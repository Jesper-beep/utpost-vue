import { and, eq, ne } from "drizzle-orm";
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { db } from "../../../src/db/postgres.ts";
import { tours, users } from "../../../src/db/schema/index.ts";
import { sign } from "../../../src/lib/token.ts";
import {
	callApi,
	errorSchema,
	expectRow,
	findUser,
	readJson,
	startTestServer,
	stopTestServer,
} from "../../helpers/api.ts";

beforeAll(startTestServer);
afterAll(stopTestServer);

describe("A01 Broken Access Control - vems tur är det?", () => {
	it("DELETE /api/tours/:id utan token ger 401 och turen finns kvar", async () => {
		const response = await callApi("/api/tours/1", { method: "DELETE" });
		expect(response.status).toBe(401);
		const rows = await db.select().from(tours).where(eq(tours.id, 1));
		expect(rows).toHaveLength(1);
	});

	it("en medlem kan inte ta bort någon annans tur (403)", async () => {
		const [tour] = await db.select().from(tours).where(eq(tours.id, 1));
		const ownedTour = expectRow(tour);
		// En annan medlem än turens ägare, och inte redaktör
		const [otherMember] = await db
			.select()
			.from(users)
			.where(and(ne(users.id, ownedTour.userId), eq(users.role, "member")))
			.limit(1);
		const response = await callApi(`/api/tours/${ownedTour.id}`, {
			method: "DELETE",
			token: sign(expectRow(otherMember)),
		});
		expect(response.status).toBe(403);
		expect(await db.select().from(tours).where(eq(tours.id, 1))).toHaveLength(
			1,
		);
	});

	it("ägaren kan ta bort sin egen tur", async () => {
		const owner = await findUser(1);
		const [created] = await db
			.insert(tours)
			.values({
				distanceM: 100,
				startedAt: new Date(),
				title: "Testtur M8",
				userId: owner.id,
			})
			.returning();
		const createdTour = expectRow(created);
		const response = await callApi(`/api/tours/${createdTour.id}`, {
			method: "DELETE",
			token: sign(owner),
		});
		expect(response.status).toBe(200);
		expect(
			await db.select().from(tours).where(eq(tours.id, createdTour.id)),
		).toHaveLength(0);
	});
});

describe("Validering av indata - A10 Mishandling of Exceptional Conditions", () => {
	it("ett id som inte är ett tal ger 400, inte ett ohanterat fel", async () => {
		const response = await callApi("/api/tours/abc");
		expect(response.status).toBe(400);
		expect(await readJson(response, errorSchema)).toEqual({
			error: "ogiltigt id",
		});
	});

	it.each([null, "", true, "100"])(
		"en tur med distanceM %j ger 400",
		async (distanceM) => {
			const owner = await findUser(1);
			const response = await callApi("/api/tours", {
				body: {
					distanceM,
					startedAt: "2026-11-01T10:00:00Z",
					title: "Tur med fel avstånd",
				},
				method: "POST",
				token: sign(owner),
			});
			expect(response.status).toBe(400);
		},
	);

	it("en tur med en guide som inte finns ger 400, inte 500", async () => {
		const owner = await findUser(1);
		const response = await callApi("/api/tours", {
			body: {
				distanceM: 100,
				guideId: 2_147_483_647,
				startedAt: "2026-11-01T10:00:00Z",
				title: "Tur med saknad guide",
			},
			method: "POST",
			token: sign(owner),
		});
		expect(response.status).toBe(400);
		expect(await readJson(response, errorSchema)).toEqual({
			error: "guiden finns inte",
		});
	});
});
