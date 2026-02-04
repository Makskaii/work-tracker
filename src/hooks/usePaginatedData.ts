// usePaginatedData.ts
import { useCallback, useState } from "react";
import { $api } from "../config";
import type { AnyObject } from "../types/types";

function fetchMessages(page: number, filters?: AnyObject) {
	const start = (page - 1) * 50;

	return $api.get("tasks.task.list", {
		params: {
			filter: { ...filters },
			start,
		},
	});
}

export function usePaginatedData() {
	const [page, setPage] = useState(1);

	const refresh = useCallback((newPage: number) => {
		setPage(newPage);
	}, []);

	const dataPromise = fetchMessages(page);

	return {
		dataPromise,
		page,
		total: 0, // мы его пока не знаем, только в Table узнаем
		setPage: (p: number) => refresh(p),
	};
}
