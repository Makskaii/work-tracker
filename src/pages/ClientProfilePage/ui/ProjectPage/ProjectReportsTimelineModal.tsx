import dayjs from "dayjs";
import { useMemo, useState } from "react";
import { ReportCodes } from "@/components/calendar/constants/const";
import type { ReportProps } from "@/components/calendar/types/types";
import { Modal } from "@/components/modal";
import type { TaskProps, User } from "@/shared/types/types";
import theme from "../ClientProfileTheme.module.scss";
import styles from "./ReportsModal.module.scss";

type ActivityItem = {
	ID: string;
	IBLOCK_ID: string;
	NAME: string;
	IBLOCK_SECTION_ID: string | null;
	CREATED_BY: string;
	BP_PUBLISHED: string;
	CODE: string | null;
	SORT: string;
};

type Props = {
	open: boolean;
	onClose: () => void;
	projectName: string;
	reports: ReportProps[];
	users: User[];
	activities: ActivityItem[];
	tasks: TaskProps[];
};

export const ProjectReportsTimelineModal = ({
	open,
	onClose,
	projectName,
	reports,
	users,
	activities,
	tasks,
}: Props) => {
	const [search, setSearch] = useState("");
	const [selectedUser, _setSelectedUser] = useState("all");
	const [selectedActivity, _setSelectedActivity] = useState("all");
	const [taskMode, _setTaskMode] = useState<"all" | "withTask" | "withoutTask">(
		"all",
	);

	const activityMap = useMemo(() => {
		return activities.reduce(
			(acc, activity) => {
				acc[String(activity.ID)] = activity;
				return acc;
			},
			{} as Record<string, ActivityItem>,
		);
	}, [activities]);

	const taskMap = useMemo(() => {
		return tasks.reduce(
			(acc, task) => {
				acc[String(task.id)] = task;
				return acc;
			},
			{} as Record<string, TaskProps>,
		);
	}, [tasks]);

	const filteredReports = useMemo(() => {
		return [...reports]
			.filter((report) => {
				const taskId = String(report[ReportCodes.taskId] ?? "");
				const hasTask = Boolean(taskId);

				if (
					selectedUser !== "all" &&
					String(report.assignedById) !== selectedUser
				) {
					return false;
				}

				if (
					selectedActivity !== "all" &&
					String(report[ReportCodes.activityType]) !== selectedActivity
				) {
					return false;
				}

				if (taskMode === "withTask" && !hasTask) return false;
				if (taskMode === "withoutTask" && hasTask) return false;

				if (!search.trim()) return true;

				const taskTitle = hasTask ? taskMap[taskId]?.title || "" : "";
				const activityName =
					activityMap[String(report[ReportCodes.activityType])]?.NAME || "";
				const user = users.find(
					(user) => user.id === String(report.assignedById),
				);

				const haystack = [
					report.title,
					report[ReportCodes.title],
					taskTitle,
					activityName,
					user?.title,
				]
					.filter(Boolean)
					.join(" ")
					.toLowerCase();

				return haystack.includes(search.toLowerCase());
			})
			.sort(
				(a, b) => dayjs(b.begindate).valueOf() - dayjs(a.begindate).valueOf(),
			);
	}, [
		reports,
		selectedUser,
		selectedActivity,
		taskMode,
		search,
		taskMap,
		activityMap,
		users.find,
	]);

	const groupedReports = useMemo(() => {
		return filteredReports.reduce(
			(acc, report) => {
				const dayKey = dayjs(report.begindate).format("YYYY-MM-DD");

				if (!acc[dayKey]) {
					acc[dayKey] = [];
				}

				acc[dayKey].push(report);

				return acc;
			},
			{} as Record<string, ReportProps[]>,
		);
	}, [filteredReports]);

	const withoutTaskCount = filteredReports.filter(
		(report) => !report[ReportCodes.taskId],
	).length;

	const uniqueUsersCount = new Set(
		filteredReports.map((item) => String(item.assignedById)),
	).size;

	return (
		<Modal
			isOpen={open}
			onClose={onClose}
			size="full"
			innerScroll
			className={theme.lightTheme}
		>
			<div className={styles.wrapper}>
				<div className={styles.header}>
					<div className={styles.headerMain}>
						<div className={styles.badge}>Отчётность проекта</div>
						<h2 className={styles.title}>{projectName}</h2>
						<p className={styles.subtitle}>
							Таймлайн всей проектной активности с фильтрами и разбивкой по дням
						</p>
					</div>

					<div className={styles.headerStats}>
						<div className={styles.statCard}>
							<div className={styles.statValue}>{filteredReports.length}</div>
							<div className={styles.statLabel}>Отчётов</div>
						</div>

						<div className={styles.statCard}>
							<div className={styles.statValue}>{withoutTaskCount}</div>
							<div className={styles.statLabel}>Без задачи</div>
						</div>

						<div className={styles.statCard}>
							<div className={styles.statValue}>{uniqueUsersCount}</div>
							<div className={styles.statLabel}>Разработчиков</div>
						</div>
					</div>
				</div>

				<div className={styles.filters}>
					<input
						className={styles.input}
						placeholder="Поиск по отчётам, задачам, активности..."
						value={search}
						onChange={(e) => setSearch(e.target.value)}
					/>

					{/* <select
						className={styles.select}
						value={selectedUser}
						onChange={(e) => setSelectedUser(e.target.value)}
					>
						<option value="all">Все разработчики</option>
						{users.map((user) => (
							<option key={user.id} value={String(user.id)}>
								{user.title}
							</option>
						))}
					</select>

					<select
						className={styles.select}
						value={selectedActivity}
						onChange={(e) => setSelectedActivity(e.target.value)}
					>
						<option value="all">Все активности</option>
						{activities.map((activity) => (
							<option key={activity.ID} value={String(activity.ID)}>
								{activity.NAME}
							</option>
						))}
					</select> */}

					{/* <select
						className={styles.select}
						value={taskMode}
						onChange={(e) =>
							setTaskMode(e.target.value as "all" | "withTask" | "withoutTask")
						}
					>
						<option value="all">Все отчёты</option>
						<option value="withTask">Только с задачей</option>
						<option value="withoutTask">Только без задачи</option>
					</select> */}

					{/* <button
						type="button"
						className={styles.closeButton}
						onClick={onClose}
					>
						Закрыть
					</button> */}
				</div>

				<div className={styles.layout}>
					<div className={styles.timelineSection}>
						{Object.entries(groupedReports).length === 0 ? (
							<div className={styles.emptyState}>
								<div className={styles.emptyTitle}>Отчёты не найдены</div>
								<div className={styles.emptyText}>
									Попробуй изменить фильтры или поисковый запрос
								</div>
							</div>
						) : (
							Object.entries(groupedReports).map(([dayKey, dayReports]) => (
								<div key={dayKey} className={styles.dayBlock}>
									<div className={styles.dayHeader}>
										<div className={styles.dayTitle}>
											{dayjs(dayKey).format("DD.MM.YYYY")}
										</div>
										<div className={styles.dayCount}>
											{dayReports.length} отч.
										</div>
									</div>

									<div className={styles.timeline}>
										{dayReports.map((report) => {
											const taskId = String(
												report[ReportCodes.parentId] ??
													report[ReportCodes.taskId],
											);
											const hasTask = Boolean(taskId);
											const task = hasTask ? taskMap[taskId] : null;
											const activity =
												activityMap[String(report[ReportCodes.activityType])];

											return (
												<div key={report.id} className={styles.timelineItem}>
													<div className={styles.timelineLine} />
													<div className={styles.timelineDot} />

													<div className={styles.reportCard}>
														<div className={styles.reportTop}>
															{/* <div className={styles.reportTime}>
																{dayjs(report.createdTime).format("HH:mm")}
															</div> */}

															<div className={styles.reportBadges}>
																<span className={styles.activityBadge}>
																	{activity?.NAME || "Активность"}
																</span>
																<span className={styles.timeBadge}>
																	{Number(
																		report[ReportCodes.timeSpent] || 0,
																	).toFixed(1)}{" "}
																	ч
																</span>
															</div>
														</div>

														<div className={styles.reportTitle}>
															{report[ReportCodes.title] ||
																report.title ||
																"Без названия"}
														</div>

														<div className={styles.metaGrid}>
															{/* <div className={styles.metaCard}>
																<div className={styles.metaLabel}>
																	Ответственный
																</div>
																<div className={styles.metaValue}>
																	{user && <UserCard user={user} />}
																</div>
															</div> */}

															<div className={styles.metaCard}>
																<div className={styles.metaLabel}>Задача</div>
																<div className={styles.metaValue}>
																	{hasTask
																		? task?.title || `Задача #${taskId}`
																		: "Без задачи"}
																</div>
															</div>
														</div>

														{!hasTask && (
															<div className={styles.noticeBox}>
																Отчёт не привязан к задаче. Это может быть
																созвон, обсуждение, клиентская активность или
																иная служебная работа по проекту.
															</div>
														)}
													</div>
												</div>
											);
										})}
									</div>
								</div>
							))
						)}
					</div>

					<div className={styles.sidebar}>
						<div className={styles.sideCard}>
							<div className={styles.sideTitle}>О формате просмотра</div>
							<div className={styles.sideText}>
								Лента позволяет быстро увидеть историю проекта: кто работал,
								когда, по какой задаче и сколько времени было списано.
							</div>
						</div>

						<div className={styles.sideCard}>
							<div className={styles.sideTitle}>Сводка</div>
							<div className={styles.sideList}>
								<div className={styles.sideRow}>
									<span>Всего записей</span>
									<strong>{filteredReports.length}</strong>
								</div>

								<div className={styles.sideRow}>
									<span>Без задачи</span>
									<strong>{withoutTaskCount}</strong>
								</div>
								<div className={styles.sideRow}>
									<span>Участников</span>
									<strong>{uniqueUsersCount}</strong>
								</div>
							</div>
						</div>

						<div className={styles.sideCard}>
							<button
								type="button"
								className={styles.primaryButton}
								onClick={onClose}
							>
								Закрыть окно
							</button>
						</div>
					</div>
				</div>
			</div>
		</Modal>
	);
};
