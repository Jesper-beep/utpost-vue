import { sql } from "drizzle-orm";
import { Router } from "express";
import { config } from "../../config/env.ts";
import { mongo, mongoDb } from "../../db/mongo.ts";
import { db } from "../../db/postgres.ts";

export const healthRouter = Router();

const checkConnection = async (
	probe: () => Promise<unknown>,
): Promise<string> => {
	try {
		await probe();
		return "ok";
	} catch (error) {
		if (error instanceof Error) {
			return `fel: ${error.message}`;
		} else {
			return "fel: okänt fel";
		}
	}
};

healthRouter.get("/", async (_request, response) => {
	const postgres = await checkConnection(() => db.execute(sql`select 1`));
	const mongodb = await checkConnection(async () => {
		await mongo.connect();
		await mongoDb().command({ ping: 1 });
	});

	let status = 503;
	if (postgres === "ok" && mongodb === "ok") {
		status = 200;
	}
	response.status(status).json({
		mongodb,
		ok: status === 200,
		postgres,
		sha: config.gitSha,
	});
});
