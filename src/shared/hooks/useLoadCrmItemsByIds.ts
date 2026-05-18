import { useEffect, useMemo, useState } from "react";
import { $api } from "@/shared/config";
import { Endpoints } from "@/shared/constants/const";

type CrmItemListResponse<T> = {
	result?: {
		items?: T[];
	};
	next?: number | null;
};

const ID_FILTER_CHUNK_SIZE = 25;

const splitIntoChunks = <T,>(items: T[], chunkSize: number) => {
	const chunks: T[][] = [];

	for (let index = 0; index < items.length; index += chunkSize) {
		chunks.push(items.slice(index, index + chunkSize));
	}

	return chunks;
};

export const useLoadCrmItemsByIds = <T,>({
	entityTypeId,
	ids,
	select,
}: {
	entityTypeId: number;
	ids: string[];
	select: readonly string[];
}) => {
	const [data, setData] = useState<T[]>([]);
	const [loading, setLoading] = useState(false);
	const [error, setError] = useState<string | null>(null);
	const normalizedIds = useMemo(() => {
		return Array.from(new Set(ids.map(String).filter(Boolean)));
	}, [ids]);

	useEffect(() => {
		let isCancelled = false;

		const fetchItems = async () => {
			if (!normalizedIds.length) {
				setData([]);
				setLoading(false);
				setError(null);
				return;
			}

			setLoading(true);
			setError(null);

			try {
				const chunks = splitIntoChunks(normalizedIds, ID_FILTER_CHUNK_SIZE);
				const loadedItems: T[] = [];

				for (const chunk of chunks) {
					let start = 0;
					let next: number | null | undefined = 0;

					while (next !== null) {
						const response = await $api.get<CrmItemListResponse<T>>(
							Endpoints.crmItems,
							{
								params: {
									entityTypeId,
									select,
									filter: {
										"@id": chunk,
									},
									start,
								},
							},
						);

						loadedItems.push(...(response.data.result?.items ?? []));

						next = response.data.next ?? null;
						start = next ?? start + 50;
					}
				}

				if (!isCancelled) {
					setData(loadedItems);
				}
			} catch (err) {
				if (!isCancelled) {
					console.error("Ошибка при загрузке CRM элементов по ID:", err);
					setError(err instanceof Error ? err.message : "Unknown error");
					setData([]);
				}
			} finally {
				if (!isCancelled) {
					setLoading(false);
				}
			}
		};

		fetchItems();

		return () => {
			isCancelled = true;
		};
	}, [entityTypeId, normalizedIds, select]);

	return {
		data,
		error,
		loading,
	};
};
