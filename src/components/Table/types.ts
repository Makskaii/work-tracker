export interface Task {
	id: string;
	title: string;

	parentId?: string;
	description?: string;
	viewedDate: string;
	groupId?: string;
	status?: string;
}

export interface TableProps {
	data: Task[];
}
