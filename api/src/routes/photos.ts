import {
	type ApiError,
	PHOTO_MAX_UPLOAD_MB,
	type Photo,
	type PhotoUploadResponse,
	type PhotoVariant,
	type Tour,
	type User,
} from "@utpost/shared";
import express, {
	type NextFunction,
	type Request,
	type Response,
	Router,
} from "express";
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
const TOUR_ID_PATTERN = /^[1-9]\d*$/;
const MAX_TOUR_ID = 2_147_483_647;

interface TourForUpload {
	photoCount: number;
	userId: Tour["user_id"];
}

const getUserId = (request: Request): User["id"] => {
	const { user } = request as Request & { user: Pick<User, "id"> };
	return user.id;
};

const sendError = (response: Response, status: number, message: string) => {
	const body: ApiError = { error: message };
	return response.status(status).json(body);
};

// Bara siffror utan inledande nolla. Number() skulle också godta 1e0 och 0x1
const readTourId = (query: Request["query"]): Tour["id"] | null => {
	const value = query["tourId"];

	if (typeof value !== "string" || !TOUR_ID_PATTERN.test(value)) {
		return null;
	}

	const tourId = Number(value);

	if (tourId > MAX_TOUR_ID) {
		return null;
	} else {
		return tourId;
	}
};

const findTourForUpload = async (
	tourId: Tour["id"],
): Promise<TourForUpload | null> => {
	const result = await pool.query<{ photo_count: number; user_id: number }>(
		`select user_id, (select count(*)::int from photos where tour_id = $1) as photo_count
		 from tours where id = $1`,
		[tourId],
	);
	const row = result.rows[0];

	if (row === undefined) {
		return null;
	} else {
		return { photoCount: row.photo_count, userId: row.user_id };
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

// Körs före express.raw, så att ingen bild läses in för en tur som användaren inte får ladda upp till
const checkTourForUpload = async (
	request: Request,
	response: Response,
	next: NextFunction,
) => {
	const tourId = readTourId(request.query);

	if (tourId === null) {
		return sendError(response, 400, "tourId saknas eller är ogiltigt");
	}

	try {
		const tour = await findTourForUpload(tourId);

		if (tour === null) {
			return sendError(response, 404, "hittades inte");
		}

		if (tour.userId !== getUserId(request)) {
			return sendError(response, 403, "inte din tur");
		}

		if (tour.photoCount > 0) {
			return sendError(response, 409, "turen har redan en bild");
		}

		response.locals["tourId"] = tourId;
		return next();
	} catch (error) {
		return sendUploadError(response, error);
	}
};

const uploadPhoto = async (request: Request, response: Response) => {
	const tourId: Tour["id"] = response.locals["tourId"];

	if (!Buffer.isBuffer(request.body) || request.body.length === 0) {
		return sendError(response, 400, "ingen bild skickades");
	}

	try {
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
	checkTourForUpload,
	express.raw({ limit: MAX_UPLOAD_SIZE, type: "image/*" }),
	uploadPhoto,
);
