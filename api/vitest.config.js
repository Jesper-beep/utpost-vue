import { loadEnv } from "vite";
import { defineConfig } from "vitest/config";

export default defineConfig(({ mode }) => ({
	ssr: { resolve: { conditions: ["module", "node"] } },
	test: {
		env: loadEnv(mode, process.cwd(), ""),
		environment: "node",
		fileParallelism: false,
		testTimeout: 10000,
	},
}));
