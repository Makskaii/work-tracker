import { useEffect, useState } from "react";
import { clearBitrixReadCache } from "@/shared/config/axios/axios.config";
import { Endpoints } from "@/shared/constants/const";
import type { Period } from "@/shared/hooks/usePeriodBorders";
import {
	getSalesReportData,
	type SalesReportSource,
} from "../../../api/getSalesReportData";

type Snapshot = {
	source: SalesReportSource;
	start: string;
	end: string;
	period: Period;
};

export const useSalesReport = (start: string, end: string, period: Period) => {
	const [snapshot, setSnapshot] = useState<Snapshot | null>(null);
	const [loading, setLoading] = useState(true);
	const [error, setError] = useState(false);
	const [revision, setRevision] = useState(0);
	// biome-ignore lint/correctness/useExhaustiveDependencies: revision intentionally triggers a manual refresh.
	useEffect(() => {
		const controller = new AbortController();
		setLoading(true);
		setError(false);
		getSalesReportData({ start, end, signal: controller.signal })
			.then((source) => {
				if (!controller.signal.aborted)
					setSnapshot({ source, start, end, period });
			})
			.catch(() => {
				if (!controller.signal.aborted) setError(true);
			})
			.finally(() => {
				if (!controller.signal.aborted) setLoading(false);
			});
		return () => controller.abort();
	}, [start, end, period, revision]);
	const refresh = () => {
		clearBitrixReadCache([Endpoints.crmItems, Endpoints.users]);
		setRevision((value) => value + 1);
	};
	return { snapshot, loading, error, refresh };
};
