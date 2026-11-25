import { config } from "../config/env.ts";

const HOSTS = {
	preview: "https://preview.contentful.com",
	published: "https://cdn.contentful.com",
};
const REQUEST_TIMEOUT_MS = 5000;
const EXCERPT_LENGTH = 180;
const SAFE_LINK = /^(https?:\/\/|\/)/;
const TEXT_BLOCK_KINDS = {
	"heading-2": "heading-2",
	"heading-3": "heading-3",
	paragraph: "paragraph",
};
const LIST_ITEM_KINDS = {
	"ordered-list": "number-item",
	"unordered-list": "bullet-item",
};

export const cmsConfigured = () => {
	if (config.cmsSpaceId && config.cmsDeliveryToken) {
		return true;
	}
	return false;
};

const fetchEntries = async (contentType, { preview = false } = {}) => {
	let host = HOSTS.published;
	let token = config.cmsDeliveryToken;
	if (preview) {
		host = HOSTS.preview;
		token = config.cmsPreviewToken;
	}
	const requestUrl =
		`${host}/spaces/${config.cmsSpaceId}/environments/${config.cmsEnvironment}/entries` +
		`?content_type=${contentType}&order=-sys.updatedAt&limit=100`;
	// Nyckeln går i en header och inte i adressen, eftersom adresser hamnar i loggar.
	const response = await fetch(requestUrl, {
		headers: { Authorization: `Bearer ${token}` },
		signal: AbortSignal.timeout(REQUEST_TIMEOUT_MS),
	});
	if (!response.ok) {
		throw new Error(`Contentful svarade ${response.status}`);
	}
	const body = await response.json();
	return body.items;
};

const valueOrDefault = (value, fallback) => {
	if (value === undefined || value === null) {
		return fallback;
	}
	return value;
};

// Allt utom webbadresser och sidor hos oss, till exempel javascript:, blir text utan länk.
const safeLink = (linkUri) => {
	if (typeof linkUri === "string" && SAFE_LINK.test(linkUri)) {
		return linkUri;
	}
	return null;
};

const hasMark = (node, markType) => {
	if (!node.marks) {
		return false;
	}
	return node.marks.some((mark) => mark.type === markType);
};

const toRuns = (nodes, href = null) => {
	if (!nodes) {
		return [];
	}
	return nodes.flatMap((node) => {
		if (node.nodeType === "text" && node.value) {
			return [
				{
					bold: hasMark(node, "bold"),
					href,
					italic: hasMark(node, "italic"),
					text: node.value,
				},
			];
		}
		if (node.nodeType === "hyperlink") {
			return toRuns(node.content, safeLink(node.data?.uri));
		}
		return [];
	});
};

const toItemRuns = (item) => {
	if (!item.content) {
		return [];
	}
	return item.content.flatMap((paragraph) => toRuns(paragraph.content));
};

const toListItemBlocks = (list) => {
	if (!list.content) {
		return [];
	}
	return list.content.map((item) => ({
		kind: LIST_ITEM_KINDS[list.nodeType],
		runs: toItemRuns(item),
	}));
};

// Rich text i Contentful är ett träd av noder. Varje stycke, rubrik och listpunkt blir ett block,
// och blocktyper som schemat inte känner till hoppas över.
export const toBlocks = (document) => {
	if (!document?.content) {
		return [];
	}
	const blocks = [];
	for (const node of document.content) {
		if (Object.hasOwn(TEXT_BLOCK_KINDS, node.nodeType)) {
			blocks.push({
				kind: TEXT_BLOCK_KINDS[node.nodeType],
				runs: toRuns(node.content),
			});
		} else if (Object.hasOwn(LIST_ITEM_KINDS, node.nodeType)) {
			blocks.push(...toListItemBlocks(node));
		}
	}
	return blocks.filter((block) => block.runs.length > 0);
};

const toNotice = (entry, status = "published") => ({
	body: toBlocks(entry.fields?.text),
	guideSlug: valueOrDefault(entry.fields?.guideSlug, null),
	id: entry.sys.id,
	level: valueOrDefault(entry.fields?.niva, "info"),
	status,
	title: valueOrDefault(entry.fields?.rubrik, ""),
});

