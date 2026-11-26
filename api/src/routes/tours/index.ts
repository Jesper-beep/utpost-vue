import { Router } from "express";
import {
	getAuthenticatedUser,
	requireUser,
} from "../../middleware/authentication.ts";
import { idSchema } from "../../schemas/common.ts";
import { createTourSchema } from "../../schemas/tours.ts";
import {
	createTour,
	deleteTour,
	findTourDetail,
	listLatestTours,
	listTours,
} from "../../services/tours.ts";

export const toursRouter = Router();

toursRouter.get("/", async (_request, response) => {
	response.json(await listTours());
});

toursRouter.get("/latest", async (_request, response) => {
	response.json(await listLatestTours());
});

toursRouter.get("/:id", async (request, response) => {
	const parsedId = idSchema.safeParse(request.params["id"]);
	if (!parsedId.success) {
		response.status(400).json({ error: "ogiltigt id" });
		return;
	}
	const tour = await findTourDetail(parsedId.data);
	if (tour === null) {
		response.status(404).json({ error: "hittades inte" });
		return;
	}
	response.json(tour);
});

toursRouter.post("/", requireUser, async (request, response) => {
	const input = createTourSchema.parse(request.body);
	const result = await createTour(getAuthenticatedUser(request).id, input);
	if (result.status === "guide-missing") {
		response.status(400).json({ error: "guiden finns inte" });
		return;
	}
	response.json(result.tour);
});

toursRouter.delete("/:id", requireUser, async (request, response) => {
	const parsedId = idSchema.safeParse(request.params["id"]);
	if (!parsedId.success) {
		response.status(400).json({ error: "ogiltigt id" });
		return;
	}
	const result = await deleteTour(parsedId.data, getAuthenticatedUser(request));
	if (result.status === "not-found") {
		response.status(404).json({ error: "hittades inte" });
		return;
	}
	if (result.status === "forbidden") {
		response.status(403).json({ error: "inte din tur" });
		return;
	}
	response.json({ ok: true });
});
