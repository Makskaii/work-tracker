import dayjs from "dayjs";
import { useEffect, useMemo, useState } from "react";
import { useNavigate, useParams } from "react-router";
import { CheckPermission } from "@/components/protectedRoute/CheckPermission";
import { UserCard } from "@/components/userCard/UserCard";
import { getDevelopers } from "@/pages/ReportsPage/api/getDevelopers";
import { getItems } from "@/pages/ReportsPage/api/getTasks";
import { ClientsCodes, EntityTypeIds } from "@/shared/constants/const";
import type { ClientProjectProps, User } from "@/shared/types/types";
import styles from "./ClientProfile.module.scss";

type ProjectMeeting = {
	id: number;
	title: string;
	projectTitle: string;
	date: string;
	time: string;
	link?: string;
};

const mockMeetings: ProjectMeeting[] = [
	{
		id: 1,
		title: "Еженедельный созвон по проекту",
		projectTitle: "CRM Dashboard",
		date: "2026-03-25",
		time: "14:00",
		link: "#",
	},
	{
		id: 2,
		title: "Демо промежуточного результата",
		projectTitle: "Mobile App",
		date: "2026-03-27",
		time: "11:30",
		link: "#",
	},
];

const formatDate = (date?: string) => {
	if (!date) return "—";

	const parsed = dayjs(date);

	if (!parsed.isValid()) return date;

	return parsed.format("DD.MM.YYYY HH:mm");
};

const getActivityLabel = (lastActivityTime?: string) => {
	if (!lastActivityTime) {
		return {
			text: "Нет активности",
			type: "idle",
		};
	}

	const diffInDays = dayjs().diff(dayjs(lastActivityTime), "day");

	if (diffInDays <= 1) {
		return {
			text: "Активность сегодня",
			type: "active",
		};
	}

	if (diffInDays <= 7) {
		return {
			text: "Активность на этой неделе",
			type: "warning",
		};
	}

	return {
		text: "Давно без обновлений",
		type: "idle",
	};
};

