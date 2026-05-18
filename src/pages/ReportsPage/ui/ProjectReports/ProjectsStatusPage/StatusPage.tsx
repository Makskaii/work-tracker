import { useEffect, useState } from "react";
import { useOutletContext } from "react-router";
import { UniversalTable } from "@/components/Table/universalTable/UniversalTable";
import type { ProjectTableRow } from "@/pages/ReportsPage/types/types";
import type { ReportsContext } from "@/shared/types/types";
import { getProjectsTableData, headersForProjects } from "../ProjectsReports";

export const ProjectStatuses = () => {
	const { clientsList } = useOutletContext<ReportsContext>();
	const [tableData, setTableData] = useState<ProjectTableRow[]>([]);

	useEffect(() => {
		const fetchData = async () => {
			const result = await getProjectsTableData({
				clients: clientsList,
			});

			setTableData(result);
		};

		if (clientsList) {
			fetchData();
		}
	}, [clientsList]);

	return (
		<UniversalTable<ProjectTableRow>
			headers={headersForProjects}
			activeItems={tableData.toSorted((a, b) =>
				a.status.localeCompare(b.status),
			)}
		/>
	);
};
