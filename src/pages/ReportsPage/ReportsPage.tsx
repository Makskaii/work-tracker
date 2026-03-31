import dayjs from "dayjs";
import { useEffect, useMemo, useState } from "react";
import { NavLink, Outlet } from "react-router";
import { TaskCodes as UserCodes } from "@/components/calendar/constants/const";
import { CheckPermission } from "@/components/protectedRoute/CheckPermission";
import {
	ClientsCodes,
	EntityTypeIds,
	TASK_SELECT_FIELDS,
} from "@/shared/constants/const";
import type {
	ClientListItems,
	ClientProjectProps,
	ProjectListDto,
	ReportsContext,
	Status,
	TaskProps,
	User,
} from "@/shared/types/types";
import {
	getActivitiesList,
	getClientsFromList,
	getProjectsFromList,
} from "../../shared/api/getCrmFields";
import { getSrartEndMonthDate } from "../../shared/utils/utils";
import { getDevelopers } from "./api/getDevelopers";
import { getStatuses } from "./api/getStatusFields";
import { getItems } from "./api/getTasks";
import { Navigation } from "./constants/UsersTitleMap";
import type { ActivityListItem } from "./types/types";

const currentMonth = dayjs().month() + 1;
const currentYear = dayjs().year();

export type Activity = {
	ID: string;
	VALUE: string;
};

export type ProjectFromList = {
	id: string;
	name: string;
	projectId: string;
};

const getSinglePropertyValue = (
	property?: Record<string, string> | null,
): string => {
	if (!property) return "";

	const value = Object.values(property)[0];

	return value ? String(value) : "";
};

export const mapProjectsFromList = (
	items: ProjectListDto[],
): ProjectFromList[] => {
	return items
		.map((element) => ({
			id: String(element.ID),
			name: String(element.NAME ?? ""),
			projectId: getSinglePropertyValue(element.PROPERTY_87),
		}))
		.filter((item) => item.projectId);
};

const ReportsPage = () => {
	const [tasks, setTasks] = useState<TaskProps[]>([]);
	const [clientsList, setClietnsList] = useState<
		(ClientListItems & { projects: ClientProjectProps[] })[]
	>([]);

	const [users, setUsers] = useState<User[]>([]);
	const [currProject, setCurrProject] = useState("");
	const [projects, setProjects] = useState<ProjectFromList[]>([]);
	const [title, setTitle] = useState("");
	const [user, setUser] = useState("");
	const [month, setMonth] = useState<number>(currentMonth);
	const [year, setYear] = useState<number>(currentYear);
	const [statuses, setStatuses] = useState<Status[]>([]);
	const [activities, setActivities] = useState<ActivityListItem[]>([]);

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
					[UserCodes.client]: currProject === "" ? null : currProject,

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
		const fetchStatuses = async () => {
			const response = await getStatuses();

			setStatuses(response);
		};

		fetchStatuses();
	}, []);

	useEffect(() => {
		const fetchActivities = async () => {
			const fields = await getActivitiesList();

			setActivities(fields);
		};

		fetchActivities();
	}, []);

	// useEffect(() => {
	// 	const fetchActivities = async () => {
	// 		const fields = await getActivities();

	// 		console.log({ fields });
	// 	};

	// 	fetchActivities();
	// }, []);

	useEffect(() => {
		const fetchProjectsByClient = async (
			clients: ClientListItems[],
			projectsFromList: ProjectFromList[],
		) => {
			if (!clients) return [];

			try {
				const response = await Promise.all(
					clients.map(async (client) => {
						const projects = await getItems<ClientProjectProps>(
							EntityTypeIds.projects,
							{
								[ClientsCodes.client]: client.ID,
							},
						);

						const projectsWithRealId = (projects ?? []).map((project) => {
							const projectTitle = String(project.title ?? "")
								.trim()
								.toLowerCase();

							const matchedProject = projectsFromList.find(
								(listProject) =>
									listProject.name.trim().toLowerCase() === projectTitle,
							);

							return {
								...project,
								projectId: matchedProject?.id ?? "",
							};
						});

						return {
							...client,
							projects: projectsWithRealId,
						};
					}),
				);

				return response;
			} catch (error) {
				console.log(error);
				return [];
			}
		};

		const fetchClients = async () => {
			try {
				const [clientsResponse, projectsListResponse] = await Promise.all([
					getClientsFromList(),
					getProjectsFromList(),
				]);

				const normalizedProjects = mapProjectsFromList(projectsListResponse);

				setProjects(normalizedProjects);

				const data = await fetchProjectsByClient(
					clientsResponse,
					normalizedProjects,
				);

				setClietnsList(data ?? []);
			} catch (error) {
				console.log(error);
			}
		};

		fetchClients();
	}, []);

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
							projects,
							tasks,
							clientsList,
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
