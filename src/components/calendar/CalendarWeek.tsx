import cls from "./WeekCalendar.module.scss";

interface ReportProps {
	id: string;
	title: string;
	day: string;
	taskId: string;
	timeSpent: number;
	responsible: string;
}

interface DayProps {
	id: string;
	date: string | null | Date;
	dayNumber: number | null;
	dayName: string | null;
	fullDayName: string;
	isToday: boolean;
	isWeekend: boolean;
	isCurrentMonth: boolean;
	isEmpty: boolean;
	totalHours?: number | null;
	reports?: ReportProps[] | null;
}

export const WeekCalendar = ({ week }: { week: DayProps[] }) => {
	const HOUR_HEIGHT = 800 / 8;
	const START_HOUR = 10;
	const END_HOUR = 19;

	return (
		<div
			style={{
				display: "flex",
				padding: "1rem",
				borderRadius: "10px",
				width: "100%",
			}}
			className={cls.container}
		>
			<div
				style={{
					display: "flex",
				}}
			>
				<div className={cls["time-gutter"]}>
					<div
						style={{
							padding: "0.5rem 1rem",
							height: "92px",
						}}
					>
						Время
					</div>
					{Array.from({ length: END_HOUR - START_HOUR + 1 }, (_, i) => {
						const hour = START_HOUR + i;
						return (
							<div
								key={hour}
								className={cls["hour-marker"]}
								style={{ height: HOUR_HEIGHT }}
							>
								<span className={cls["hour-label"]}>{hour}:00</span>
							</div>
						);
					})}
				</div>
				{week.map((day) => (
					<div
						key={day.id}
						style={{
							minWidth: "200px",
							position: "relative",
						}}
					>
						<div
							data-today={day.isToday}
							style={{
								padding: "1rem",
							}}
							className={cls.weekHeader}
							data-weekend={day.isWeekend}
						>
							<div className={cls.dayName}>{day.dayName}</div>
							<div className={cls.dayNumber}>{day.dayNumber}</div>
						</div>

						<div
							className={cls.weekBody}
							style={{
								flexDirection: "column",
								justifyContent: "space-between",
							}}
						>
							<div
								style={{
									display: "flex",
									flexDirection: "column",
									padding: "1rem",
									gap: "15px",
								}}
							>
								{day.reports?.map((report) => (
									<div
										style={{
											minHeight: HOUR_HEIGHT * report.timeSpent,
											maxHeight: HOUR_HEIGHT * report.timeSpent,
											height: HOUR_HEIGHT * report.timeSpent,
											maxWidth: "200px",
										}}
										className={cls.reportItem}
									>
										{report.title}
									</div>
								))}
							</div>
						</div>
					</div>
				))}
			</div>
		</div>
	);
};
