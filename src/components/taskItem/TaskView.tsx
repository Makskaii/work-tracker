import { useEffect, useState } from "react";
import { $api } from "@/shared/config";
import { Endpoints, EntityTypeIds } from "@/shared/constants/const";
import type { TaskProps } from "@/shared/types/types";
import { convertNumberFormat, convertToDate } from "@/shared/utils";
import { ReportCodes, TaskCodes } from "../calendar/constants/const";
import type { ReportProps } from "../calendar/types/types";
import { Spinner } from "../spinner/Spinner";
import { InfoCard } from "./TaskInfoCard";

export const TaskView = ({
	taskId,
	onClose,
}: {
	taskId: string;
	onClose?: () => void;
}) => {
	const [task, setTask] = useState<TaskProps | null>(null);
	const [loading, setLoading] = useState<boolean>(false);
	const [reports, setReports] = useState<ReportProps[]>([]);

	useEffect(() => {
		const fetchTask = async () => {
			setLoading(true);

			try {
				const response = await $api.get(Endpoints.item, {
					params: {
						entityTypeId: EntityTypeIds.tasks,
						id: taskId,
					},
				});

				setTask(response.data.result.item);
			} catch (error) {
				console.log(error);
			} finally {
				setLoading(false);
			}
		};

		const getReportsByTask = async () => {
			try {
				const reports = await $api.get<{ result: { items: ReportProps[] } }>(
					Endpoints.crmItems,
					{
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
								ReportCodes.show,
								"assignedById",
								"createdTime",
								"lastActivityTime",
								`parentId1072`,
							],
							filter: {
								[ReportCodes.parentId]: taskId,
								[`!${ReportCodes.show}`]: "N",
							},
						},
					},
				);

				setReports(reports.data.result.items ?? []);
			} catch (error) {
				console.log("Ошибка при получении отчетов по задачам", error);
			}
		};

		if (taskId) {
			fetchTask();
			getReportsByTask();
		}
	}, [taskId]);

	if (loading) {
		return <Spinner />;
	}
	if (!task) {
		return (
			<div
				style={{
					padding: "24px",
					borderRadius: "16px",
					background: "#fff",
					boxShadow:
						"rgba(17, 24, 39, 0.06) 0px 8px 24px, rgba(17, 24, 39, 0.04) 0px 1px 3px",
					color: "#6b7280",
				}}
			>
				Задача не найдена
			</div>
		);
	}

	return (
		<div
			style={{
				background: "#fff",
				borderRadius: "20px",
				padding: "24px",
				boxShadow:
					"rgba(17, 24, 39, 0.06) 0px 10px 30px, rgba(17, 24, 39, 0.04) 0px 1px 3px",
				display: "flex",
				flexDirection: "column",
				gap: "20px",
				border: "1px solid #f1f5f9",
				position: "relative",
			}}
		>
			{task && (
				<>
					<div
						style={{
							display: "flex",
							justifyContent: "space-between",
							alignItems: "flex-start",
							gap: "16px",
							flexWrap: "wrap",
						}}
					>
						<div
							style={{
								display: "flex",
								flexDirection: "column",
								gap: "8px",
								minWidth: 0,
								flex: 1,
							}}
						>
							<div
								style={{
									fontSize: "12px",
									fontWeight: 600,
									letterSpacing: "0.08em",
									textTransform: "uppercase",
									color: "#94a3b8",
								}}
							>
								Задача
							</div>

							<h2
								style={{
									margin: 0,
									fontSize: "24px",
									lineHeight: 1.3,
									fontWeight: 700,
									color: "#0f172a",
									wordBreak: "break-word",
								}}
							>
								{task.title || "Без названия"}
							</h2>
						</div>

						<div
							style={{
								padding: "8px 12px",
								borderRadius: "999px",
								background: "#eff6ff",
								color: "#1d4ed8",
								fontSize: "13px",
								fontWeight: 600,
								whiteSpace: "nowrap",
								cursor: "pointer",
							}}
							onClick={(e) => {
								e.stopPropagation();
								console.log("in");
								onClose?.();
							}}
						>
							Закрыть
						</div>
					</div>

					<div
						style={{
							display: "grid",
							gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))",
							gap: "12px",
						}}
					>
						<InfoCard
							label="План по часам"
							value={
								task[TaskCodes.hours]
									? `${convertNumberFormat(task[TaskCodes.hours])} ч.`
									: "—"
							}
						/>
					</div>

					<div
						style={{
							display: "flex",
							flexDirection: "column",
							gap: "10px",
							padding: "18px",
							borderRadius: "16px",
							background: "#f8fafc",
							border: "1px solid #e2e8f0",
						}}
					>
						<div
							style={{
								fontSize: "14px",
								fontWeight: 600,
								color: "#334155",
							}}
						>
							Описание
						</div>

						<div
							style={{
								fontSize: "15px",
								lineHeight: 1.6,
								color: "#475569",
								whiteSpace: "pre-wrap",
								wordBreak: "break-word",
							}}
						>
							{task[TaskCodes.description]
								? String(task[TaskCodes.description])
								: "Описание отсутствует"}
						</div>
					</div>

					<div
						style={{
							display: "grid",
							gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))",
							gap: "12px",
						}}
					>
						<InfoCard label="Создано" value={convertToDate(task.createdTime)} />
					</div>

					<div
						style={{
							display: "flex",
							flexDirection: "column",
							gap: "10px",
							padding: "18px",
							borderRadius: "16px",
							background: "#f8fafc",
							border: "1px solid #e2e8f0",
						}}
					>
						<div
							style={{
								fontSize: "14px",
								fontWeight: 600,
								color: "#334155",
							}}
						>
							Активность
						</div>

						<div
							style={{
								fontSize: "15px",
								lineHeight: 1.6,
								color: "#475569",
								whiteSpace: "pre-wrap",
								wordBreak: "break-word",
								display: "flex",
								flexDirection: "column",
								gap: "10px",
							}}
						>
							{reports.length !== 0 ? (
								reports.map((report) => (
									<InfoCard label="Создано" value={report[ReportCodes.title]} />
								))
							) : (
								<div>Нет активности</div>
							)}
						</div>
					</div>
				</>
			)}
		</div>
	);
};
