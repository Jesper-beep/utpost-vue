import { Router } from "express";
import {
	guideExcerpt,
	publishedGuideBody,
	publishedNotices,
} from "../cms/contentful.js";
import { pool } from "../db/client.js";
import { requireRole, requireUser } from "../lib/auth.js";
import { guideUpdateSchema, idParam, searchSchema } from "../lib/schemas.js";
import { validate } from "../lib/validate.js";

export const guidesRouter = Router();

// body_html skickas inte med, eftersom texten bor i CMS:et. Listorna får ett utdrag i stället.
const GUIDE_COLUMNS =
	"id, slug, title, region, difficulty, length_km, hero_image, published, author_id, updated_at";

const withExcerpts = (rows) =>
	Promise.all(
		rows.map(async (row) => ({ ...row, excerpt: await guideExcerpt(row.id) })),
	);

guidesRouter.get("/", async (_request, response) => {
	const result = await pool.query(
		`select ${GUIDE_COLUMNS} from guides order by updated_at desc`,
	);
	response.json(await withExcerpts(result.rows));
});

guidesRouter.get("/regions", async (_request, response) => {
	const result = await pool.query(
		"select distinct region from guides order by region",
	);
	response.json(result.rows.map((row) => row.region));
});

guidesRouter.get("/popular", async (_request, response) => {
	const result = await pool.query(
		`select ${GUIDE_COLUMNS} from guides where published = true order by id desc limit 6`,
	);
	response.json(await withExcerpts(result.rows));
});

guidesRouter.get(
	"/search",
	validate(searchSchema, "query"),
	async (request, response) => {
		const { q: searchText } = request.validQuery;
		const result = await pool.query(
			`select ${GUIDE_COLUMNS} from guides where title ilike $1 or region ilike $1 order by updated_at desc`,
			[`%${searchText}%`],
		);
		response.json(await withExcerpts(result.rows));
	},
);

guidesRouter.get("/:slug", async (request, response) => {
	const result = await pool.query(
		`select ${GUIDE_COLUMNS} from guides where slug = $1`,
		[request.params.slug],
	);
	const guide = result.rows[0];
	if (!guide) {
		return response.status(404).json({ error: "hittades inte" });
	}
	// Är CMS:et nere blir både texten och notiserna tomma, men resten av guiden går att läsa.
	const [body, notices] = await Promise.all([
		publishedGuideBody(guide.id),
		publishedNotices(),
	]);
	response.json({
		...guide,
		body,
		notices: notices.filter((notice) => notice.guideSlug === guide.slug),
	});
});

guidesRouter.put(
	"/:id",
	requireUser,
	requireRole("editor"),
	validate(guideUpdateSchema),
	async (request, response) => {
		const parsedId = idParam.safeParse(request.params.id);
		if (!parsedId.success) {
			return response.status(400).json({ error: "ogiltigt id" });
		}
		const { title, region, difficulty, lengthKm, bodyHtml, published } =
			request.body;
		const result = await pool.query(
			`update guides set title=$1, region=$2, difficulty=$3, length_km=$4, body_html=$5,
     published=$6, updated_at=now() where id=$7 returning *`,
			[title, region, difficulty, lengthKm, bodyHtml, published, parsedId.data],
		);
		if (!result.rows[0]) {
			return response.status(404).json({ error: "hittades inte" });
		}
		response.json(result.rows[0]);
	},
);
