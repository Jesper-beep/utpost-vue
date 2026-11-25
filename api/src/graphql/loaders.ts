import DataLoader from "dataloader";
import { findGuideRowsByIds } from "../services/guides.ts";
import { findPhotosByTourIds } from "../services/photos.ts";
import { findLogsByTourIds } from "../services/tour-logs.ts";
import { findUsersByIds } from "../services/users.ts";
import type { Loaders } from "../types/graphql.ts";

// DataLoader kräver ett svar per nyckel, i samma ordning som nycklarna.
const byId = <T extends { id: number }>(
	rows: T[],
	ids: readonly number[],
): (T | null)[] => {
	const rowsById = new Map(rows.map((row) => [row.id, row]));
	return ids.map((id) => {
		const row = rowsById.get(id);
		if (row === undefined) {
			return null;
		} else {
			return row;
		}
	});
};

const groupByTour = <T extends { tourId: number }>(
	rows: T[],
	tourIds: readonly number[],
): T[][] => {
	const groups = new Map<number, T[]>();
	for (const row of rows) {
		const group = groups.get(row.tourId);
		if (group) {
			group.push(row);
		} else {
			groups.set(row.tourId, [row]);
		}
	}
	return tourIds.map((tourId) => {
		const group = groups.get(tourId);
		if (group === undefined) {
			return [];
		} else {
			return group;
		}
	});
};

export const createLoaders = (): Loaders => {
	return {
		guide: new DataLoader(async (ids) =>
			byId(await findGuideRowsByIds(ids), ids),
		),
		logs: new DataLoader(async (tourIds) => {
			const logsByTour = await findLogsByTourIds(tourIds);
			return tourIds.map((tourId) => {
				const logs = logsByTour.get(tourId);
				if (logs === undefined) {
					return [];
				} else {
					return logs;
				}
			});
		}),
		photos: new DataLoader(async (tourIds) =>
			groupByTour(await findPhotosByTourIds(tourIds), tourIds),
		),
		user: new DataLoader(async (ids) => byId(await findUsersByIds(ids), ids)),
	};
};
