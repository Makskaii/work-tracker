import dayjs from "dayjs";
import { useEffect, useMemo, useState } from "react";
import { Outlet } from "react-router";
import {
	ProjectCodes,
	TaskCodes as UserCodes,
} from "@/components/calendar/constants/const";
import { CheckPermission } from "@/components/protectedRoute/CheckPermission";
import { $api } from "@/shared/config";
import {
	ClientsCodes,
	Endpoints,
	EntityTypeIds,
	TASK_SELECT_FIELDS,
} from "@/shared/constants/const";
import type {
	AnyObject,
	ClientListItems,
	ClientProjectProps,
	ReportsContext,
	Status,
	TaskProps,
	User,
} from "@/shared/types/types";
import {
	getActivities,
	getActivitiesList,
} from "../../shared/api/getCrmFields";
import { getSrartEndMonthDate } from "../../shared/utils/utils";
import { getDevelopers } from "./api/getDevelopers";
import { getStatuses } from "./api/getStatusFields";
import { getItems } from "./api/getTasks";
import type { ActivityListItem } from "./types/types";

const currentMonth = dayjs().month() + 1;
const currentYear = dayjs().year();

export type Activity = {
	ID: string;
	VALUE: string;
};

export type ProjectFromList = {
	id: string;
	title: string;
	[ClientsCodes.client]: string;
	name?: string;
};

type CompanyFromCrm = {
	id: string | number;
	title?: string;
};

type CrmItemListResponse<T> = {
	result?: {
		items?: T[];
	};
	next?: number | null;
	total?: number;
};

const fetchAllCrmItems = async <T extends AnyObject>({
	entityTypeId,
	select,
	filter = {},
}: {
	entityTypeId: number;
	select: readonly string[];
	filter?: AnyObject;
}) => {
	const limit = 50;
	let start = 0;
	let next: number | null | undefined = 0;
	const items: T[] = [];

	while (next !== null) {
		const response = await $api.get<CrmItemListResponse<T>>(
			Endpoints.crmItems,
			{
				params: {
					entityTypeId,
					select,
					filter,
					start,
				},
			},
		);

		const pageItems = response.data.result?.items ?? [];
		items.push(...pageItems);

		next = response.data.next ?? null;
		start = next ?? start + limit;
	}

	return items;
};

const mapCompanyFromCrm = (company: CompanyFromCrm): ClientListItems => {
	const id = String(company.id);
	const title = String(company.title ?? `Компания #${id}`);

	return {
		ID: id,
		NAME: title,
		id,
		title,
	};
};

const getUniqueProjectCompanyIds = (projects: ClientProjectProps[]) => {
	return Array.from(
		new Set(
			projects
				.map((project) => String(project[ProjectCodes.company] ?? "").trim())
				.filter(Boolean),
		),
	);
};

export const mapProjectsFromSmartProcess = (
	items: ClientProjectProps[],
): ProjectFromList[] => {
	return items.map((project) => ({
		id: String(project.id),
		title: String(project.title ?? ""),
		name: String(project.title ?? ""),
		[ClientsCodes.client]: String(project[ProjectCodes.company] ?? ""),
	}));
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
			const response = await getItems<TaskProps>({
				typeId: EntityTypeIds.tasks,
				filters: {
					[UserCodes.company]: currProject === "" ? null : currProject,

					">=createdTime": getSrartEndMonthDate("start", month, year),
					"<=createdTime": getSrartEndMonthDate("end", month, year),
				},
				select: TASK_SELECT_FIELDS,
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
		const fetchActivities = async () => {
			const fields = await getActivitiesList();

			setActivities(fields);
		};

		fetchActivities();
	}, []);

	useEffect(() => {
		const fetchActivities = async () => {
			const fields = await getActivities();

			console.log({ fields });
		};

		fetchActivities();
	}, []);

	useEffect(() => {
		const fetchClients = async () => {
			try {
				const projectsResponse = await fetchAllCrmItems<ClientProjectProps>({
					entityTypeId: EntityTypeIds.projects,
					select: [
						"id",
						"title",
						"assignedById",
						"createdTime",
						"updatedTime",
						"movedTime",
						"categoryId",
						ProjectCodes.company,
						ProjectCodes.parentproject,
					],
				});

				const projectCompanyIds = getUniqueProjectCompanyIds(projectsResponse);

				const companiesResponse = projectCompanyIds.length
					? await fetchAllCrmItems<CompanyFromCrm>({
							entityTypeId: EntityTypeIds.companies,
							select: ["id", "title"],
							filter: {
								"@id": projectCompanyIds,
							},
						})
					: [];

				const companies = companiesResponse.map(mapCompanyFromCrm);
				const normalizedProjects =
					mapProjectsFromSmartProcess(projectsResponse);

				setProjects(normalizedProjects);

				const data = companies.map((company) => ({
					...company,
					projects: projectsResponse
						.filter(
							(project) =>
								String(project[ProjectCodes.company] ?? "") === company.ID,
						)
						.map((project) => ({
							...project,
							projectId: String(project.id),
						})),
				}));

				setClietnsList(data);
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
					gap: "1rem",
					flexDirection: "column",
					padding: 0,
				}}
			>
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
