import type { Block } from "./notices.js";

export type GroupKind =
	| "paragraph"
	| "heading-2"
	| "heading-3"
	| "bullet-list"
	| "number-list";

export interface BlockGroup {
	kind: GroupKind;
	blocks: Block[];
}

const GROUP_KINDS: Record<string, GroupKind> = {
	"bullet-item": "bullet-list",
	"heading-2": "heading-2",
	"heading-3": "heading-3",
	"number-item": "number-list",
	paragraph: "paragraph",
};

// En sort som klienten inte känner till visas som ett stycke.
const getGroupKind = (block: Block): GroupKind => {
	const groupKind = GROUP_KINDS[block.kind];
	if (!groupKind) {
		return "paragraph";
	}
	return groupKind;
};

export const isListKind = (kind: GroupKind): boolean => {
	if (kind === "bullet-list" || kind === "number-list") {
		return true;
	}
	return false;
};

// API:et skickar varje listpunkt som ett eget block. Här läggs punkter som står efter varandra i samma lista.
export const groupBlocks = (blocks: Block[]): BlockGroup[] => {
	const groups: BlockGroup[] = [];
	for (const block of blocks) {
		const kind = getGroupKind(block);
		const lastGroup = groups.at(-1);
		if (lastGroup && isListKind(kind) && lastGroup.kind === kind) {
			lastGroup.blocks.push(block);
		} else {
			groups.push({ blocks: [block], kind });
		}
	}
	return groups;
};
