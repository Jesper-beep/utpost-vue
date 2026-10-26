// https://github.com/jonatanhallenberg/utpost-graphql-labb/blob/main/api/src/graphql/server.js

import { getOperationAST } from "graphql";
import { createSchema, createYoga } from "graphql-yoga";
import jwt from "jsonwebtoken";
import { config } from "../config.js";
import { pool } from "../db/client.js";
import { createLoaders } from "./loaders.js";
import { resolvers } from "./resolvers.js";
import { typeDefs } from "./schema.js";

const userFrom = (request) => {
	const header = request.headers.get("authorization");
	if (!header) return null;
	try {
		return jwt.verify(header.replace("Bearer ", ""), config.jwtSecret);
	} catch {
		return null;
	}
};

const reportQueryCount = {
	onExecute: ({ args }) => ({
		onExecuteDone: ({ result, setResult }) => {
			const name =
				getOperationAST(args.document, args.operationName)?.name?.value ??
				"anonym";
			const count = args.contextValue.stats.queries;
			console.log(`graphql ${name}: ${count} databasfrågor`);
			if (!(Symbol.asyncIterator in result)) {
				setResult({
					...result,
					extensions: { ...result.extensions, databasfragor: count },
				});
			}
		},
	}),
};

export const yoga = createYoga({
	context: ({ request }) => {
		const stats = { queries: 0 };
		const query = (sql, params) => {
			stats.queries += 1;
			return pool.query(sql, params);
		};
		return {
			loaders: createLoaders({ query }),
			query,
			stats,
			user: userFrom(request),
		};
	},
	graphqlEndpoint: "/graphql",
	plugins: [reportQueryCount],
	schema: createSchema({ resolvers, typeDefs }),
});
