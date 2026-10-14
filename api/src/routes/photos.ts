import {
	type ApiError,
	PHOTO_MAX_UPLOAD_MB,
	type Photo,
	type Tour,
	type User,
} from "@utpost/shared";
import express, { type Request, type Response, Router } from "express";
import { config } from "../config.js";
import { pool } from "../db/client.js";
import { requireUser } from "../lib/auth.js";
import {
	InvalidPhotoError,
	type ProcessedPhoto,
	processPhoto,
	removePhoto,
} from "../lib/photos.ts";

export const photosRouter = Router();

const MAX_UPLOAD_SIZE = `${PHOTO_MAX_UPLOAD_MB}mb`;

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

const saveUploadedPhoto = async (
	tourId: Tour["id"],
	imageBuffer: Buffer,
): Promise<Photo> => {
	const photo = await processPhoto(imageBuffer, config.uploadDir);

	try {
		return await insertPhoto(tourId, photo);
	} catch (error) {
		await removePhoto(config.uploadDir, photo.key);
		throw error;
	}
};

const sendUploadError = (response: Response, error: unknown) => {
	if (error instanceof InvalidPhotoError) {
		return sendError(response, 400, error.message);
	}

	console.error("Uppladdningen misslyckades:", error);
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

		const photo = await saveUploadedPhoto(tourId, request.body);
		return response.json(photo);
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
