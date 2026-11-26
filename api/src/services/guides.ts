import { desc, eq, ilike, inArray, or, sql } from "drizzle-orm";
import {
	guideExcerpt,
	publishedGuideBody,
	publishedNotices,
} from "../cms/contentful.js";
import { db } from "../db/postgres.ts";
import { type GuideRow, guides } from "../db/schema/guides/index.ts";
import type { GuideUpdate } from "../schemas/guides.ts";
import type { Notice } from "../types/cms.ts";
import type {
	GuideListRow,
	GuideWithContent,
	GuideWithExcerpt,
} from "../types/guides.ts";

const POPULAR_GUIDE_COUNT = 6;

// bodyHtml skickas inte med, eftersom texten bor i CMS:et. Listorna får ett utdrag i stället.
const guideColumns = {
	authorId: guides.authorId,
	difficulty: guides.difficulty,
	heroImage: guides.heroImage,
	id: guides.id,
	lengthKm: guides.lengthKm,
	published: guides.published,
	region: guides.region,
	slug: guides.slug,
	title: guides.title,
	updatedAt: guides.updatedAt,
};

const addExcerpts = (rows: GuideListRow[]): Promise<GuideWithExcerpt[]> => {
	return Promise.all(
		rows.map(async (row) => ({ ...row, excerpt: await guideExcerpt(row.id) })),
	);
};

// Tecknen % och _ är jokertecken i ett LIKE-mönster. Med ett snedstreck framför söks de som vanlig text.
const escapeLikePattern = (text: string): string => {
	return text.replace(/[\\%_]/g, "\\$&");
};

export const listGuideRows = (): Promise<GuideListRow[]> => {
	return db.select(guideColumns).from(guides).orderBy(desc(guides.updatedAt));
};

export const listPopularGuideRows = (
	limit: number = POPULAR_GUIDE_COUNT,
): Promise<GuideListRow[]> => {
	return db
		.select(guideColumns)
		.from(guides)
		.where(eq(guides.published, true))
		.orderBy(desc(guides.id))
		.limit(limit);
};

export const findGuideRowBySlug = async (
	slug: string,
): Promise<GuideListRow | null> => {
	const [guide] = await db
		.select(guideColumns)
		.from(guides)
		.where(eq(guides.slug, slug));
	if (guide === undefined) {
		return null;
	} else {
		return guide;
	}
};

export const findGuideRowsByIds = (
	ids: readonly number[],
): Promise<GuideListRow[]> => {
	return db
		.select(guideColumns)
		.from(guides)
		.where(inArray(guides.id, [...ids]));
};

export const listRegions = async (): Promise<string[]> => {
	const rows = await db
		.selectDistinct({ region: guides.region })
		.from(guides)
		.orderBy(guides.region);
	return rows.map((row) => row.region);
};

export const listGuides = async (): Promise<GuideWithExcerpt[]> => {
	return addExcerpts(await listGuideRows());
};

export const listPopularGuides = async (): Promise<GuideWithExcerpt[]> => {
	return addExcerpts(await listPopularGuideRows());
};

export const searchGuides = async (
	searchText: string,
): Promise<GuideWithExcerpt[]> => {
	const pattern = `%${escapeLikePattern(searchText)}%`;
	const rows = await db
		.select(guideColumns)
		.from(guides)
		.where(or(ilike(guides.title, pattern), ilike(guides.region, pattern)))
		.orderBy(desc(guides.updatedAt));
	return addExcerpts(rows);
};

export const findGuideWithContent = async (
	slug: string,
): Promise<GuideWithContent | null> => {
	const guide = await findGuideRowBySlug(slug);
	if (guide === null) {
		return null;
	}

	// Är CMS:et nere blir både texten och notiserna tomma, men resten av guiden går att läsa.
	const [body, notices] = await Promise.all([
		publishedGuideBody(guide.id),
		publishedNotices(),
	]);
	return {
		...guide,
		body,
		notices: notices.filter(
			(notice: Notice) => notice.guideSlug === guide.slug,
		),
	};
};

export const updateGuide = async (
	identifier: number,
	update: GuideUpdate,
): Promise<GuideRow | null> => {
	const [guide] = await db
		.update(guides)
		.set({ ...update, updatedAt: sql`now()` })
		.where(eq(guides.id, identifier))
		.returning();
	if (guide === undefined) {
		return null;
	} else {
		return guide;
	}
};
