import {
	PAYMENT_KIND_BY_SORT,
	PAYMENT_SORT_TITLES,
} from "@/components/calendar/helpers/paymentType";
import type { ActivitySort, GroupedClientItem } from "../../../types/types";
import { formatHours, getProjectKey } from "../model/utils";
import cls from "../ReportsCalendar.module.scss";
import { PanelSkeleton } from "./PanelSkeleton";

type ProjectCardsPanelProps = {
	clients: GroupedClientItem[];
	expandedClients: Set<number>;
	selectedProjectKey: string;
	isLoading: boolean;
	onToggleClient: (clientId: number) => void;
	onSelectProject: (projectKey: string) => void;
};

export const ProjectCardsPanel = ({
	clients,
	expandedClients,
	selectedProjectKey,
	isLoading,
	onToggleClient,
	onSelectProject,
}: ProjectCardsPanelProps) => (
	<section className={`${cls.panel} ${cls.projectsPanel}`}>
		<div className={cls.panelHeader}>
			<h3>Клиенты и проекты</h3>
			<span>{clients.length}</span>
		</div>
		<div className={cls.projectCards}>
			{isLoading ? (
				<PanelSkeleton rows={6} variant="project" />
			) : (
				clients.map((client) => {
					const isExpanded = expandedClients.has(client.clientId);
					const firstProject = client.projects[0];
					const clientSummary = client.projects.reduce(
						(acc, project) => {
							([0, 1, 2] as ActivitySort[]).forEach((sort) => {
								acc[sort] += project.categories[sort].timeSpent;
							});

							return acc;
						},
						{ 0: 0, 1: 0, 2: 0 } as Record<ActivitySort, number>,
					);

					return (
						<div key={client.clientId} className={cls.clientBlock}>
							<button
								type="button"
								className={`${cls.clientCard} ${
									firstProject &&
									selectedProjectKey ===
										getProjectKey(client.clientId, firstProject.projectId)
										? cls.activeCard
										: ""
								}`}
								onClick={() => {
									if (firstProject) {
										onSelectProject(
											getProjectKey(client.clientId, firstProject.projectId),
										);
									}

									onToggleClient(client.clientId);
								}}
							>
								<div>
									<div className={cls.clientTitle}>› {client.clientTitle}</div>
									<div className={cls.clientMeta}>
										{client.projects.length} проектов
									</div>
									<div className={cls.clientPills}>
										{([0, 1, 2] as ActivitySort[]).map((sort) => {
											const kind = PAYMENT_KIND_BY_SORT[sort];

											return (
												<span key={sort} className={cls[kind]}>
													{PAYMENT_SORT_TITLES[sort].replace(" paid", "")}{" "}
													{Number(clientSummary[sort].toFixed(1))}
												</span>
											);
										})}
									</div>
								</div>
								<span className={cls.clientTotal}>
									{formatHours(client.timeSpent)}
								</span>
							</button>
							{isExpanded && (
								<div className={cls.projectList}>
									{client.projects.map((project) => (
										<button
											type="button"
											key={project.projectId}
											className={`${cls.projectButton} ${
												selectedProjectKey ===
												getProjectKey(client.clientId, project.projectId)
													? cls.activeCard
													: ""
											}`}
											onClick={() =>
												onSelectProject(
													getProjectKey(client.clientId, project.projectId),
												)
											}
										>
											<span>{project.projectTitle}</span>
											<strong>{formatHours(project.timeSpent)}</strong>
										</button>
									))}
								</div>
							)}
						</div>
					);
				})
			)}
			{!isLoading && !clients.length && (
				<div className={cls.emptyState}>Нет данных за выбранный период</div>
			)}
		</div>
	</section>
);
