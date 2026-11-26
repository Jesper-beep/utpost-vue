import { fileURLToPath } from "node:url";
import { asc } from "drizzle-orm";
import type { AnyBulkWriteOperation } from "mongodb";
import type { LogPointDocument, TourDocument } from "../types/tour-logs.ts";
import { mongo, toursCollection } from "./mongo.ts";
import { db, pool } from "./postgres.ts";
import { tourLogs, tours } from "./schema/index.ts";

export const migrateLogs = async (): Promise<void> => {
	const started = Date.now();
	const tourRows = await db.select().from(tours).orderBy(asc(tours.id));
	const logRows = await db
		.select()
		.from(tourLogs)
		.orderBy(asc(tourLogs.tourId), asc(tourLogs.recordedAt));
	if (tourRows.length === 0) {
		throw new Error("Inga turer i Postgres - kör npm run seed först");
	}

	const logsByTour = new Map<number, LogPointDocument[]>();
	for (const log of logRows) {
		const point: LogPointDocument = {
			elevationM: log.elevationM,
			heartRate: log.heartRate,
			lat: log.lat,
			lon: log.lon,
			note: log.note,
			recordedAt: log.recordedAt,
		};
		const points = logsByTour.get(log.tourId);
		if (points) {
			points.push(point);
		} else {
			logsByTour.set(log.tourId, [point]);
		}
	}

	await mongo.connect();
	const collection = toursCollection();
	await collection.createIndex({ tourId: 1 }, { unique: true });

	const operations: AnyBulkWriteOperation<TourDocument>[] = tourRows.map(
		(tour) => {
			let points = logsByTour.get(tour.id);
			if (points === undefined) {
				points = [];
			}
			return {
				replaceOne: {
					filter: { tourId: tour.id },
					replacement: {
						distanceM: tour.distanceM,
						guideId: tour.guideId,
						logs: points,
						notes: tour.notes,
						startedAt: tour.startedAt,
						stats: { points: points.length },
						title: tour.title,
						tourId: tour.id,
						userId: tour.userId,
					},
					upsert: true,
				},
			};
		},
	);
	const result = await collection.bulkWrite(operations, { ordered: false });
	const removed = await collection.deleteMany({
		tourId: { $nin: tourRows.map((tour) => tour.id) },
	});

	const documents = await collection.countDocuments();
	const [totals] = await collection
		.aggregate<{ points: number }>([
			{ $group: { _id: null, points: { $sum: { $size: "$logs" } } } },
		])
		.toArray();
	if (totals === undefined) {
		throw new Error("Hittade inga mätpunkter i MongoDB");
	}

	console.log(
		`Postgres: ${tourRows.length} turer, ${logRows.length} rader i tour_logs`,
	);
	console.log(
		`MongoDB:  ${documents} dokument i tours (${result.upsertedCount} nya, ${result.matchedCount} ersatta, ${removed.deletedCount} borttagna), ${totals.points} mätpunkter`,
	);
	console.log(`Tid: ${Date.now() - started} ms`);
	if (documents !== tourRows.length || totals.points !== logRows.length) {
		throw new Error(
			"Migreringen stämmer inte - antalet dokument eller mätpunkter avviker",
		);
	}
	console.log("Verifierat: inget tappades på vägen.");
};

if (process.argv[1] === fileURLToPath(import.meta.url)) {
	try {
		await migrateLogs();
	} catch (error) {
		if (error instanceof Error) {
			console.error(error.message);
		} else {
			console.error(error);
		}
		process.exitCode = 1;
	} finally {
		await mongo.close();
		await pool.end();
	}
}
