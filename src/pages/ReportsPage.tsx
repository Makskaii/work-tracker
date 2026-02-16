import { useEffect, useMemo, useState } from "react";
import { NavLink, Outlet } from "react-router";
import { dtoFieldsCodesUserReports as UserCodes } from "../components/calendar/constants/const";
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

interface TaskProps {
	id: string;
	title: string;
	createdBy: string;
	assignedById: number;
	createdTime: string;
	lastActivityTime: string;
	stageId: string;
	[UserCodes.project]: number;
	[UserCodes.estimateTime]: string;
	[UserCodes.description]: string;
	[UserCodes.stage]: string;
}

type UserReports = {
	setUser: (id: string) => void;
	tasks: TaskProps[];
	projects: { ID: string; VALUE: string }[];
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

const ReportsPage = () => {
	const [tasks, setTasks] = useState<TaskProps[]>([]);
	const [projects, setProjects] = useState<
		{
			ID: string;
			VALUE: string;
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
				const response = await $api.get(Endpoints.reports, {
					params: {
						entityTypeId: 1072,

						select: [
							"id",
							"title",
							"createdBy",
							"assignedById",
							"createdTime",
							"lastActivityTime",
							"stageId",
							UserCodes.project,
							UserCodes.estimateTime,
							UserCodes.description,
							UserCodes.stage,
						],
						filter: {
							[UserCodes.project]: currProject,
						},
					},
				});

				setTasks(response.data.result.items);
			} catch {
				console.log("Ошибка при получении списка сотрудников");
			}
		};

		getTasks();
	}, [currProject]);

	useEffect(() => {
		const getProjects = async () => {
			try {
				const response = await $api.post("crm.item.fields", {
					entityTypeId: 1072,
				});

				setProjects(response.data.result.fields["ufCrm14_1770801014487"].items);
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

export default ReportsPage;
