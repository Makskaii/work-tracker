import { useEffect, useState } from "react";
import { useOutletContext } from "react-router";
import { ReportCodes, TaskCodes } from "@/components/calendar/constants/const";
import { TableCell } from "@/components/Table/universalTable/TableCellDecoration";
import { $api } from "@/shared/config";
import { Endpoints, EntityTypeIds } from "@/shared/constants/const";
import { useSprintBorders } from "@/shared/hooks/useSprintBorders";
import type { Header } from "@/shared/types/table";
import { getFixedNumber } from "@/shared/utils/getNumber";
import { Modal } from "../../../../components/modal";
import type {
	ClientListItems,
	ReportsContext,
	TaskProps,
} from "../../../../shared/types/types";
import { getItems } from "../../api/getTasks";
import type { ProjectTableRow } from "../../types/types";
import { ProjectsStats } from "./ProjectStatsModal";
import styles from "./ProjectsReports.module.scss";

type ProjectWithStatus = ClientListItems & {
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
		return acc + parseFloat(task[TaskCodes.estimateTime] ?? 0);
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
				ReportCodes.title,
				ReportCodes.timeSpent,
				ReportCodes.project,
				ReportCodes.taskId,
				ReportCodes.activityType,
				"assignedById",
				"createdTime",
				"lastActivityTime",
				`parentId${EntityTypeIds.tasks}`,
			],
			filter: {
				[ReportCodes.client]: projectId,
			},
		},
	});

	return response?.data?.result?.items ?? [];
};

const getSpentHoursByReports = (reports: Array<Record<string, unknown>>) => {
	return reports.reduce((acc, report) => {
		return acc + Number(report[ReportCodes.timeSpent] ?? 0);
	}, 0);
};

const getProjectRisk = (planHours: number, spentHours: number) => {
	return spentHours > planHours ? "Перерасход" : "Нет риска";
};

export const getProjectsTableData = async ({
	projects,
}: {
	projects: ClientListItems[];
}): Promise<ProjectTableRow[]> => {
	const result = await Promise.all(
		projects.map(async (project) => {
			const tasks = await getItems<TaskProps>({
				typeId: EntityTypeIds.tasks,
				filters: {
					[TaskCodes.client]: project.ID,
				},
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
		convertFn: (value) => getFixedNumber(value),
	},
	{
		title: "Потрачено",
		key: "spentHours",
		convertFn: (value) => getFixedNumber(value),
	},
	{
		title: "Отклонение",
		key: "deviation",
		convertFn: (value) =>
			value > 0 ? `+${getFixedNumber(value)}` : getFixedNumber(value),
	},
	{
		title: "Риск",
		key: "risk",
		render: (value) => (
			<TableCell
				value={value}
				styles={{
					color: getRiskColor(value),
				}}
			/>
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
	projects: ClientListItems[];
	startOfTheWeek: string;
	endOfTheWeek: string;
}): Promise<ProjectWithStatus[]> => {
	const result = await Promise.all(
		projects.map(async (project) => {
			const response = await getItems<TaskProps>({
				typeId: EntityTypeIds.tasks,
				filters: {
					[TaskCodes.client]: project.ID,
					[`<=${TaskCodes.sprintDateStart}`]: endOfTheWeek,
					[`>=${TaskCodes.sprintDateStart}`]: startOfTheWeek,
				},
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

const ProjectsReports = () => {
	const [open, setOpen] = useState<boolean>(false);
	const [activeProject, setActiveProject] = useState<{
		ID: string;
		NAME: string;
	}>();

	const { clientsList } = useOutletContext<ReportsContext>();
	const { startOfTheWeek, endOfTheWeek } = useSprintBorders();
	const [projWithStatus, setProjWithStatus] = useState<ProjectWithStatus[]>([]);

	useEffect(() => {
		const fetchData = async () => {
			const result = await getProjectsWithStatuses({
				projects: clientsList,
				startOfTheWeek: startOfTheWeek,
				endOfTheWeek: endOfTheWeek,
			});

			setProjWithStatus(result);
		};

		if (clientsList) {
			fetchData();
		}
	}, [endOfTheWeek, startOfTheWeek, clientsList]);

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
		</>
	);
};

export default ProjectsReports;
