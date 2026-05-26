import dayjs from "dayjs";
import { useEffect, useMemo, useState } from "react";
import { useOutletContext } from "react-router";
import {
	getHeadersForDevs,
	WorkLoadTable,
} from "@/components/Table/WorkLoadTable/WorkLoadTable";
import { getUsersTableData } from "@/pages/ReportsPage/helpers/devsStatsBySprint";
import type { GroupedFields } from "@/pages/ReportsPage/types/types";
import { DEPARTMENT_IDS } from "@/shared/constants/const";
import { useSprintBorders } from "@/shared/hooks/useSprintBorders";
import type { ReportsContext } from "@/shared/types/types";

export const WorkLoad = () => {
	const { users, activities } = useOutletContext<ReportsContext>();

	const tableHeaders = useMemo(() => {
		return getHeadersForDevs(activities ?? []);
	}, [activities]);

	const { endOfTheWeek, startOfTheWeek, setDay } = useSprintBorders();

	const [effectivity, setEffectivity] = useState<GroupedFields[]>([]);

	useEffect(() => {
		const fetch = async () => {
			const devs = users.filter(
				(user) => user.department === DEPARTMENT_IDS.DEV,
			);

			const fetchvalues = await getUsersTableData({
				users: devs,
				activities,
				startOfTheWeek: startOfTheWeek,
				endOfTheWeek: endOfTheWeek,
			});

			setEffectivity(fetchvalues);
		};

		fetch();
	}, [activities, endOfTheWeek, startOfTheWeek, users.filter]);

	return (
		<>
			<div
				style={{
					display: "flex",
					alignItems: "center",
					gap: "1rem",
				}}
			>
				<button
					style={{
						background: "#102036",
						border: "1px solid var(--color-border)",
						color: "var(--color-text)",
					}}
					onClick={() => {
						setDay((prev) => prev.subtract(7, "day"));
					}}
				>
					пред. неделя
				</button>
				<div
					style={{
						display: "flex",
						flexDirection: "column",
						alignItems: "center",
					}}
				>
					<div>
						{dayjs(startOfTheWeek).format("DD.MM")}-
						{dayjs(endOfTheWeek).format("DD.MM")}
					</div>
				</div>
				<button
					style={{
						background: "#102036",
						border: "1px solid var(--color-border)",
						color: "var(--color-text)",
					}}
					onClick={() => {
						setDay((prev) => prev.add(7, "day"));
					}}
				>
					след. неделя
				</button>
			</div>
			<WorkLoadTable<GroupedFields>
				headers={tableHeaders}
				activeItems={effectivity}
				additionalData={{
					day: dayjs().day() - 1,
				}}
			/>
		</>
	);
};
