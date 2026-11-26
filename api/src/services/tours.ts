import { asc, desc, eq } from "drizzle-orm";
import { config } from "../config/env.ts";
import { db } from "../db/postgres.ts";
import { photos } from "../db/schema/photos/index.ts";
import { tourLogs } from "../db/schema/tour-logs/index.ts";
import {
	TOUR_GUIDE_FOREIGN_KEY,
	type TourRow,
	tours,
} from "../db/schema/tours/index.ts";
import { getForeignKeyViolationConstraint } from "../lib/database-errors.ts";
import { removePhoto } from "../lib/photos.ts";
import { publicUser } from "../lib/public-user.ts";
import type { CreateTourInput } from "../schemas/tours.ts";
import type { TokenUser } from "../types/authentication.ts";
import type {
	CreateTourResult,
	DeleteTourResult,
	TourDetail,
	TourWithRelations,
} from "../types/tours.ts";

const TOUR_LIST_LIMIT = 50;
const LATEST_TOUR_COUNT = 5;

export const listTours = async (): Promise<TourWithRelations[]> => {
	const rows = await db.query.tours.findMany({
		limit: TOUR_LIST_LIMIT,
		orderBy: desc(tours.startedAt),
		with: {
			guide: { columns: { bodyHtml: false } },
			logs: { orderBy: asc(tourLogs.recordedAt) },
			photos: true,
			user: true,
		},
	});
	return rows.map((row) => ({ ...row, user: publicUser(row.user) }));
};

export const listLatestTours = (
	limit: number = LATEST_TOUR_COUNT,
): Promise<TourRow[]> => {
	return db.select().from(tours).orderBy(desc(tours.startedAt)).limit(limit);
};

export const findTour = async (identifier: number): Promise<TourRow | null> => {
	const [tour] = await db.select().from(tours).where(eq(tours.id, identifier));
	if (tour === undefined) {
		return null;
	} else {
		return tour;
	}
};

export const findTourDetail = async (
	identifier: number,
): Promise<TourDetail | null> => {
	const tour = await db.query.tours.findFirst({
		where: eq(tours.id, identifier),
		with: {
			logs: { orderBy: asc(tourLogs.recordedAt) },
			photos: true,
		},
	});
	if (tour === undefined) {
		return null;
	} else {
		return tour;
	}
};

export const createTour = async (
	userId: number,
	input: CreateTourInput,
): Promise<CreateTourResult> => {
	try {
		const [tour] = await db
			.insert(tours)
			.values({ ...input, userId })
			.returning();
		if (tour === undefined) {
			throw new Error("Turen sparades inte");
		} else {
			return { status: "created", tour };
		}
	} catch (error) {
		if (getForeignKeyViolationConstraint(error) === TOUR_GUIDE_FOREIGN_KEY) {
			return { status: "guide-missing" };
		}
		throw error;
	}
};

// Loggar och bilder tas bort av databasen (on delete cascade). Bildfilerna tas bort här, efter att raden är borta.
export const deleteTour = async (
	identifier: number,
	user: TokenUser,
): Promise<DeleteTourResult> => {
	const [tour] = await db
		.select({ userId: tours.userId })
		.from(tours)
		.where(eq(tours.id, identifier));
	if (tour === undefined) {
		return { status: "not-found" };
	}
	if (tour.userId !== user.id && user.role !== "editor") {
		return { status: "forbidden" };
	}

	const tourPhotos = await db
		.select({ filename: photos.filename })
		.from(photos)
		.where(eq(photos.tourId, identifier));
	await db.delete(tours).where(eq(tours.id, identifier));
	for (const photo of tourPhotos) {
		await removePhoto(config.uploadDir, photo.filename);
	}
	return { status: "deleted" };
};
