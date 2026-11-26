import { eq } from "drizzle-orm";
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { z } from "zod";
import { db } from "../../../src/db/postgres.ts";
import { guides } from "../../../src/db/schema/index.ts";
import { sign } from "../../../src/lib/token.ts";
import {
	callApi,
	expectRow,
	findGuide,
	findMember,
	findUser,
	getBaseUrl,
	issuesSchema,
	readJson,
	recordSchema,
	startTestServer,
	stopTestServer,
	toGuideBody,
} from "../../helpers/api.ts";

beforeAll(startTestServer);
afterAll(stopTestServer);

describe("A05 Injection - sökningen", () => {
	it("ett citattecken i sökordet ger 200 och en tom lista, inte 500", async () => {
		const response = await callApi(
			`/api/guides/search?q=${encodeURIComponent("'")}`,
		);
		expect(response.status).toBe(200);
		expect(await response.json()).toEqual([]);
	});

	it("ett procenttecken i sökordet söks som vanlig text och ger inte alla guider", async () => {
		const response = await callApi(
			`/api/guides/search?q=${encodeURIComponent("%")}`,
		);
		expect(response.status).toBe(200);
		expect(await response.json()).toEqual([]);
	});

	it("en vanlig sökning hittar guider i landskapet", async () => {
		const { region } = await findGuide();
		const response = await callApi(
			`/api/guides/search?q=${encodeURIComponent(region)}`,
		);
		expect(response.status).toBe(200);
		const found = await readJson(
			response,
			z.array(z.object({ region: z.string() })),
		);
		expect(found.length).toBeGreaterThan(0);
		for (const guide of found) {
			expect(guide.region).toBe(region);
		}
	});
});

describe("A01 Broken Access Control - guiderna", () => {
	it("PUT /api/guides/:id utan token ger 401 och guiden ändras inte", async () => {
		const guide = await findGuide();
		const response = await callApi(`/api/guides/${guide.id}`, {
			body: { ...toGuideBody(guide), title: "Ändrad utan token" },
			method: "PUT",
		});
		expect(response.status).toBe(401);
		expect((await findGuide()).title).toBe(guide.title);
	});

	it("en medlem kan inte ändra en guide (403)", async () => {
		const guide = await findGuide();
		const member = await findMember();
		const response = await callApi(`/api/guides/${guide.id}`, {
			body: { ...toGuideBody(guide), title: "Ändrad av medlem" },
			method: "PUT",
			token: sign(member),
		});
		expect(response.status).toBe(403);
		expect((await findGuide()).title).toBe(guide.title);
	});

	it("en redaktör kan uppdatera en guide", async () => {
		const guide = await findGuide();
		const editor = await findUser(1);
		const response = await callApi(`/api/guides/${guide.id}`, {
			body: { ...toGuideBody(guide), title: "Ändrad av redaktör" },
			method: "PUT",
			token: sign(editor),
		});
		expect(response.status).toBe(200);
		const updated = await readJson(response, z.object({ title: z.string() }));
		expect(updated.title).toBe("Ändrad av redaktör");
		await db
			.update(guides)
			.set({ title: guide.title })
			.where(eq(guides.id, guide.id));
	});

	it("ogiltig indata ger 400 med vad som var fel, och guiden ändras inte", async () => {
		const guide = await findGuide();
		const editor = await findUser(1);
		const response = await callApi(`/api/guides/${guide.id}`, {
			body: { ...toGuideBody(guide), lengthKm: -5, title: "" },
			method: "PUT",
			token: sign(editor),
		});
		expect(response.status).toBe(400);
		const responseBody = await readJson(response, issuesSchema);
		expect(responseBody.issues.map((issue) => issue.path)).toEqual(
			expect.arrayContaining(["title", "lengthKm"]),
		);
		expect((await findGuide()).title).toBe(guide.title);
	});

	it("ger 404 för en guide som inte finns", async () => {
		const guide = await findGuide();
		const editor = await findUser(1);
		const response = await callApi("/api/guides/999999", {
			body: toGuideBody(guide),
			method: "PUT",
			token: sign(editor),
		});
		expect(response.status).toBe(404);
	});
});

// I testerna är CMS:et avstängt, så texten och notiserna är tomma. Svaret ska ändå ha rätt form.
describe("Guidernas text ur CMS:et", () => {
	it("guidesidan svarar utan bodyHtml och med tom text och inga notiser", async () => {
		const [guide] = await db
			.select({ slug: guides.slug })
			.from(guides)
			.orderBy(guides.id)
			.limit(1);
		const response = await fetch(
			`${getBaseUrl()}/api/guides/${expectRow(guide).slug}`,
		);
		const body = await readJson(response, recordSchema);
		expect(response.status).toBe(200);
		expect(body["body"]).toEqual([]);
		expect(body["notices"]).toEqual([]);
		expect(body).toHaveProperty("lengthKm");
		expect(body).not.toHaveProperty("bodyHtml");
	});

	it("listan har ett utdrag i stället för bodyHtml", async () => {
		const response = await fetch(`${getBaseUrl()}/api/guides`);
		const list = await readJson(response, z.array(recordSchema));
		expect(list[0]).toHaveProperty("excerpt", "");
		expect(list[0]).not.toHaveProperty("bodyHtml");
	});
});
