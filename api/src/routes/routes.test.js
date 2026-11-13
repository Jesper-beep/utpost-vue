import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { app } from "../app.js";
import { pool } from "../db/client.js";
import { mongo } from "../db/mongo.js";
import { sign } from "../lib/auth.js";

// Säkerhetstester för REST-API:et mot riktiga databaser, på samma sätt som
// GraphQL-testerna i graphql/server.test.js. Appen startas på en ledig port
// och stängs när testerna är klara.
//
// Varje hål som lagas har ett test som var rött före rättningen.
// Testet bevisar att hålet fanns och hindrar det från att komma tillbaka.
let server;
let baseUrl;
const callApi = (path, { method = "GET", body, token } = {}) =>
	fetch(`${baseUrl}${path}`, {
		body: body === undefined ? undefined : JSON.stringify(body),
		headers: {
			"content-type": "application/json",
			...(token ? { authorization: `Bearer ${token}` } : {}),
		},
		method,
	});

const findUser = async (id) =>
	(
		await pool.query(
			"select id, email, role, display_name from users where id = $1",
			[id],
		)
	).rows[0];

const countPhotos = async () =>
	(await pool.query("select count(*)::int as n from photos")).rows[0].n;

beforeAll(async () => {
	server = app.listen(0);
	await new Promise((resolve) => server.once("listening", resolve));
	baseUrl = `http://127.0.0.1:${server.address().port}`;
});

afterAll(async () => {
	await new Promise((resolve) => server.close(resolve));
	await pool.end();
	await mongo.close();
});

describe("A07 Authentication Failures - inloggningen", () => {
	it("svaret på en lyckad inloggning innehåller token och användaren - men aldrig password_hash", async () => {
		const user = await findUser(1);
		const res = await callApi("/api/auth/login", {
			body: { email: user.email, password: "hemligt123" },
			method: "POST",
		});
		expect(res.status).toBe(200);
		const responseBody = await res.json();
		expect(responseBody.token).toEqual(expect.any(String));
		expect(responseBody.user.email).toBe(user.email);
		expect(JSON.stringify(responseBody)).not.toContain("password_hash");
		expect(JSON.stringify(responseBody)).not.toContain("hemligt123");
	});

	it("fel lösenord och okänd e-post ger samma svar (401, samma text)", async () => {
		const user = await findUser(1);
		const wrongPassword = await callApi("/api/auth/login", {
			body: { email: user.email, password: "fel" },
			method: "POST",
		});
		const unknownEmail = await callApi("/api/auth/login", {
			body: { email: "finns.inte@example.com", password: "fel" },
			method: "POST",
		});
		expect(wrongPassword.status).toBe(401);
		expect(unknownEmail.status).toBe(401);
		expect(await wrongPassword.json()).toEqual(await unknownEmail.json());
	});

	it("lösenordet i databasen är hashat, inte klartext", async () => {
		const { rows } = await pool.query(
			"select count(*)::int as n from users where password_hash like 'plaintext:%'",
		);
		expect(rows[0].n).toBe(0);
	});

	it("registrering med för kort lösenord ger 400 med vad som var fel", async () => {
		const res = await callApi("/api/auth/register", {
			body: { displayName: "Ny", email: "ny@example.com", password: "kort" },
			method: "POST",
		});
		expect(res.status).toBe(400);
		const responseBody = await res.json();
		expect(responseBody.error).toBe("ogiltig indata");
		expect(responseBody.issues[0].path).toBe("password");
	});
});

