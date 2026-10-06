import react from "@vitejs/plugin-react";
import { defineConfig, loadEnv } from "vite";

export default defineConfig(({ mode }) => {
	const env = loadEnv(mode, process.cwd(), "");

	return {
		plugins: [react()],
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
