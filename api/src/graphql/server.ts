// https://github.com/jonatanhallenberg/utpost-graphql-labb/blob/main/api/src/graphql/server.js

import { useRateLimiter } from "@envelop/rate-limiter";
import type { Request as ExpressRequest } from "express";
import { getOperationAST } from "graphql";
import { createSchema, createYoga, type Plugin } from "graphql-yoga";
import {
	guideExcerpt,
	previewNotices,
	publishedNotices,
} from "../cms/contentful.js";
import { config } from "../config/env.ts";
import { runWithQueryStats } from "../lib/query-stats.ts";
import { readBearerToken, verifyToken } from "../lib/token.ts";
import type { TokenUser } from "../types/auth.ts";
import type { GraphQLContext } from "../types/graphql.ts";
import { createLoaders } from "./loaders.ts";
import { resolvers } from "./resolvers.ts";
import { typeDefs } from "./schema.ts";

interface ServerContext {
	req?: ExpressRequest;
}

const readUser = (request: Request): TokenUser | null => {
	const token = readBearerToken(request.headers.get("authorization"));
	if (token === null) {
		return null;
	}
	try {
		return verifyToken(token);
	} catch {
		return null;
	}
};

// Räknar databasfrågorna för varje fråga till API:et. Räkningen följer med genom alla await.
const reportQueryCount: Plugin = {
	onExecute: ({ args, executeFn, setExecuteFn }) => {
		const stats = { queries: 0 };
		setExecuteFn((executeArgs) =>
			runWithQueryStats(stats, () => executeFn(executeArgs)),
		);
		return {
			onExecuteDone: ({ result, setResult }) => {
				const operation = getOperationAST(args.document, args.operationName);
				let name = "anonym";
				if (operation?.name !== undefined) {
					name = operation.name.value;
				}
				console.log(`graphql ${name}: ${stats.queries} databasfrågor`);
				if (!(Symbol.asyncIterator in result)) {
					setResult({
						...result,
						extensions: { ...result.extensions, databasfragor: stats.queries },
					});
				}
			},
		};
	},
};

const UNKNOWN_CLIENT = "unknown";

// Räknar anropen per IP-adress. Saknas adressen delar alla anrop på en och samma räknare.
const readClientIp = (context: unknown): string => {
	if (
		typeof context === "object" &&
		context !== null &&
		"ip" in context &&
		typeof context.ip === "string"
	) {
		return context.ip;
	} else {
		return UNKNOWN_CLIENT;
	}
};

const graphqlLimiter = useRateLimiter({
	configByField: [
		{
			field: "*",
			max: 10,
			message: "Too many attempts, please try again later.",
			type: "Query",
			window: "15m",
		},
	],
	identifyFn: readClientIp,
});

const limiterPlugins: (typeof graphqlLimiter)[] = [];

if (config.isRateLimitEnabled) {
	limiterPlugins.push(graphqlLimiter);
}

export const yoga = createYoga<ServerContext>({
	context: ({ request, req }): GraphQLContext => ({
		cms: { guideExcerpt, notices: publishedNotices, previewNotices },
		ip: req?.ip,
		loaders: createLoaders(),
		user: readUser(request),
	}),
	graphqlEndpoint: "/graphql",
	plugins: [reportQueryCount, ...limiterPlugins],
	schema: createSchema({ resolvers, typeDefs }),
});
