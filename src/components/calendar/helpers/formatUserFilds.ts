export interface UserItem {
	ID: string | number;
	NAME?: string;
	LAST_NAME?: string;
	WORK_POSITION?: string;
	PERSONAL_PHOTO?: string;
	UF_DEPARTMENT?: number[] | number | null;
}

interface FormattedUser {
	id: string;
	value: string;
	title: string;
	position?: string;
	photo?: string;
	department?: number | null;
}

export const formatUserFields = (item: UserItem): FormattedUser => {
	return {
		id: String(item.ID),
		value: item.NAME + " " + item.LAST_NAME,
		title: item.NAME + " " + item.LAST_NAME,
		position: item.WORK_POSITION || "",
		photo: item.PERSONAL_PHOTO || "",
		department: Array.isArray(item.UF_DEPARTMENT)
			? item.UF_DEPARTMENT[0]
			: item.UF_DEPARTMENT || null,
	};
};
