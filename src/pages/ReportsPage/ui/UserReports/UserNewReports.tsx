import { useEffect, useMemo, useState } from "react";
import { useOutletContext } from "react-router";
import { TaskCodes } from "@/components/calendar/constants/const";
import { Spinner } from "@/components/spinner/Spinner";
import { StatsModal } from "@/components/statistics/EmployeeStats/StatsModal";
import { ListItem } from "@/components/userListItem/UserListItem";
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

export const NewUserReports = () => {
	const { users, projects } = useOutletContext<ReportsContext>();
	const [activeUser, setActiveUser] = useState<User>();
	const [activeTab, setActiveTab] = useState<UserReportsTab>("staff");
	const [sprintTasks, setSprintTasks] = useState<TaskProps[]>([]);
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
					className={`${cls.tabButton} ${
						activeTab === "staff" ? cls.tabButtonActive : ""
					}`}
					onClick={() => setActiveTab("staff")}
				>
					Штат
				</button>
				<button
					type="button"
					role="tab"
					aria-selected={activeTab === "piecework"}
					className={`${cls.tabButton} ${
						activeTab === "piecework" ? cls.tabButtonActive : ""
					}`}
					onClick={() => setActiveTab("piecework")}
				>
					Сдельная оплата
				</button>
			</div>

			{activeTab === "staff" && (
				<div className={cls.projectManagerPage} role="tabpanel">
					<aside className={cls.projectManagerSidebar}>
						<div className={cls.sidebarSection}>
							<div className={cls.sidebarSectionTitle}>
								Проектный менеджер
							</div>

							<div className={cls.employeeList}>
								{staffUsers.map((user) => {
									const currentTask = data.find(
										(task) => task.assignedById === Number(user.id),
									);
									const isActive = activeUser?.id === user.id;

									return (
										<button
											key={user.id}
											type="button"
											className={`${cls.employeeCard} ${
												isActive ? cls.employeeCardActive : ""
											}`}
											onClick={() => setActiveUser(user)}
										>
											<ListItem
												user={user}
												task={currentTask}
												projects={projects}
												onClick={() => setActiveUser(user)}
											/>
										</button>
									);
								})}
							</div>
						</div>

						<div className={cls.sidebarProjects}>
							<div className={cls.sidebarSectionTitle}>Клиенты и проекты</div>

							{activeUserProjects.length > 0 ? (
								<div className={cls.projectList}>
									{activeUserProjects.map((project) => (
										<button
											key={project.id}
											type="button"
											className={cls.projectCard}
										>
											<div className={cls.projectName}>{project.name}</div>
											<div className={cls.projectMeta}>
												{project.tasksCount} задач
											</div>
										</button>
									))}
								</div>
							) : (
								<div className={cls.sidebarEmpty}>Нет проектов</div>
							)}
						</div>
					</aside>

					<section className={cls.employeeDetailsPanel}>
						{activeUser ? (
							<StatsModal user={activeUser} onTasksChange={setSprintTasks} />
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
