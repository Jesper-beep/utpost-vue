import { hostname } from "node:os";
import { app } from "@azure/functions";
import { InvalidPhotoError, processPhoto } from "./image.js";

let isFirstInvocationInProcess = true;

const consumeColdStartFlag = () => {
	const wasColdStart = isFirstInvocationInProcess;
	isFirstInvocationInProcess = false;
	return wasColdStart;
};

const readInstanceName = () => {
	return process.env["WEBSITE_INSTANCE_ID"] ?? hostname();
};

const createErrorResponse = (status, message) => {
	return { jsonBody: { error: message }, status };
};

const createFailureResponse = (error, context) => {
	if (error instanceof InvalidPhotoError) {
		return createErrorResponse(400, error.message);
	}

	context.error("process-image misslyckades:", error);
	return createErrorResponse(500, "bildbehandlingen misslyckades");
};

const processImage = async (request, context) => {
	const coldStart = consumeColdStartFlag();
	const imageBuffer = Buffer.from(await request.arrayBuffer());

	if (imageBuffer.length === 0) {
		return createErrorResponse(400, "ingen bild skickades");
	}

	const startedAt = performance.now();

	try {
		const photo = await processPhoto(imageBuffer);
		const processingMs = Math.round(performance.now() - startedAt);

		context.log(
			`process-image: ${photo.variants.length} varianter på ${processingMs} ms, coldStart=${coldStart}`,
		);

		return {
			jsonBody: {
				...photo,
				coldStart,
				instance: readInstanceName(),
				nodeVersion: process.version,
				processingMs,
			},
		};
	} catch (error) {
		return createFailureResponse(error, context);
	}
};

app.http("process-image", {
	authLevel: "function",
	handler: processImage,
	methods: ["POST"],
});
