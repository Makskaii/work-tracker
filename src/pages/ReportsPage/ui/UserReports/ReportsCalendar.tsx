import { useEffect, useMemo, useState } from "react";
import { FormProvider, useForm } from "react-hook-form";
import { useOutletContext } from "react-router";

import { getActivitiesList } from "@/shared/api/getCrmFields";
import { Endpoints } from "@/shared/constants/const";
import type { GroupedReportFields } from "@/shared/types/table";
import { Calendar } from "../../../../components/calendar/Calendar";
import { AsyncSelect } from "../../../../components/form/SelectField";
import type {
	ClientListItems,
	ClientProjectProps,
	ReportsContext,
} from "../../../../shared/types/types";
import type { ProjectFromList } from "../../ReportsPage";
import type {
	ActivityListItem,
	ActivitySort,
	GroupedClientItem,
} from "../../types/types";
import { ProjectActivitiesTree } from "./ui/ProjectActivitiesTree/ProjectActivitiesTree";

const ACTIVITY_SORT_TITLES: Record<ActivitySort, string> = {
	0: "Clients paid",
	1: "Company paid",
	2: "Unpaid",
};

const parseTimeSpent = (value: string | number | null | undefined): number => {
	if (value == null) return 0;

	const normalized = String(value).replace(",", ".").trim();
	const parsed = Number(normalized);

	return Number.isNaN(parsed) ? 0 : parsed;
};

export const groupReportsByClientsProjectsAndActivities = ({
	reports,
	projects,
	activities,
	clients,
}: {
	reports: GroupedReportFields[];
	projects: ProjectFromList[];
	activities: ActivityListItem[];
	clients: (ClientListItems & { projects: ClientProjectProps[] })[];
}): GroupedClientItem[] => {
	const projectsMap = new Map<number, ProjectFromList>();
	for (const project of projects) {
		projectsMap.set(Number(project.id), project);
	}

	const clientsMap = new Map<number, ClientListItems>();
	for (const client of clients) {
		clientsMap.set(Number(client.ID), client);
	}

	const activitiesMap = new Map<
		number,
		{ title: string; sort: ActivitySort }
	>();

	for (const activity of activities) {
		const activityId = Number(activity.ID);
		const sort = Number(activity.SORT) as ActivitySort;

		if (sort === 0 || sort === 1 || sort === 2) {
			activitiesMap.set(activityId, {
				title: activity.NAME,
				sort,
			});
		}
	}

	const resultMap = new Map<number, GroupedClientItem>();

	for (const report of reports) {
		const clientId = Number(report.client);
		const projectId = Number(report.project);
		const activityId = Number(report.activity);

		if (!clientId || !projectId || !activityId) continue;

		const client = clientsMap.get(clientId);
		const project = projectsMap.get(projectId);
		const activity = activitiesMap.get(activityId);

		if (!client || !project || !activity) continue;

		const timeSpent = parseTimeSpent(report.timeSpent);

		if (!resultMap.has(clientId)) {
			resultMap.set(clientId, {
				clientId,
				clientTitle: client.NAME,
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
				projectTitle: project.name,
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

		const category = projectGroup.categories[activity.sort];

		let activityGroup = category.activities.find(
			(item) => item.activityId === activityId,
		);

		if (!activityGroup) {
			activityGroup = {
				activityId,
				activityTitle: activity.title,
				sort: activity.sort,
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
type ViewCalendar = "month" | "week";

const ReportsCalendar = () => {
	const Context = useOutletContext<ReportsContext>();
	const [view, setView] = useState<ViewCalendar>("month");

	const [groupedByActivity, setGroupByActivity] = useState<
		GroupedReportFields[]
	>([]);
	const [activities, setActivities] = useState<ActivityListItem[]>([]);

	const methods = useForm<{
		userId: string;
	}>({
		mode: "onChange",
		reValidateMode: "onChange",
		defaultValues: {
			userId: Context?.user || "",
		},
	});

	const { handleSubmit } = methods;

	const handleChange = handleSubmit((data) => {
		Context?.setUser(data.userId);
	});

	useEffect(() => {
		const fetchActivities = async () => {
			const fields = await getActivitiesList();

			setActivities(fields);
		};

		fetchActivities();
	}, []);

	const groupedClientActivities = useMemo(() => {
		return groupReportsByClientsProjectsAndActivities({
			reports: groupedByActivity,
			projects: Context.projects,
			activities: activities,
			clients: Context.clientsList,
		});
	}, [activities, Context.projects, groupedByActivity, Context.clientsList]);

	return (
		<div
			style={{
				display: "flex",
				height: "100%",
				padding: "1rem",
			}}
		>
			<div
				style={{
					flex: 1,
					minWidth: 320,
					maxWidth: 420,
					paddingRight: "1rem",
					overflow: "hidden",
				}}
			>
				<FormProvider {...methods}>
					<form onChange={handleChange}>
						<AsyncSelect
							name="userId"
							placeholder="Сотрудники"
							endpoint={Endpoints.users}
							params={{
								params: {
									filter: {
										"@UF_DEPARTMENT": [23, 25],
									},
									select: [
										"NAME",
										"ID",
										"LAST_NAME",
										"UF_DEPARTMENT",
										"WORK_POSITION",
										"PERSONAL_PHOTO",
									],
								},
							}}
						/>
					</form>
				</FormProvider>

				<ProjectActivitiesTree data={groupedClientActivities} />
			</div>
			<div
				style={{
					flex: 4,
					overflow: "hidden",
					borderLeft: "1px solid #ccc",
				}}
			>
				<div
					style={{
						display: "flex",
						gap: "1rem",
						borderBottom: "1px solid #ccc",
						padding: "0.5rem 2rem",
						justifyContent: "space-between",
					}}
				>
					<div
						style={{
							display: "flex",
							gap: "1rem",
						}}
					>
						<button onClick={() => setView("month")}>Месяц</button>
						<button onClick={() => setView("week")}>Неделя</button>
					</div>
				</div>
				<Calendar
					view={view}
					userId={Context?.user}
					setGroupByActivity={setGroupByActivity}
				/>
			</div>
		</div>
	);
};

export default ReportsCalendar;
