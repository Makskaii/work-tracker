import dayjs from "dayjs";
import { useEffect, useMemo, useRef, useState } from "react";
import { Outlet, useLocation } from "react-router";
import { ProjectCodes } from "@/components/calendar/constants/const";
import { normalizeUserActive } from "@/components/calendar/helpers/formatUserFilds";
import { CheckPermission } from "@/components/protectedRoute/CheckPermission";
import { $api } from "@/shared/config";
import {
	ClientsCodes,
	DEPARTMENT_IDS,
	Endpoints,
	EntityTypeIds,
} from "@/shared/constants/const";
import type {
	AnyObject,
	ClientListItems,
	ClientProjectProps,
	ReportsContext,
	Status,
	User,
} from "@/shared/types/types";
import { getActivitiesList } from "../../shared/api/getCrmFields";
import { getDevelopers } from "./api/getDevelopers";
import { getStatuses } from "./api/getStatusFields";
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
	signal,
}: {
	entityTypeId: number;
	select: readonly string[];
	filter?: AnyObject;
	signal?: AbortSignal;
}) => {
	const limit = 50;
	let start = 0;
	let next: number | null | undefined = 0;
	const items: T[] = [];

	while (next !== null) {
		const response = await $api.get<CrmItemListResponse<T>>(
			Endpoints.crmItems,
			{
				signal,
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
		if (next !== null && next <= start) {
			throw new Error("CRM pagination did not advance");
		}
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
	const { pathname } = useLocation();
	const needs = getReportDataNeeds(pathname);
	const loaded = useRef({ users: false, statuses: false, activities: false, catalog: false });
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
		if (!needs.users || loaded.current.users) return;
		const controller = new AbortController();
		const getUsers = async () => {
			const response = await getDevelopers(controller.signal);
			if (controller.signal.aborted) return;

			setUsers(
				response
					.map((user) => ({
						id: user.ID,
						isActive: normalizeUserActive(user.ACTIVE),
						value: user.NAME + user.LAST_NAME,
						title: user.NAME + " " + user.LAST_NAME,
						position: user.WORK_POSITION,
						photo: user.PERSONAL_PHOTO,
						department:
							user.UF_DEPARTMENT.find((department) =>
								[DEPARTMENT_IDS.ANALYTICS, DEPARTMENT_IDS.DEV].includes(
									department,
								),
							) ??
							user.UF_DEPARTMENT[0] ??
							0,
					}))
					.toSorted((a, b) => a.department - b.department),
			);
			loaded.current.users = true;
		};

		void getUsers().catch((error) => { if (!controller.signal.aborted) console.error("Failed to load report users", error); });
		return () => controller.abort();
	}, [needs.users]);

	useEffect(() => {
		if (!needs.statuses || loaded.current.statuses) return;
		const controller = new AbortController();
		const fetchStatuses = async () => {
			const response = await getStatuses(controller.signal);
			if (controller.signal.aborted) return;

			setStatuses(response);
			loaded.current.statuses = true;
		};

		void fetchStatuses().catch((error) => { if (!controller.signal.aborted) console.error("Failed to load report statuses", error); });
		return () => controller.abort();
	}, [needs.statuses]);

	useEffect(() => {
		if (!needs.activities || loaded.current.activities) return;
		const controller = new AbortController();
		const fetchActivities = async () => {
			const fields = await getActivitiesList(controller.signal);
			if (controller.signal.aborted) return;

			setActivities(fields);
			loaded.current.activities = true;
		};

		void fetchActivities().catch((error) => { if (!controller.signal.aborted) console.error("Failed to load report activities", error); });
		return () => controller.abort();
	}, [needs.activities]);

	useEffect(() => {
		if (!needs.catalog || loaded.current.catalog) return;
		const controller = new AbortController();
		const fetchClients = async () => {
			try {
				const projectsResponse = await fetchAllCrmItems<ClientProjectProps>({
					entityTypeId: EntityTypeIds.projects,
					signal: controller.signal,
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
							signal: controller.signal,
							select: ["id", "title"],
							filter: {
								"@id": projectCompanyIds,
							},
						})
					: [];
				if (controller.signal.aborted) return;

				const companies = companiesResponse.map(mapCompanyFromCrm);
				const normalizedProjects =
					mapProjectsFromSmartProcess(projectsResponse);

				setProjects(normalizedProjects);

				const projectsByCompany = new Map<string, ClientProjectProps[]>();
				for (const project of projectsResponse) {
					const companyId = String(project[ProjectCodes.company] ?? "");
					const companyProjects = projectsByCompany.get(companyId) ?? [];
					companyProjects.push({ ...project, projectId: String(project.id) });
					projectsByCompany.set(companyId, companyProjects);
				}
				const data = companies.map((company) => ({
					...company,
					projects: projectsByCompany.get(company.ID) ?? [],
				}));

				setClietnsList(data);
				loaded.current.catalog = true;
			} catch (error) {
				if (!controller.signal.aborted) console.error("Failed to load report catalog", error);
			}
		};

		void fetchClients();
		return () => controller.abort();
	}, [needs.catalog]);

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
							tasks: [],
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

export const getReportDataNeeds = (pathname: string) => {
	const section = pathname.toLowerCase().split("/").filter(Boolean)[1] ?? "calendar";
	return {
		users: ["calendar", "projects", "clients", "developers", "development", "workload"].includes(section),
		statuses: ["projects", "clients", "developers", "progress"].includes(section),
		activities: ["calendar", "projects", "clients", "developers", "development", "workload", "profitability"].includes(section),
		catalog: ["calendar", "projects", "clients", "developers", "development", "progress", "project-statuses"].includes(section),
	};
};

export default ReportsPage;
