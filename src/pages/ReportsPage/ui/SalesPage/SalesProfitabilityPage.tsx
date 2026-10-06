import { useEffect, useState } from "react";
import { useOutletContext } from "react-router";
import type { ReportsContext, User } from "@/shared/types/types";
import { getUsers } from "../../api/getUsers";
import { SalesProfitabilityReport } from "./SalesProfitabilityReport";

export const SalesProfitabilityPage = () => {
	const { activities } = useOutletContext<ReportsContext>();
	const [users, setUsers] = useState<User[]>([]);
	const [loading, setLoading] = useState(true);

	useEffect(() => {
		const controller = new AbortController();

		const fetchData = async () => {
			setLoading(true);

			try {
				const bitrixUsers = await getUsers(controller.signal);

				if (controller.signal.aborted) {
					return;
				}

				setUsers(
					bitrixUsers
						.map((user) => ({
							id: user.ID,
							value: `${user.NAME} ${user.LAST_NAME}`,
							title: `${user.NAME} ${user.LAST_NAME}`,
							position: user.WORK_POSITION,
							photo: user.PERSONAL_PHOTO,
							department: Number(user.UF_DEPARTMENT?.[0] ?? 0),
						}))
						.toSorted((a, b) => a.department - b.department),
				);
			} catch (error) {
				if (!controller.signal.aborted) {
					console.error("Failed to fetch sales profitability page data", error);
				}
			} finally {
				if (!controller.signal.aborted) {
					setLoading(false);
				}
			}
		};

		fetchData();

		return () => {
			controller.abort();
		};
	}, []);

	return (
		<SalesProfitabilityReport
			activities={activities}
			deals={[]}
			users={users}
			loading={loading}
		/>
	);
};
