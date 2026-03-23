import dayjs from "dayjs";
import { useEffect, useMemo, useState } from "react";
import { NavLink, Outlet } from "react-router";
import { dtoFieldsCodesUserReports as UserCodes } from "@/components/calendar/constants/const";
import { CheckPermission } from "@/components/protectedRoute/CheckPermission";
import { $api } from "@/shared/config";
import {
	ClientsCodes,
	Endpoints,
	EntityTypeIds,
	TASK_SELECT_FIELDS,
} from "@/shared/constants/const";
import type {
	ClientListItems,
	ClientProjectProps,
	ReportsContext,
	Status,
	TaskProps,
	User,
} from "@/shared/types/types";
import {
	getActivities,
	getProjectsFromList,
} from "../../shared/api/getCrmFields";
import { getSrartEndMonthDate } from "../../shared/utils/utils";
import { getDevelopers } from "./api/getDevelopers";
import { getStatuses } from "./api/getStatusFields";
import { getItems } from "./api/getTasks";
import { Navigation } from "./constants/UsersTitleMap";

const currentMonth = dayjs().month() + 1;
const currentYear = dayjs().year();

export type Activity = {
	ID: string;
	VALUE: string;
};

const ReportsPage = () => {
	const [tasks, setTasks] = useState<TaskProps[]>([]);
	const [clientsList, setClietnsList] = useState<
		(ClientListItems & { projects: ClientProjectProps[] })[]
	>([]);
	const [users, setUsers] = useState<User[]>([]);
	const [currProject, setCurrProject] = useState("");
	const [title, setTitle] = useState("");
	const [user, setUser] = useState("");
	const [month, setMonth] = useState<number>(currentMonth);
	const [year, setYear] = useState<number>(currentYear);
	const [statuses, setStatuses] = useState<Status[]>([]);
	const [activities, setActivities] = useState<Activity[]>([]);

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
				response
					.map((user) => ({
						id: user.ID,
						value: user.NAME + user.LAST_NAME,
						title: user.NAME + " " + user.LAST_NAME,
						position: user.WORK_POSITION,
						photo: user.PERSONAL_PHOTO,
						department: user.UF_DEPARTMENT[0],
					}))
					.toSorted((a, b) => a.department - b.department),
			);
		};

		getUsers();
	}, []);

	useEffect(() => {
		const fetchTasks = async () => {
			const response = await getItems<TaskProps>(
				EntityTypeIds.tasks,
				{
					[UserCodes.project]: currProject === "" ? null : currProject,

					">=createdTime": getSrartEndMonthDate("start", month, year),
					"<=createdTime": getSrartEndMonthDate("end", month, year),
				},
				TASK_SELECT_FIELDS,
			);

			setTasks(response);
		};

		fetchTasks();
	}, [currProject, month, year]);

	useEffect(() => {
		const fetchTasks = async () => {
			const response = await $api.get(Endpoints.crmItems, {
				params: {
					entityTypeId: EntityTypeIds.projects,
				},
			});

			const res = await $api.post(Endpoints.crmFeilds, {
				entityTypeId: 1092,
			});
			console.log({ response, res });
		};
		fetchTasks();
	}, []);

	useEffect(() => {
		const fetchStatuses = async () => {
			const response = await getStatuses();

			setStatuses(response);
		};

		fetchStatuses();
	}, []);

	useEffect(() => {
		const fetchProjects = async () => {
			const fields = await getActivities();

			setActivities(fields["ufCrm11_1770804288638"].items);
			console.log(fields["ufCrm11_1770804288638"].items);
		};

		fetchProjects();
	}, []);

	useEffect(() => {
		const fetchProjectsByClient = async (clients: ClientListItems[]) => {
			if (!clients) return;

			try {
				const response = await Promise.all(
					clients.map(async (client) => {
						const projects = await getItems<ClientProjectProps>(
							EntityTypeIds.projects,
							{
								[ClientsCodes.client]: client.ID,
							},
						);
						console.log({ projects });
						return {
							...client,
							projects,
						};
					}),
				);
				console.log({ response });
				return response;
			} catch (error) {
				console.log(error);
			}
		};

		const fetchClients = async () => {
			try {
				const response = await getProjectsFromList();

				const data = await fetchProjectsByClient(response);

				setClietnsList(data ?? []);
			} catch (error) {
				console.log(error);
			}
		};

		fetchClients();
	}, []);

	console.log({ clientsList });

	return (
		<CheckPermission permission="read" subject="post">
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
						justifyContent: "space-between",
					}}
				>
					<div
						style={{
							display: "flex",
							gap: "1rem",
						}}
					>
						{Navigation.map((link) => (
							<NavLink
								key={link.path}
								className={({ isActive, isPending }) =>
									[isPending ? "pending" : "", isActive ? "active" : ""].join(
										" ",
									)
								}
								to={link.path}
								end
							>
								<div>{link.title}</div>
							</NavLink>
						))}
					</div>
				</div>
				<Outlet
					context={
						{
							tasks,
							projects: clientsList,
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
							statuses,
							activities,
						} satisfies ReportsContext
					}
				/>
			</div>
		</CheckPermission>
	);
};

export default ReportsPage;
