import { useEffect, useMemo, useState } from "react";
import { useOutletContext } from "react-router";
import { ReportCodes, TaskCodes } from "@/components/calendar/constants/const";
import type { ReportProps } from "@/components/calendar/types/types";
import { Spinner } from "@/components/spinner/Spinner";
import { StatsModal } from "@/components/statistics/EmployeeStats/StatsModal";
import { $api } from "@/shared/config";
import {
	ClientsCodes,
	DEPARTMENT_IDS,
	Endpoints,
	EntityTypeIds,
	TASK_SELECT_FIELDS,
} from "@/shared/constants/const";
import { useLoadAllData } from "@/shared/hooks/useLoadAllTasks";
import { useSprintBorders } from "@/shared/hooks/useSprintBorders";
import type { ReportsContext, TaskProps, User } from "@/shared/types/types";
import { Piecework } from "./Piecework";
import cls from "./UserReports.module.scss";

type UserReportsTab = "staff" | "piecework";
type SelectedContext =
	| { type: "employee"; id: string }
	| { type: "client"; id: string }
	| { type: "project"; id: string };

type CrmItemListResponse<T> = {
	result?: {
		items?: T[];
	};
	next?: number | null;
};

const REPORT_SELECT_FIELDS = [
	"id",
	"title",
	"begindate",
	ReportCodes.timeSpent,
	ReportCodes.taskId,
	`parentId${EntityTypeIds.tasks}`,
] as const;

const fetchAllCrmItems = async <T,>({
	entityTypeId,
	select,
	filter,
}: {
	entityTypeId: number;
	select: readonly string[];
	filter: Record<string, unknown>;
}) => {
	const limit = 50;
	let start = 0;
	let next: number | null | undefined = 0;
	const items: T[] = [];

	while (next !== null) {
		const response = await $api.get<CrmItemListResponse<T>>(Endpoints.crmItems, {
			params: {
				entityTypeId,
				select,
				filter,
				start,
			},
		});

		items.push(...(response.data.result?.items ?? []));

		next = response.data.next ?? null;
		start = next ?? start + limit;
	}

	return items;
};

const getReportTaskId = (report: ReportProps) => {
	const taskId = report[ReportCodes.parentId] ?? report[ReportCodes.taskId];

	return taskId === null || taskId === undefined ? "" : String(taskId).trim();
};

const getNumberValue = (value: unknown) => {
	if (typeof value === "number") {
		return Number.isFinite(value) ? value : 0;
	}

	if (typeof value === "string") {
		const numberValue = Number(value.trim().replace(",", "."));

		return Number.isFinite(numberValue) ? numberValue : 0;
	}

	return 0;
};

const ProjectManagerUserCard = ({
	user,
	taskTitle,
	projectName,
	isActive,
	onClick,
}: {
	user: User;
	taskTitle?: string;
	projectName?: string;
	isActive: boolean;
	onClick: () => void;
}) => {
	return (
		<button
			type="button"
			className={`${cls.pmItem} ${cls.pmEmployee} ${isActive ? cls.pmItemActive : ""
				}`}
			onClick={onClick}
		>
			<img className={cls.pmAvatar} src={user.photo} alt={user.title} />
			<span className={cls.pmItemMain}>
				<span className={cls.pmItemTitle}>{user.title}</span>
				<span className={cls.pmItemMeta}>
					{user.position || "Проектный менеджмент"} · 24/40 ч
				</span>
				{taskTitle && (
					<span className={cls.pmItemMeta}>
						{taskTitle}
						{projectName ? ` · ${projectName}` : ""}
					</span>
				)}
			</span>
		</button>
	);
};

