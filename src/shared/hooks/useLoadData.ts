// usePaginatedData.ts
import { useState, useCallback, useEffect } from "react";
import { $api } from "../config/axios/axios.config";
import type { AnyObject } from "../types/types";
import type { commonDto } from "../../components/Table/types";

interface UsePaginatedDataResult {
	data: commonDto;
	loading: boolean;
	error: string | null;
	page: number;
	total: number;
	next?: number;
	setPage: (page: number) => void;
	setFilters: (filters: AnyObject) => void;
	refetch: () => void;
	setEndpoint: (endpoint: string) => void;
}

export function useLoadData(
	initialEndpoint: string,
	initialFilters: AnyObject = {},
): UsePaginatedDataResult {
	const [data, setData] = useState<commonDto>([]);
	const [loading, setLoading] = useState(true);
	const [error, setError] = useState<string | null>(null);
	const [page, setPage] = useState(1);
	const [endpoint, setEndpoint] = useState(initialEndpoint);
	const [filters, setFilters] = useState<AnyObject>(initialFilters);
	const [total, setTotal] = useState(0);
	const [next, setNext] = useState(0);
	const limit = 50;

	const fetchData = useCallback(async () => {
		setLoading(true);
		setError(null);
		try {
			const start = (page - 1) * limit;
			const params = { filter: filters, start };

			const response = await $api.get(endpoint, { params });

			let resultData = [];
			let totalCount = 0;
			let nexts = 0;

			if (endpoint.includes("tasks")) {
				resultData = response.data.result?.tasks || [];
			} else {
				resultData = response.data.result || [];
			}

			totalCount = response.data.total || resultData.length;
			nexts = response.data.next ?? null;

			setData(resultData);
			setTotal(totalCount);
			setNext(nexts);
		} catch (err) {
			setError(err instanceof Error ? err.message : "Unknown error");
			setData([]);
		} finally {
			setLoading(false);
		}
	}, [endpoint, page, filters]);

	useEffect(() => {
		fetchData();
	}, [fetchData]);

	const refetch = useCallback(() => {
		fetchData();
	}, [fetchData]);

	return {
		data,
		loading,
		error,
		page,
		total,
		next,
		setPage: (newPage: number) => setPage(newPage),
		setFilters,
		setEndpoint,
		refetch,
	};
}
