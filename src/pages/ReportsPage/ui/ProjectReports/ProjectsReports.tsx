import dayjs from "dayjs";
import { useEffect, useMemo, useState } from "react";
import { useOutletContext } from "react-router";
import { dtoFieldsCodesUserReports } from "@/components/calendar/constants/const";
import { getWeekBorders } from "@/shared/utils/statisticUtils/generateWeekBorders";
import { Modal } from "../../../../components/modal";
import type { ReportsContext } from "../../../../shared/types/types";
import { getTasks } from "../../api/getTasks";
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
	const [activeProject, setActiveProject] = useState<{
		ID: string;
		NAME: string;
	}>();

	const { projects } = useOutletContext<ReportsContext>();

	const borders = useMemo(() => getWeekBorders(dayjs(today)), []);

	const [projWithStatus, setProjWithStatus] = useState<ProjectWithStatus[]>([]);

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
		</>
	);
};

export default ProjectsReports;
