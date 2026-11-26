import type { GuideRow } from "../db/schema/guides/index.ts";
import type { Block, Notice } from "./cms.ts";

export type GuideListRow = Omit<GuideRow, "bodyHtml">;

export interface GuideWithExcerpt extends GuideListRow {
	excerpt: string;
}

export interface GuideWithContent extends GuideListRow {
	body: Block[];
	notices: Notice[];
}
