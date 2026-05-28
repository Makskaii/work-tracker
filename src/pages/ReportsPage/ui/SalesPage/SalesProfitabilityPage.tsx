import { useEffect, useState } from "react";
import { useOutletContext } from "react-router";
import type { ReportsContext, User } from "@/shared/types/types";
import { getProfitabilityDeals } from "../../api/getCrmDeals";
import { getUsers } from "../../api/getUsers";
import type { Deal } from "../../types/deals.types";
import { SalesProfitabilityReport } from "./SalesProfitabilityReport";

export const SalesProfitabilityPage = () => {
	const { activities } = useOutletContext<ReportsContext>();
	const [deals, setDeals] = useState<Deal[]>([]);
	const [users, setUsers] = useState<User[]>([]);
	const [loading, setLoading] = useState(true);

	useEffect(() => {
		const controller = new AbortController();

		const fetchData = async () => {
			setLoading(true);

			try {
				const [crmDeals, bitrixUsers] = await Promise.all([
					getProfitabilityDeals(controller.signal),
					getUsers(controller.signal),
				]);

				if (controller.signal.aborted) {
					return;
				}

				setDeals(crmDeals);
				setUsers(
					bitrixUsers
						.map((user) => ({
							id: user.ID,
							value: `${user.NAME} ${user.LAST_NAME}`,
							title: `${user.NAME} ${user.LAST_NAME}`,
							position: user.WORK_POSITION,
							photo: user.PERSONAL_PHOTO,
							department: user.UF_DEPARTMENT[0],
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
			deals={deals}
			users={users}
			loading={loading}
		/>
	);
};