const ClientProfile = () => {
	const [projects, setProjects] = useState<ClientProjectProps[]>([]);
	const [loading, setLoading] = useState(false);
	const [error, setError] = useState<string | null>(null);
	const [users, setUsers] = useState<User[]>([]);

	const { clientId } = useParams<{ clientId: string }>();
	const navigate = useNavigate();

	useEffect(() => {
		const getUsers = async () => {
			const response = await getDevelopers();

			setUsers(
				response
					.map((user) => ({
						id: user.ID,
						value: user.NAME + user.LAST_NAME,
						title: user.NAME + " " + user.LAST_NAME,
						position: user.WORK_POSITION,
						photo: user.PERSONAL_PHOTO,
						department: user.UF_DEPARTMENT[0],
					}))
					.toSorted((a, b) => a.department - b.department),
			);
		};

		getUsers();
	}, []);

	useEffect(() => {
		const fetchProjects = async () => {
			if (!clientId) return;

			try {
				setLoading(true);
				setError(null);

				const response = await getItems<ClientProjectProps>(
					EntityTypeIds.projects,
					{
						[ClientsCodes.client]: clientId,
					},
				);

				setProjects(response ?? []);
			} catch (err) {
				console.error(err);
				setError("Не удалось загрузить проекты клиента");
			} finally {
				setLoading(false);
			}
		};

		fetchProjects();
	}, [clientId]);

	const latestActivityProjects = useMemo(() => {
		return [...projects]
			.filter((project) => project.lastActivityTime)
			.sort(
				(a, b) =>
					dayjs(b.lastActivityTime).valueOf() -
					dayjs(a.lastActivityTime).valueOf(),
			)
			.slice(0, 4);
	}, [projects]);

	const totalProjects = projects.length;
	const activeProjectsCount = projects.filter((project) => {
		const diffInDays = dayjs().diff(dayjs(project.lastActivityTime), "day");
		return diffInDays <= 7;
	}).length;

	return (
		<CheckPermission permission="read" subject={`client-profile-${clientId}`}>
			<div className={styles.page}>
				<div className={styles.headerCard}>
					<div className={styles.headerInfo}>
						<div className={styles.badge}>Кабинет клиента</div>
						<h1 className={styles.pageTitle}>Профиль клиента</h1>
						<p className={styles.pageSubtitle}>
							Здесь отображаются все проекты клиента, последние обновления по
							ним и ближайшие активности команды.
						</p>
					</div>

					<div className={styles.headerStats}>
						<div className={styles.statCard}>
							<div className={styles.statValue}>{totalProjects}</div>
							<div className={styles.statLabel}>Всего проектов</div>
						</div>

						<div className={styles.statCard}>
							<div className={styles.statValue}>{activeProjectsCount}</div>
							<div className={styles.statLabel}>Активны за 7 дней</div>
						</div>
					</div>
				</div>

				<div className={styles.content}>
					<div className={styles.mainColumn}>
						<div className={styles.sectionCard}>
							<div className={styles.sectionHeader}>
								<div>
									<h2
										style={{
											textAlign: "left",
										}}
										className={styles.sectionTitle}
									>
										Проекты
									</h2>
									<p className={styles.sectionSubtitle}>
										Основной список проектов с краткой сводкой по каждому
									</p>
								</div>

								<button type="button" className={styles.primaryButton}>
									Оставить заявку
								</button>
							</div>

							{loading && (
								<div className={styles.stateBox}>
									<div className={styles.stateTitle}>Загрузка проектов...</div>
									<div className={styles.stateText}>
										Получаем список проектов клиента
									</div>
								</div>
							)}

							{error && !loading && (
								<div className={styles.stateBoxError}>
									<div className={styles.stateTitle}>{error}</div>
									<div className={styles.stateText}>
										Попробуй обновить страницу или проверить доступ к данным
									</div>
								</div>
							)}

							{!loading && !error && projects.length === 0 && (
								<div className={styles.stateBox}>
									<div className={styles.stateTitle}>Проекты не найдены</div>
									<div className={styles.stateText}>
										Для этого клиента пока нет доступных проектов
									</div>
								</div>
							)}

							{!loading && !error && projects.length > 0 && (
								<div className={styles.projectsList}>
									{projects.map((project) => {
										const activity = getActivityLabel(project.lastActivityTime);
										const responsible = users.find(
											(user) => user.id === String(project.assignedById),
										);
										const lastUpdater = users.find(
											(user) => user.id === String(project.lastActivityBy),
										);

										return (
											<div key={project.id} className={styles.projectCard}>
												<div className={styles.projectTop}>
													<div className={styles.projectMainInfo}>
														<div className={styles.projectTitleRow}>
															<h3 className={styles.projectTitle}>
																{project.title}
															</h3>

															<span
																className={`${styles.activityBadge} ${
																	activity.type === "active"
																		? styles.activityActive
																		: activity.type === "warning"
																			? styles.activityWarning
																			: styles.activityIdle
																}`}
															>
																{activity.text}
															</span>
														</div>

														{responsible && (
															<div className={styles.projectMeta}>
																<span>Ответственный:</span>
																<UserCard user={responsible} />
															</div>
														)}
													</div>

													<div className={styles.projectDates}>
														<div className={styles.dateItem}>
															<span className={styles.dateLabel}>Обновлён</span>
															<span className={styles.dateValue}>
																{formatDate(project.updatedTime)}
															</span>
														</div>

														<div className={styles.dateItem}>
															<span className={styles.dateLabel}>
																Последняя активность
															</span>
															<span className={styles.dateValue}>
																{formatDate(project.lastActivityTime)}
															</span>
														</div>
													</div>
												</div>

												<div className={styles.projectBody}>
													<div className={styles.projectInfoGrid}>
														<div className={styles.infoTile}>
															<div className={styles.infoTileLabel}>
																Дата создания
															</div>
															<div className={styles.infoTileValue}>
																{formatDate(project.createdTime)}
															</div>
														</div>

														<div className={styles.infoTile}>
															<div className={styles.infoTileLabel}>
																Последнее перемещение
															</div>
															<div className={styles.infoTileValue}>
																{formatDate(project.movedTime)}
															</div>
														</div>

														{lastUpdater && (
															<div className={styles.infoTile}>
																<div className={styles.infoTileLabel}>
																	Последний активный пользователь
																</div>

																<div className={styles.infoTileValue}>
																	{lastUpdater?.title}
																</div>
															</div>
														)}
													</div>

													<div className={styles.projectActions}>
														<button
															type="button"
															className={styles.secondaryButton}
															onClick={() =>
																navigate(`/client-projects/${project.id}`)
															}
														>
															Открыть карточку проекта
														</button>

														<button
															type="button"
															className={styles.ghostButton}
														>
															Связаться с менеджером
														</button>

														<button
															type="button"
															className={styles.ghostButton}
														>
															Написать разработчикам
														</button>
													</div>
												</div>
											</div>
										);
									})}
								</div>
							)}
						</div>
					</div>

					<div className={styles.sideColumn}>
						<div className={styles.sectionCard}>
							<h2 className={styles.sectionTitle}>Быстрые действия</h2>

							<div className={styles.quickActions}>
								<button type="button" className={styles.primaryButton}>
									Оставить обращение
								</button>
								<button type="button" className={styles.secondaryButton}>
									Запросить отчёт
								</button>
								<button type="button" className={styles.secondaryButton}>
									Запланировать встречу
								</button>
							</div>
						</div>

						<div className={styles.sectionCard}>
							<h2 className={styles.sectionTitle}>Последняя активность</h2>

							<div className={styles.activityList}>
								{latestActivityProjects.length > 0 ? (
									latestActivityProjects.map((project) => (
										<div key={project.id} className={styles.activityItem}>
											<div className={styles.activityDot} />
											<div className={styles.activityContent}>
												<div className={styles.activityProjectTitle}>
													{project.title}
												</div>
												<div className={styles.activityProjectText}>
													Последнее действие:{" "}
													{formatDate(project.lastActivityTime)}
												</div>
											</div>
										</div>
									))
								) : (
									<div className={styles.mutedText}>
										Пока нет данных по активности
									</div>
								)}
							</div>
						</div>

						<div className={styles.sectionCard}>
							<h2 className={styles.sectionTitle}>Ближайшие встречи</h2>

							<div className={styles.meetingsList}>
								{mockMeetings.map((meeting) => (
									<div key={meeting.id} className={styles.meetingCard}>
										<div className={styles.meetingTitle}>{meeting.title}</div>
										<div className={styles.meetingProject}>
											{meeting.projectTitle}
										</div>
										<div className={styles.meetingMeta}>
											<span>{dayjs(meeting.date).format("DD.MM.YYYY")}</span>
											<span>{meeting.time}</span>
										</div>
										<a href={meeting.link} className={styles.meetingLink}>
											Подключиться
										</a>
									</div>
								))}
							</div>
						</div>
					</div>
				</div>
			</div>
		</CheckPermission>
	);
};

export default ClientProfile;
