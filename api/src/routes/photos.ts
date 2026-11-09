import {
	type ApiError,
	PHOTO_MAX_UPLOAD_MB,
	type Photo,
	type PhotoUploadResponse,
	type PhotoVariant,
	type Tour,
	type User,
} from "@utpost/shared";
import express, { type Request, type Response, Router } from "express";
import { config } from "../config.js";
import { pool } from "../db/client.js";
import { requireUser } from "../lib/auth.js";
import {
	ImageFunctionError,
	type ImageFunctionVariant,
	InvalidPhotoError,
	type ProcessedPhoto,
	requestPhotoProcessing,
} from "../lib/imageFunction.ts";
import { removePhoto, savePhotoVariants } from "../lib/photos.ts";

export const photosRouter = Router();

const MAX_UPLOAD_SIZE = `${PHOTO_MAX_UPLOAD_MB}mb`;
const DEFAULT_CONTENT_TYPE = "application/octet-stream";

const getUserId = (request: Request): User["id"] => {
	const { user } = request as Request & { user: Pick<User, "id"> };
	return user.id;
};

const sendError = (response: Response, status: number, message: string) => {
	const body: ApiError = { error: message };
	return response.status(status).json(body);
};

const readTourId = (query: Request["query"]): Tour["id"] | null => {
	const tourId = Number(query["tourId"]);

	if (!Number.isInteger(tourId) || tourId < 1) {
		return null;
	} else {
		return tourId;
	}
};

const findTourOwnerId = async (
	tourId: Tour["id"],
): Promise<Tour["user_id"] | null> => {
	const result = await pool.query<Pick<Tour, "user_id">>(
		"select user_id from tours where id = $1",
		[tourId],
	);
	const tour = result.rows[0];

	if (tour === undefined) {
		return null;
	} else {
		return tour.user_id;
	}
};

const insertPhoto = async (
	tourId: Tour["id"],
	photo: ProcessedPhoto,
): Promise<Photo> => {
	const result = await pool.query<Photo>(
		"insert into photos (tour_id, filename, width, height) values ($1,$2,$3,$4) returning *",
		[tourId, photo.key, photo.width, photo.height],
	);
	const savedPhoto = result.rows[0];

	if (savedPhoto === undefined) {
		throw new Error("bilden sparades inte i databasen");
	} else {
		return savedPhoto;
	}
};

const toPhotoVariant = (variant: ImageFunctionVariant): PhotoVariant => {
	return {
		height: variant.height,
		sizeBytes: variant.sizeBytes,
		width: variant.width,
	};
};

const buildUploadResponse = (
	savedPhoto: Photo,
	processedPhoto: ProcessedPhoto,
	apiMs: number,
): PhotoUploadResponse => {
	return {
		...savedPhoto,
		apiMs,
		coldStart: processedPhoto.coldStart,
		instance: processedPhoto.instance,
		processingMs: processedPhoto.processingMs,
		variants: processedPhoto.variants.map(toPhotoVariant),
	};
};

const saveUploadedPhoto = async (
	tourId: Tour["id"],
	imageBuffer: Buffer,
	contentType: string,
): Promise<PhotoUploadResponse> => {
	const startedAt = performance.now();
	const processedPhoto = await requestPhotoProcessing(imageBuffer, contentType);
	await savePhotoVariants(
		config.uploadDir,
		processedPhoto.key,
		processedPhoto.variants,
	);

	try {
		const savedPhoto = await insertPhoto(tourId, processedPhoto);
		const apiMs = Math.round(performance.now() - startedAt);
		return buildUploadResponse(savedPhoto, processedPhoto, apiMs);
	} catch (error) {
		await removePhoto(config.uploadDir, processedPhoto.key);
		throw error;
	}
};

const sendUploadError = (response: Response, error: unknown) => {
	if (error instanceof InvalidPhotoError) {
		return sendError(response, 400, error.message);
	}

	console.error("Uppladdningen misslyckades:", error);

	if (error instanceof ImageFunctionError) {
		return sendError(response, 502, "bildbehandlingen är inte tillgänglig");
	}

	return sendError(response, 500, "uppladdningen misslyckades");
};

const uploadPhoto = async (request: Request, response: Response) => {
	const tourId = readTourId(request.query);

	if (tourId === null) {
		return sendError(response, 400, "tourId saknas eller är ogiltigt");
	}

	if (!Buffer.isBuffer(request.body) || request.body.length === 0) {
		return sendError(response, 400, "ingen bild skickades");
	}

	try {
		const ownerId = await findTourOwnerId(tourId);

		if (ownerId === null) {
			return sendError(response, 404, "hittades inte");
		}

		if (ownerId !== getUserId(request)) {
			return sendError(response, 403, "inte din tur");
		}

		const uploadResponse = await saveUploadedPhoto(
			tourId,
			request.body,
			request.headers["content-type"] ?? DEFAULT_CONTENT_TYPE,
		);
		return response.json(uploadResponse);
	} catch (error) {
		return sendUploadError(response, error);
	}
};

photosRouter.post(
	"/",
	requireUser,
	express.raw({ limit: MAX_UPLOAD_SIZE, type: "image/*" }),
	uploadPhoto,
);
