import { drizzle } from "drizzle-orm/node-postgres";
import pg from "pg";
import { config } from "../config/env.ts";
import { countQuery } from "../lib/query-stats.ts";
import * as schema from "./schema/index.ts";

export const pool = new pg.Pool({ connectionString: config.postgresUrl });

// Utan en lyssnare stoppar Node processen när en ledig anslutning bryts, till exempel när Postgres startar om.
pool.on("error", (error) => {
	console.error(`postgres: en ledig anslutning bröts (${error.message})`);
});

export const db = drizzle(pool, {
	casing: "snake_case",
	logger: { logQuery: countQuery },
	schema,
});
