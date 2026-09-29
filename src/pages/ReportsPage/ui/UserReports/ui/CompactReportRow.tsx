import { useState } from "react";
import { isNotAtWorkReport } from "@/components/calendar/helpers/reportCategory";
import type { GroupedReportFields } from "@/shared/types/table";
import type { User } from "@/shared/types/types";
import type { ActivityListItem } from "../../../types/types";
import { formatHours, parseTimeSpent } from "../model/utils";
import cls from "../ReportsCalendar.module.scss";

type CompactReportRowProps = {
	report: GroupedReportFields;
	users: User[];
	activities: ActivityListItem[];
	onOpenReport: (id: string) => void;
};

export const CompactReportRow = ({
	report,
	users,
	activities,
	onOpenReport,
}: CompactReportRowProps) => {
	const user = users.find(
		(item) => String(item.id) === String(report.assignedById),
	);
	const name = user?.title || `Сотрудник #${report.assignedById}`;
	const [failedPhoto, setFailedPhoto] = useState<string>();
	const photo = user?.photo;
	const absent = isNotAtWorkReport(report, activities);
	// Descriptions are rendered as text, never as executable HTML.
	const description = (report.title || "")
		.replace(/<[^>]*>/g, " ")
		.replace(
			/\[(?:\/?(?:b|i|u|s|p|br|list|\*|quote)|\/?url(?:=[^\]]*)?)\]/gi,
			" ",
		)
		.replace(/\s+/g, " ")
		.trim();
	const date = new Date(report.day);
	const dateLabel = Number.isNaN(date.getTime())
		? ""
		: date.toLocaleDateString("ru-RU", { day: "numeric", month: "short" });
	const hours = formatHours(parseTimeSpent(report.timeSpent));
	return (
		<button
			type="button"
			className={`${cls.compactReportRow} ${absent ? cls.absenceReport : ""}`}
			onClick={() => onOpenReport(report.id)}
			aria-label={`${name}, ${hours}${absent ? ", Not at work" : ""}, ${description || "Без описания"}`}
		>
			<span className={cls.reportAvatar} title={name}>
				{photo && photo !== failedPhoto ? (
					<img
						src={photo}
						alt={name}
						loading="lazy"
						onError={() => setFailedPhoto(photo)}
					/>
				) : (
					<span aria-label={name}>
						{name
							.split(/\s+/)
							.slice(0, 2)
							.map((part) => part[0])
							.join("")}
					</span>
				)}
			</span>
			<span className={cls.compactReportText}>
				<strong title={description}>
					{description || (absent ? "Отсутствие на работе" : "Без описания")}
				</strong>
				<span className={cls.reportMeta}>
					{absent && <span className={cls.absenceBadge}>Not at work</span>}
					<time dateTime={report.day}>{dateLabel}</time>
				</span>
			</span>
			<strong className={cls.compactReportHours}>{hours}</strong>
		</button>
	);
};
