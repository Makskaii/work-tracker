import dayjs from "dayjs";
import { useEffect, useMemo, useState } from "react";
import { NavLink, Outlet } from "react-router";
import { dtoFieldsCodesUserReports as UserCodes } from "../../components/calendar/constants/const";
import { CheckPermission } from "../../components/protectedRoute/CheckPermission";
import { $api } from "../../shared/config";
import {
	Endpoints,
	EntityTypeIds,
	TASK_SELECT_FIELDS,
} from "../../shared/constants/const";
import type {
	AnyObject,
	ContextType,
	Status,
	TaskProps,
} from "../../shared/types/types";
import { getSrartEndMonthDate } from "../../shared/utils/utils";
import { Navigation } from "./constants/titleMap";

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
			position: string;
			photo: string;
		}[]
	>([]);
	const [currProject, setCurrProject] = useState("");
	const [title, setTitle] = useState("");
	const [user, setUser] = useState("");
	const [month, setMonth] = useState<number>(currentMonth);
	const [year, setYear] = useState<number>(currentYear);
	const [_statuses, setStatuses] = useState<Status[]>([]);

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
						position: task.WORK_POSITION,
						photo: task.PERSONAL_PHOTO,
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
						entityTypeId: EntityTypeIds.tasks,

						select: TASK_SELECT_FIELDS,
						filter: {
							[UserCodes.project]: currProject === "" ? null : currProject,
							">=createdTime": getSrartEndMonthDate("start", month, year),
							"<=createdTime": getSrartEndMonthDate("end", month, year),
						},
					},
				});
				console.log(currProject);
				setTasks(response.data.result.items);
			} catch {
				console.log("Ошибка при получении списка сотрудников");
			}
		};

		getTasks();
	}, [currProject, month, year]);

	useEffect(() => {
		const getStatuses = async () => {
			try {
				const response = await $api.post(Endpoints.status, {
					filter: {
						ENTITY_ID: "DYNAMIC_1072_STAGE_18",
					},
				});

				setStatuses(response.data.result);
			} catch {
				console.log("Ошибка при получении списка задач");
			}
		};

		getStatuses();
	}, []);

	useEffect(() => {
		const getProjectsAsCRMfields = async () => {
			try {
				const response = await $api.post(Endpoints.crmFeilds, {
					entityTypeId: EntityTypeIds.reports,
				});

				setProjects(response.data.result.fields["ufCrm14_1770801014487"].items);
			} catch {
				console.log("Ошибка при получении списка задач");
			}
		};

		getProjectsAsCRMfields();
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
						gap: "3px",
					}}
				>
					{Navigation.map((link) => (
						<NavLink
							style={{
								border: "1px solid #ccc",
								padding: "0.3rem",
								borderRadius: "12px",
							}}
							className={({ isActive, isPending }) =>
								[isPending ? "pending" : "", isActive ? "active" : ""].join(" ")
							}
							to={link.path}
							end
						>
							<div>{link.title}</div>
						</NavLink>
					))}
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
