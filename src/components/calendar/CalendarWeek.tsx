import { useState } from "react";
import { convertToMinutesOrHours } from "@/shared/utils/utils";
import { Modal } from "../modal";
import { ActivityTitle, ActivityType } from "./constants/const";
import { getColorAdnBorder } from "./helpers/getReportItemColors";
import type { DayProps, GroupedReportFields } from "./types/types";
import cls from "./WeekCalendar.module.scss";

const WeekCalendar = ({ week }: { week: DayProps[] }) => {
	const HOUR_HEIGHT = 800 / 8;
	const START_HOUR = 10;
	const END_HOUR = 19;
	const [isModalOpen, setIsModalOpen] = useState(false);
	const [activeReport, setActiveReport] = useState<GroupedReportFields>();

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
					padding: "0 1rem",
					gap: "10px",
					width: "100%",
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
					{" "}
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
				}}
			>
				<div>
					<div
						style={{
							height: "92px",
						}}
					>
						Время
					</div>
					{Array.from({ length: END_HOUR - START_HOUR + 1 }, (_, i) => {
						const hour = START_HOUR + i;
						return (
							<div key={hour} style={{ height: HOUR_HEIGHT }}>
								<span>{hour}:00</span>
							</div>
						);
					})}
				</div>
				{week.map((day) => (
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
										title={report.title}
										style={{
											minHeight: HOUR_HEIGHT * +report.timeSpent,
											maxHeight: HOUR_HEIGHT * +report.timeSpent,
											height: HOUR_HEIGHT * +report.timeSpent,
											maxWidth: "200px",
											...getColorAdnBorder(report),
										}}
										className={cls.reportItem}
										onClick={() => {
											setIsModalOpen(true);
											setActiveReport(report);
										}}
									>
										{report.title}{" "}
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
							{ActivityTitle[activeReport?.project ?? ActivityType.dash]}
							<div
								style={{
									padding: "0 0.5rem",
								}}
							>
								{convertToMinutesOrHours(+activeReport.timeSpent)}
							</div>
						</div>
						<div
							style={{
								padding: "1rem",
							}}
						>
							{activeReport?.title}
						</div>
					</div>
				)}
			</Modal>
		</div>
	);
};

export default WeekCalendar;
