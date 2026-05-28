import { useEffect, useMemo, useState } from "react";
import { useOutletContext } from "react-router";
import { TaskCodes } from "@/components/calendar/constants/const";
import { Spinner } from "@/components/spinner/Spinner";
import { StatsModal } from "@/components/statistics/EmployeeStats/StatsModal";
import {
	DEPARTMENT_IDS,
	Endpoints,
	EntityTypeIds,
	TASK_SELECT_FIELDS,
} from "@/shared/constants/const";
import { useLoadAllData } from "@/shared/hooks/useLoadAllTasks";
import type { ReportsContext, TaskProps, User } from "@/shared/types/types";
import { Piecework } from "./Piecework";
import cls from "./UserReports.module.scss";

type UserReportsTab = "staff" | "piecework";

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
	const { users, projects } = useOutletContext<ReportsContext>();
	const [activeUser, setActiveUser] = useState<User>();
	const [activeProjectId, setActiveProjectId] = useState("");
	const [activeTab, setActiveTab] = useState<UserReportsTab>("staff");
	const [sprintTasks, setSprintTasks] = useState<TaskProps[]>([]);
	const [isPmSidebarCollapsed, setIsPmSidebarCollapsed] = useState(false);
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

	const activeUserProjects = useMemo(() => {
		const result = new Map<
			string,
			{ id: string; name: string; tasksCount: number }
		>();

		sprintTasks.forEach((task) => {
			const projectId = String(
				task[TaskCodes.parentproject] ?? task[TaskCodes.project] ?? "",
			).trim();

			if (!projectId) {
				return;
			}

			const project = projects.find((item) => String(item.id) === projectId);

			if (!project) {
				return;
			}

			const current = result.get(projectId);

			result.set(projectId, {
				id: projectId,
				name: project.name ?? project.title,
				tasksCount: (current?.tasksCount ?? 0) + 1,
			});
		});

		return Array.from(result.values());
	}, [sprintTasks, projects]);

	useEffect(() => {
		if (!activeUser && staffUsers.length) {
			setActiveUser(staffUsers[0]);
		}
	}, [activeUser, staffUsers]);

	useEffect(() => {
		setSprintTasks([]);
		setActiveProjectId("");
	}, [activeUser?.id]);

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
										isActive={activeUser?.id === user.id}
										onClick={() => setActiveUser(user)}
									/>
								);
							})}

							<div className={cls.pmSectionTitle}>Клиенты и проекты</div>

							{activeUserProjects.length > 0 ? (
								<div className={cls.pmProjectsList}>
									{activeUserProjects.map((project) => (
										<button
											key={project.id}
											type="button"
											className={`${cls.pmItem} ${cls.pmProject} ${
												activeProjectId === project.id ? cls.pmItemActive : ""
											}`}
											onClick={() => setActiveProjectId(project.id)}
										>
											<span className={cls.pmItemTitle}>{project.name}</span>
											<span className={cls.pmItemMeta}>
												Задач: {project.tasksCount}
											</span>
										</button>
									))}
								</div>
							) : (
								<div className={cls.pmEmpty}>Нет проектов</div>
							)}
						</div>
					</aside>

					<section className={cls.pmDetail}>
						{activeUser ? (
							<StatsModal
								user={activeUser}
								onTasksChange={setSprintTasks}
								selectedProjectId={activeProjectId}
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
