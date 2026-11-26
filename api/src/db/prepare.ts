import { setTimeout as sleep } from "node:timers/promises";
import { count, sql } from "drizzle-orm";
import { config } from "../config/env.ts";
import { runMigrations } from "./migrate.ts";
import { migrateLogs } from "./migrate-logs.ts";
import { mongo } from "./mongo.ts";
import { db } from "./postgres.ts";
import { users } from "./schema/users/index.ts";
import { seed } from "./seed.ts";

const MAX_ATTEMPTS = 30;
const RETRY_DELAY_MILLISECONDS = 2000;

// Databaserna startar i samma app som API:et och det finns ingen startordning, så Postgres kan vara långsam.
const waitForPostgres = async (): Promise<void> => {
	for (let attempt = 1; attempt <= MAX_ATTEMPTS; attempt++) {
		try {
			await db.execute(sql`select 1`);
			return;
		} catch (error) {
			let reason = "okänt fel";
			if (error instanceof Error) {
				reason = error.message;
			}
			console.log(
				`prepare: väntar på Postgres (${attempt}/${MAX_ATTEMPTS}): ${reason}`,
			);
			await sleep(RETRY_DELAY_MILLISECONDS);
		}
	}
	throw new Error("prepare: Postgres svarade inte");
};

const seedIfEmpty = async (): Promise<void> => {
	const [row] = await db.select({ total: count() }).from(users);
	if (row === undefined) {
		throw new Error("prepare: kunde inte räkna användare");
	}
	if (row.total > 0) {
		console.log(`prepare: ${row.total} användare finns redan, ingen seed`);
		return;
	}
	console.log("prepare: tom databas, seedar");
	await seed();
	await mongo.connect();
	await migrateLogs();
};

// Körs före att API:et börjar lyssna. Migreringarna körs alltid. Testdata läggs bara in när SEED_ON_START=1.
export const prepareDatabase = async (): Promise<void> => {
	await waitForPostgres();
	await runMigrations();
	if (config.seedOnStart) {
		await seedIfEmpty();
	}
};
