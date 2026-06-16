import { ProjectCodes } from "@/components/calendar/constants/const";
import {
	getPaymentSortFromReportTaskType,
	PAYMENT_SORT_TITLES,
} from "@/components/calendar/helpers/paymentType";
import { ClientsCodes } from "@/shared/constants/const";
import type { GroupedReportFields } from "@/shared/types/table";
import type { ClientListItems, ClientProjectProps } from "@/shared/types/types";
import type { ProjectFromList } from "../../../ReportsPage";
import type { ActivityListItem, GroupedClientItem } from "../../../types/types";
import { parseTimeSpent } from "./utils";

const ACTIVITY_SORT_TITLES = PAYMENT_SORT_TITLES;

const getProjectCompanyId = (project: ClientProjectProps) => {
	return Number(project[ProjectCodes.company] ?? 0);
};

export const buildClientTitleMap = (
	clients: (ClientListItems & { projects: ClientProjectProps[] })[],
) => {
	const clientTitleMap = new Map<number, string>();

	for (const client of clients) {
		clientTitleMap.set(Number(client.ID), client.NAME);

		for (const project of client.projects ?? []) {
			const companyId = getProjectCompanyId(project);

			if (companyId) {
				clientTitleMap.set(companyId, client.NAME);
			}
		}
	}

	return clientTitleMap;
};

const getClientTitle = (
	clientId: number,
	clientTitleMap: Map<number, string>,
	companyTitleById: Map<number, string>,
) =>
	clientTitleMap.get(clientId) ??
	companyTitleById.get(clientId) ??
	`Компания #${clientId}`;

export const groupReportsByClientsProjectsAndActivities = ({
	reports,
	projects,
	activities,
	clients,
	companyTitleById = new Map<number, string>(),
}: {
	reports: GroupedReportFields[];
	projects: ProjectFromList[];
	activities: ActivityListItem[];
	clients: (ClientListItems & { projects: ClientProjectProps[] })[];
	companyTitleById?: Map<number, string>;
}): GroupedClientItem[] => {
	const projectTitleMap = new Map<number, string>();
	for (const project of projects) {
		const projectTitle =
			project.title || project.name || `Проект #${project.id}`;

		projectTitleMap.set(Number(project.id), projectTitle);
		projectTitleMap.set(Number(project[ClientsCodes.client]), projectTitle);
	}

	const clientTitleMap = buildClientTitleMap(clients);
	for (const client of clients) {
		for (const project of client.projects ?? []) {
			projectTitleMap.set(Number(project.id), project.title);

			if (project.projectId) {
				projectTitleMap.set(Number(project.projectId), project.title);
			}
		}
	}

	const resultMap = new Map<number, GroupedClientItem>();

	for (const report of reports) {
		const clientId = Number(report.company ?? report.client);
		const projectId = Number(report.parentproject ?? report.project);
		const sort = getPaymentSortFromReportTaskType(report, activities);

		if (!clientId || !projectId || sort === null) continue;

		const timeSpent = parseTimeSpent(report.timeSpent);

		if (!resultMap.has(clientId)) {
			resultMap.set(clientId, {
				clientId,
				clientTitle: getClientTitle(clientId, clientTitleMap, companyTitleById),
				timeSpent: 0,
				projects: [],
			});
		}

		const clientGroup = resultMap.get(clientId)!;

		let projectGroup = clientGroup.projects.find(
			(item) => item.projectId === projectId,
		);

		if (!projectGroup) {
			projectGroup = {
				projectId,
				projectTitle: projectTitleMap.get(projectId) ?? `Проект #${projectId}`,
				timeSpent: 0,
				categories: {
					0: {
						sort: 0,
						title: ACTIVITY_SORT_TITLES[0],
						timeSpent: 0,
						activities: [],
					},
					1: {
						sort: 1,
						title: ACTIVITY_SORT_TITLES[1],
						timeSpent: 0,
						activities: [],
					},
					2: {
						sort: 2,
						title: ACTIVITY_SORT_TITLES[2],
						timeSpent: 0,
						activities: [],
					},
				},
			};

			clientGroup.projects.push(projectGroup);
		}

		const category = projectGroup.categories[sort];
		const activityId = Number(report.activity);
		const activityTitle =
			activities.find((activity) => Number(activity.ID) === activityId)?.NAME ??
			`Активность #${activityId}`;

		let activityGroup = category.activities.find(
			(item) => item.activityId === activityId,
		);

		if (!activityGroup) {
			activityGroup = {
				activityId,
				activityTitle,
				sort,
				timeSpent: 0,
				reports: [],
			};

			category.activities.push(activityGroup);
		}

		activityGroup.timeSpent += timeSpent;
		activityGroup.reports.push({
			id: report.id,
			title: report.title,
			begindate: report.day,
			timeSpent,
			rawTimeSpent: report.timeSpent,
			taskId: report.taskId,
			parentId: report.parentId,
		});

		category.timeSpent += timeSpent;
		projectGroup.timeSpent += timeSpent;
		clientGroup.timeSpent += timeSpent;
	}

	return Array.from(resultMap.values())
		.map((client) => ({
			...client,
			projects: client.projects
				.map((project) => ({
					...project,
					categories: {
						0: {
							...project.categories[0],
							activities: [...project.categories[0].activities]
								.map((activity) => ({
									...activity,
									reports: [...activity.reports].sort(
										(a, b) =>
											new Date(b.begindate).getTime() -
											new Date(a.begindate).getTime(),
									),
								}))
								.sort((a, b) => b.timeSpent - a.timeSpent),
						},
						1: {
							...project.categories[1],
							activities: [...project.categories[1].activities]
								.map((activity) => ({
									...activity,
									reports: [...activity.reports].sort(
										(a, b) =>
											new Date(b.begindate).getTime() -
											new Date(a.begindate).getTime(),
									),
								}))
								.sort((a, b) => b.timeSpent - a.timeSpent),
						},
						2: {
							...project.categories[2],
							activities: [...project.categories[2].activities]
								.map((activity) => ({
									...activity,
									reports: [...activity.reports].sort(
										(a, b) =>
											new Date(b.begindate).getTime() -
											new Date(a.begindate).getTime(),
									),
								}))
								.sort((a, b) => b.timeSpent - a.timeSpent),
						},
					},
				}))
				.sort((a, b) => b.timeSpent - a.timeSpent),
		}))
		.sort((a, b) => b.timeSpent - a.timeSpent);
};
