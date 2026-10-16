import { getOperationAST } from "graphql";
import { createSchema, createYoga } from "graphql-yoga";
import jwt from "jsonwebtoken";
import { config } from "../src/config.js";
import { pool } from "../src/db/client.js";
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

const logQueryCount = {
	onExecute: ({ args }) => ({
		onExecuteDone: () => {
			const name =
				getOperationAST(args.document, args.operationName)?.name?.value ??
				"anonym";
			console.log(
				`graphql ${name}: ${args.contextValue.stats.queries} databasfrågor`,
			);
		},
	}),
};

export const yoga = createYoga({
	context: ({ request }) => {
		const stats = { queries: 0 };
		return {
			query: (sql, params) => {
				stats.queries += 1;
				return pool.query(sql, params);
			},
			stats,
			user: userFrom(request),
		};
	},
	graphqlEndpoint: "/graphql",
	plugins: [logQueryCount],
	schema: createSchema({ resolvers, typeDefs }),
});
