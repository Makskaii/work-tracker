import dayjs from "dayjs";
import { useEffect, useMemo, useState } from "react";
import { useOutletContext } from "react-router";
import {
	dtoFieldsCodesDailyReports,
	dtoFieldsCodesUserReports,
} from "@/components/calendar/constants/const";
import { UniversalTable } from "@/components/Table/universalTable/UniversalTable";
import { $api } from "@/shared/config";
import { Endpoints, EntityTypeIds } from "@/shared/constants/const";
import type { Header } from "@/shared/types/table";
import { getWeekBorders } from "@/shared/utils/statisticUtils/generateWeekBorders";
import { Modal } from "../../../../components/modal";
import type { ReportsContext, TaskProps } from "../../../../shared/types/types";
import { getTasks } from "../../api/getTasks";
import type { ProjectTableRow } from "../../types/types";
import { ProjectsStats } from "./ProjectStatsModal";
import styles from "./ProjectsReports.module.scss";

type ProjectWithStatus = { ID: string; NAME: string } & {
	status: string;
	tasksCount: number;
};

const TASK_STAGE_IDS = {
	BACKLOG: "DT1072_18:NEW",
	SPRINT: "DT1072_18:PREPARATION",
	IN_WORK: "DT1072_18:CLIENT",
	DONE: "DT1072_18:UC_6JNSDG",
	TESTING: "DT1072_18:TESTING",
	WAITING: "DT1072_18:UC_A9IWFS",
	DOCS: "DT1072_18:UC_K596F0",
} as const;

export const getRiskColor = (risk: string): string => {
	return risk === "Перерасход" ? "#ef4444" : "#22c55e";
};

const getProjectStatus = (tasks: Array<{ stageId?: string }>): string => {
	if (!tasks.length) {
		return "нет задач";
	}

	const hasInWorkTasks = tasks.some(
		(task) =>
			task.stageId === TASK_STAGE_IDS.IN_WORK ||
			task.stageId === TASK_STAGE_IDS.SPRINT ||
			task.stageId === TASK_STAGE_IDS.TESTING ||
			task.stageId === TASK_STAGE_IDS.WAITING ||
			task.stageId === TASK_STAGE_IDS.DOCS,
	);

	if (hasInWorkTasks) {
		return "в работе";
	}

	const hasBacklogTasks = tasks.some(
		(task) => task.stageId === TASK_STAGE_IDS.BACKLOG,
	);

	if (hasBacklogTasks) {
		return "в бэклоге";
	}

	return "нет задач";
};

const getProjectPlanHours = (tasks: TaskProps[]) => {
	return tasks.reduce((acc, task) => {
		return acc + parseFloat(task[dtoFieldsCodesUserReports.estimateTime] ?? 0);
	}, 0);
};

const getReportsByProject = async ({ projectId }: { projectId: string }) => {
	const response = await $api.get(Endpoints.crmItems, {
		params: {
			entityTypeId: EntityTypeIds.reports,
			select: [
				"id",
				"title",
				"begindate",
				dtoFieldsCodesDailyReports.title,
				dtoFieldsCodesDailyReports.timeSpent,
				dtoFieldsCodesDailyReports.project,
				dtoFieldsCodesDailyReports.taskId,
				dtoFieldsCodesDailyReports.activityType,
				"assignedById",
				"createdTime",
				"lastActivityTime",
				`parentId${EntityTypeIds.tasks}`,
			],
			filter: {
				[dtoFieldsCodesDailyReports.project]: projectId,
			},
		},
	});

	return response?.data?.result?.items ?? [];
};

const getSpentHoursByReports = (reports: Array<Record<string, unknown>>) => {
	return reports.reduce((acc, report) => {
		return acc + Number(report[dtoFieldsCodesDailyReports.timeSpent] ?? 0);
	}, 0);
};

const getProjectRisk = (planHours: number, spentHours: number) => {
	return spentHours > planHours ? "Перерасход" : "Нет риска";
};

export const getProjectsTableData = async ({
	projects,
}: {
	projects: { ID: string; NAME: string }[];
}): Promise<ProjectTableRow[]> => {
	const result = await Promise.all(
		projects.map(async (project) => {
			const tasks = await getTasks({
				[dtoFieldsCodesUserReports.project]: project.ID,
			});

			const reports = await getReportsByProject({
				projectId: project.ID,
			});

			const planHours = getProjectPlanHours(tasks ?? []);
			const spentHours = getSpentHoursByReports(reports);
			const deviation = spentHours - planHours;
			const risk = getProjectRisk(planHours, spentHours);
			const purchasedHours = "-";

			return {
				id: project.ID,
				title: project.NAME,
				status: getProjectStatus(tasks ?? []),
				planHours,
				spentHours,
				deviation,
				risk,
				purchasedHours,
			};
		}),
	);

	return result;
};

