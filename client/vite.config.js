import { fileURLToPath } from "node:url";
import vue from "@vitejs/plugin-vue";
import { defineConfig, loadEnv } from "vite";

// https://vite.dev/config/
export default defineConfig(({ mode }) => {
	const env = loadEnv(mode, process.cwd(), "");

	return {
		plugins: [vue()],
		resolve: {
			alias: { "@": fileURLToPath(new URL("./src", import.meta.url)) },
		},
		server: {
			proxy: {
				"/api": {
					changeOrigin: true,
					secure: false,
					target: env.API_PROXY_TARGET || "http://localhost:4000",
				},
			},
			strictPort: true,
		},
	};
});
