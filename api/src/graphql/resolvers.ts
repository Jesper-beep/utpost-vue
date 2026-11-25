// https://github.com/jonatanhallenberg/utpost-graphql-labb/blob/main/api/src/graphql/resolvers.js

import { GraphQLError } from "graphql";
import type { TourRow } from "../db/schema/tours/index.ts";
import { idSchema } from "../schemas/common.ts";
import {
	findGuideRowBySlug,
	listGuideRows,
	listPopularGuideRows,
	listRegions,
} from "../services/guides.ts";
import { findTour, listLatestTours } from "../services/tours.ts";
import type { Notice } from "../types/cms.ts";
import type { GraphQLContext } from "../types/graphql.ts";
import type { GuideListRow } from "../types/guides.ts";
import type { LogPointDocument } from "../types/tour-logs.ts";

const MAX_LIMIT = 200;

const iso = (date: Date): string => {
	return date.toISOString();
};

const clampLimit = (limit: number): number => {
	return Math.max(0, Math.min(limit, MAX_LIMIT));
};

const readIdentifier = (value: string): number => {
	const parsedId = idSchema.safeParse(value);
	if (parsedId.success) {
		return parsedId.data;
	} else {
		throw new GraphQLError("ogiltigt id", {
			extensions: { code: "BAD_USER_INPUT" },
		});
	}
};

export const resolvers = {
	Guide: {
		excerpt: (
			guide: GuideListRow,
			_arguments: unknown,
			{ cms }: GraphQLContext,
		) => cms.guideExcerpt(guide.id),
		// Guiden bor i Postgres och notisen i CMS:et. Fältet guideSlug på notisen kopplar ihop dem.
		notices: async (
			guide: GuideListRow,
			_arguments: unknown,
			{ cms }: GraphQLContext,
		) =>
			(await cms.notices()).filter(
				(notice: Notice) => notice.guideSlug === guide.slug,
			),
		updatedAt: (guide: GuideListRow) => iso(guide.updatedAt),
	},

	LogPoint: {
		recordedAt: (log: LogPointDocument) => iso(log.recordedAt),
	},

	Query: {
		guide: (_parent: unknown, { slug }: { slug: string }) =>
			findGuideRowBySlug(slug),
		guides: () => listGuideRows(),
		// Utkast får bara redaktionen se. Rollen kontrolleras här, på servern, som också håller preview-nyckeln.
		notices: async (
			_parent: unknown,
			{ preview }: { preview: boolean },
			{ cms, user }: GraphQLContext,
		) => {
			if (!preview) {
				return cms.notices();
			}
			if (user?.role !== "editor") {
				throw new GraphQLError("Förhandsgranskningen kräver rollen editor", {
					extensions: { code: "FORBIDDEN" },
				});
			}
			return cms.previewNotices();
		},
		popularGuides: (_parent: unknown, { limit }: { limit: number }) =>
			listPopularGuideRows(clampLimit(limit)),
		regions: () => listRegions(),
		tour: (_parent: unknown, { id }: { id: string }) =>
			findTour(readIdentifier(id)),
		tours: (_parent: unknown, { limit }: { limit: number }) =>
			listLatestTours(clampLimit(limit)),
	},

	Tour: {
		guide: (
			tour: TourRow,
			_arguments: unknown,
			{ loaders }: GraphQLContext,
		) => {
			if (tour.guideId === null) {
				return null;
			} else {
				return loaders.guide.load(tour.guideId);
			}
		},
		logs: (tour: TourRow, _arguments: unknown, { loaders }: GraphQLContext) =>
			loaders.logs.load(tour.id),
		photos: (tour: TourRow, _arguments: unknown, { loaders }: GraphQLContext) =>
			loaders.photos.load(tour.id),
		startedAt: (tour: TourRow) => iso(tour.startedAt),
		user: (tour: TourRow, _arguments: unknown, { loaders }: GraphQLContext) =>
			loaders.user.load(tour.userId),
	},
};
