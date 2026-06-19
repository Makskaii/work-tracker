import { ReportCodes, TaskCodes } from "@/components/calendar/constants/const";
import type { ReportProps } from "@/components/calendar/types/types";
import { DEPARTMENT_IDS } from "@/shared/constants/const";
import type { TaskProps, User } from "@/shared/types/types";
import { toNumber } from "../model/profitabilityUtils";
import type { ProfitabilityProject } from "../model/types";
import styles from "./DealProjectTeamCostTable.module.scss";

type TeamRole = "pm" | "analytics" | "development" | "qa" | "unknown";

type TeamMember = {
	userId: string;
	name: string;
	position: string;
	role: TeamRole;
	totalHours: number;
	soldHours: number;
	planHours: number;
	factHours: number;
	taskIds: Set<string>;
};

type TeamGroup = {
	role: TeamRole;
	members: TeamMember[];
	taskIds: Set<string>;
};

const COST_RATE = 1000;

const ROLE_LABELS: Record<TeamRole, string> = {
	pm: "Ответственный",
	analytics: "Аналитики",
	development: "Разработка",
	qa: "QA",
	unknown: "Без роли",
};

const FIXED_ROLE_ORDER: TeamRole[] = ["pm", "analytics", "development", "qa"];
const ROLE_SORT_ORDER: TeamRole[] = [...FIXED_ROLE_ORDER, "unknown"];

const formatHours = (value: number) => `${Number(value.toFixed(1))} ч`;

const formatMoney = (value: number) =>
	new Intl.NumberFormat("ru-RU", {
		style: "currency",
		currency: "RUB",
		maximumFractionDigits: 0,
	}).format(value);

const getUserRole = (user?: User): TeamRole => {
	const position = String(user?.position ?? "").toLowerCase();
	const title = String(user?.title ?? "").toLowerCase();
	const searchable = `${position} ${title}`;

	if (
		searchable.includes("pm") ||
		searchable.includes("project manager") ||
		searchable.includes("руководитель") ||
		searchable.includes("владелец проекта")
	) {
		return "pm";
	}

	if (
		user?.department === DEPARTMENT_IDS.ANALYTICS ||
		searchable.includes("analyst") ||
		searchable.includes("ba") ||
		searchable.includes("аналит")
	) {
		return "analytics";
	}

	if (
		searchable.includes("qa") ||
		searchable.includes("test") ||
		searchable.includes("tester") ||
		searchable.includes("тест")
	) {
		return "qa";
	}

	if (
		user?.department === DEPARTMENT_IDS.DEV ||
		searchable.includes("backend") ||
		searchable.includes("frontend") ||
		searchable.includes("developer") ||
		searchable.includes("dev") ||
		searchable.includes("разработ")
	) {
		return "development";
	}

	return "unknown";
};

const getReportTaskId = (report: ReportProps) =>
	String(report[ReportCodes.parentId] ?? report[ReportCodes.taskId] ?? "").trim();

const buildTaskMap = (projects: ProfitabilityProject[]) => {
	const tasks = projects.flatMap((project) => project.tasks);

	return new Map(tasks.map((task) => [String(task.id), task]));
};

const getTasksPlanHours = (
	taskIds: Set<string>,
	tasksById: Map<string, TaskProps>,
) =>
	Array.from(taskIds).reduce((acc, taskId) => {
		const task = tasksById.get(taskId);

		return acc + toNumber(task?.[TaskCodes.estimateTime]);
	}, 0);

const getUniqueTasksPlanHours = (projects: ProfitabilityProject[]) => {
	const tasksById = buildTaskMap(projects);

	return getTasksPlanHours(new Set(tasksById.keys()), tasksById);
};

const buildTeamMembers = (
	projects: ProfitabilityProject[],
	users: User[],
): TeamMember[] => {
	const members = new Map<string, TeamMember>();
	const tasksById = buildTaskMap(projects);

	projects
		.flatMap((project) => project.reports)
		.forEach((report) => {
			const userId = String(report.assignedById ?? "");

			if (!userId) {
				return;
			}

			const user = users.find((item) => String(item.id) === userId);
			const current = members.get(userId);
			const taskId = getReportTaskId(report);
			const taskIds = current?.taskIds ?? new Set<string>();
			const hours = toNumber(report[ReportCodes.timeSpent]);

			if (taskId && tasksById.has(taskId)) {
				taskIds.add(taskId);
			}

			members.set(userId, {
				userId,
				name: user?.title ?? `Сотрудник #${userId}`,
				position: user?.position ?? "Не указана",
				role: current?.role ?? getUserRole(user),
				totalHours: (current?.totalHours ?? 0) + hours,
				soldHours: current?.soldHours ?? 0,
				planHours: 0,
				factHours: (current?.factHours ?? 0) + hours,
				taskIds,
			});
		});

	const responsibleUserIds = new Set<string>();

	projects.forEach((project) => {
		const userId = String(project.assignedById ?? "");

		if (userId) {
			responsibleUserIds.add(userId);
		}
	});

	responsibleUserIds.forEach((userId) => {
		if (members.has(userId)) {
			return;
		}

		const user = users.find((item) => String(item.id) === userId);

		members.set(userId, {
			userId,
			name: user?.title ?? `Сотрудник #${userId}`,
			position: user?.position ?? "Не указана",
			role: "pm",
			totalHours: 0,
			soldHours: 0,
			planHours: 0,
			factHours: 0,
			taskIds: new Set<string>(),
		});
	});

	return Array.from(members.values())
		.map((member) => ({
			...member,
			planHours: getTasksPlanHours(member.taskIds, tasksById),
		}))
		.sort((a, b) => {
			const roleDiff =
				ROLE_SORT_ORDER.indexOf(a.role) - ROLE_SORT_ORDER.indexOf(b.role);

			if (roleDiff !== 0) {
				return roleDiff;
			}

			return a.name.localeCompare(b.name, "ru");
		});
};

