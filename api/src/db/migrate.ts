import { fileURLToPath } from "node:url";
import { migrate } from "drizzle-orm/node-postgres/migrator";
import { db, pool } from "./postgres.ts";

const MIGRATIONS_FOLDER = fileURLToPath(
	new URL("../../drizzle", import.meta.url),
);

export const runMigrations = async (): Promise<void> => {
	await migrate(db, { migrationsFolder: MIGRATIONS_FOLDER });
};

if (process.argv[1] === fileURLToPath(import.meta.url)) {
	try {
		await runMigrations();
		console.log("Migreringarna är körda.");
	} catch (error) {
		console.error(error);
		process.exitCode = 1;
	} finally {
		await pool.end();
	}
}
