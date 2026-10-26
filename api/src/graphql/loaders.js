import DataLoader from "dataloader";

const byId = (rows, ids) => {
	const rowsById = new Map(rows.map((row) => [row.id, row]));
	return ids.map((id) => rowsById.get(id) ?? null);
};

const groupBy = (rows, key, ids) => {
	const groups = new Map();
	for (const row of rows) {
		const group = groups.get(row[key]);
		if (group) {
			group.push(row);
		} else {
			groups.set(row[key], [row]);
		}
	}
	return ids.map((id) => groups.get(id) ?? []);
};

export const createLoaders = ({ findTours, query }) => ({
	guide: new DataLoader(async (ids) =>
		byId(
			(await query("select * from guides where id = any($1)", [ids])).rows,
			ids,
		),
	),
	logs: new DataLoader(async (tourIds) => {
		const documents = await findTours(
			{ tour_id: { $in: tourIds } },
			{ logs: 1, tour_id: 1 },
		);
		const logsByTour = new Map(
			documents.map((document) => [document.tour_id, document.logs]),
		);
		return tourIds.map((id) => logsByTour.get(id) ?? []);
	}),
	photos: new DataLoader(async (tourIds) =>
		groupBy(
			(
				await query(
					"select * from photos where tour_id = any($1) order by id",
					[tourIds],
				)
			).rows,
			"tour_id",
			tourIds,
		),
	),
	user: new DataLoader(async (ids) =>
		byId(
			(await query("select * from users where id = any($1)", [ids])).rows,
			ids,
		),
	),
});
