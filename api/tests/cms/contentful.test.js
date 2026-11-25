import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import {
	clearCmsCache,
	guideExcerpt,
	previewNotices,
	publishedGuideBody,
	publishedNotices,
	toBlocks,
} from "../../src/cms/contentful.js";
import { config } from "../../src/config/env.ts";

// Contentful anropas aldrig i testerna. fetch byts mot en funktion som svarar som Contentful skulle ha svarat,
// så testerna körs utan nycklar och utan nät och prövar vår kod, inte deras tjänst.
const createText = (value, marks = []) => ({
	data: {},
	marks: marks.map((type) => ({ type })),
	nodeType: "text",
	value,
});
const createParagraph = (...content) => ({
	content,
	data: {},
	nodeType: "paragraph",
});
const createDocument = (...content) => ({
	content,
	data: {},
	nodeType: "document",
});
const createEntry = (identifier, fields) => ({
	fields,
	sys: { id: identifier, updatedAt: "2026-11-18T08:00:00Z" },
});

const closedBridge = createEntry("n1", {
	guideSlug: "norra-leden-7",
	niva: "varning",
	rubrik: "Leden är avstängd",
	text: createDocument(
		createParagraph(
			createText("Bron vid "),
			createText("Storforsen", ["bold"]),
			createText(" lagas."),
		),
	),
});
const welcome = createEntry("n2", {
	niva: "info",
	rubrik: "Välkommen",
	text: createDocument(createParagraph(createText("Hej!"))),
});

// Svarar som Contentful: { items: [...] }. items kan vara en lista eller en funktion av adressen.
const createFakeFetch = (items) =>
	vi.fn(async (requestUrl) => {
		let responseItems = items;
		if (typeof items === "function") {
			responseItems = items(String(requestUrl));
		}
		return {
			json: async () => ({ items: responseItems }),
			ok: true,
			status: 200,
		};
	});

beforeEach(() => {
	Object.assign(config, {
		cmsDeliveryToken: "delivery-nyckel",
		cmsPreviewToken: "preview-nyckel",
		cmsSpaceId: "space1",
	});
	clearCmsCache();
});

afterEach(() => {
	vi.unstubAllGlobals();
	vi.restoreAllMocks();
});

describe("rich text till block av textbitar", () => {
	it("ett stycke med fet text blir textbitar med märken", () => {
		expect(toBlocks(closedBridge.fields.text)).toEqual([
			{
				kind: "paragraph",
				runs: [
					{ bold: false, href: null, italic: false, text: "Bron vid " },
					{ bold: true, href: null, italic: false, text: "Storforsen" },
					{ bold: false, href: null, italic: false, text: " lagas." },
				],
			},
		]);
	});

	it("en länk blir en textbit med href, men bara till http(s) eller en sida hos oss", () => {
		const createLink = (uri) => ({
			content: [createText("läs mer")],
			data: { uri },
			nodeType: "hyperlink",
		});
		const document = createDocument(
			createParagraph(
				createLink("https://utpost.se/leder"),
				createLink("/guider/norra-leden-7"),
				createLink("javascript:alert(1)"),
			),
		);
		const linkTargets = toBlocks(document)[0].runs.map((run) => run.href);
		expect(linkTargets).toEqual([
			"https://utpost.se/leder",
			"/guider/norra-leden-7",
			null,
		]);
	});

	it("rubriker och listor blir block med en sort, en listpunkt per block", () => {
		const createList = (nodeType, ...items) => ({
			content: items.map((item) => ({
				content: [createParagraph(createText(item))],
				data: {},
				nodeType: "list-item",
			})),
			data: {},
			nodeType,
		});
		const document = createDocument(
			{ content: [createText("Om leden")], data: {}, nodeType: "heading-2" },
			{
				content: [createText("Bra att veta")],
				data: {},
				nodeType: "heading-3",
			},
			createList("unordered-list", "Vindskydd", "Ingen service"),
			createList("ordered-list", "Parkera"),
		);
		expect(
			toBlocks(document).map((block) => [
				block.kind,
				block.runs.map((run) => run.text).join(""),
			]),
		).toEqual([
			["heading-2", "Om leden"],
			["heading-3", "Bra att veta"],
			["bullet-item", "Vindskydd"],
			["bullet-item", "Ingen service"],
			["number-item", "Parkera"],
		]);
	});

	it("blocktyper schemat inte känner till hoppas över, och ett tomt fält ger inga block", () => {
		const table = {
			content: [createText("Tabell")],
			data: {},
			nodeType: "table",
		};
		const document = createDocument(
			table,
			createParagraph(createText("Stycke")),
		);
		expect(toBlocks(document)).toHaveLength(1);
		expect(toBlocks(undefined)).toEqual([]);
	});
});

