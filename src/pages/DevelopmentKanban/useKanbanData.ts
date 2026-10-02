import { useCallback, useEffect, useRef, useState } from "react";
import { clearBitrixReadCache } from "@/shared/config/axios/axios.config";
import { Endpoints } from "@/shared/constants/const";
import { fetchKanbanData, type KanbanData } from "./api";

type KanbanDataState = {
	data: KanbanData | null;
	loading: boolean;
	isRefreshing: boolean;
	error: string | null;
	updatedAt: Date | null;
};

export const useKanbanData = () => {
	const [state, setState] = useState<KanbanDataState>({
		data: null,
		loading: true,
		isRefreshing: false,
		error: null,
		updatedAt: null,
	});
	const [revision, setRevision] = useState(0);
	const controllerRef = useRef<AbortController | null>(null);
	const refresh = useCallback(() => {
		controllerRef.current?.abort();
		clearBitrixReadCache([
			Endpoints.crmItems,
			Endpoints.status,
			Endpoints.users,
		]);
		setRevision((value) => value + 1);
	}, []);

	useEffect(() => {
		void revision;
		const controller = new AbortController();
		controllerRef.current = controller;
		setState((previous) => ({
			...previous,
			loading: previous.data === null,
			isRefreshing: previous.data !== null,
			error: null,
		}));
		fetchKanbanData(controller.signal)
			.then((data) => {
				if (controller.signal.aborted) return;
				setState({
					data,
					loading: false,
					isRefreshing: false,
					error: null,
					updatedAt: new Date(),
				});
			})
			.catch((error) => {
				if (controller.signal.aborted) return;
				setState((previous) => ({
					...previous,
					loading: false,
					isRefreshing: false,
					error:
						error instanceof Error
							? error.message
							: "Не удалось загрузить задачи из Битрикс24",
				}));
			});
		return () => controller.abort();
	}, [revision]);

	return { ...state, refresh };
};
