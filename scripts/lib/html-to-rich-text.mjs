import { parseFragment } from "parse5";

const SAFE_LINK = /^(https?:\/\/|\/)/;
const WHITESPACE = /\s+/g;
// Contentfuls modell för guiderna har bara två rubriknivåer, så h1 blir heading-2 och h4 till h6 blir heading-3.
const HEADING_NODE_TYPES = {
	h1: "heading-2",
	h2: "heading-2",
	h3: "heading-3",
	h4: "heading-3",
	h5: "heading-3",
	h6: "heading-3",
};
const LIST_NODE_TYPES = { ol: "ordered-list", ul: "unordered-list" };
const MARK_TYPES = { b: "bold", em: "italic", i: "italic", strong: "bold" };

const createText = (value, marks) => ({
	data: {},
	marks: marks.map((type) => ({ type })),
	nodeType: "text",
	value,
});

const getAttribute = (node, name) =>
	node.attrs?.find((attribute) => attribute.name === name)?.value;

const toInlineNodes = (nodes, marks = []) => {
	const result = [];
	for (const node of nodes) {
		if (node.nodeName === "#text") {
			result.push(createText(node.value.replace(WHITESPACE, " "), marks));
		} else if (node.nodeName === "a") {
			const linkUri = getAttribute(node, "href");
			const content = toInlineNodes(node.childNodes, marks);
			if (linkUri && SAFE_LINK.test(linkUri)) {
				result.push({
					content,
					data: { uri: linkUri },
					nodeType: "hyperlink",
				});
			} else {
				result.push(...content);
			}
		} else if (node.childNodes) {
			let childMarks = marks;
			if (Object.hasOwn(MARK_TYPES, node.nodeName)) {
				childMarks = [...marks, MARK_TYPES[node.nodeName]];
			}
			result.push(...toInlineNodes(node.childNodes, childMarks));
		}
	}
	return result;
};

const isEmptyText = (node) => {
	if (node.nodeType === "text" && node.value === "") {
		return true;
	}
	return false;
};

const trimEdges = (nodes) => {
	const trimmed = [...nodes];
	const first = trimmed[0];
	if (first?.nodeType === "text") {
		trimmed[0] = { ...first, value: first.value.trimStart() };
	}
	const last = trimmed.at(-1);
	if (last?.nodeType === "text") {
		trimmed[trimmed.length - 1] = { ...last, value: last.value.trimEnd() };
	}
	return trimmed.filter((node) => !isEmptyText(node));
};

const toTextBlock = (nodeType, childNodes) => {
	const content = trimEdges(toInlineNodes(childNodes));
	if (content.length === 0) {
		return [];
	}
	return [{ content, data: {}, nodeType }];
};

const toList = (node) => {
	const items = node.childNodes
		.filter((child) => child.nodeName === "li")
		.flatMap((item) => toTextBlock("paragraph", item.childNodes))
		.map((paragraph) => ({
			content: [paragraph],
			data: {},
			nodeType: "list-item",
		}));
	if (items.length === 0) {
		return [];
	}
	return [
		{ content: items, data: {}, nodeType: LIST_NODE_TYPES[node.nodeName] },
	];
};

const toBlockNodes = (nodes) =>
	nodes.flatMap((node) => {
		if (node.nodeName === "#text") {
			return toTextBlock("paragraph", [node]);
		}
		if (node.nodeName === "p") {
			return toTextBlock("paragraph", node.childNodes);
		}
		if (Object.hasOwn(HEADING_NODE_TYPES, node.nodeName)) {
			return toTextBlock(HEADING_NODE_TYPES[node.nodeName], node.childNodes);
		}
		if (Object.hasOwn(LIST_NODE_TYPES, node.nodeName)) {
			return toList(node);
		}
		// Andra element, till exempel div, släpps igenom så att innehållet i dem hamnar bland blocken.
		if (node.childNodes) {
			return toBlockNodes(node.childNodes);
		}
		return [];
	});

export const htmlToRichText = (html) => ({
	content: toBlockNodes(parseFragment(html).childNodes),
	data: {},
	nodeType: "document",
});
