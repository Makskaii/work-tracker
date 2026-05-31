import { ReportCodes } from "@/components/calendar/constants/const";
import type { User } from "@/shared/types/types";
import type { ActivityListItem } from "../../../types/types";
import {
	formatHours,
	getActivityName,
	getUserName,
	toNumber,
} from "../model/profitabilityUtils";
import type { ProfitabilityReportItem } from "../model/types";
import styles from "../SalesProfitabilityReport.module.scss";

type ReportsTabProps = {
	activities: ActivityListItem[];
	items: ProfitabilityReportItem[];
	users: User[];
	openReport: (id: string | number) => void;
};

export const ReportsTab = ({
	activities,
	items,
	users,
	openReport,
}: ReportsTabProps) => (
	<div className={styles.tableCard}>
		<div className={styles.tableTitle}>
			Все отчёты сотрудников ({items.length})
		</div>
		<div className={styles.reportsTable}>
			<div className={styles.reportsHead}>
				<span>Дата</span>
				<span>Сотрудник</span>
				<span>Проект</span>
				<span>Задача</span>
				<span>Активность</span>
				<span>Часы</span>
				<span>Клиентский отчёт</span>
			</div>
			{items.length ? (
				items.map(({ report, project }) => (
					<button
						key={report.id}
						type="button"
						className={styles.reportRow}
						onClick={() => openReport(report.id)}
					>
						<span>
							{new Date(report.begindate).toLocaleDateString("ru-RU")}
						</span>
						<span>{getUserName(users, report.assignedById)}</span>
						<span>{project.title}</span>
						<span>{report[ReportCodes.title]}</span>
						<span>
							{getActivityName(activities, report[ReportCodes.activityType])}
						</span>
						<strong>
							{formatHours(toNumber(report[ReportCodes.timeSpent]))}
						</strong>
						<span className={styles.paymentPill}>Показывать</span>
					</button>
				))
			) : (
				<div className={styles.emptyState}>
					Отчёты по проектам сделки не найдены
				</div>
			)}
		</div>
	</div>
);
