import { Router } from "express";
import { requireUser } from "../../middleware/authentication.ts";
import { requireRole } from "../../middleware/authorization.ts";
import { idSchema } from "../../schemas/common.ts";
import { guideUpdateSchema, searchSchema } from "../../schemas/guides.ts";
import {
	findGuideWithContent,
	listGuides,
	listPopularGuides,
	listRegions,
	searchGuides,
	updateGuide,
} from "../../services/guides.ts";

export const guidesRouter = Router();

guidesRouter.get("/", async (_request, response) => {
	response.json(await listGuides());
});

guidesRouter.get("/regions", async (_request, response) => {
	response.json(await listRegions());
});

guidesRouter.get("/popular", async (_request, response) => {
	response.json(await listPopularGuides());
});

guidesRouter.get("/search", async (request, response) => {
	const { q: searchText } = searchSchema.parse(request.query);
	response.json(await searchGuides(searchText));
});

guidesRouter.get("/:slug", async (request, response) => {
	const guide = await findGuideWithContent(request.params.slug);
	if (guide === null) {
		response.status(404).json({ error: "hittades inte" });
		return;
	}
	response.json(guide);
});

guidesRouter.put(
	"/:id",
	requireUser,
	requireRole("editor"),
	async (request, response) => {
		const parsedId = idSchema.safeParse(request.params["id"]);
		if (!parsedId.success) {
			response.status(400).json({ error: "ogiltigt id" });
			return;
		}
		const update = guideUpdateSchema.parse(request.body);
		const guide = await updateGuide(parsedId.data, update);
		if (guide === null) {
			response.status(404).json({ error: "hittades inte" });
			return;
		}
		response.json(guide);
	},
);
