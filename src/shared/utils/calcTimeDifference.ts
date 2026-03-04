export const calcTimeDifference = (diffTime: string): string => {
	const difference = Date.now() - Date.parse(diffTime);

	if (!diffTime) {
		return "";
	}

	const diffDate = new Date(diffTime);
	const now = new Date();

	const years = now.getFullYear() - diffDate.getFullYear();
	const months = now.getMonth() - diffDate.getMonth();

	const oneMinute = 1000 * 60;
	const oneHour = oneMinute * 60;
	const twentyFourHours = oneHour * 24;
	const thirtyDays = twentyFourHours * 30;

	const dayTitle = (number: number) => {
		const last_num = number % 10;
		if (number > 10 && [11, 12, 13, 14].includes(number % 100)) return "дней";
		if (last_num == 1) return "день";
		if ([2, 3, 4].includes(last_num)) return "дня";
		if ([5, 6, 7, 8, 9, 0].includes(last_num)) return "дней";
	};

	if (difference < oneMinute) {
		return "только что";
	} else if (difference < oneHour) {
		const diffMinutes = Math.floor(difference / oneMinute);
		return `${diffMinutes} минут${diffMinutes === 1 ? "у" : diffMinutes < 5 ? "ы" : ""} назад`;
	} else if (difference < twentyFourHours) {
		const diffHours = Math.floor(difference / oneHour);
		return `${diffHours} час${diffHours === 1 ? "" : diffHours < 5 ? "а" : "ов"} назад`;
	} else if (difference < thirtyDays) {
		const diffDays = Math.floor(difference / twentyFourHours);
		return `${diffDays} ${dayTitle(diffDays)} назад`;
	} else if (years === 0) {
		const diffMonths = Math.max(0, months);
		return `${diffMonths} месяц${diffMonths === 1 ? "" : diffMonths < 5 ? "а" : "ев"} назад`;
	} else {
		if (years > 5) {
			const date = new Date(Date.parse(diffTime)).toLocaleDateString(); // Format the date
			return `более 5 лет назад (${date})`;
		} else {
			return `${years} ${years === 1 ? "год" : "года"} назад`;
		}
	}
};
