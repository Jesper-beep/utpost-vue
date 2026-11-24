import { timingSafeEqual } from "node:crypto";
import { Router } from "express";
import { clearCmsCache } from "../cms/contentful.js";
import { config } from "../config.js";

export const cmsRouter = Router();

// Är ingen hemlighet satt på servern kommer ingen in, eftersom en tom sträng aldrig får vara rätt svar.
// Jämförelsen görs i konstant tid, så att svarstiden inte avslöjar hur många tecken som var rätt.
const isSameSecret = (givenSecret) => {
	if (typeof givenSecret !== "string") {
		return false;
	}
	const given = Buffer.from(givenSecret);
	const expected = Buffer.from(config.cmsWebhookSecret);
	if (expected.length === 0 || given.length !== expected.length) {
		return false;
	}
	return timingSafeEqual(given, expected);
};

// Contentful anropar adressen när en post publiceras eller slutar vara publicerad. Adressen är publik, så den kräver hemligheten i en header.
cmsRouter.post("/webhook", (request, response) => {
	if (!isSameSecret(request.headers["x-utpost-webhook-secret"])) {
		return response
			.status(401)
			.json({ error: "fel eller ingen webhook-hemlighet" });
	}
	clearCmsCache();
	let topic = request.headers["x-contentful-topic"];
	if (!topic) {
		topic = "okänt ämne";
	}
	console.log(`cms: webhook (${topic}) – cachen tömd`);
	response.status(204).end();
});
