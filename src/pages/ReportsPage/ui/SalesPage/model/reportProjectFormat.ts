export const formatProjectReportDate = (date?: string | null) => {
	if (!date) {
		return "—";
	}

	return new Date(date).toLocaleDateString("ru-RU");
};

export const formatFileSize = (size: number) => {
	if (size < 1024 * 1024) {
		return `${Math.max(1, Math.round(size / 1024))} КБ`;
	}

	return `${(size / 1024 / 1024).toFixed(1)} МБ`;
};
