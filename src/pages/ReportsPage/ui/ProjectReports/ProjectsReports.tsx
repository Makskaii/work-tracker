import { useEffect, useState } from "react";
import { useOutletContext } from "react-router";
import { Modal } from "../../../../components/modal";
import { $api } from "../../../../shared/config";
import { Endpoints } from "../../../../shared/constants/const";
import type { ReportsContext } from "../../../../shared/types/types";
import { ProjectsStats } from "./ProjectStatsModal";
import styles from "./ProjectsReports.module.scss";

const ProjectsReports = () => {
	const [open, setOpen] = useState<boolean>(false);
	const [activeProject, setActiveProject] = useState<{
		ID: string;
		NAME: string;
	}>();

	const { setCurrProject } = useOutletContext<ReportsContext>();

	const [projects, setProjects] = useState<
		{
			ID: string;
			NAME: string;
		}[]
	>([]);

	useEffect(() => {
		if (!open) {
			setCurrProject("");
		}
	}, [open, setCurrProject]);

	useEffect(() => {
		const getProjectsAsCRMfields = async () => {
			try {
				const response = await $api.post(Endpoints.lists, {
					IBLOCK_TYPE_ID: "lists",
					IBLOCK_ID: "23",
					SELECT: ["ID", "NAME"],
				});

				setProjects(response.data.result);
			} catch {
				console.log("Ошибка при получении списка задач");
			}
		};

		getProjectsAsCRMfields();
	}, []);

	return (
		<>
			<div className={styles.header}>Проекты</div>
			<div className={styles.contentContainer}>
				<div className={styles.itemsContainer}>
					{projects.map((proj) => (
						<div
							key={proj.ID}
							className={styles.projectItem}
							onClick={() => {
								setCurrProject(proj.ID);
								setActiveProject(proj);
								setOpen(true);
							}}
						>
							<div>
								<div className={styles.projectTitle}> {proj.NAME}</div>
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
				<Modal isOpen={open} onClose={() => setOpen(false)} innerScroll>
					<ProjectsStats project={activeProject} />
				</Modal>
			)}
		</>
	);
};

export default ProjectsReports;
