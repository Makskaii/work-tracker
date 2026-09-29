import type { ReportProject } from "../model/groupReportsByProject";
import { formatHours } from "../model/utils";
import cls from "../ReportsCalendar.module.scss";
import { PanelSkeleton } from "./PanelSkeleton";

type ProjectCardsPanelProps = {
	projects: ReportProject[];
	selectedProjectKey: string;
	isLoading: boolean;
	onSelectProject: (key: string) => void;
};

export const ProjectCardsPanel = ({
	projects,
	selectedProjectKey,
	isLoading,
	onSelectProject,
}: ProjectCardsPanelProps) => (
	<section className={`${cls.panel} ${cls.projectsPanel}`} aria-label="Проекты">
		<div className={cls.panelHeader}>
			<h3>Проекты</h3>
			<span>{projects.length}</span>
		</div>
		<div className={cls.projectCards}>
			{isLoading ? (
				<PanelSkeleton rows={6} variant="project" />
			) : (
				projects.map((project) => (
					<button
						type="button"
						key={project.key}
						className={`${cls.compactProject} ${selectedProjectKey === project.key ? cls.activeCard : ""}`}
						aria-pressed={selectedProjectKey === project.key}
						onClick={() => onSelectProject(project.key)}
					>
						<span className={cls.projectInfo}>
							<strong title={project.title}>{project.title}</strong>
							<small>Отчётов: {project.reports.length}</small>
						</span>
						<span className={cls.hoursPill}>{formatHours(project.hours)}</span>
					</button>
				))
			)}
			{!isLoading && !projects.length && (
				<div className={cls.emptyState}>Нет отчётов за выбранный период</div>
			)}
		</div>
	</section>
);
