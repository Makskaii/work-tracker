import { useEffect, useMemo, useState } from "react";
import { FormProvider, useForm } from "react-hook-form";
import { useOutletContext } from "react-router";
import type {
	ActivityListItem,
	ActivitySort,
	ProjectActivitiesGroup,
} from "@/components/calendar/types/types";
import { getActivitiesList } from "@/shared/api/getCrmFields";
import { Endpoints } from "@/shared/constants/const";
import type { GroupedReportFields } from "@/shared/types/table";
import { Calendar } from "../../../../components/calendar/Calendar";
import { AsyncSelect } from "../../../../components/form/SelectField";
import type { ReportsContext } from "../../../../shared/types/types";
import type { ProjectFromList } from "../../ReportsPage";

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

export const groupReportsByProjectsAndActivities = ({
	reports,
	projects,
	activities,
}: {
	reports: GroupedReportFields[];
	projects: ProjectFromList[];
	activities: ActivityListItem[];
}): ProjectActivitiesGroup[] => {
	const projectsMap = new Map<number, ProjectFromList>();
	for (const project of projects) {
		projectsMap.set(Number(project.id), project);
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

	const resultMap = new Map<number, ProjectActivitiesGroup>();

	for (const report of reports) {
		const projectId = Number(report.project);
		const activityId = Number(report.activity);

		if (!projectId || !activityId) continue;

		const project = projectsMap.get(projectId);
		const activity = activitiesMap.get(activityId);

		if (!project || !activity) continue;

		const timeSpent = parseTimeSpent(report.timeSpent);

		if (!resultMap.has(projectId)) {
			resultMap.set(projectId, {
				projectId,
				projectTitle: project.name,
				categories: {
					0: {
						sort: 0,
						title: ACTIVITY_SORT_TITLES[0],
						activities: [],
						totalTimeSpent: 0,
					},
					1: {
						sort: 1,
						title: ACTIVITY_SORT_TITLES[1],
						activities: [],
						totalTimeSpent: 0,
					},
					2: {
						sort: 2,
						title: ACTIVITY_SORT_TITLES[2],
						activities: [],
						totalTimeSpent: 0,
					},
				},
				totalTimeSpent: 0,
			});
		}

		const projectGroup = resultMap.get(projectId)!;
		const category = projectGroup.categories[activity.sort];

		const existingActivity = category.activities.find(
			(item) => item.activityId === activityId,
		);

		if (existingActivity) {
			existingActivity.timeSpent += timeSpent;
			existingActivity.reports.push(report);
		} else {
			category.activities.push({
				activityId,
				activityTitle: activity.title,
				sort: activity.sort,
				timeSpent,
				reports: [report],
			});
		}

		category.totalTimeSpent += timeSpent;
		projectGroup.totalTimeSpent += timeSpent;
	}

	return Array.from(resultMap.values())
		.map((projectGroup) => ({
			...projectGroup,
			categories: {
				0: {
					...projectGroup.categories[0],
					activities: [...projectGroup.categories[0].activities].sort(
						(a, b) => b.timeSpent - a.timeSpent,
					),
				},
				1: {
					...projectGroup.categories[1],
					activities: [...projectGroup.categories[1].activities].sort(
						(a, b) => b.timeSpent - a.timeSpent,
					),
				},
				2: {
					...projectGroup.categories[2],
					activities: [...projectGroup.categories[2].activities].sort(
						(a, b) => b.timeSpent - a.timeSpent,
					),
				},
			},
		}))
		.sort((a, b) => b.totalTimeSpent - a.totalTimeSpent);
};

type ViewCalendar = "month" | "week";

const ReportsCalendar = () => {
	const Context = useOutletContext<ReportsContext>();
	const [view, setView] = useState<ViewCalendar>("month");

	const [expandedProjects, setExpandedProjects] = useState<Set<number>>(
		() => new Set(),
	);

	const toggleProject = (projectId: number) => {
		setExpandedProjects((prev) => {
			const next = new Set(prev);

			if (next.has(projectId)) {
				next.delete(projectId);
			} else {
				next.add(projectId);
			}

			return next;
		});
	};

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

	const groupedProjectActivities = useMemo(() => {
		return groupReportsByProjectsAndActivities({
			reports: groupedByActivity,
			projects: Context.projects,
			activities: activities,
		});
	}, [activities, Context.projects, groupedByActivity]);

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

				{groupedProjectActivities.length > 0 && (
					<div
						style={{
							marginTop: "1rem",
							display: "flex",
							flexDirection: "column",
							gap: "0.75rem",
							maxHeight: "calc(100vh - 180px)",
							overflowY: "auto",
							paddingRight: "0.5rem",
						}}
					>
						{groupedProjectActivities.map((project) => {
							const isExpanded = expandedProjects.has(project.projectId);

							return (
								<div
									key={project.projectId}
									style={{
										border: "1px solid #e5e7eb",
										borderRadius: "14px",
										background: "#fff",
										boxShadow: "0 2px 10px rgba(0,0,0,0.04)",
										overflow: "hidden",
									}}
								>
									<button
										type="button"
										onClick={() => toggleProject(project.projectId)}
										style={{
											width: "100%",
											border: "none",
											background: "transparent",
											cursor: "pointer",
											padding: "1rem",
											display: "flex",
											alignItems: "center",
											justifyContent: "space-between",
											gap: "0.75rem",
											textAlign: "left",
										}}
									>
										<div
											style={{
												display: "flex",
												alignItems: "center",
												gap: "0.75rem",
												minWidth: 0,
											}}
										>
											<div
												style={{
													fontSize: "0.9rem",
													color: "#6b7280",
													transform: isExpanded
														? "rotate(90deg)"
														: "rotate(0deg)",
													transition: "transform 0.2s ease",
												}}
											>
												▶
											</div>

											<div
												style={{
													fontSize: "1rem",
													fontWeight: 700,
													color: "#111827",
													lineHeight: 1.3,
													wordBreak: "break-word",
												}}
											>
												{project.projectTitle}
											</div>
										</div>

										<div
											style={{
												whiteSpace: "nowrap",
												padding: "0.3rem 0.65rem",
												borderRadius: "999px",
												background: "#f3f4f6",
												fontWeight: 600,
												fontSize: "0.9rem",
												color: "#374151",
												flexShrink: 0,
											}}
										>
											{project.totalTimeSpent} ч.
										</div>
									</button>

									{isExpanded && (
										<div
											style={{
												padding: "0 1rem 1rem",
												borderTop: "1px solid #f3f4f6",
											}}
										>
											{([0, 1, 2] as ActivitySort[]).map((sort) => {
												const category = project.categories[sort];

												if (!category.activities.length) return null;

												return (
													<div
														key={sort}
														style={{
															marginTop: "0.85rem",
														}}
													>
														<div
															style={{
																display: "flex",
																justifyContent: "space-between",
																alignItems: "center",
																marginBottom: "0.5rem",
															}}
														>
															<div
																style={{
																	fontSize: "0.92rem",
																	fontWeight: 600,
																	color: "#1f2937",
																}}
															>
																{category.title}
															</div>

															<div
																style={{
																	fontSize: "0.85rem",
																	color: "#6b7280",
																	fontWeight: 600,
																}}
															>
																{category.totalTimeSpent} ч.
															</div>
														</div>

														<div
															style={{
																display: "flex",
																flexDirection: "column",
																gap: "0.35rem",
															}}
														>
															{category.activities.map((activity) => (
																<div
																	key={activity.activityId}
																	style={{
																		display: "flex",
																		justifyContent: "space-between",
																		alignItems: "center",
																		gap: "0.75rem",
																		padding: "0.55rem 0.75rem",
																		borderRadius: "10px",
																		background: "#f9fafb",
																	}}
																>
																	<div
																		style={{
																			fontSize: "0.9rem",
																			color: "#374151",
																			wordBreak: "break-word",
																		}}
																	>
																		{activity.activityTitle}
																	</div>

																	<div
																		style={{
																			fontSize: "0.9rem",
																			fontWeight: 600,
																			color: "#111827",
																			whiteSpace: "nowrap",
																			flexShrink: 0,
																		}}
																	>
																		{activity.timeSpent} ч.
																	</div>
																</div>
															))}
														</div>
													</div>
												);
											})}
										</div>
									)}
								</div>
							);
						})}
					</div>
				)}

				{groupedProjectActivities.length === 0 && (
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
						Нет данных по активностям за выбранный период
					</div>
				)}
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
