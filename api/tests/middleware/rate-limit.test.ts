import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { config } from "../../src/config/env.ts";
import { callApi, startTestServer, stopTestServer } from "../helpers/api.ts";

const MAX_ATTEMPTS = 10;
const wasRateLimitEnabled = config.isRateLimitEnabled;

// Hastighetsbegränsningen är avstängd i testmiljön, så den slås på här. Den läser inställningen vid varje anrop.
beforeAll(async () => {
	config.isRateLimitEnabled = true;
	await startTestServer();
});

afterAll(async () => {
	config.isRateLimitEnabled = wasRateLimitEnabled;
	await stopTestServer();
});

describe("A07 Authentication Failures - hastighetsbegränsningen", () => {
	it("det elfte anropet till inloggningen ger 429", async () => {
		for (let i = 0; i < MAX_ATTEMPTS; i++) {
			const response = await callApi("/api/auth/login", {
				body: {},
				method: "POST",
			});
			expect(response.status).toBe(400);
		}

		const blockedResponse = await callApi("/api/auth/login", {
			body: {},
			method: "POST",
		});
		expect(blockedResponse.status).toBe(429);
	});
});
