import { useState } from "react";
import { treeColors } from "@/pages/ReportsPage/constants/colorTree";
import type {
	ActivitySort,
	GroupedClientItem,
} from "@/pages/ReportsPage/types/types";
import { ActivityNode } from "./ActivityNode";
import { TreeNode } from "./TreeNode";

type ProjectActivitiesTreeProps = {
	data: GroupedClientItem[];
	emptyText?: string;
};

export const ProjectActivitiesTree = ({
	data,
	emptyText = "Нет данных по активностям за выбранный период",
}: ProjectActivitiesTreeProps) => {
	const [expandedClients, setExpandedClients] = useState<Set<number>>(
		() => new Set(),
	);
	const [expandedProjects, setExpandedProjects] = useState<Set<string>>(
		() => new Set(),
	);

	const toggleClient = (clientId: number) => {
		setExpandedClients((prev) => {
			const next = new Set(prev);

			if (next.has(clientId)) {
				next.delete(clientId);
			} else {
				next.add(clientId);
			}

			return next;
		});
	};

	const toggleProject = (clientId: number, projectId: number) => {
		const key = `${clientId}-${projectId}`;

		setExpandedProjects((prev) => {
			const next = new Set(prev);

			if (next.has(key)) {
				next.delete(key);
			} else {
				next.add(key);
			}

			return next;
		});
	};

	if (!data.length) {
		return (
			<div
				style={{
					marginTop: "1rem",
					padding: "1rem",
					border: "1px dashed #d1d5db",
					borderRadius: "12px",
					color: "#6b7280",
					background: "#fafafa",
				}}
			>
				{emptyText}
			</div>
		);
	}

	return (
		<div
			style={{
				marginTop: "1rem",
				maxHeight: "calc(100vh - 180px)",
				overflowY: "auto",
				paddingRight: "0.5rem",
			}}
		>
			{data.map((client) => {
				const isClientExpanded = expandedClients.has(client.clientId);

				return (
					<TreeNode
						key={client.clientId}
						level={0}
						styles={treeColors.client}
						title={
							<div
								style={{
									fontSize: "1rem",
									fontWeight: 700,
									color: "#111827",
								}}
							>
								{client.clientTitle}
							</div>
						}
						value={`${client.timeSpent} ч.`}
						isExpanded={isClientExpanded}
						onToggle={() => toggleClient(client.clientId)}
					>
						{client.projects.map((project) => {
							const projectKey = `${client.clientId}-${project.projectId}`;
							const isProjectExpanded = expandedProjects.has(projectKey);

							return (
								<TreeNode
									key={project.projectId}
									level={1}
									styles={treeColors.project}
									title={
										<div
											style={{
												fontWeight: 600,
												color: "#1f2937",
											}}
										>
											{project.projectTitle}
										</div>
									}
									value={`${project.timeSpent} ч.`}
									isExpanded={isProjectExpanded}
									onToggle={() =>
										toggleProject(client.clientId, project.projectId)
									}
								>
									{([0, 1, 2] as ActivitySort[]).map((sort) => {
										const category = project.categories[sort];

										if (!category.activities.length) {
											return null;
										}

										return (
											<div
												key={sort}
												style={{
													display: "flex",
													flexDirection: "column",
													gap: "0.4rem",
													paddingLeft: "0.75rem",
													...treeColors.sort[sort],
												}}
											>
												<div
													style={{
														display: "flex",
														justifyContent: "space-between",
														alignItems: "center",
														padding: "0.35rem 0.25rem 0.15rem",
													}}
												>
													<div
														style={{
															fontSize: "0.9rem",
															fontWeight: 700,
															color: "#374151",
														}}
													>
														{category.title}
													</div>

													<div
														style={{
															fontSize: "0.85rem",
															fontWeight: 600,
															color: "#6b7280",
														}}
													>
														{category.timeSpent} ч.
													</div>
												</div>

												{category.activities.map((activity) => (
													<ActivityNode
														key={activity.activityId}
														activity={activity}
													/>
												))}
											</div>
										);
									})}
								</TreeNode>
							);
						})}
					</TreeNode>
				);
			})}
		</div>
	);
};
