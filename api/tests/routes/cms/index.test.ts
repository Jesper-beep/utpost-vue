import { afterAll, beforeAll, describe, expect, it, vi } from "vitest";
import {
	clearCmsCache,
	publishedNotices,
} from "../../../src/cms/contentful.js";
import { config } from "../../../src/config/env.ts";
import {
	getBaseUrl,
	startTestServer,
	stopTestServer,
} from "../../helpers/api.ts";

beforeAll(startTestServer);
afterAll(stopTestServer);

// Adressen är publik, så testerna gäller två saker: att ingen kommer in utan hemligheten,
// och att rätt anrop tömmer cachen.
describe("POST /api/cms/webhook", () => {
	const WEBHOOK_SECRET = "en-lang-webhook-hemlighet-for-testerna";
	const callWebhook = (headers: Record<string, string> = {}) =>
		fetch(`${getBaseUrl()}/api/cms/webhook`, { headers, method: "POST" });

	it("utan hemlighet, med fel hemlighet eller när ingen är satt på servern: 401", async () => {
		config.cmsWebhookSecret = WEBHOOK_SECRET;
		expect((await callWebhook()).status).toBe(401);
		expect(
			(await callWebhook({ "X-Utpost-Webhook-Secret": "fel" })).status,
		).toBe(401);
		config.cmsWebhookSecret = "";
		const emptySecretResponse = await callWebhook({
			"X-Utpost-Webhook-Secret": "",
		});
		expect(emptySecretResponse.status).toBe(401);
	});

	it("med rätt hemlighet töms cachen och nästa fråga hämtar från CMS:et igen", async () => {
		Object.assign(config, {
			cmsDeliveryToken: "nyckel",
			cmsSpaceId: "space1",
			cmsWebhookSecret: WEBHOOK_SECRET,
		});
		clearCmsCache();
		const realFetch = globalThis.fetch;
		// Bara anropen till Contentful byts ut. Testets egna anrop till API:et går som vanligt.
		const contentful = vi.fn(
			async (_requestUrl: string | URL | Request, _options?: RequestInit) => ({
				json: async () => ({ items: [] }),
				ok: true,
				status: 200,
			}),
		);
		vi.stubGlobal(
			"fetch",
			(requestUrl: string | URL | Request, options?: RequestInit) => {
				if (String(requestUrl).includes("contentful.com")) {
					return contentful(requestUrl, options);
				}
				return realFetch(requestUrl, options);
			},
		);
		vi.spyOn(console, "log").mockImplementation(() => undefined);

		await publishedNotices();
		await publishedNotices();
		expect(contentful).toHaveBeenCalledTimes(1);

		const response = await callWebhook({
			"X-Contentful-Topic": "ContentManagement.Entry.publish",
			"X-Utpost-Webhook-Secret": WEBHOOK_SECRET,
		});
		expect(response.status).toBe(204);

		await publishedNotices();
		expect(contentful).toHaveBeenCalledTimes(2);

		vi.unstubAllGlobals();
		vi.restoreAllMocks();
		Object.assign(config, {
			cmsDeliveryToken: "",
			cmsSpaceId: "",
			cmsWebhookSecret: "",
		});
		clearCmsCache();
	});
});
