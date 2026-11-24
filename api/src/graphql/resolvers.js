// https://github.com/jonatanhallenberg/utpost-graphql-labb/blob/main/api/src/graphql/resolvers.js

import { GraphQLError } from "graphql";

const iso = (date) => new Date(date).toISOString();

export const resolvers = {
	Guide: {
		excerpt: (guide, _args, { cms }) => cms.guideExcerpt(guide.id),
		heroImage: (guide) => guide.hero_image,
		lengthKm: (guide) => guide.length_km,
		// Guiden bor i Postgres och notisen i CMS:et. Fältet guideSlug på notisen kopplar ihop dem.
		notices: async (guide, _args, { cms }) =>
			(await cms.notices()).filter((notice) => notice.guideSlug === guide.slug),
		updatedAt: (guide) => iso(guide.updated_at),
	},

	LogPoint: {
		elevationM: (log) => log.elevation_m,
		heartRate: (log) => log.heart_rate,
		recordedAt: (log) => iso(log.recorded_at),
	},

	Query: {
		guide: async (_parent, { slug }, { query }) =>
			(await query("select * from guides where slug = $1", [slug])).rows[0] ??
			null,
		guides: async (_parent, _args, { query }) =>
			(await query("select * from guides order by updated_at desc")).rows,
		// Utkast får bara redaktionen se. Rollen kontrolleras här, på servern, som också håller preview-nyckeln.
		notices: async (_parent, { preview }, { cms, user }) => {
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
		popularGuides: async (_parent, { limit }, { query }) =>
			(
				await query(
					"select * from guides where published = true order by id desc limit $1",
					[limit],
				)
			).rows,
		regions: async (_parent, _args, { query }) =>
			(
				await query("select distinct region from guides order by region")
			).rows.map((row) => row.region),
		tour: async (_parent, { id }, { query }) =>
			(await query("select * from tours where id = $1", [id])).rows[0] ?? null,
		tours: async (_parent, { limit }, { query }) =>
			(
				await query("select * from tours order by started_at desc limit $1", [
					Math.min(limit, 200),
				])
			).rows,
	},

	Tour: {
		distanceM: (tour) => tour.distance_m,
		guide: (tour, _args, { loaders }) =>
			tour.guide_id ? loaders.guide.load(tour.guide_id) : null,
		logs: (tour, _args, { loaders }) => loaders.logs.load(tour.id),
		photos: (tour, _args, { loaders }) => loaders.photos.load(tour.id),
		startedAt: (tour) => iso(tour.started_at),
		user: (tour, _args, { loaders }) => loaders.user.load(tour.user_id),
	},

	User: {
		displayName: (user) => user.display_name,
	},
};
