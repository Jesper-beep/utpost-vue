// Lokal ersättning för Azure-funktionen process-image (för mätningar utan Azure Functions Core Tools). Använder samma bildbehandling (functions/src/image.js) och ignorerar x-functions-key.

import { createServer } from "node:http";
import { hostname } from "node:os";
import { InvalidPhotoError, processPhoto } from "../functions/src/image.js";

const PORT = 7071;
const IMAGE_PATH = "/api/process-image";

let hasHandledRequest = false;

const readBody = async (request) => {
	const chunks = [];

	for await (const chunk of request) {
		chunks.push(chunk);
	}

	return Buffer.concat(chunks);
};

const sendJson = (response, status, body) => {
	response.writeHead(status, { "Content-Type": "application/json" });
	response.end(JSON.stringify(body));
};

const sendError = (response, status, message) => {
	sendJson(response, status, { error: message });
};

const sendErrorResponse = (response, error) => {
	if (error instanceof InvalidPhotoError) {
		return sendError(response, 400, error.message);
	}

	console.error("process-image misslyckades:", error);
	return sendError(response, 500, "bildbehandlingen misslyckades");
};

const handleProcessImage = async (request, response) => {
	const coldStart = !hasHandledRequest;
	hasHandledRequest = true;
	const imageBuffer = await readBody(request);

	if (imageBuffer.length === 0) {
		return sendError(response, 400, "ingen bild skickades");
	}

	const startedAt = performance.now();

	try {
		const photo = await processPhoto(imageBuffer);
		const processingMs = Math.round(performance.now() - startedAt);

		console.log(
			`process-image: ${photo.variants.length} varianter på ${processingMs} ms, coldStart=${coldStart}`,
		);

		return sendJson(response, 200, {
			...photo,
			coldStart,
			instance: hostname(),
			nodeVersion: process.version,
			processingMs,
		});
	} catch (error) {
		return sendErrorResponse(response, error);
	}
};

const isProcessImageRequest = (request) => {
	if (request.method !== "POST") {
		return false;
	}

	const requestUrl = new URL(request.url, "http://localhost");

	return requestUrl.pathname === IMAGE_PATH;
};

const server = createServer((request, response) => {
	if (isProcessImageRequest(request)) {
		return handleProcessImage(request, response);
	}

	sendJson(response, 404, { error: "finns inte" });
});

server.listen(PORT, () => {
	console.log(`Funktionsstub lyssnar på http://localhost:${PORT}${IMAGE_PATH}`);
});
