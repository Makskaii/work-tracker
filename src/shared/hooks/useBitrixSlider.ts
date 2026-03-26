import { useB24 } from "../config/bitrixProvider/bitrixContext";
import { EntityTypeIds } from "../constants/const";

export const useBitrixSlider = () => {
	const { b24 } = useB24();

	const openCrmItem = async (
		itemId: number | string,
		entityId: number = EntityTypeIds.tasks,
	) => {
		if (!b24) return null;

		const url = b24.slider.getUrl(`/crm/type/${entityId}/details/${itemId}/`);
		return b24.slider.openPath(url, 1100);
	};

	return {
		b24,
		openTask: openCrmItem,
	};
};
