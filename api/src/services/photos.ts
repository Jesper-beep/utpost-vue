import type { PhotoUploadResponse, PhotoVariant } from "@utpost/shared";
import { eq, inArray } from "drizzle-orm";
import { config } from "../config/env.ts";
import { db } from "../db/postgres.ts";
import {
	PHOTO_TOUR_UNIQUE_CONSTRAINT,
	type PhotoRow,
	photos,
} from "../db/schema/photos/index.ts";
import { tours } from "../db/schema/tours/index.ts";
import { getUniqueViolationConstraint } from "../lib/database-errors.ts";
import {
	type ImageFunctionVariant,
	type ProcessedPhoto,
	requestPhotoProcessing,
} from "../lib/imageFunction.ts";
import { removePhoto, savePhotoVariants } from "../lib/photos.ts";
import type {
	InsertPhotoResult,
	TourForUpload,
	UploadPhotoResult,
} from "../types/photos.ts";

export const findTourForUpload = async (
	tourId: number,
): Promise<TourForUpload | null> => {
	const tour = await db.query.tours.findFirst({
		columns: { userId: true },
		where: eq(tours.id, tourId),
		with: { photos: { columns: { id: true } } },
	});
	if (tour === undefined) {
		return null;
	} else {
		return { hasPhoto: tour.photos.length > 0, userId: tour.userId };
	}
};

export const findPhotosByTourIds = (
	tourIds: readonly number[],
): Promise<PhotoRow[]> => {
	return db
		.select()
		.from(photos)
		.where(inArray(photos.tourId, [...tourIds]))
		.orderBy(photos.id);
};

// Den unika kontrollen i databasen stoppar två uppladdningar som pågår samtidigt för samma tur.
const insertPhoto = async (
	tourId: number,
	photo: ProcessedPhoto,
): Promise<InsertPhotoResult> => {
	try {
		const [savedPhoto] = await db
			.insert(photos)
			.values({
				filename: photo.key,
				height: photo.height,
				tourId,
				width: photo.width,
			})
			.returning();
		if (savedPhoto === undefined) {
			throw new Error("bilden sparades inte i databasen");
		} else {
			return { photo: savedPhoto, status: "saved" };
		}
	} catch (error) {
		if (getUniqueViolationConstraint(error) === PHOTO_TOUR_UNIQUE_CONSTRAINT) {
			return { status: "conflict" };
		}
		throw error;
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
	savedPhoto: PhotoRow,
	processedPhoto: ProcessedPhoto,
	apiMs: number,
): PhotoUploadResponse => {
	return {
		...savedPhoto,
		apiMs,
		coldStart: processedPhoto.coldStart,
		createdAt: savedPhoto.createdAt.toISOString(),
		instance: processedPhoto.instance,
		processingMs: processedPhoto.processingMs,
		variants: processedPhoto.variants.map(toPhotoVariant),
	};
};

export const saveUploadedPhoto = async (
	tourId: number,
	imageBuffer: Buffer,
	contentType: string,
): Promise<UploadPhotoResult> => {
	const startedAt = performance.now();
	const processedPhoto = await requestPhotoProcessing(imageBuffer, contentType);
	await savePhotoVariants(
		config.uploadDir,
		processedPhoto.key,
		processedPhoto.variants,
	);

	let result: InsertPhotoResult;
	try {
		result = await insertPhoto(tourId, processedPhoto);
	} catch (error) {
		await removePhoto(config.uploadDir, processedPhoto.key);
		throw error;
	}

	if (result.status === "conflict") {
		await removePhoto(config.uploadDir, processedPhoto.key);
		return { status: "conflict" };
	}
	const apiMs = Math.round(performance.now() - startedAt);
	return {
		response: buildUploadResponse(result.photo, processedPhoto, apiMs),
		status: "saved",
	};
};
