import { loadEnv } from "vite";
import { defineConfig } from "vitest/config";

// Testerna ska aldrig nå Contentful, så nycklarna i din .env nollas. Pipelinen har inga nycklar alls.
const CMS_DISABLED_ENV = {
	CONTENTFUL_DELIVERY_TOKEN: "",
	CONTENTFUL_PREVIEW_TOKEN: "",
	CONTENTFUL_SPACE_ID: "",
};

export default defineConfig(({ mode }) => ({
	ssr: { resolve: { conditions: ["module", "node"] } },
	test: {
		env: { ...loadEnv(mode, process.cwd(), ""), ...CMS_DISABLED_ENV },
		environment: "node",
		fileParallelism: false,
		testTimeout: 10000,
	},
}));
