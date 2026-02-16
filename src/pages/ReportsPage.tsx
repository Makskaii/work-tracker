import dayjs from "dayjs";
import {
	type Dispatch,
	type SetStateAction,
	useEffect,
	useMemo,
	useState,
} from "react";
import { NavLink, Outlet } from "react-router";
import { dtoFieldsCodesUserReports as UserCodes } from "../components/calendar/constants/const";
import { CheckPermission } from "../components/protectedRoute/CheckPermission";
import { $api } from "../shared/config";
import { Endpoints, TASK_SELECT_FIELDS } from "../shared/constants/const";
import type { AnyObject, TaskProps } from "../shared/types/types";
import { getSrartEndMonthDate } from "../shared/utils/utils";

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
	setMonth: Dispatch<SetStateAction<number>>;
	setYear: Dispatch<SetStateAction<number>>;
	month?: number;
	year?: number;
};

export type ContextType = UserReports;

const currentMonth = dayjs().month() + 1;
const currentYear = dayjs().year();

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
	const [month, setMonth] = useState<number>(currentMonth);
	const [year, setYear] = useState<number>(currentYear);

	const userIds = useMemo(() => {
		if (!users) return [];

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

						select: TASK_SELECT_FIELDS,
						filter: {
							[UserCodes.project]: currProject,
							">=createdTime": getSrartEndMonthDate("start", month, year),
							"<=createdTime": getSrartEndMonthDate("end", month, year),
						},
					},
				});

				setTasks(response.data.result.items);
			} catch {
				console.log("Ошибка при получении списка сотрудников");
			}
		};

		getTasks();
	}, [currProject, month, year]);

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
							setMonth,
							month,
							setYear,
							year,
						} satisfies ContextType
					}
				/>
			</div>
		</CheckPermission>
	);
};

export default ReportsPage;
