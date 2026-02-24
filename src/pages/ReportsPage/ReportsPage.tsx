import dayjs from "dayjs";
import { useEffect, useMemo, useState } from "react";
import { NavLink, Outlet } from "react-router";
import { dtoFieldsCodesUserReports as UserCodes } from "../../components/calendar/constants/const";
import { CheckPermission } from "../../components/protectedRoute/CheckPermission";
import {
	EntityTypeIds,
} from "../../shared/constants/const";
import type {
	AnyObject,
	ContextType,
	Status,
	TaskProps,
} from "../../shared/types/types";
import { getSrartEndMonthDate } from "../../shared/utils/utils";
import { getCrmFields } from "./api/getCrmFields";
import { getDevelopers } from "./api/getDevelopers";
import { getStatuses } from "./api/getStatusFields";
import { getTasks } from "./api/getTasks";
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
			const response = await getDevelopers();

			setUsers(
				response.map((task: AnyObject) => ({
					id: task.ID,
					value: task.NAME + task.LAST_NAME,
					title: task.NAME + " " + task.LAST_NAME,
					position: task.WORK_POSITION,
					photo: task.PERSONAL_PHOTO,
				})),
			);
		};

		getUsers();
	}, []);

	useEffect(() => {
		const fetchTasks = async () => {
			const response = await getTasks({
				[UserCodes.project]: currProject === "" ? null : currProject,
				">=createdTime": getSrartEndMonthDate("start", month, year),
				"<=createdTime": getSrartEndMonthDate("end", month, year),
			});

			setTasks(response);
		};

		fetchTasks();
	}, [currProject, month, year]);

	useEffect(() => {
		const fetchStatuses = async () => {
			const response = await getStatuses();

			setStatuses(response);
		};

		fetchStatuses();
	}, []);

	useEffect(() => {
		const getProjectsAsCRMfields = async () => {
			const response = await getCrmFields(
				EntityTypeIds.tasks,
				"ufCrm14_1770801014487",
			);

			setProjects(response);
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
							key={link.path}
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
