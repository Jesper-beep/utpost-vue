import { pool } from "./client.js";
import { mongo, toursCollection } from "./mongo.js";

const run = async () => {
	const started = Date.now();
	const tours = (await pool.query("select * from tours order by id")).rows;
	const logs = (
		await pool.query("select * from tour_logs order by tour_id, recorded_at")
	).rows;
	if (tours.length === 0) {
		throw new Error("Inga turer i Postgres – kör npm run seed först");
	}

	const logsByTour = new Map();
	for (const log of logs) {
		const point = {
			elevation_m: log.elevation_m,
			heart_rate: log.heart_rate,
			lat: log.lat,
			lon: log.lon,
			note: log.note,
			recorded_at: log.recorded_at,
		};
		const points = logsByTour.get(log.tour_id);
		if (points) {
			points.push(point);
		} else {
			logsByTour.set(log.tour_id, [point]);
		}
	}

	await mongo.connect();
	const collection = toursCollection();
	await collection.createIndex({ tour_id: 1 }, { unique: true });

	const result = await collection.bulkWrite(
		tours.map((tour) => {
			const points = logsByTour.get(tour.id) ?? [];
			return {
				replaceOne: {
					filter: { tour_id: tour.id },
					replacement: {
						distance_m: tour.distance_m,
						guide_id: tour.guide_id,
						logs: points,
						notes: tour.notes,
						started_at: tour.started_at,
						stats: { points: points.length },
						title: tour.title,
						tour_id: tour.id,
						user_id: tour.user_id,
					},
					upsert: true,
				},
			};
		}),
		{ ordered: false },
	);
	const removed = await collection.deleteMany({
		tour_id: { $nin: tours.map((tour) => tour.id) },
	});

	const documents = await collection.countDocuments();
	const [{ points }] = await collection
		.aggregate([
			{ $group: { _id: null, points: { $sum: { $size: "$logs" } } } },
		])
		.toArray();

	console.log(
		`Postgres: ${tours.length} turer, ${logs.length} rader i tour_logs`,
	);
	console.log(
		`MongoDB:  ${documents} dokument i tours (${result.upsertedCount} nya, ${result.matchedCount} ersatta, ${removed.deletedCount} borttagna), ${points} mätpunkter`,
	);
	console.log(`Tid: ${Date.now() - started} ms`);
	if (documents !== tours.length || points !== logs.length) {
		throw new Error(
			"Migreringen stämmer inte – antalet dokument eller mätpunkter avviker",
		);
	}
	console.log("Verifierat: inget tappades på vägen.");
	await mongo.close();
	await pool.end();
};

run().catch((error) => {
	console.error(error.message);
	process.exit(1);
});
