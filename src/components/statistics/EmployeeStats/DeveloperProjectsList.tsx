import { useState } from "react";
import type { ProjectFromList } from "@/pages/ReportsPage/ReportsPage";
import type { TGroupedTasks } from "@/pages/ReportsPage/ui/ProgressReports/types";
import { EntityTypeIds } from "@/shared/constants/const";
import { useBitrixSlider } from "@/shared/hooks/useBitrixSlider";
import type { TaskProps } from "@/shared/types/types";

type DeveloperProjectsAccordionProps = {
	tasks: TaskProps[];
	grouped: TGroupedTasks;
	projects: ProjectFromList[];
};
export const DeveloperProjectsAccordion = ({
	tasks,
	grouped,
	projects,
}: DeveloperProjectsAccordionProps) => {
	const [openProjectId, setOpenProjectId] = useState<string | null>(null);

	const { openTask } = useBitrixSlider();

	if (tasks.length === 0) {
		return null;
	}

	const handleToggle = (projectId: string) => {
		setOpenProjectId((prev) => (prev === projectId ? null : projectId));
	};

	return (
		<div style={{ marginTop: "1rem", width: "100%" }}>
			<div
				style={{
					marginBottom: "1rem",
					fontWeight: 700,
					fontSize: "1rem",
					color: "#111827",
				}}
			>
				Список проектов
			</div>

			<div
				style={{
					display: "flex",
					flexDirection: "column",
					gap: "12px",
					width: "100%",
				}}
			>
				{Object.entries(grouped).map(([projectId, projectTasks]) => {
					const isOpen = openProjectId === projectId;
					const projectName =
						projects.find((project) => String(project.id) === String(projectId))
							?.name ?? "Без проекта";

					return (
						<div
							key={projectId}
							style={{
								background: "#f9fafb",
								border: "1px solid #e5e7eb",
								borderRadius: "20px",
								overflow: "hidden",
								boxShadow: "0 4px 14px rgba(0, 0, 0, 0.04)",
							}}
						>
							<button
								type="button"
								onClick={() => handleToggle(projectId)}
								style={{
									width: "100%",
									display: "flex",
									alignItems: "center",
									justifyContent: "space-between",
									gap: "1rem",
									padding: "1rem 1.25rem",
									border: "none",
									background: "transparent",
									cursor: "pointer",
									textAlign: "left",
								}}
							>
								<div
									style={{
										display: "flex",
										flexDirection: "column",
										gap: "4px",
										minWidth: 0,
									}}
								>
									<div
										style={{
											fontWeight: 600,
											fontSize: "0.95rem",
											color: "#111827",
											wordBreak: "break-word",
										}}
									>
										{projectName}
									</div>

									<div
										style={{
											fontSize: "0.85rem",
											color: "#6b7280",
										}}
									>
										Задач: {projectTasks?.length}
									</div>
								</div>

								<div
									style={{
										flexShrink: 0,
										width: "32px",
										height: "32px",
										display: "flex",
										alignItems: "center",
										justifyContent: "center",
										borderRadius: "50%",
										background: "#ffffff",
										border: "1px solid #e5e7eb",
										transform: isOpen ? "rotate(180deg)" : "rotate(0deg)",
										transition: "transform 0.25s ease",
										fontSize: "1rem",
										color: "#374151",
									}}
								>
									⌄
								</div>
							</button>

							<div
								style={{
									maxHeight: isOpen ? "500px" : "0px",
									opacity: isOpen ? 1 : 0,
									overflow: "hidden",
									transition:
										"max-height 0.3s ease, opacity 0.25s ease, padding 0.3s ease",
									padding: isOpen ? "0 1.25rem 1rem 1.25rem" : "0 1.25rem",
								}}
							>
								<div
									style={{
										borderTop: "1px solid #e5e7eb",
										paddingTop: "0.75rem",
										display: "flex",
										flexDirection: "column",
										gap: "8px",
									}}
								>
									{projectTasks?.map((task) => (
										<div
											onClick={() => openTask(task.id, EntityTypeIds.tasks)}
											key={task.id}
											style={{
												padding: "0.75rem 0.9rem",
												borderRadius: "14px",
												background: "#ffffff",
												border: "1px solid #edf0f3",
												color: "#374151",
												fontSize: "0.9rem",
												lineHeight: 1.4,
												wordBreak: "break-word",
											}}
										>
											{task.title}
										</div>
									))}
								</div>
							</div>
						</div>
					);
				})}
			</div>
		</div>
	);
};
