// https://github.com/jonatanhallenberg/utpost-graphql-labb/blob/main/api/src/graphql/resolvers.js

import { GraphQLError } from "graphql";

const iso = (d) => new Date(d).toISOString();

export const resolvers = {
	Guide: {
		bodyHtml: (guide) => guide.body_html,
		heroImage: (guide) => guide.hero_image,
		lengthKm: (guide) => guide.length_km,
		updatedAt: (guide) => iso(guide.updated_at),
	},

	LogPoint: {
		elevationM: (log) => log.elevation_m,
		heartRate: (log) => log.heart_rate,
		recordedAt: (log) => iso(log.recorded_at),
	},

	Mutation: {
		createTour: async (_, { input }, { query, user }) => {
			if (!user) {
				throw new GraphQLError("Du måste vara inloggad", {
					extensions: { code: "UNAUTHENTICATED" },
				});
			}
			const result = await query(
				`insert into tours (user_id, guide_id, title, started_at, distance_m, notes)
         values ($1,$2,$3,$4,$5,$6) returning *`,
				[
					user.id,
					input.guideId ?? null,
					input.title,
					input.startedAt,
					input.distanceM,
					input.notes ?? null,
				],
			);
			return result.rows[0];
		},
	},
	Query: {
		guide: async (_, { slug }, { query }) =>
			(await query("select * from guides where slug = $1", [slug])).rows[0] ??
			null,
		guides: async (_, _args, { query }) =>
			(await query("select * from guides order by updated_at desc")).rows,
		popularGuides: async (_, { limit }, { query }) =>
			(
				await query(
					"select * from guides where published = true order by id desc limit $1",
					[limit],
				)
			).rows,
		regions: async (_, _args, { query }) =>
			(
				await query("select distinct region from guides order by region")
			).rows.map((r) => r.region),
		tour: async (_, { id }, { query }) =>
			(await query("select * from tours where id = $1", [id])).rows[0] ?? null,
		tours: async (_, { limit }, { query }) =>
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
