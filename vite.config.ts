/// <reference types="vitest/config" />

import react from "@vitejs/plugin-react";
import { defineConfig } from "vite";
import tsconfigPaths from "vite-tsconfig-paths";

export default defineConfig({
	base: "/devapps/work-tracker/",
	plugins: [react(), tsconfigPaths()],
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
