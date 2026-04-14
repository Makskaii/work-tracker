import dayjs from "dayjs";
import { useEffect, useMemo, useState } from "react";
import { useOutletContext } from "react-router";
import { Endpoints, EntityTypeIds } from "@/shared/constants/const";
import { useLoadAllData } from "@/shared/hooks/useLoadAllTasks";
import { useSprintBorders } from "@/shared/hooks/useSprintBorders";
import type { ReportsContext } from "@/shared/types/types";
import { convertToMinutesOrHours } from "@/shared/utils/utils";
import { Modal } from "../modal";
import { ActivityTitle, ReportCodes } from "./constants/const";
import { buildWeekCalendarFromReports } from "./helpers/generateWeek";
import { getColorAdnBorder } from "./helpers/getReportItemColors";
import type { ReportProps } from "./types/types";
import cls from "./WeekCalendar.module.scss";

const WeekCalendar = () => {
	const HOUR_HEIGHT = 800 / 8;
	const [isModalOpen, setIsModalOpen] = useState(false);
	const [activeReport, setActiveReport] = useState<ReportProps>();
	const { user } = useOutletContext<ReportsContext>();

	const { startOfTheWeek, endOfTheWeek, setDay, day } = useSprintBorders();

	const { data, setFilters } = useLoadAllData<ReportProps>({
		initialEndpoint: Endpoints.crmItems,
		initialFilters: {
			params: {
				entityTypeId: EntityTypeIds.reports,
				select: [
					"id",
					"title",
					"begindate",
					ReportCodes.title,
					ReportCodes.timeSpent,
					ReportCodes.project,
					ReportCodes.taskId,
					ReportCodes.activityType,
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
						ReportCodes.title,
						ReportCodes.timeSpent,
						ReportCodes.project,
						ReportCodes.taskId,
						ReportCodes.activityType,
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
			{
				startOfTheWeek,
				endOfTheWeek,
			},
			ReportCodes.timeSpent,
		);
	}, [data, startOfTheWeek, endOfTheWeek]);

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
							{dayjs(startOfTheWeek).format("DD.MM")}-
							{dayjs(endOfTheWeek).format("DD.MM")}
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
										title={report[ReportCodes.title]}
										style={{
											minHeight: HOUR_HEIGHT * +report[ReportCodes.timeSpent],
											maxHeight: HOUR_HEIGHT * +report[ReportCodes.timeSpent],
											height: HOUR_HEIGHT * +report[ReportCodes.timeSpent],
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
											{report[ReportCodes.title]}
										</span>
										<span
											style={{
												whiteSpace: "nowrap",
											}}
										>
											{convertToMinutesOrHours(report[ReportCodes.timeSpent])}
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
							{ActivityTitle[activeReport?.[ReportCodes.activityType]]}
							<div
								style={{
									padding: "0 0.5rem",
								}}
							>
								{convertToMinutesOrHours(+activeReport[ReportCodes.timeSpent])}
							</div>
						</div>
						<div
							style={{
								padding: "1rem",
							}}
						>
							{activeReport?.[ReportCodes.title]}
						</div>
					</div>
				)}
			</Modal>
		</div>
	);
};

export default WeekCalendar;
