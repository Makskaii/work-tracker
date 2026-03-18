import type { AnyObject } from "./types";

type HeaderItem<T, K extends keyof T> = {
	key: K;
	title: string;
	convertFn?: (value: T[K], additionalData?: AnyObject) => string;
	render?: (value: T[K], additionalData?: AnyObject) => React.ReactNode;
};

export type Header<T> = {
	[K in keyof T]: HeaderItem<T, K>;
}[keyof T];

export type UniversalTableProps<T extends { id: string }> = {
	headers: Header<T>[];
	activeItems: T[];
	additionalData?: AnyObject;
	totalRow?: React.ReactNode;
	onRowClick?: (id: string) => void;
};

export interface GroupedReportFields {
	id: string;
	title: string;
	timeSpent: string;

	taskId: string;
	parentId: number;
	day: string;
	project: number;
	assignedById: string;
	activity?: number;
}
