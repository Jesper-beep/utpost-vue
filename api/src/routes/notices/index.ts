import { Router } from "express";
import { previewNotices, publishedNotices } from "../../cms/contentful.js";
import { requireUser } from "../../middleware/authentication.ts";
import { requireRole } from "../../middleware/authorization.ts";

export const noticesRouter = Router();

noticesRouter.get("/", async (_request, response) => {
	response.json(await publishedNotices());
});

// Utkast får bara redaktionen se. Rollen kontrolleras här på servern, som också håller preview-nyckeln.
noticesRouter.get(
	"/preview",
	requireUser,
	requireRole("editor"),
	async (_request, response) => {
		response.json(await previewNotices());
	},
);
