import type { Dayjs } from "dayjs";
import dayjs from "dayjs";
import { useEffect, useMemo, useState } from "react";
import { useOutletContext } from "react-router";
import { Endpoints, EntityTypeIds } from "@/shared/constants/const";
import { useLoadAllData } from "@/shared/hooks/useLoadAllTasks";
import type { ReportsContext } from "@/shared/types/types";
import { getWeekBorders } from "@/shared/utils/statisticUtils/generateWeekBorders";
import { convertToMinutesOrHours } from "@/shared/utils/utils";
import { Modal } from "../modal";
import {
	ActivityTitle,
	ActivityType,
	dtoFieldsCodesDailyReports,
} from "./constants/const";
import { buildWeekCalendarFromReports } from "./helpers/generateWeek";
import { getColorAdnBorder } from "./helpers/getReportItemColors";
import type { ReportProps } from "./types/types";
import cls from "./WeekCalendar.module.scss";

const today = dayjs();

const WeekCalendar = () => {
	const HOUR_HEIGHT = 800 / 8;
	const [isModalOpen, setIsModalOpen] = useState(false);
	const [activeReport, setActiveReport] = useState<ReportProps>();
	const [day, setDay] = useState<Dayjs>(today);
	const borders = useMemo(() => getWeekBorders(dayjs(day)), [day]);
	const { user } = useOutletContext<ReportsContext>();

	const { startOfTheWeek, endOfTheWeek } = borders;

	const { data, setFilters } = useLoadAllData<ReportProps>({
		initialEndpoint: Endpoints.crmItems,
		initialFilters: {
			params: {
				entityTypeId: EntityTypeIds.reports,
				select: [
					"id",
					"title",
					"begindate",
					dtoFieldsCodesDailyReports.title,
					dtoFieldsCodesDailyReports.timeSpent,
					dtoFieldsCodesDailyReports.project,
					dtoFieldsCodesDailyReports.taskId,
					dtoFieldsCodesDailyReports.activityType,
					"assignedById",
					"createdTime",
					"lastActivityTime",
					`parentId${EntityTypeIds.tasks}`,
				],
				filter: {
					assignedById: user,
					">=begindate": startOfTheWeek,
					"<=begindate": endOfTheWeek,
				},
			},
		},
	});

	useEffect(() => {
		if (day)
			setFilters({
				params: {
					entityTypeId: EntityTypeIds.reports,
					select: [
						"id",
						"title",
						"begindate",
						dtoFieldsCodesDailyReports.title,
						dtoFieldsCodesDailyReports.timeSpent,
						dtoFieldsCodesDailyReports.project,
						dtoFieldsCodesDailyReports.taskId,
						dtoFieldsCodesDailyReports.activityType,
						"assignedById",
						"createdTime",
						"lastActivityTime",
						`parentId${EntityTypeIds.tasks}`,
					],
					filter: {
						assignedById: user,
						">=begindate": startOfTheWeek,
						"<=begindate": endOfTheWeek,
					},
				},
			});
	}, [endOfTheWeek, setFilters, startOfTheWeek, user, day]);

	const weekCalendar = useMemo(() => {
		return buildWeekCalendarFromReports(
			data,
			borders,
			dtoFieldsCodesDailyReports.timeSpent,
		);
	}, [data, borders]);
	console.log({ user });
	return (
		<div
			style={{
				display: "flex",
				padding: "1rem",
				borderRadius: "10px",
				width: "100%",
				gap: "10px",
			}}
			className={cls.container}
		>
			<div
				style={{
					display: "flex",
					gap: "10px",
					width: "100%",
					justifyContent: "space-between",
				}}
			>
				<div
					style={{
						display: "flex",
					}}
				>
					<div
						style={{
							background: "rgba(76, 175, 80, 0.2)",
							borderLeft: "4px solid #4caf50",
						}}
					>
						{ActivityTitle[ActivityType.development]}
					</div>
					<div
						style={{
							background: "#eeab6d",
							borderLeft: "4px solid #f3e300",
						}}
					>
						{ActivityTitle[ActivityType.analitycsCall]}
					</div>
					<div
						style={{
							background: "#E6E6FA",
							borderLeft: "4px solid #2414af",
						}}
					>
						{ActivityTitle[ActivityType.clientCall]}
					</div>
					<div
						style={{
							background: "#E6E6FA",
							borderLeft: "4px solid #d397d3",
						}}
					>
						{ActivityTitle[ActivityType.dash]}
					</div>
				</div>

				<div
					style={{
						display: "flex",
						alignItems: "center",
						gap: "1rem",
					}}
				>
					<button
						style={{
							background: "white",
							color: "#aeacac",
						}}
						onClick={() => {
							setDay((prev) => prev.subtract(7, "day"));
						}}
					>
						пред. спринт
					</button>
					<div
						style={{
							display: "flex",
							flexDirection: "column",
							alignItems: "center",
						}}
					>
						<span>Cпринт</span>
						<div>
							{dayjs(borders.startOfTheWeek).format("DD.MM")}-
							{dayjs(borders.endOfTheWeek).format("DD.MM")}
						</div>
					</div>
					<button
						style={{
							background: "white",
							color: "#aeacac",
						}}
						onClick={() => {
							setDay((prev) => prev.add(7, "day"));
						}}
					>
						след. спринт
					</button>
				</div>
			</div>

			<div
				style={{
					display: "flex",
				}}
			>
				{weekCalendar?.map((day) => (
					<div
						key={day.id}
						style={{
							minWidth: "230px",
							position: "relative",
						}}
					>
						<div
							data-today={day.isToday}
							className={cls.weekHeader}
							data-weekend={day.isWeekend}
						>
							<div className={cls.dayName}>{day.dayName}</div>

							<div className={cls.dayNumber}>
								{new Date(day.date ?? "").toLocaleDateString("ru-RU", {
									day: "numeric",
									month: "short",
								})}
							</div>
						</div>

						<div
							className={cls.weekBody}
							style={{
								flexDirection: "column",
								justifyContent: "space-between",
								height: "100%",
							}}
						>
							<div
								style={{
									display: "flex",
									flexDirection: "column",
									padding: "0.5rem 1rem",
									maxWidth: "230px",
									boxSizing: "border-box",
									height: "100%",
								}}
							>
								{day.reports?.map((report) => (
									<div
										key={report.id}
										title={report[dtoFieldsCodesDailyReports.title]}
										style={{
											minHeight:
												HOUR_HEIGHT *
												+report[dtoFieldsCodesDailyReports.timeSpent],
											maxHeight:
												HOUR_HEIGHT *
												+report[dtoFieldsCodesDailyReports.timeSpent],
											height:
												HOUR_HEIGHT *
												+report[dtoFieldsCodesDailyReports.timeSpent],
											maxWidth: "200px",
											...getColorAdnBorder(report),
											display: "flex",
											flexDirection: "row",
											justifyContent: "space-between",
										}}
										className={cls.reportItem}
										onClick={() => {
											setIsModalOpen(true);
											setActiveReport(report);
										}}
									>
										<span
											style={{
												textAlign: "left",
											}}
										>
											{report[dtoFieldsCodesDailyReports.title]}
										</span>
										<span
											style={{
												whiteSpace: "nowrap",
											}}
										>
											{convertToMinutesOrHours(
												report[dtoFieldsCodesDailyReports.timeSpent],
											)}
										</span>
									</div>
								))}
							</div>
						</div>
					</div>
				))}
			</div>
			<Modal
				isOpen={isModalOpen}
				onClose={() => setIsModalOpen(false)}
				innerScroll
			>
				{activeReport && (
					<div
						style={{
							padding: "0 1rem",
							display: "flex",
							flexDirection: "column",
							gap: "10px",
						}}
					>
						<div
							style={{
								...getColorAdnBorder(activeReport),
								padding: "1rem",
								display: "flex",
								justifyContent: "space-between",
							}}
						>
							{
								ActivityTitle[
									activeReport?.[dtoFieldsCodesDailyReports.activityType]
								]
							}
							<div
								style={{
									padding: "0 0.5rem",
								}}
							>
								{convertToMinutesOrHours(
									+activeReport[dtoFieldsCodesDailyReports.timeSpent],
								)}
							</div>
						</div>
						<div
							style={{
								padding: "1rem",
							}}
						>
							{activeReport?.[dtoFieldsCodesDailyReports.title]}
						</div>
					</div>
				)}
			</Modal>
		</div>
	);
};

export default WeekCalendar;
