import { defineConfig } from "drizzle-kit";
import { z } from "zod";

export default defineConfig({
	casing: "snake_case",
	dbCredentials: {
		url: z.string().default("").parse(process.env["POSTGRES_URL"]), // Biome strikes again...?
	},
	dialect: "postgresql",
	out: "./drizzle",
	schema: "./src/db/schema",
});
