import type { Guide } from "@utpost/shared";
import type { Block, Notice } from "./notices.js";

// Svaret från GET /api/guides/:slug. Texten och notiserna kommer ur CMS:et, så bodyHtml skickas inte med.
export interface GuidePage extends Omit<Guide, "bodyHtml"> {
	body: Block[];
	notices: Notice[];
}
