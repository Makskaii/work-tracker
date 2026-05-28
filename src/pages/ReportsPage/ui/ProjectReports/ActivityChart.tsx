import dayjs from "dayjs";
import { useMemo, useState } from "react";
import { EntityTypeIds } from "@/shared/constants/const";
import { useBitrixSlider } from "@/shared/hooks/useBitrixSlider";
import { buildActivityChartData } from "../../helpers/buildActivityData";
import type {
	ChartReportItem,
	ProjectActivityChartProps,
} from "../../types/types";

const GROUP_COLORS: Record<string, string> = {
	"0": "#4f46e5",
	"1": "#0ea5e9",
	"2": "#94a3b8",
};

type SelectedSegment = {
	date: string;
	activityName: string;
	totalHours: number;
	reports: ChartReportItem[];
} | null;

export const ProjectActivityChart = ({
	reports,
	activities,
	users,
	startOfWeek,
}: ProjectActivityChartProps) => {
	const [selectedSegment, setSelectedSegment] = useState<SelectedSegment>(null);
	const { openTask } = useBitrixSlider();
	const data = useMemo(() => {
		return buildActivityChartData({
			reports,
			activities,
			startOfWeek,
		});
	}, [reports, activities, startOfWeek]);

	const usersMap = useMemo(() => {
		return new Map(users.map((user) => [String(user.id), user]));
	}, [users]);

	return (
		<div style={{ display: "flex", flexDirection: "column", gap: "1rem" }}>
			<div
				style={{
					display: "grid",
					gridTemplateColumns: "repeat(7, minmax(0, 1fr))",
					gap: "12px",
					alignItems: "end",
				}}
			>
				{data.map((day) => (
					<div
						key={day.date}
						style={{
							display: "flex",
							flexDirection: "column",
							gap: "8px",
							minWidth: 0,
						}}
					>
						<div
							style={{
								textAlign: "center",
								fontSize: "12px",
								color: "#9fb2cb",
							}}
						>
							<div>{day.dayName}</div>
							<div>{dayjs(day.date).format("DD.MM")}</div>
							<div style={{ marginTop: 4, fontWeight: 600 }}>
								{day.totalHours.toFixed(1)}ч
							</div>
						</div>

						<div
							style={{
								height: "280px",
								border: "1px solid rgba(73, 111, 160, 0.38)",
								borderRadius: "8px",
								background: "#07111f",
								overflow: "hidden",
								display: "flex",
								flexDirection: "column",
								justifyContent: "flex-end",
							}}
						>
							{day.totalHours > 0 ? (
								day.segments.map((segment) => (
									<button
										key={`${day.date}-${segment.activityId}`}
										type="button"
										onClick={() =>
											setSelectedSegment({
												date: day.date,
												activityName: segment.activityName,
												totalHours: segment.totalHours,
												reports: segment.reports,
											})
										}
										title={`${segment.activityName}: ${segment.totalHours.toFixed(2)}ч`}
										style={{
											height: `${Math.max(segment.percent, 8)}%`,
											minHeight: "28px",
											border: "none",
											borderTop: "1px solid rgba(255,255,255,0.35)",
											cursor: "pointer",
											background:
												GROUP_COLORS[segment.activitySort] ?? "#94a3b8",
											color: "#fff",
											padding: "6px",
											textAlign: "left",
											display: "flex",
											flexDirection: "column",
											justifyContent: "space-between",
										}}
									>
										<span
											style={{
												fontSize: "12px",
												fontWeight: 600,
												overflow: "hidden",
												textOverflow: "ellipsis",
												whiteSpace: "nowrap",
											}}
										>
											{segment.activityName}
										</span>

										<span style={{ fontSize: "11px", opacity: 0.95 }}>
											{segment.totalHours.toFixed(1)}ч ·{" "}
											{segment.reports.length}
										</span>
									</button>
								))
							) : (
								<div
									style={{
										height: "100%",
										display: "grid",
										placeItems: "center",
										color: "#7d91ad",
										fontSize: "12px",
									}}
								>
									Нет отчетов
								</div>
							)}
						</div>
					</div>
				))}
			</div>

			{selectedSegment && (
				<div
					style={{
						border: "1px solid rgba(73, 111, 160, 0.38)",
						borderRadius: "8px",
						padding: "1rem",
						background: "#0b1726",
					}}
				>
					<div
						style={{
							display: "flex",
							justifyContent: "space-between",
							marginBottom: "1rem",
							gap: "1rem",
						}}
					>
						<div>
							<div style={{ fontWeight: 700 }}>
								{selectedSegment.activityName}
							</div>
							<div style={{ color: "#9fb2cb", fontSize: "14px" }}>
								{dayjs(selectedSegment.date).format("DD.MM.YYYY")} ·{" "}
								{selectedSegment.totalHours.toFixed(2)}ч
							</div>
						</div>

						<button
							type="button"
							onClick={() => setSelectedSegment(null)}
							style={{
								border: "1px solid rgba(83, 137, 211, 0.46)",
								borderRadius: "7px",
								background: "#183153",
								color: "#cfe2ff",
								cursor: "pointer",
							}}
						>
							Закрыть
						</button>
					</div>

					<div style={{ display: "flex", flexDirection: "column", gap: "8px" }}>
						{selectedSegment.reports.map((report) => {
							const user = usersMap.get(String(report.assignedById));
							const taskId = report.raw.parentId1072 ?? report.taskId;

							return (
								<div
									onClick={() => openTask(report.raw.id, EntityTypeIds.reports)}
									key={report.id}
									style={{
										border: "1px solid rgba(73, 111, 160, 0.38)",
										borderRadius: "8px",
										padding: "10px 12px",
										display: "flex",
										flexDirection: "column",
										gap: "4px",
										background: "#101d2f",
									}}
								>
									<div style={{ fontWeight: 600 }}>{report.title}</div>
									<div style={{ fontSize: "14px", color: "#9fb2cb" }}>
										Исполнитель: {user?.title ?? report.assignedById}
									</div>
									<div style={{ fontSize: "14px", color: "#9fb2cb" }}>
										Время: {report.hours.toFixed(2)}ч
									</div>

									{!!taskId && (
										<div
											style={{
												fontSize: "14px",
												color: "#9fb2cb",
												display: "flex",
												justifyContent: "flex-end",
												alignItems: "center",
											}}
										>
											<button
												onClick={(e) => {
													e.stopPropagation();
													openTask(taskId);
												}}
												type="button"
												style={{
													background: "#2196f3",
												}}
											>
												Задача
											</button>
										</div>
									)}
								</div>
							);
						})}
					</div>
				</div>
			)}
		</div>
	);
};
