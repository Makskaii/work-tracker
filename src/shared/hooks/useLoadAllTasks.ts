// useLoadData.ts
import { useCallback, useEffect, useRef, useState } from "react";
import { $api } from "../config/axios/axios.config";
import type { AnyObject } from "../types/types";

interface UseLoadDataResult<T> {
	data: T[];
	loading: boolean;
	error: string | null;
	page: number;
	total: number;
	next?: number | null;
	setPage: (page: number) => void;
	setFilters: (filters: AnyObject) => void;
	setEndpoint: (endpoint: string) => void;
}

const fetchWithRetry = async (
	endpoint: string,
	params: AnyObject,
	retries = 3,
	delay = 1000,
	signal?: AbortSignal,
	// biome-ignore lint/suspicious/noExplicitAny: <ss>
): Promise<any> => {
	for (let i = 0; i < retries; i++) {
		try {
			const response = await $api.get(endpoint, {
				params: {
					...params.params,
					start: params.start,
				},
				signal,
			});
			return response;
		} catch (error) {
			if (signal?.aborted) throw error;
			if (i === retries - 1) throw error;
			await new Promise((resolve) =>
				setTimeout(resolve, delay * Math.pow(2, i)),
			); // экспоненциальная задержка
		}
	}
};

export function useLoadAllData<T>({
	initialEndpoint,
	initialFilters = {},
	isTiems = true,
}: {
	initialEndpoint: string;
	initialFilters?: AnyObject;
	isTiems?: boolean;
}): UseLoadDataResult<T> {
	const [data, setData] = useState<T[]>([]);
	const [loading, setLoading] = useState(true);
	const [error, setError] = useState<string | null>(null);
	const [page, setPage] = useState(1);
	const [endpoint, setEndpoint] = useState(initialEndpoint);
	const [filters, setFilters] = useState<AnyObject>(initialFilters);
	const [total, setTotal] = useState(0);
	const [next, setNext] = useState<number | null>(null);
	const requestIdRef = useRef(0);
	const abortControllerRef = useRef<AbortController | null>(null);
	const limit = 50;

	const fetchData = useCallback(async () => {
		abortControllerRef.current?.abort();
		const abortController = new AbortController();
		abortControllerRef.current = abortController;
		const requestId = requestIdRef.current + 1;
		requestIdRef.current = requestId;

		setLoading(true);
		setError(null);
		try {
			const start = (page - 1) * limit;
			const params = { ...filters, start };

			const response = await fetchWithRetry(
				endpoint,
				params,
				3,
				1000,
				abortController.signal,
			);

			if (
				requestIdRef.current !== requestId ||
				abortController.signal.aborted
			) {
				return;
			}

			let resultData = [];
			let totalCount = 0;
			let nextValue = response.data.next ?? null;

			if (isTiems) resultData = response.data.result?.items || [];
			else resultData = response.data.result || [];

			totalCount = response.data.total;
			setTotal(totalCount);
			if (nextValue !== null && nextValue > 0 && totalCount > 0) {
				const allData = [...resultData];
				let currentStart = start + limit;

				// Загружаем оставшиеся страницы
				while (nextValue !== null && nextValue > 0) {
					if (
						requestIdRef.current !== requestId ||
						abortController.signal.aborted
					) {
						return;
					}

					const nextParams = { ...filters, start: currentStart };

					const nextResponse = await fetchWithRetry(
						endpoint,
						nextParams,
						3,
						1000,
						abortController.signal,
					);

					if (
						requestIdRef.current !== requestId ||
						abortController.signal.aborted
					) {
						return;
					}

					const nextPageData = isTiems
						? nextResponse.data.result?.items
						: nextResponse.data.result || [];

					allData.push(...nextPageData);
					nextValue = nextResponse.data.next ?? null;
					currentStart += limit;
				}

				setData(allData);

				setNext(null);
			} else {
				setData(resultData);
				setTotal(totalCount);
				setNext(nextValue);
			}
		} catch (err) {
			if (
				requestIdRef.current !== requestId ||
				abortController.signal.aborted
			) {
				return;
			}

			console.error("Ошибка при загрузке данных:", err);
			setError(err instanceof Error ? err.message : "Unknown error");
			setData([]);
		} finally {
			if (requestIdRef.current === requestId) {
				setLoading(false);
				abortControllerRef.current = null;
			}
		}
	}, [endpoint, page, filters, isTiems]);

	useEffect(() => {
		if (initialEndpoint) fetchData();

		return () => {
			requestIdRef.current += 1;
			abortControllerRef.current?.abort();
		};
	}, [fetchData, initialEndpoint]);

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
	};
}
