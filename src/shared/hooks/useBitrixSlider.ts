import { useB24 } from "../config/bitrixProvider/bitrixContext";
import { EntityTypeIds } from "../constants/const";

export const useBitrixSlider = () => {
	const { b24 } = useB24();

	const openCrmItem = async (
		itemId: number | string,
		entityId: number = EntityTypeIds.tasks,
		type: "task" | "common" = "task",
	) => {
		const path = `/crm/${type === "task" ? `type/${entityId}` : "deal"}/details/${itemId}/`;

		if (!b24) {
			window.location.assign(path);
			return null;
		}

		const url = b24.slider.getUrl(path);
		return b24.slider.openPath(url, 1100);
	};

	return {
		b24,
		openTask: openCrmItem,
	};
};
