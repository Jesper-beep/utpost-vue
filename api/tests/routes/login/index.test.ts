import { count, like } from "drizzle-orm";
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { z } from "zod";
import { db } from "../../../src/db/postgres.ts";
import { users } from "../../../src/db/schema/index.ts";
import {
	callApi,
	errorSchema,
	expectRow,
	findUser,
	getBaseUrl,
	readJson,
	startTestServer,
	stopTestServer,
} from "../../helpers/api.ts";

beforeAll(startTestServer);
afterAll(stopTestServer);

describe("A07 Authentication Failures - inloggningen", () => {
	it("svaret på en lyckad inloggning innehåller token och användaren - men aldrig passwordHash", async () => {
		const user = await findUser(1);
		const response = await callApi("/api/auth/login", {
			body: { email: user.email, password: "hemligt123" },
			method: "POST",
		});
		expect(response.status).toBe(200);
		const text = await response.text();
		const responseBody = z
			.object({ token: z.string(), user: z.object({ email: z.string() }) })
			.parse(JSON.parse(text));
		expect(responseBody.user.email).toBe(user.email);
		expect(text).not.toContain("passwordHash");
		expect(text).not.toContain("hemligt123");
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
		const [row] = await db
			.select({ total: count() })
			.from(users)
			.where(like(users.passwordHash, "plaintext:%"));
		expect(expectRow(row).total).toBe(0);
	});
});

describe("Validering av indata - A10 Mishandling of Exceptional Conditions", () => {
	it("trasig JSON ger 400 med ett svar - inte ett anrop som hänger", async () => {
		const response = await fetch(`${getBaseUrl()}/api/auth/login`, {
			body: '{"email": ',
			headers: { "content-type": "application/json" },
			method: "POST",
		});
		expect(response.status).toBe(400);
		expect(await readJson(response, errorSchema)).toEqual({
			error: "ogiltig JSON",
		});
	});
});
