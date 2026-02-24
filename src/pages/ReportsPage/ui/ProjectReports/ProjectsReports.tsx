import { useEffect, useState } from "react";
import { useOutletContext } from "react-router";
import { Modal } from "../../../../components/modal";
import { $api } from "../../../../shared/config";
import { Endpoints, EntityTypeIds } from "../../../../shared/constants/const";
import type { ContextType } from "../../../../shared/types/types";
import { connectProjectIds } from "../../../../shared/utils/crmFieldsConnect/connectProjectsIds";
import { ProjectsStats } from "./ProjectStatsModal";
import styles from "./ProjectsReports.module.scss";

const ProjectsReports = () => {
	const [open, setOpen] = useState<boolean>(false);
	const [activeProject, setActiveProject] = useState<{
		ID: string;
		VALUE: string;
	}>();

	const { setCurrProject, projects: taskProjects } =
		useOutletContext<ContextType>();

	const [projects, setProjects] = useState<
		{
			ID: string;
			VALUE: string;
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
				const response = await $api.post(Endpoints.crmFeilds, {
					entityTypeId: EntityTypeIds.reports,
				});

				setProjects(response.data.result.fields["ufCrm11_1770393502397"].items);
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
								setCurrProject(
									connectProjectIds(taskProjects, proj.VALUE) ?? "",
								);
								setActiveProject(proj);
								setOpen(true);
							}}
						>
							<div>
								<div className={styles.projectTitle}> {proj.VALUE}</div>
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
