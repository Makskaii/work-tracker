import type { GroupedReportFields } from "@/shared/types/table";
import type { User } from "@/shared/types/types";
import type { ActivityListItem } from "../../../types/types";
import cls from "../ReportsCalendar.module.scss";
import { CompactReportRow } from "./CompactReportRow";
import { PanelSkeleton } from "./PanelSkeleton";

type ReportsPanelProps = {
	projectTitle?: string;
	reports: GroupedReportFields[];
	users: User[];
	activities: ActivityListItem[];
	isLoading: boolean;
	onOpenReport: (reportId: string) => void;
};

export const ReportsPanel = ({
	projectTitle,
	reports,
	users,
	activities,
	isLoading,
	onOpenReport,
}: ReportsPanelProps) => (
	<section
		className={`${cls.panel} ${cls.reportsPanel}`}
		aria-label="Отчёты проекта"
	>
		<div className={cls.panelHeader}>
			<h3>{projectTitle ? `Отчёты: ${projectTitle}` : "Отчёты"}</h3>
			<span>{reports.length}</span>
		</div>
		<div className={cls.reportList}>
			{isLoading ? (
				<PanelSkeleton rows={8} variant="report" />
			) : (
				reports.map((report) => (
					<CompactReportRow
						key={report.id}
						report={report}
						users={users}
						activities={activities}
						onOpenReport={onOpenReport}
					/>
				))
			)}
			{!isLoading && !reports.length && (
				<div className={cls.emptyState}>
					{projectTitle ? "Нет отчётов за выбранный период" : "Выберите проект"}
				</div>
			)}
		</div>
	</section>
);
