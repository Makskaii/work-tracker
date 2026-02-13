import { useEffect, useMemo, useState } from "react";
import { NavLink, Outlet } from "react-router";
import { CheckPermission } from "../components/protectedRoute/CheckPermission";
import { $api } from "../shared/config";
import { Endpoints } from "../shared/constants/const";
import type { AnyObject } from "../shared/types/types";

// const statuses =
// 	2: "ждет выполнения",
// 	3: "выполняется",
// 	4: "ожидает контроля",
// 	5: "завершена",
// 	6: "отложена",
// };

type UserReports = {
	setUser: (id: string) => void;
	tasks: {
		id: string;
		title: string;
		value: string;
		responsible?: string;
		status?: string;
		timeEstimate?: string;
		timeSpentInLogs?: string;
		groupId?: string;
		deadline?: string;
		endDate?: string;
	}[];
	projects: { id: string; title: string; value: string }[];
	setCurrProject: (id: string) => void;
	setTitle: (id: string) => void;
	title: string;
	user?: string;
	users: {
		id: string;
		value: string;
		title: string;
	}[];
	userIds: string[];
	currProject?: string;
};

export type ContextType = UserReports;

export const ReportsPage = () => {
	const [tasks, setTasks] = useState<
		{
			id: string;
			title: string;
			value: string;
			responsible?: string;
			status?: string;
			timeEstimate?: string;
			timeSpentInLogs?: string;
			deadline?: string;
		}[]
	>([]);
	const [projects, setProjects] = useState<
		{
			id: string;
			title: string;
			value: string;
		}[]
	>([]);
	const [users, setUsers] = useState<
		{
			id: string;
			value: string;
			title: string;
		}[]
	>([]);
	const [currProject, setCurrProject] = useState("");
	const [title, setTitle] = useState("");
	const [user, setUser] = useState("");

	const userIds = useMemo(() => {
		return users.map((user) => {
			return user.id;
		});
	}, [users]);

	useEffect(() => {
		const getUsers = async () => {
			try {
				const response = await $api.get(Endpoints.users, {
					params: {
						UF_DEPARTMENT: 23,
					},
				});

				setUsers(
					response.data.result.map((task: AnyObject) => ({
						id: task.ID,
						value: task.NAME + task.LAST_NAME,
						title: task.NAME + " " + task.LAST_NAME,
					})),
				);
			} catch {
				console.log("Ошибка при получении списка сотрудников");
			}
		};

		getUsers();
	}, []);

	useEffect(() => {
		const getTasks = async () => {
			try {
				const response = await $api.get(Endpoints.tasks, {
					params: {
						filter: {
							GROUP_ID: currProject,
							TITLE: title,
							RESPONSIBLE_ID: user,
						},
					},
				});

				setTasks(
					response.data.result.tasks
						.map((task: AnyObject) => {
							if (userIds.includes(task.responsible.id)) {
								return {
									id: task?.id,
									title: task?.title,
									value: task?.title,
									responsible: task?.responsible.name,
									status: task?.status,
									timeEstimate: task?.timeEstimate,
									timeSpentInLogs: task?.timeSpentInLogs,
									groupId: task?.groupId,
									deadline: task?.deadline,
									endDate: task?.endDatePlan,
								};
							}
						})
						.filter(Boolean),
				);
			} catch {
				console.log("Ошибка при получении списка задач");
			}
		};

		getTasks();
	}, [currProject, title, user, userIds]);

	useEffect(() => {
		const getProjects = async () => {
			try {
				const response = await $api.get(Endpoints.groups);

				setProjects(
					response.data.result.map((group: AnyObject) => ({
						id: group.ID,
						title: group.NAME,
						value: group.NAME,
					})),
				);
			} catch {
				console.log("Ошибка при получении списка задач");
			}
		};

		getProjects();
	}, []);

	return (
		<CheckPermission permission="read">
			<div
				style={{
					width: "100%",
					display: "flex",
					gap: "2rem",
					flexDirection: "column",
					padding: "1rem",
				}}
			>
				<div
					style={{
						display: "flex",
						gap: "1rem",
					}}
				>
					<NavLink
						className={({ isActive, isPending }) =>
							[isPending ? "pending" : "", isActive ? "active" : ""].join(" ")
						}
						to="projects"
						end
					>
						<div>Проекты</div>
					</NavLink>
					/
					<NavLink
						className={({ isActive, isPending }) =>
							[isPending ? "pending" : "", isActive ? "active" : ""].join(" ")
						}
						to="employees"
						end
					>
						<div>Сотрудники</div>
					</NavLink>
					/
					<NavLink
						className={({ isActive, isPending }) =>
							[isPending ? "pending" : "", isActive ? "active" : ""].join(" ")
						}
						to="progress"
						end
					>
						<div>Занятость</div>
					</NavLink>
				</div>
				<Outlet
					context={
						{
							tasks,
							projects,
							setCurrProject,
							setTitle,
							title,
							setUser,
							user,
							users,
							userIds,
							currProject,
						} satisfies ContextType
					}
				/>
			</div>
		</CheckPermission>
	);
};
