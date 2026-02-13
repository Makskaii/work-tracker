import react from "@vitejs/plugin-react";
import { defineConfig } from "vite";

export default defineConfig({
	base: "/devapps/work-tracker/",
	plugins: [react()],
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
});
