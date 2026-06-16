import {
	getPaymentKindFromReportTaskType,
	getPaymentSortFromReportTaskType,
	PAYMENT_SORT_TITLES,
} from "@/components/calendar/helpers/paymentType";
import type { GroupedReportFields } from "@/shared/types/table";
import type {
	ActivityListItem,
	GroupedClientItem,
	GroupedProjectItem,
} from "../../../types/types";
import { formatHours, parseTimeSpent } from "../model/utils";
import cls from "../ReportsCalendar.module.scss";
import { PanelSkeleton } from "./PanelSkeleton";

type SelectedClientProject = {
	client: GroupedClientItem;
	project: GroupedProjectItem;
} | null;

type ReportsPanelProps = {
	selectedClientProject: SelectedClientProject;
	reports: GroupedReportFields[];
	activities: ActivityListItem[];
	isLoading: boolean;
	onOpenReport: (reportId: string) => void;
	getEmployeeTitle: (userId: string | number) => string;
	getActivityTitle: (activityId: number) => string;
};

export const ReportsPanel = ({
	selectedClientProject,
	reports,
	activities,
	isLoading,
	onOpenReport,
	getEmployeeTitle,
	getActivityTitle,
}: ReportsPanelProps) => (
	<section className={`${cls.panel} ${cls.reportsPanel}`}>
		<div className={cls.panelHeader}>
			<h3>
				Отчеты: {selectedClientProject?.client.clientTitle ?? "клиент"} -{" "}
				{selectedClientProject?.project.projectTitle ?? "проект"}
			</h3>
			<span>{reports.length}</span>
		</div>
		<div className={cls.reportList}>
			{isLoading ? (
				<PanelSkeleton rows={8} variant="report" />
			) : (
				reports.map((report) => {
					const paymentKind = getPaymentKindFromReportTaskType(
						report,
						activities,
					);

					return (
						<button
							type="button"
							key={report.id}
							className={cls.reportRow}
							onClick={() => onOpenReport(report.id)}
						>
							<div className={cls.reportMain}>
								<strong>{report.title}</strong>
								<small>
									{getEmployeeTitle(report.assignedById)} ·{" "}
									{new Date(report.day).toLocaleDateString("ru-RU")}
								</small>
							</div>
							<span className={cls.activityBadge}>
								{getActivityTitle(Number(report.activity))}
							</span>
							<span
								className={`${cls.paymentLabel} ${
									paymentKind ? cls[paymentKind] : ""
								}`}
							>
								{paymentKind
									? PAYMENT_SORT_TITLES[
											getPaymentSortFromReportTaskType(report, activities) ?? 0
										]
									: "Без типа"}
							</span>
							<strong className={cls.reportHours}>
								{formatHours(parseTimeSpent(report.timeSpent))}
							</strong>
						</button>
					);
				})
			)}
			{!isLoading && !reports.length && (
				<div className={cls.emptyState}>Выберите клиента или проект</div>
			)}
		</div>
	</section>
);