export const headersForProjects: Header<ProjectTableRow>[] = [
	{
		title: "Проект",
		key: "title",
	},
	{
		title: "Статус",
		key: "status",
	},
	{
		title: "План часов",
		key: "planHours",
		convertFn: (value) => String(value),
	},
	{
		title: "Потрачено",
		key: "spentHours",
		convertFn: (value) => String(value),
	},
	{
		title: "Отклонение",
		key: "deviation",
		convertFn: (value) => (value > 0 ? `+${value}` : String(value)),
	},
	{
		title: "Риск",
		key: "risk",
		render: (value) => (
			<span style={{ color: getRiskColor(value) }}>{value}</span>
		),
	},
	{
		title: "Купленные часы на разработку",
		key: "purchasedHours",
	},
];

export const getProjectsWithStatuses = async ({
	projects,
	startOfTheWeek,
	endOfTheWeek,
}: {
	projects: { ID: string; NAME: string }[];
	startOfTheWeek: string;
	endOfTheWeek: string;
}): Promise<ProjectWithStatus[]> => {
	const result = await Promise.all(
		projects.map(async (project) => {
			const response = await getTasks({
				[dtoFieldsCodesUserReports.project]: project.ID,
				[`<=${dtoFieldsCodesUserReports.sprintDateStart}`]: endOfTheWeek,
				[`>=${dtoFieldsCodesUserReports.sprintDateStart}`]: startOfTheWeek,
			});

			const tasks = response ?? [];

			return {
				...project,
				tasksCount: tasks.length,
				status: getProjectStatus(tasks),
			};
		}),
	);

	return result;
};

const today = dayjs();

const ProjectsReports = () => {
	const [open, setOpen] = useState<boolean>(false);
	const [showStatuses, setShowStatuses] = useState<boolean>(false);
	const [activeProject, setActiveProject] = useState<{
		ID: string;
		NAME: string;
	}>();

	const { projects } = useOutletContext<ReportsContext>();
	const borders = useMemo(() => getWeekBorders(dayjs(today)), []);
	const [projWithStatus, setProjWithStatus] = useState<ProjectWithStatus[]>([]);
	const [tableData, setTableData] = useState<ProjectTableRow[]>([]);

	useEffect(() => {
		const fetchData = async () => {
			const result = await getProjectsWithStatuses({
				projects,
				startOfTheWeek: borders.startOfTheWeek,
				endOfTheWeek: borders.endOfTheWeek,
			});

			setProjWithStatus(result);
		};

		if (projects) {
			fetchData();
		}
	}, [borders.endOfTheWeek, borders.startOfTheWeek, projects]);

	useEffect(() => {
		const fetchData = async () => {
			const result = await getProjectsTableData({
				projects: projects,
			});

			setTableData(result);
		};

		if (projects) {
			fetchData();
		}
	}, [projects]);

	return (
		<>
			<div className={styles.header}>Проекты</div>
			<div className={styles.contentContainer}>
				<div className={styles.itemsContainer}>
					{projWithStatus
						.toSorted((a, b) => a.status.localeCompare(b.status))
						.map((proj) => (
							<div
								key={proj.ID}
								className={styles.projectItem}
								onClick={() => {
									setActiveProject(proj);
									setOpen(true);
								}}
							>
								<div
									style={{
										display: "flex",
										justifyContent: "space-between",
										width: "100%",
									}}
								>
									<div className={styles.projectTitle}> {proj.NAME}</div>
									<div>
										<div>{proj.status}</div>
									</div>
								</div>
							</div>
						))}
				</div>
				<div className={styles.statisticsContainer}>
					<div className={styles.noTasksMessage}>
						Количество проектов: {projects.length}
						<button onClick={() => setShowStatuses(true)}>
							Статус проектов
						</button>
					</div>
				</div>
			</div>

			{activeProject && (
				<Modal
					isOpen={open}
					onClose={() => setOpen(false)}
					innerScroll
					size="covered"
				>
					<ProjectsStats project={activeProject} />
				</Modal>
			)}

			{showStatuses && (
				<Modal
					isOpen={showStatuses}
					onClose={() => setShowStatuses(false)}
					innerScroll
					size="covered"
				>
					<UniversalTable<ProjectTableRow>
						headers={headersForProjects}
						activeItems={tableData.toSorted((a, b) =>
							a.status.localeCompare(b.status),
						)}
					/>
				</Modal>
			)}
		</>
	);
};

export default ProjectsReports;
