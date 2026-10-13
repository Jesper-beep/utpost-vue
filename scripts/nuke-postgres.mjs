// Hjälp när Postgres strular...

import { execFileSync } from "node:child_process";

const run = (command, args, options = {}) =>
	execFileSync(command, args, { stdio: "inherit", ...options });

try {
	run("docker", ["compose", "rm", "-sf", "postgres"]);
	run("docker", ["volume", "rm", "-f", "utpost_pgdata"]);
	run("docker", ["compose", "up", "-d", "--wait", "postgres"]);

	run("npm", ["run", "seed", "--workspace=api"], { cwd: process.cwd() });

	console.log("Postgres är nollställd, seedad och körs igen.");
} catch (error) {
	throw new Error(`Postgres kunde inte nukas:: ${error.message}`);
}
