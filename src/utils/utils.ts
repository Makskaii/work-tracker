import dayjs from "dayjs";

export const convertToDate = (date?: string | number | null): string => {
	if (!date) {
		return "";
	}

	try {
		return dayjs(new Date(date)).format("DD.MM.YYYY");
	} catch (_e) {
		return "Неверный формат даты";
	}
};

export const convertMinutesInHrs = (minutes: string): string => {
	// if (minutes === "0") {
	// 	return "Нет оценки";
	// }

	return `${parseInt(minutes) / 600}.ч`;
};
