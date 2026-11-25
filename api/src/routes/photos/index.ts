import { type ApiError, PHOTO_MAX_UPLOAD_MB } from "@utpost/shared";
import express, {
	type NextFunction,
	type Request,
	type Response,
	Router,
} from "express";
import {
	ImageFunctionError,
	InvalidPhotoError,
} from "../../lib/imageFunction.ts";
import {
	getAuthenticatedUser,
	requireUser,
} from "../../middleware/authentication.ts";
import { uploadQuerySchema } from "../../schemas/photos.ts";
import { findTourForUpload, saveUploadedPhoto } from "../../services/photos.ts";

export const photosRouter = Router();

const MAX_UPLOAD_SIZE = `${PHOTO_MAX_UPLOAD_MB}mb`;
const DEFAULT_CONTENT_TYPE = "application/octet-stream";

const sendError = (
	response: Response,
	status: number,
	message: string,
): void => {
	const body: ApiError = { error: message };
	response.status(status).json(body);
};

const sendUploadError = (response: Response, error: unknown): void => {
	if (error instanceof InvalidPhotoError) {
		sendError(response, 400, error.message);
		return;
	}

	console.error("Uppladdningen misslyckades:", error);

	if (error instanceof ImageFunctionError) {
		sendError(response, 502, "bildbehandlingen är inte tillgänglig");
	} else {
		sendError(response, 500, "uppladdningen misslyckades");
	}
};

// Körs före express.raw, så att ingen bild läses in för en tur som användaren inte får ladda upp till
const checkTourForUpload = async (
	request: Request,
	response: Response,
	next: NextFunction,
): Promise<void> => {
	const parsedQuery = uploadQuerySchema.safeParse(request.query);
	if (!parsedQuery.success) {
		sendError(response, 400, "tourId saknas eller är ogiltigt");
		return;
	}

	try {
		const tour = await findTourForUpload(parsedQuery.data.tourId);
		if (tour === null) {
			sendError(response, 404, "hittades inte");
			return;
		}
		if (tour.userId !== getAuthenticatedUser(request).id) {
			sendError(response, 403, "inte din tur");
			return;
		}
		if (tour.hasPhoto) {
			sendError(response, 409, "turen har redan en bild");
			return;
		}
	} catch (error) {
		sendUploadError(response, error);
		return;
	}

	next();
};

const uploadPhoto = async (
	request: Request,
	response: Response,
): Promise<void> => {
	const { tourId } = uploadQuerySchema.parse(request.query);

	if (!Buffer.isBuffer(request.body) || request.body.length === 0) {
		sendError(response, 400, "ingen bild skickades");
		return;
	}

	try {
		const result = await saveUploadedPhoto(
			tourId,
			request.body,
			request.headers["content-type"] ?? DEFAULT_CONTENT_TYPE,
		);
		if (result.status === "conflict") {
			sendError(response, 409, "turen har redan en bild");
			return;
		}
		response.json(result.response);
	} catch (error) {
		sendUploadError(response, error);
	}
};

photosRouter.post(
	"/",
	requireUser,
	checkTourForUpload,
	express.raw({ limit: MAX_UPLOAD_SIZE, type: "image/*" }),
	uploadPhoto,
);
