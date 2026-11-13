import { Router } from "express";
import { pool } from "../db/client.js";
import { publicUser, requireUser } from "../lib/auth.js";
import { createTourSchema, idParam } from "../lib/schemas.js";
import { validate } from "../lib/validate.js";
import { wrap } from "../lib/wrap.js";

export const toursRouter = Router();

toursRouter.get(
	"/",
	wrap(async (_req, res) => {
		const tours = await pool.query(
			"select * from tours order by started_at desc limit 50",
		);

		const out = [];
		for (const tour of tours.rows) {
			const user = await pool.query("select * from users where id = $1", [
				tour.user_id,
			]);
			const guide = tour.guide_id
				? await pool.query("select * from guides where id = $1", [
						tour.guide_id,
					])
				: { rows: [] };
			const photos = await pool.query(
				"select * from photos where tour_id = $1",
				[tour.id],
			);
			const logs = await pool.query(
				"select * from tour_logs where tour_id = $1 order by recorded_at",
				[tour.id],
			);
			out.push({
				...tour,
				guide: guide.rows[0] || null,
				logs: logs.rows,
				photos: photos.rows,
				user: publicUser(user.rows[0]),
			});
		}

		res.json(out);
	}),
);

toursRouter.get(
	"/latest",
	wrap(async (_req, res) => {
		const result = await pool.query(
			"select * from tours order by started_at desc limit 5",
		);
		res.json(result.rows);
	}),
);

toursRouter.get(
	"/:id",
	wrap(async (req, res) => {
		const parsedId = idParam.safeParse(req.params.id);
		if (!parsedId.success)
			return res.status(400).json({ error: "ogiltigt id" });
		const tour = await pool.query("select * from tours where id = $1", [
			parsedId.data,
		]);
		if (!tour.rows[0]) return res.status(404).json({ error: "hittades inte" });
		const logs = await pool.query(
			"select * from tour_logs where tour_id = $1 order by recorded_at",
			[parsedId.data],
		);
		const photos = await pool.query("select * from photos where tour_id = $1", [
			parsedId.data,
		]);
		res.json({ ...tour.rows[0], logs: logs.rows, photos: photos.rows });
	}),
);

toursRouter.post(
	"/",
	requireUser,
	validate(createTourSchema),
	wrap(async (req, res) => {
		const { title, guideId, startedAt, distanceM, notes } = req.body;
		const result = await pool.query(
			`insert into tours (user_id, guide_id, title, started_at, distance_m, notes)
     values ($1,$2,$3,$4,$5,$6) returning *`,
			[req.user.id, guideId || null, title, startedAt, distanceM, notes],
		);
		res.json(result.rows[0]);
	}),
);

toursRouter.delete(
	"/:id",
	requireUser,
	wrap(async (req, res) => {
		const parsedId = idParam.safeParse(req.params.id);
		if (!parsedId.success)
			return res.status(400).json({ error: "ogiltigt id" });
		const tour = await pool.query(
			"select id, user_id from tours where id = $1",
			[parsedId.data],
		);
		if (!tour.rows[0]) return res.status(404).json({ error: "hittades inte" });
		if (tour.rows[0].user_id !== req.user.id && req.user.role !== "editor") {
			return res.status(403).json({ error: "inte din tur" });
		}
		await pool.query("delete from tour_logs where tour_id = $1", [
			parsedId.data,
		]);
		await pool.query("delete from photos where tour_id = $1", [parsedId.data]);
		await pool.query("delete from tours where id = $1", [parsedId.data]);
		res.json({ ok: true });
	}),
);