const getGroups = (members: TeamMember[]): TeamGroup[] => {
	const unknownMembers = members.filter((member) => member.role === "unknown");
	const visibleRoles: TeamRole[] = unknownMembers.length
		? [...FIXED_ROLE_ORDER, "unknown"]
		: FIXED_ROLE_ORDER;

	return visibleRoles.map((role) => {
		const groupMembers = members.filter((member) => member.role === role);
		const taskIds = new Set<string>();

		groupMembers.forEach((member) => {
			member.taskIds.forEach((taskId) => taskIds.add(taskId));
		});

		return {
			role,
			members: groupMembers,
			taskIds,
		};
	});
};

const getMembersTotals = (members: TeamMember[]) =>
	members.reduce(
		(acc, member) => ({
			totalHours: acc.totalHours + member.totalHours,
			soldHours: acc.soldHours + member.soldHours,
			factHours: acc.factHours + member.factHours,
			cost: acc.cost + member.factHours * COST_RATE,
		}),
		{
			totalHours: 0,
			soldHours: 0,
			factHours: 0,
			cost: 0,
		},
	);

const getFactBadgeClassName = (factHours: number, planHours: number) =>
	`${styles.hoursBadge} ${
		factHours <= planHours ? styles.factBadgeGood : styles.factBadgeOverrun
	}`;

export const DealProjectTeamCostTable = ({
	projects,
	users,
}: {
	projects: ProfitabilityProject[];
	users: User[];
}) => {
	const tasksById = buildTaskMap(projects);
	const members = buildTeamMembers(projects, users);
	const groups = getGroups(members);
	const baseTotals = getMembersTotals(members);
	const totals = {
		...baseTotals,
		planHours: getUniqueTasksPlanHours(projects),
	};

	return (
		<section className={styles.teamCard}>
			<div className={styles.teamHeader}>
				<div className={styles.teamTitle}>Проектная команда и себестоимость</div>
				<div className={styles.teamSubtitle}>
					Продано клиенту / Внутренний план / Факт по отчетам
				</div>
			</div>

			<div className={styles.teamCostTableWrapper}>
				<div className={styles.teamCostTable}>
					<div className={styles.teamHead}>
						<span>Отдел / роль</span>
						<span>Сотрудники</span>
						<span>Всего часов</span>
						<span>Продано</span>
						<span>План</span>
						<span>Факт</span>
						<span>Ставка себест.</span>
						<span>Себестоимость</span>
					</div>

					{groups.map((group) => {
						const groupTotals = getMembersTotals(group.members);
						const groupPlanHours = getTasksPlanHours(group.taskIds, tasksById);

						if (!group.members.length) {
							return (
								<div key={group.role} className={styles.teamRow}>
									<span className={styles.roleCell}>{ROLE_LABELS[group.role]}</span>
									<div className={styles.employeeCell}>
										<strong>—</strong>
									</div>
									<span className={styles.hoursBadge}>{formatHours(0)}</span>
									<span className={styles.hoursBadge}>{formatHours(0)}</span>
									<span className={styles.hoursBadge}>{formatHours(0)}</span>
									<span className={getFactBadgeClassName(0, 0)}>
										{formatHours(0)}
									</span>
									<span>{formatMoney(COST_RATE)} / ч</span>
									<span className={styles.costCell}>{formatMoney(0)}</span>
								</div>
							);
						}

						return (
							<div key={group.role}>
								{group.members.map((member, index) => (
									<div key={member.userId} className={styles.teamRow}>
										<span
											className={
												index === 0 ? styles.roleCell : styles.roleCellEmpty
											}
										>
											{index === 0 ? ROLE_LABELS[group.role] : ""}
										</span>
										<div className={styles.employeeCell}>
											<strong>{member.name}</strong>
											<span>{member.position}</span>
										</div>
										<span className={styles.hoursBadge}>
											{formatHours(member.totalHours)}
										</span>
										<span className={styles.hoursBadge}>
											{formatHours(member.soldHours)}
										</span>
										<span className={styles.hoursBadge}>
											{formatHours(member.planHours)}
										</span>
										<span
											className={getFactBadgeClassName(
												member.factHours,
												member.planHours,
											)}
										>
											{formatHours(member.factHours)}
										</span>
										<span>{formatMoney(COST_RATE)} / ч</span>
										<span className={styles.costCell}>
											{formatMoney(member.factHours * COST_RATE)}
										</span>
									</div>
								))}

								<div className={styles.groupTotal}>
									<span />
									<span>Итого по отделу · {ROLE_LABELS[group.role]}</span>
									<span>{formatHours(groupTotals.totalHours)}</span>
									<span>{formatHours(groupTotals.soldHours)}</span>
									<span>{formatHours(groupPlanHours)}</span>
									<span
										className={getFactBadgeClassName(
											groupTotals.factHours,
											groupPlanHours,
										)}
									>
										{formatHours(groupTotals.factHours)}
									</span>
									<span>—</span>
									<span>{formatMoney(groupTotals.cost)}</span>
								</div>
							</div>
						);
					})}

					<div className={styles.grandTotal}>
						<span>Итого</span>
						<strong>Итого по всем ролям</strong>
						<span>{formatHours(totals.totalHours)}</span>
						<span>{formatHours(totals.soldHours)}</span>
						<span>{formatHours(totals.planHours)}</span>
						<span className={getFactBadgeClassName(totals.factHours, totals.planHours)}>
							{formatHours(totals.factHours)}
						</span>
						<span>—</span>
						<strong>{formatMoney(totals.cost)}</strong>
					</div>
				</div>
			</div>
		</section>
	);
};
