import { useB24 } from "../config/bitrixProvider/bitrixContext";
import { EntityTypeIds } from "../constants/const";

export const useBitrixSlider = () => {
	const { b24 } = useB24();

	const openTask = async (taskId: number | string) => {
		if (!b24) return null;

		const url = b24.slider.getUrl(
			`/crm/type/${EntityTypeIds.tasks}/details/${taskId}/`,
		);
		return b24.slider.openPath(url, 1100);
	};

	return {
		b24,
		openTask,
	};
};
