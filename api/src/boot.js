import { pool } from "./db/client.js";
import { migrateLogs } from "./db/migrate-logs.js";
import { mongo } from "./db/mongo.js";
import { seed } from "./db/seed.js";

const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

const waitForPostgres = async (attempts = 30) => {
	for (let i = 1; i <= attempts; i++) {
		try {
			await pool.query("select 1");
			return;
		} catch (err) {
			console.log(
				`boot: väntar på Postgres (${i}/${attempts}): ${err.message}`,
			);
			await sleep(2000);
		}
	}
	throw new Error("boot: Postgres svarade inte");
};

const seedIfEmpty = async () => {
	let users = 0;
	try {
		users = Number(
			(await pool.query("select count(*) from users")).rows[0].count,
		);
	} catch {
		users = 0;
	}
	if (users > 0) {
		console.log(`boot: ${users} användare finns redan – ingen seed`);
		return;
	}
	console.log("boot: tom databas – seedar");
	await seed();
	await mongo.connect();
	await migrateLogs();
};

if (process.env["SEED_ON_START"] === "1") {
	await waitForPostgres();
	await seedIfEmpty();
}

await import("./index.js");
