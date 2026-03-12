const devMode =
	typeof import.meta !== "undefined" && (import.meta.env?.DEV ?? false);

declare global {
	interface Window {
		BX24?: {
			openPath: (path: string, callback?: (result: unknown) => void) => void;
		};
	}
}

export const openBitrixSlider = (path: string) => {
	if (devMode) {
		window.open(path, "_blank");
		return;
	}

	if (window.BX24?.openPath) {
		window.BX24.openPath(path, (result) => {
			console.log("Slider result:", result);
		});
		return;
	}

	console.error("BX24 slider not available");
};