describe("A01 Broken Access Control - vems tur är det?", () => {
	it("DELETE /api/tours/:id utan token ger 401 och turen finns kvar", async () => {
		const res = await callApi("/api/tours/1", { method: "DELETE" });
		expect(res.status).toBe(401);
		const { rows } = await pool.query("select id from tours where id = 1");
		expect(rows).toHaveLength(1);
	});

	it("en medlem kan inte ta bort någon annans tur (403)", async () => {
		const tour = (
			await pool.query("select id, user_id from tours where id = 1")
		).rows[0];
		// En annan medlem än turens ägare, och inte redaktör
		const otherMember = (
			await pool.query(
				"select id, email, role from users where id <> $1 and role = 'member' limit 1",
				[tour.user_id],
			)
		).rows[0];
		const res = await callApi(`/api/tours/${tour.id}`, {
			method: "DELETE",
			token: sign(otherMember),
		});
		expect(res.status).toBe(403);
		expect(
			(await pool.query("select id from tours where id = 1")).rows,
		).toHaveLength(1);
	});

	it("ägaren kan ta bort sin egen tur", async () => {
		const owner = await findUser(1);
		const created = await pool.query(
			`insert into tours (user_id, title, started_at, distance_m) values ($1, 'Testtur M8', now(), 100) returning id`,
			[owner.id],
		);
		const res = await callApi(`/api/tours/${created.rows[0].id}`, {
			method: "DELETE",
			token: sign(owner),
		});
		expect(res.status).toBe(200);
		expect(
			(
				await pool.query("select id from tours where id = $1", [
					created.rows[0].id,
				])
			).rows,
		).toHaveLength(0);
	});

	it("POST /api/photos utan token ger 401 - uppladdning kräver inloggning", async () => {
		const res = await callApi("/api/photos", {
			body: { filename: "mountain.jpg", height: 3000, tourId: 1, width: 4000 },
			method: "POST",
		});
		expect(res.status).toBe(401);
	});
});

describe("A05 Injection - sökningen", () => {
	it("ett citattecken i sökordet ger 200 och en tom lista, inte 500", async () => {
		const res = await callApi(
			`/api/guides/search?q=${encodeURIComponent("'")}`,
		);
		expect(res.status).toBe(200);
		expect(await res.json()).toEqual([]);
	});

	it("en vanlig sökning hittar guider i landskapet", async () => {
		const region = (await pool.query("select region from guides limit 1"))
			.rows[0].region;
		const res = await callApi(
			`/api/guides/search?q=${encodeURIComponent(region)}`,
		);
		expect(res.status).toBe(200);
		const guides = await res.json();
		expect(guides.length).toBeGreaterThan(0);
		for (const guide of guides) expect(guide.region).toBe(region);
	});
});

describe("Validering av indata - A10 Mishandling of Exceptional Conditions", () => {
	// Ersätter lärarens test med JSON och mått. Vår uppladdning tar råa bilder,
	// och bilder över 50 MP stoppas av bildfunktionen (functions/src/image.test.js).
	it("ett tourId som inte är ett heltal stoppas med 400 innan något sparas", async () => {
		const owner = await findUser(1);
		const photoCountBefore = await countPhotos();
		const res = await fetch(`${baseUrl}/api/photos?tourId=1e0`, {
			body: new Uint8Array(100),
			headers: {
				authorization: `Bearer ${sign(owner)}`,
				"content-type": "image/jpeg",
			},
			method: "POST",
		});
		expect(res.status).toBe(400);
		expect(await res.json()).toEqual({
			error: "tourId saknas eller är ogiltigt",
		});
		expect(await countPhotos()).toBe(photoCountBefore);
	});

	it("ett id som inte är ett tal ger 400, inte ett ohanterat fel", async () => {
		const res = await callApi("/api/tours/abc");
		expect(res.status).toBe(400);
		expect(await res.json()).toEqual({ error: "ogiltigt id" });
	});

	it("trasig JSON ger 400 med ett svar - inte ett anrop som hänger", async () => {
		const res = await fetch(`${baseUrl}/api/auth/login`, {
			body: '{"email": ',
			headers: { "content-type": "application/json" },
			method: "POST",
		});
		expect(res.status).toBe(400);
		expect(await res.json()).toEqual({ error: "ogiltig JSON" });
	});
});
