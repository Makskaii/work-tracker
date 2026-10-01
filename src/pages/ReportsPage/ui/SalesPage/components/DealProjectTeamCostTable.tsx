import type { User } from "@/shared/types/types";
import type { ProjectTeamRole } from "../model/projectTeam";
import {
	buildTaskMap,
	buildTeamMembers,
	getTasksPlanHours,
	getUniqueTasksPlanHours,
	type ProjectTeamMember as TeamMember,
} from "../model/projectTeamMetrics";
import type { ProfitabilityProject } from "../model/types";
import styles from "./DealProjectTeamCostTable.module.scss";

type TeamRole = ProjectTeamRole;

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

const formatHours = (value: number) => `${Number(value.toFixed(1))} ч`;

const formatMoney = (value: number) =>
	new Intl.NumberFormat("ru-RU", {
		style: "currency",
		currency: "RUB",
		maximumFractionDigits: 0,
	}).format(value);

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
				<div className={styles.teamTitle}>
					Проектная команда и себестоимость
				</div>
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
									<span className={styles.roleCell}>
										{ROLE_LABELS[group.role]}
									</span>
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
						<span
							className={getFactBadgeClassName(
								totals.factHours,
								totals.planHours,
							)}
						>
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
