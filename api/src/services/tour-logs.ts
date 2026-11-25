import { toursCollection } from "../db/mongo.ts";
import { countQuery } from "../lib/query-stats.ts";
import type { LogPointDocument } from "../types/tour-logs.ts";

// Mätpunkterna bor i MongoDB, ett dokument per tur. Hämtningen räknas som en databasfråga.
export const findLogsByTourIds = async (
	tourIds: readonly number[],
): Promise<Map<number, LogPointDocument[]>> => {
	countQuery();
	const documents = await toursCollection()
		.find(
			{ tourId: { $in: [...tourIds] } },
			{ projection: { logs: 1, tourId: 1 } },
		)
		.toArray();
	return new Map(documents.map((document) => [document.tourId, document.logs]));
};
