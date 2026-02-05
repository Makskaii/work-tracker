// usePaginatedData.ts
import { useCallback, useState } from "react";
import { $api } from "../config";
import type { AnyObject } from "../types/types";

function fetchMessages(page: number, endpoint: string, filters?: AnyObject) {
	const start = (page - 1) * 50;

	return $api.get(endpoint, {
		params: {
			filter: { ...filters },
			start,
		},
	});
}

export function usePaginatedData() {
	const [page, setPage] = useState(1);
	const [endpoint, setEndpoint] = useState("tasks.task.list");

	const refresh = useCallback((newPage: number) => {
		setPage(newPage);
	}, []);

	const refreshEndpoint = useCallback((endpoint: string) => {
		setPage(1);
		setEndpoint(endpoint);
	}, []);

	const dataPromise = fetchMessages(page, endpoint);

	return {
		dataPromise,
		page,
		total: 0, // мы его пока не знаем, только в Table узнаем
		setPage: (p: number) => refresh(p),
		setEndpoint: (endpoint: string) => refreshEndpoint(endpoint),
	};
}