// guideId är guidens id i Postgres. En slug duger inte som nyckel, eftersom den slumpas i testdata.
const toGuideTexts = (guideEntries) =>
	new Map(
		guideEntries.map((entry) => [
			entry.fields?.guideId,
			toBlocks(entry.fields?.text),
		]),
	);

const isCacheFresh = (cache) => {
	if (!cache.value) {
		return false;
	}
	return Date.now() - cache.at < config.cmsCacheSeconds * 1000;
};

// Contentful räknar varje anrop och gratisnivån har ett tak per månad. Därför hämtas innehållet
// högst en gång per CMS_CACHE_SECONDS, och svaret kommer ur minnet däremellan.
const createCachedLoader = ({ describe, emptyValue, load, name }) => {
	let cache = { at: 0, value: null };
	let pendingLoad = null;

	const describeFailure = (error, fallback) =>
		`cms: kunde inte hämta ${name} (${error.message}) - svarar med ${fallback}`;

	const fetchValue = async () => {
		try {
			const value = await load();
			console.log(`cms: hämtade ${describe(value)} från Contentful`);
			cache = { at: Date.now(), value };
			return value;
		} catch (error) {
			if (cache.value) {
				console.error(describeFailure(error, "det senast hämtade"));
				return cache.value;
			}
			console.error(describeFailure(error, "en tom lista"));
			return emptyValue;
		}
	};

	return {
		clear: () => {
			cache = { at: 0, value: null };
		},
		get: async () => {
			if (!cmsConfigured()) {
				return emptyValue;
			}
			if (isCacheFresh(cache)) {
				return cache.value;
			}
			// Frågor som kommer medan ett anrop pågår väntar på samma svar.
			if (!pendingLoad) {
				pendingLoad = fetchValue().finally(() => {
					pendingLoad = null;
				});
			}
			return pendingLoad;
		},
	};
};

const noticeLoader = createCachedLoader({
	describe: (notices) => `${notices.length} publicerade notiser`,
	emptyValue: [],
	load: async () =>
		(await fetchEntries("notis")).map((entry) => toNotice(entry)),
	name: "notiser",
});

const guideTextLoader = createCachedLoader({
	describe: (texts) => `${texts.size} guidetexter`,
	emptyValue: new Map(),
	load: async () => toGuideTexts(await fetchEntries("guide")),
	name: "guidetexter",
});

export const clearCmsCache = () => {
	noticeLoader.clear();
	guideTextLoader.clear();
};

export const publishedNotices = () => noticeLoader.get();

// En guide som saknar text i CMS:et, till exempel för att den inte är publicerad där, får en tom lista.
export const publishedGuideBody = async (guideId) => {
	const texts = await guideTextLoader.get();
	const body = texts.get(guideId);
	if (!body) {
		return [];
	}
	return body;
};

export const guideExcerpt = async (guideId) => {
	const body = await publishedGuideBody(guideId);
	const firstParagraph = body.find((block) => block.kind === "paragraph");
	if (!firstParagraph) {
		return "";
	}
	return firstParagraph.runs
		.map((textRun) => textRun.text)
		.join("")
		.slice(0, EXCERPT_LENGTH);
};

const getPreviewStatus = (publishedFields, entry) => {
	const published = publishedFields.get(entry.sys.id);
	if (published === undefined) {
		return "draft";
	}
	if (published === JSON.stringify(entry.fields)) {
		return "published";
	}
	return "changed";
};

// Förhandsgranskningen cachas aldrig, för redaktören vill se det hen just skrev.
export const previewNotices = async () => {
	const [latest, published] = await Promise.all([
		fetchEntries("notis", { preview: true }),
		fetchEntries("notis"),
	]);
	const publishedFields = new Map(
		published.map((entry) => [entry.sys.id, JSON.stringify(entry.fields)]),
	);
	return latest.map((entry) =>
		toNotice(entry, getPreviewStatus(publishedFields, entry)),
	);
};