export const NewUserReports = () => {
	const { users, projects, clientsList } = useOutletContext<ReportsContext>();
	const [activeUser, setActiveUser] = useState<User>();
	const [activeProjectId, setActiveProjectId] = useState("");
	const [activeClientId, setActiveClientId] = useState("");
	const [selectedContext, setSelectedContext] = useState<SelectedContext>();
	const [expandedClientId, setExpandedClientId] = useState("");
	const [activeTab, setActiveTab] = useState<UserReportsTab>("staff");
	const [allSprintTasks, setAllSprintTasks] = useState<TaskProps[]>([]);
	const [allSprintReports, setAllSprintReports] = useState<ReportProps[]>([]);
	const [isPmSidebarCollapsed, setIsPmSidebarCollapsed] = useState(false);
	const { setDay, startOfTheWeek, endOfTheWeek } = useSprintBorders("workweek");
	const staffUsers = useMemo(
		() => users.filter((user) => user.department === DEPARTMENT_IDS.DEV),
		[users],
	);

	const { data, loading } = useLoadAllData<TaskProps>({
		initialEndpoint: Endpoints.crmItems,
		initialFilters: {
			params: {
				entityTypeId: EntityTypeIds.tasks,
				select: TASK_SELECT_FIELDS,
				filter: {
					stageId: "DT1072_18:CLIENT",
				},
			},
		},
	});

	const sprintClients = useMemo(() => {
		const reportsByTask = allSprintReports.reduce<Record<string, ReportProps[]>>(
			(acc, report) => {
				const taskId = getReportTaskId(report);

				if (!taskId) {
					return acc;
				}

				acc[taskId] = [...(acc[taskId] ?? []), report];

				return acc;
			},
			{},
		);
		const projectStats = new Map<string, { tasksCount: number; hours: number }>();

		allSprintTasks.forEach((task) => {
			const projectId = String(
				task[TaskCodes.parentproject] ?? task[TaskCodes.project] ?? "",
			).trim();

			if (!projectId) {
				return;
			}

			const taskHours = (reportsByTask[String(task.id)] ?? []).reduce(
				(sum, report) => sum + getNumberValue(report[ReportCodes.timeSpent]),
				0,
			);
			const current = projectStats.get(projectId);

			projectStats.set(projectId, {
				tasksCount: (current?.tasksCount ?? 0) + 1,
				hours: (current?.hours ?? 0) + taskHours,
			});
		});

		const projectsByClient = new Map<
			string,
			{ id: string; name: string; tasksCount: number; hours: number }[]
		>();

		Array.from(projectStats.entries()).forEach(([projectId, stats]) => {
			const project = projects.find((item) => String(item.id) === projectId);

			if (!project) {
				return;
			}

			const clientId = String(project[ClientsCodes.client] ?? "").trim();

			if (!clientId) {
				return;
			}

			projectsByClient.set(clientId, [
				...(projectsByClient.get(clientId) ?? []),
				{
					id: projectId,
					name: project.name ?? project.title,
					tasksCount: stats.tasksCount,
					hours: stats.hours,
				},
			]);
		});

		return Array.from(projectsByClient.entries()).map(
			([clientId, clientProjects]) => {
				const client = clientsList.find((item) => String(item.ID) === clientId);

				return {
					id: clientId,
					name: client?.NAME ?? client?.title ?? `Клиент #${clientId}`,
					projects: clientProjects,
					hours: clientProjects.reduce((sum, project) => sum + project.hours, 0),
				};
			},
		);
	}, [allSprintReports, allSprintTasks, clientsList, projects]);

	useEffect(() => {
		if (!selectedContext && staffUsers.length) {
			const firstUser = staffUsers[0];
			setActiveUser(firstUser);
			setSelectedContext({ type: "employee", id: String(firstUser.id) });
		}
	}, [selectedContext, staffUsers]);

	useEffect(() => {
		let isCancelled = false;

		const loadSprintTasks = async () => {
			try {
				const reports = await fetchAllCrmItems<ReportProps>({
					entityTypeId: EntityTypeIds.reports,
					select: REPORT_SELECT_FIELDS,
					filter: {
						">=begindate": startOfTheWeek,
						"<=begindate": endOfTheWeek,
						stageId: "DT1060_15:PREPARATION",
					},
				});

				if (isCancelled) {
					return;
				}

				setAllSprintReports(reports);

				const taskIds = Array.from(
					new Set(reports.map(getReportTaskId).filter(Boolean)),
				);

				if (!taskIds.length) {
					setAllSprintTasks([]);
					setAllSprintReports([]);
					return;
				}

				const tasks = await fetchAllCrmItems<TaskProps>({
					entityTypeId: EntityTypeIds.tasks,
					select: TASK_SELECT_FIELDS,
					filter: {
						"@id": taskIds,
					},
				});

				if (!isCancelled) {
					setAllSprintTasks(tasks);
				}
			} catch (error) {
				if (!isCancelled) {
					setAllSprintTasks([]);
					setAllSprintReports([]);
					console.log("Ошибка при загрузке проектов спринта", error);
				}
			}
		};

		loadSprintTasks();

		return () => {
			isCancelled = true;
		};
	}, [startOfTheWeek, endOfTheWeek]);

	if (loading) {
		return <Spinner text="Загружаем данные по сотрудникам" />;
	}

	return (
		<div className={cls.page}>
			<div className={cls.tabs} role="tablist" aria-label="Тип оплаты">
				<button
					type="button"
					role="tab"
					aria-selected={activeTab === "staff"}
					className={`${cls.tabButton} ${activeTab === "staff" ? cls.tabButtonActive : ""
						}`}
					onClick={() => setActiveTab("staff")}
				>
					Штат
				</button>
				<button
					type="button"
					role="tab"
					aria-selected={activeTab === "piecework"}
					className={`${cls.tabButton} ${activeTab === "piecework" ? cls.tabButtonActive : ""
						}`}
					onClick={() => setActiveTab("piecework")}
				>
					Сдельная оплата
				</button>
			</div>

			{activeTab === "staff" && (
				<div
					className={`${cls.pmLayout} ${isPmSidebarCollapsed ? cls.pmLayoutCollapsed : ""
						}`}
					role="tabpanel"
				>
					<aside className={cls.pmListPanel}>
						<div className={cls.pmListHead}>
							<button
								type="button"
								className={cls.pmCollapseBtn}
								onClick={() => setIsPmSidebarCollapsed((prev) => !prev)}
								title={
									isPmSidebarCollapsed
										? "Развернуть список"
										: "Свернуть список"
								}
							>
								{isPmSidebarCollapsed ? "⇥" : "⇤"}
							</button>
							<span>Проектный менеджмент</span>
							<span className={cls.pmSprintChip}>спринт</span>
						</div>

						<div className={cls.pmListBody}>
							<div className={cls.pmSectionTitle}>Сотрудники отдела</div>

							{staffUsers.map((user) => {
								const currentTask = data.find(
									(task) => task.assignedById === Number(user.id),
								);
								const project = projects.find(
									(item) =>
										String(item.id) ===
										String(
											currentTask?.[TaskCodes.parentproject] ??
											currentTask?.[TaskCodes.project] ??
											"",
										),
								);

								return (
									<ProjectManagerUserCard
										key={user.id}
										user={user}
										taskTitle={currentTask?.title}
										projectName={project?.name ?? project?.title}
										isActive={
											selectedContext?.type === "employee" &&
											selectedContext.id === String(user.id)
										}
										onClick={() => {
											setActiveProjectId("");
											setActiveClientId("");
											setActiveUser(user);
											setSelectedContext({ type: "employee", id: String(user.id) });
										}}
									/>
								);
							})}

							<div className={cls.pmSectionTitle}>Клиенты и проекты</div>

							{sprintClients.length > 0 ? (
								<div className={cls.pmProjectsList}>
									{sprintClients.map((client) => {
										const isExpanded = expandedClientId === client.id;

										return (
											<div key={client.id} className={cls.pmClientGroup}>
												<div
													className={`${cls.pmItem} ${cls.pmClientShell} ${
														selectedContext?.type === "client" &&
														selectedContext.id === client.id
															? cls.pmItemActive
															: ""
													}`}
												>
													<button
														type="button"
														className={cls.pmClient}
														title={client.name}
														onClick={() => {
															setActiveUser(undefined);
															setActiveProjectId("");
															setActiveClientId(client.id);
															setSelectedContext({ type: "client", id: client.id });
														}}
													>
														<span className={cls.pmLetterAvatar}>{client.name.trim().charAt(0)}</span>
													<span className={cls.pmItemTitle}>{client.name}</span>
														<span className={cls.pmItemMeta}>{client.hours} ч</span>
													</button>

													<button
														type="button"
														className={cls.pmClientToggle}
														aria-expanded={isExpanded}
														title={isExpanded ? "Скрыть проекты" : "Показать проекты"}
														onClick={() => {
															setExpandedClientId((current) =>
																current === client.id ? "" : client.id,
															);
														}}
													>
														{isExpanded ? "⌃" : "⌄"}
													</button>
												</div>

												{isExpanded && (
													<div className={cls.pmClientProjects}>
														{client.projects.map((project) => (
															<button
																key={project.id}
																type="button"
																className={`${cls.pmItem} ${cls.pmProject} ${
																	selectedContext?.type === "project" &&
																	selectedContext.id === project.id
																		? cls.pmItemActive
																		: ""
																}`}
																onClick={() => {
																	setActiveUser(undefined);
																	setActiveClientId("");
																	setActiveProjectId(project.id);
																	setSelectedContext({
																		type: "project",
																		id: project.id,
																	});
																}}
															>
																<span className={cls.pmLetterAvatar}>{project.name.trim().charAt(0)}</span>
																<span className={cls.pmItemTitle}>{project.name}</span>
																<span className={cls.pmItemMeta}>
																	{project.hours} ч · Задач: {project.tasksCount}
																</span>
															</button>
														))}
													</div>
												)}
											</div>
										);
									})}
								</div>
							) : (
								<div className={cls.pmEmpty}>Нет проектов</div>
							)}
						</div>
					</aside>

					<section className={cls.pmDetail}>
						{activeUser || activeClientId || activeProjectId ? (
							<StatsModal
								user={activeUser}
								selectedClientId={activeClientId}
								selectedProjectId={activeProjectId}
								sprintStart={startOfTheWeek}
								sprintEnd={endOfTheWeek}
								onSprintShift={(days) => {
									setDay((prev) =>
										days < 0 ? prev.subtract(7, "day") : prev.add(7, "day"),
									);
								}}
							/>
						) : (
							<div className={cls.emptyDetails}>
								Выберите проектного менеджера
							</div>
						)}
					</section>
				</div>
			)}

			{activeTab === "piecework" && (
				<div className={cls.pieceworkTab} role="tabpanel">
					<Piecework />
				</div>
			)}
		</div>
	);
};
