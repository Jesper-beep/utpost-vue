import { timingSafeEqual } from "node:crypto";
import { Router } from "express";
import { clearCmsCache } from "../../cms/contentful.js";
import { config } from "../../config/env.ts";

export const cmsRouter = Router();

// Är ingen hemlighet satt på servern kommer ingen in, eftersom en tom sträng aldrig får vara rätt svar.
// Jämförelsen görs i konstant tid, så att svarstiden inte avslöjar hur många tecken som var rätt.
const isSameSecret = (givenSecret: string | string[] | undefined): boolean => {
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
		response.status(401).json({ error: "fel eller ingen webhook-hemlighet" });
		return;
	}
	clearCmsCache();
	const topic = request.headers["x-contentful-topic"];
	let topicName = "okänt ämne";
	if (typeof topic === "string" && topic !== "") {
		topicName = topic;
	}
	console.log(`cms: webhook (${topicName}) – cachen tömd`);
	response.status(204).end();
});
