export interface UserItem {
	ACTIVE?: boolean | "Y" | "N" | 0 | 1 | "0" | "1";
	ID: string | number;
	NAME?: string;
	LAST_NAME?: string;
	WORK_POSITION?: string;
	PERSONAL_PHOTO?: string;
	UF_DEPARTMENT?: number[] | number | null;
}

interface FormattedUser {
	isActive?: boolean;
	id: string;
	value: string;
	title: string;
	position?: string;
	photo?: string;
	department?: number | null;
}

export const normalizeUserActive = (
	value: UserItem["ACTIVE"],
): boolean | undefined => {
	if (value === true || value === "Y" || value === 1 || value === "1") {
		return true;
	}
	if (value === false || value === "N" || value === 0 || value === "0") {
		return false;
	}
	return undefined;
};

export const formatUserFields = (item: UserItem): FormattedUser => {
	return {
		id: String(item.ID),
		isActive: normalizeUserActive(item.ACTIVE),
		value: item.NAME + " " + item.LAST_NAME,
		title: item.NAME + " " + item.LAST_NAME,
		position: item.WORK_POSITION || "",
		photo: item.PERSONAL_PHOTO || "",
		department: Array.isArray(item.UF_DEPARTMENT)
			? item.UF_DEPARTMENT[0]
			: item.UF_DEPARTMENT || null,
	};
};
