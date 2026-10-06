/// <reference types="vitest/config" />

import react from "@vitejs/plugin-react";
import { randomUUID } from "node:crypto";
import { defineConfig } from "vite";
import tsconfigPaths from "vite-tsconfig-paths";

const buildId = randomUUID();

export default defineConfig({
	base: "/devapps/work-tracker/",
	define: { __WORK_TRACKER_BUILD_ID__: JSON.stringify(buildId) },
	plugins: [
		react(),
		tsconfigPaths(),
		{
			name: "work-tracker-build-version",
			apply: "build",
			generateBundle() {
				this.emitFile({
					type: "asset",
					fileName: "version.json",
					source: JSON.stringify({ buildId }),
				});
			},
		},
	],
	build: {
		rollupOptions: {
			output: {
				manualChunks: {
					vendor: ["react", "react-dom"],
					auth: ["@casl/ability", "@casl/react"],
					bitrix: ["@bitrix24/b24jssdk"],
					forms: ["react-hook-form"],
					date: ["dayjs"],
				},
			},
		},
		chunkSizeWarningLimit: 500,
	},
	test: {
		environment: "jsdom",
		globals: true,
		setupFiles: "./tests/setup.ts",
	},
});
