import { useB24 } from "../config/bitrixProvider/bitrixContext";
import { EntityTypeIds } from "../constants/const";

const getBitrixPortalOrigin = () => {
	const apiUrl = import.meta.env.VITE_API_URL;

	if (!apiUrl) return window.location.origin;

	try {
		return new URL(apiUrl).origin;
	} catch {
		return window.location.origin;
	}
};

export const useBitrixSlider = () => {
	const { b24 } = useB24();

	const openCrmItem = async (
		itemId: number | string,
		entityId: number = EntityTypeIds.tasks,
		type: "task" | "common" = "task",
	) => {
		const path = `/crm/${type === "task" ? `type/${entityId}` : "deal"}/details/${itemId}/`;

		if (!b24) {
			return window.open(`${getBitrixPortalOrigin()}${path}`, "_blank", "noopener,noreferrer");
		}

		const url = b24.slider.getUrl(path);
		return b24.slider.openPath(url, 1100);
	};

	return {
		b24,
		openTask: openCrmItem,
	};
};
