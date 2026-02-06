import { useEffect, useState } from "react";
import { NavLink, Outlet } from "react-router";
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
	}[];
	projects: { id: string; title: string; value: string }[];
	setCurrProject: (id: string) => void;
	setTitle: (id: string) => void;
	title: string;
	user?: string;
};

export type ContextType = UserReports | null;

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
		}[]
	>([]);
	const [projects, setProjects] = useState<
		{
			id: string;
			title: string;
			value: string;
		}[]
	>([]);
	const [currProject, setCurrProject] = useState("");
	const [title, setTitle] = useState("");
	const [user, setUser] = useState("");

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
					response.data.result.tasks.map((task: AnyObject) => ({
						id: task.id,
						title: task.title,
						value: task.title,
						responsible: task.responsible.name,
						status: task.status,
						timeEstimate: task.timeEstimate,
						timeSpentInLogs: task.timeSpentInLogs,
						groupId: task.groupId,
					})),
				);
			} catch {
				console.log("Ошибка при получении списка задач");
			}
		};

		getTasks();
	}, [currProject, title, user]);

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
					} satisfies ContextType
				}
			/>
		</div>
	);
};