describe("publicerade notiser", () => {
	it("hämtas från delivery-API:et med nyckeln i en header och formas om till schemat", async () => {
		const fakeFetch = createFakeFetch([closedBridge, welcome]);
		vi.stubGlobal("fetch", fakeFetch);

		const notices = await publishedNotices();

		expect(
			notices.map((notice) => [
				notice.id,
				notice.title,
				notice.level,
				notice.guideSlug,
				notice.status,
			]),
		).toEqual([
			["n1", "Leden är avstängd", "varning", "norra-leden-7", "published"],
			["n2", "Välkommen", "info", null, "published"],
		]);
		const [requestUrl, options] = fakeFetch.mock.calls[0];
		expect(requestUrl).toContain(
			"https://cdn.contentful.com/spaces/space1/environments/master/entries?content_type=notis",
		);
		expect(requestUrl).not.toContain("delivery-nyckel");
		expect(options.headers.Authorization).toBe("Bearer delivery-nyckel");
	});

	it("cachas: två frågor i rad kostar ett anrop till Contentful", async () => {
		const fakeFetch = createFakeFetch([welcome]);
		vi.stubGlobal("fetch", fakeFetch);
		await publishedNotices();
		await publishedNotices();
		expect(fakeFetch).toHaveBeenCalledTimes(1);
	});

	it("40 frågor på samma gång med kall cache delar på ett anrop", async () => {
		const fakeFetch = createFakeFetch([closedBridge]);
		vi.stubGlobal("fetch", fakeFetch);
		const answers = await Promise.all(
			Array.from({ length: 40 }, () => publishedNotices()),
		);
		expect(fakeFetch).toHaveBeenCalledTimes(1);
		expect(answers.every((notices) => notices.length === 1)).toBe(true);
	});

	it("är CMS:et nere svarar vi med det senast hämtade, eller en tom lista, aldrig ett fel", async () => {
		vi.spyOn(console, "error").mockImplementation(() => {});
		const unavailable = vi.fn(async () => ({
			json: async () => ({}),
			ok: false,
			status: 503,
		}));
		vi.stubGlobal("fetch", unavailable);
		expect(await publishedNotices()).toEqual([]);

		vi.stubGlobal("fetch", createFakeFetch([welcome]));
		expect(await publishedNotices()).toHaveLength(1);
		config.cmsCacheSeconds = 0;
		vi.stubGlobal("fetch", unavailable);
		expect(await publishedNotices()).toHaveLength(1);
		config.cmsCacheSeconds = 60;
	});

	it("utan space och nyckel är CMS:et avstängt: tom lista och inget anrop", async () => {
		Object.assign(config, { cmsDeliveryToken: "", cmsSpaceId: "" });
		const fakeFetch = createFakeFetch([welcome]);
		vi.stubGlobal("fetch", fakeFetch);
		expect(await publishedNotices()).toEqual([]);
		expect(fakeFetch).not.toHaveBeenCalled();
	});
});

describe("förhandsgranskningen", () => {
	it("hämtar från preview-API:et med preview-nyckeln och säger vad som är utkast och vad som är ändrat", async () => {
		const draft = createEntry("n3", { niva: "info", rubrik: "Ny led i vår" });
		const changed = createEntry("n2", {
			...welcome.fields,
			rubrik: "Välkommen tillbaka",
		});
		const fakeFetch = createFakeFetch((requestUrl) => {
			if (requestUrl.startsWith("https://preview.contentful.com")) {
				return [closedBridge, changed, draft];
			}
			return [closedBridge, welcome];
		});
		vi.stubGlobal("fetch", fakeFetch);

		const notices = await previewNotices();

		expect(notices.map((notice) => [notice.id, notice.status])).toEqual([
			["n1", "published"],
			["n2", "changed"],
			["n3", "draft"],
		]);
		expect(notices[2].body).toEqual([]);
		const previewCall = fakeFetch.mock.calls.find(([requestUrl]) =>
			requestUrl.startsWith("https://preview.contentful.com"),
		);
		expect(previewCall[1].headers.Authorization).toBe("Bearer preview-nyckel");
	});
});

describe("guidernas text", () => {
	const guideEntry = createEntry("utpost-guide-7", {
		guideId: 7,
		text: createDocument(
			createParagraph(createText("En av de mest omtyckta lederna.")),
		),
	});

	it("hittas med guidens id i Postgres och hämtas med ett anrop för alla guider", async () => {
		const fakeFetch = createFakeFetch([guideEntry]);
		vi.stubGlobal("fetch", fakeFetch);

		const body = await publishedGuideBody(7);
		await publishedGuideBody(8);

		expect(body[0].kind).toBe("paragraph");
		expect(fakeFetch).toHaveBeenCalledTimes(1);
		expect(fakeFetch.mock.calls[0][0]).toContain("content_type=guide");
	});

	it("en guide utan text i CMS:et får en tom lista och ett tomt utdrag", async () => {
		vi.stubGlobal("fetch", createFakeFetch([guideEntry]));

		expect(await publishedGuideBody(99)).toEqual([]);
		expect(await guideExcerpt(99)).toBe("");
	});

	it("utdraget är första stycket, klippt efter 180 tecken", async () => {
		const longText = "a".repeat(300);
		vi.stubGlobal(
			"fetch",
			createFakeFetch([
				createEntry("utpost-guide-1", {
					guideId: 1,
					text: createDocument(
						{
							content: [createText("Rubrik")],
							data: {},
							nodeType: "heading-2",
						},
						createParagraph(createText(longText)),
					),
				}),
			]),
		);

		expect(await guideExcerpt(1)).toBe(longText.slice(0, 180));
	});
});
