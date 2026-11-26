import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { getBaseUrl, startTestServer, stopTestServer } from "./helpers/api.ts";

beforeAll(startTestServer);
afterAll(stopTestServer);

describe("A02 Security Misconfiguration - CORS", () => {
	it("svaret ger ingen access-control-allow-origin till en annan webbplats", async () => {
		const response = await fetch(`${getBaseUrl()}/api/guides`, {
			headers: { origin: "https://shrek-is-love.com" },
		});
		expect(response.status).toBe(200);
		expect(response.headers.get("access-control-allow-origin")).toBeNull();
	});
});
