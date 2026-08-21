import dayjs from "dayjs";
import {
	type ChangeEvent,
	type ReactNode,
	useEffect,
	useMemo,
	useState,
} from "react";
import { useOutletContext } from "react-router";
import {
	ActivityType,
	months,
	ReportCodes,
	ReportStageIds,
	TaskCodes,
	years,
} from "@/components/calendar/constants/const";
import { Spinner } from "@/components/spinner/Spinner";
import { DEPARTMENT_IDS, EntityTypeIds } from "@/shared/constants/const";
import { useBitrixSlider } from "@/shared/hooks/useBitrixSlider";
import type { ReportsContext } from "@/shared/types/types";
import {
	getDevelopmentReportData,
	type DevelopmentReportSourceData,
} from "../../api/getDevelopmentReportData";
import cls from "./DevelopmentReport.module.scss";
import {
	buildDevelopmentReport,
	DEVELOPMENT_REPORT_THRESHOLDS,
	type DevelopmentTaskMetric,
	type EmployeeDevelopmentMetric,
	type EmployeeSignal,
	type ManagementActionTone,
	type ProjectDevelopmentMetric,
	type ProjectSignal,
} from "./model/developmentReport";

const EMPTY_SOURCE_DATA: DevelopmentReportSourceData = {
	tasks: [],
	reports: [],
};

const DEVELOPMENT_ACTIVITY_NAMES = new Set(["development", "разработка"]);

const isDevelopmentActivityName = (value: string): boolean =>
	DEVELOPMENT_ACTIVITY_NAMES.has(value.trim().toLocaleLowerCase("ru-RU"));

const numberFormatter = new Intl.NumberFormat("ru-RU", {
	maximumFractionDigits: 1,
});

const formatHours = (value: number): string =>
	`${numberFormatter.format(value)} ч`;

const formatSignedHours = (value: number | null): string => {
	if (value === null) {
		return "—";
	}

	const prefix = value > 0 ? "+" : "";

	return `${prefix}${numberFormatter.format(value)} ч`;
};

const formatPercent = (value: number | null, signed = false): string => {
	if (value === null) {
		return "—";
	}

	const prefix = signed && value > 0 ? "+" : "";

	return `${prefix}${numberFormatter.format(value)}%`;
};

const employeeSignalMeta: Record<
	EmployeeSignal,
	{ label: string; tone: ManagementActionTone }
> = {
	insufficient_data: { label: "Недостаточно данных", tone: "neutral" },
	isolated_signal: { label: "Изолированный сигнал", tone: "attention" },
	repeated_signal: { label: "Несколько сигналов", tone: "attention" },
	calibration_signal: { label: "Калибровать оценку", tone: "neutral" },
	stable_sample: { label: "Нет сильных сигналов", tone: "positive" },
};

const projectSignalMeta: Record<
	ProjectSignal,
	{ label: string; tone: ManagementActionTone }
> = {
	insufficient_data: { label: "Недостаточно данных", tone: "neutral" },
	review_overrun: { label: "Нужен разбор", tone: "attention" },
	calibrate_estimates: { label: "Калибровать оценки", tone: "neutral" },
	stable_sample: { label: "Без сильных сигналов", tone: "positive" },
};

const toneClassNames: Record<ManagementActionTone, string> = {
	attention: cls.toneAttention,
	positive: cls.tonePositive,
	neutral: cls.toneNeutral,
};

const MetricCard = ({
	label,
	value,
	note,
	tone = "neutral",
}: {
	label: string;
	value: string;
	note: string;
	tone?: ManagementActionTone;
}) => (
	<article className={`${cls.metricCard} ${toneClassNames[tone]}`}>
		<span className={cls.metricLabel}>{label}</span>
		<strong className={cls.metricValue}>{value}</strong>
		<span className={cls.metricNote}>{note}</span>
	</article>
);

const StatusBadge = ({
	label,
	tone,
}: {
	label: string;
	tone: ManagementActionTone;
}) => (
	<span className={`${cls.statusBadge} ${toneClassNames[tone]}`}>{label}</span>
);

const TableEmpty = ({ children }: { children: ReactNode }) => (
	<div className={cls.tableEmpty}>{children}</div>
);

const getEmployeeAction = (employee: EmployeeDevelopmentMetric): string => {
	switch (employee.signal) {
		case "repeated_signal":
			return "Разобрать несколько кейсов. Межмесячную повторяемость и управляемость причины проверить отдельно.";
		case "isolated_signal":
			return "Разобрать конкретную задачу. Кадровый вывод по одному кейсу не делать.";
		case "calibration_signal":
			return "Проверить завышение оценки и качество декомпозиции; не считать недорасход автоматическим успехом.";
		case "stable_sample":
			return "По этой выборке вмешательство не требуется; сложность и динамику проверить отдельно.";
		case "insufficient_data":
			return employee.participatedSignalTasks > 0
				? `Разобрать ${employee.participatedSignalTasks} задач-сигналов, но не оценивать сотрудника по этой выборке.`
				: "Накопить минимум 3 строго атрибутируемые задачи и покрытие от 60%.";
	}
};

const getProjectAction = (project: ProjectDevelopmentMetric): string => {
	switch (project.signal) {
		case "review_overrun":
			return "Проверить scope, блокеры, оценку и влияние на часовой бюджет; затем — финансовый вывод.";
		case "calibrate_estimates":
			return "Разобрать отклонения по типам задач и откалибровать оценку.";
		case "stable_sample":
			return "Оставить без отдельного вмешательства и проверить следующую когорту.";
		case "insufficient_data":
			return "Закрыть оценки/отчёты; решение по проекту пока не принимать.";
	}
};

const getTaskSignal = (
	task: DevelopmentTaskMetric,
): { label: string; tone: ManagementActionTone } => {
	if (task.isCriticalDeviation) {
		return {
			label: task.isSignificantOverrun
				? "Критический перерасход"
				: "Критическая переоценка",
			tone: "attention",
		};
	}

	return task.isSignificantOverrun
		? { label: "Значимый перерасход", tone: "attention" }
		: { label: "Значимая переоценка", tone: "neutral" };
};

const getContributors = (task: DevelopmentTaskMetric): string => {
	const contributors = task.contributors.map(
		(contributor) => `${contributor.title} — ${formatHours(contributor.hours)}`,
	);

	if (task.unknownAuthorHours > 0) {
		contributors.push(`Без автора — ${formatHours(task.unknownAuthorHours)}`);
	}

	return contributors.join(", ") || "Нет подтверждённого факта";
};

const getAttributionNote = (task: DevelopmentTaskMetric): string => {
	if (task.personalOwnerId) {
		return "Включена в персональную выборку";
	}

	switch (task.attributionIssue) {
		case "multiple_contributors":
			return "Несколько авторов — только отдел/проект";
		case "owner_mismatch":
			return "Автор не совпадает с текущим ответственным";
		case "unknown_author":
			return "Есть часы без автора";
		default:
			return "Недостаточно данных для персональной атрибуции";
	}
};

const DevelopmentReport = () => {
	const { users, projects, activities, month, year, setMonth, setYear } =
		useOutletContext<ReportsContext>();
	const { openTask } = useBitrixSlider();
	const selectedMonth = month ?? dayjs().month() + 1;
	const selectedYear = year ?? dayjs().year();
	const [sourceData, setSourceData] =
		useState<DevelopmentReportSourceData>(EMPTY_SOURCE_DATA);
	const [isLoading, setIsLoading] = useState(false);
	const [error, setError] = useState("");
	const [reloadToken, setReloadToken] = useState(0);
	const [isRosterWaitExpired, setIsRosterWaitExpired] = useState(false);
	const [isActivityWaitExpired, setIsActivityWaitExpired] = useState(false);
	const developers = useMemo(
		() =>
			users
				.filter((user) => user.department === DEPARTMENT_IDS.DEV)
				.map((user) => ({ id: String(user.id), title: user.title })),
		[users],
	);
	const developerIdsKey = developers.map((developer) => developer.id).join(",");
	const currentDevelopmentActivityIds = useMemo(
		() =>
			activities
				.filter((activity) => isDevelopmentActivityName(activity.NAME))
				.map((activity) => String(activity.ID)),
		[activities],
	);
	const developmentActivityIds = useMemo(
		() =>
			Array.from(
				new Set([
					String(ActivityType.development),
					...currentDevelopmentActivityIds,
				]),
			),
		[currentDevelopmentActivityIds],
	);
	const developmentActivityIdsKey = developmentActivityIds.join(",");
	const developmentActivityIdSet = useMemo(
		() => new Set(developmentActivityIds),
		[developmentActivityIds],
	);
	const developerIdSet = useMemo(
		() => new Set(developers.map((developer) => developer.id)),
		[developers],
	);
	const periodStart = useMemo(
		() =>
			dayjs()
				.date(1)
				.year(selectedYear)
				.month(selectedMonth - 1)
				.startOf("month"),
		[selectedMonth, selectedYear],
	);
	const periodEnd = useMemo(() => periodStart.add(1, "month"), [periodStart]);
	const yearOptions = useMemo(
		() =>
			Array.from(new Set([...years, selectedYear])).toSorted(
				(left, right) => left - right,
			),
		[selectedYear],
	);

	useEffect(() => {
		if (users.length > 0) {
			setIsRosterWaitExpired(false);
			return;
		}

		const timeoutId = window.setTimeout(
			() => setIsRosterWaitExpired(true),
			10000,
		);

		return () => window.clearTimeout(timeoutId);
	}, [users.length]);

	useEffect(() => {
		if (activities.length > 0) {
			setIsActivityWaitExpired(false);
			return;
		}

		const timeoutId = window.setTimeout(
			() => setIsActivityWaitExpired(true),
			10000,
		);

		return () => window.clearTimeout(timeoutId);
	}, [activities.length]);

	useEffect(() => {
		const developerIds = developerIdsKey.split(",").filter(Boolean);
		const activityIds = developmentActivityIdsKey.split(",").filter(Boolean);

		if (
			!developerIds.length ||
			!activities.length ||
			!currentDevelopmentActivityIds.length
		) {
			setSourceData(EMPTY_SOURCE_DATA);
			setIsLoading(false);
			return;
		}

		const abortController = new AbortController();

		setIsLoading(true);
		setError("");

		getDevelopmentReportData({
			periodStart: periodStart.format(),
			periodEnd: periodEnd.format(),
			developerIds,
			developmentActivityIds: activityIds,
			signal: abortController.signal,
		})
			.then((data) => {
				if (!abortController.signal.aborted) {
					setSourceData(data);
				}
			})
			.catch((requestError) => {
				if (abortController.signal.aborted) {
					return;
				}

				console.error("Failed to load development report", requestError);
				setSourceData(EMPTY_SOURCE_DATA);
				setError("Не удалось загрузить задачи или подтверждённые отчёты.");
			})
			.finally(() => {
				if (!abortController.signal.aborted) {
					setIsLoading(false);
				}
			});

		return () => abortController.abort();
	}, [
		activities.length,
		currentDevelopmentActivityIds.length,
		developerIdsKey,
		developmentActivityIdsKey,
		periodEnd,
		periodStart,
		reloadToken,
	]);

	const report = useMemo(
		() =>
			buildDevelopmentReport({
				tasks: sourceData.tasks.map((task) => {
					const parentProjectId = String(
						task[TaskCodes.parentproject] ?? "",
					).trim();

					return {
						id: task.id,
						title: task.title,
						ownerId: task.assignedById,
						projectId: parentProjectId || task[TaskCodes.project],
						planHours: task[TaskCodes.estimateTime],
						budgetHours: task[TaskCodes.hours],
					};
				}),
				reports: sourceData.reports.map((sourceReport) => ({
					id: sourceReport.id,
					parentTaskId: sourceReport[ReportCodes.parentId],
					legacyTaskId: sourceReport[ReportCodes.taskId],
					employeeId: sourceReport.assignedById,
					hours: sourceReport[ReportCodes.timeSpent],
					isConfirmed: sourceReport.stageId === ReportStageIds.confirmed,
					isDevelopment: developmentActivityIdSet.has(
						String(sourceReport[ReportCodes.activityType]),
					),
					isDepartmentEmployee: developerIdSet.has(
						String(sourceReport.assignedById),
					),
				})),
				developers,
				projects: projects.map((project) => ({
					id: String(project.id),
					title: project.title,
				})),
			}),
		[
			sourceData,
			developers,
			developerIdSet,
			developmentActivityIdSet,
			projects,
		],
	);
	const hasReliableDepartmentSample =
		report.summary.comparableTasks >=
			DEVELOPMENT_REPORT_THRESHOLDS.minimumPersonalSample &&
		(report.summary.coveragePercent ?? 0) >=
			DEVELOPMENT_REPORT_THRESHOLDS.minimumPersonalCoveragePercent;

	const movePeriod = (monthsDelta: number) => {
		const nextPeriod = periodStart.add(monthsDelta, "month");

		setMonth(nextPeriod.month() + 1);
		setYear(nextPeriod.year());
	};

	const handleMonthChange = (event: ChangeEvent<HTMLSelectElement>) => {
		setMonth(Number(event.target.value));
	};

	const handleYearChange = (event: ChangeEvent<HTMLSelectElement>) => {
		setYear(Number(event.target.value));
	};

	return (
		<section className={cls.page}>
			<header className={cls.header}>
				<div className={cls.headingGroup}>
					<div className={cls.eyebrow}>
						<span className={cls.betaBadge}>BETA</span>
						<span>Управленческий отчёт</span>
					</div>
					<h1>Разработка: сигналы и решения</h1>
					<p>
						Завершённые задачи за {months[selectedMonth - 1]} {selectedYear} года.
						 План — техническая оценка, факт — подтверждённые отчёты разработки
						 текущего состава отдела за весь цикл задачи.
					</p>
				</div>

				<div className={cls.periodControls}>
					<button
						type="button"
						className={cls.iconButton}
						onClick={() => movePeriod(-1)}
						aria-label="Предыдущий месяц"
					>
						‹
					</button>
					<select value={selectedMonth} onChange={handleMonthChange}>
						{months.map((monthTitle, index) => (
							<option key={monthTitle} value={index + 1}>
								{monthTitle}
							</option>
						))}
					</select>
					<select value={selectedYear} onChange={handleYearChange}>
						{yearOptions.map((yearOption) => (
							<option key={yearOption} value={yearOption}>
								{yearOption}
							</option>
						))}
					</select>
					<button
						type="button"
						className={cls.iconButton}
						onClick={() => movePeriod(1)}
						aria-label="Следующий месяц"
					>
						›
					</button>
				</div>
			</header>

			<div className={cls.guardrail}>
				<strong>Что можно решить по этому отчёту:</strong> какие задачи и
				 проекты разбирать, где калибровать оценку и где данных уже достаточно
				 для наблюдения. План/факт — сигнал, а не доказательство вины. Beta не
				 рекомендует увольнение без подтверждённой причины и проверки
				 корректирующей меры.
			</div>

			{users.length === 0 && !isRosterWaitExpired ? (
				<div className={cls.loadingState}>
					<Spinner text="Загружаем состав отдела разработки" />
				</div>
			) : isRosterWaitExpired || developers.length === 0 ? (
				<div className={cls.errorState} role="alert">
					<strong>Не удалось получить состав отдела разработки.</strong>
					<span>Без списка DEV персональные и отделовые показатели не рассчитываются.</span>
					<button type="button" onClick={() => window.location.reload()}>
						Перезагрузить страницу
					</button>
				</div>
			) : activities.length === 0 && !isActivityWaitExpired ? (
				<div className={cls.loadingState}>
					<Spinner text="Загружаем справочник активностей" />
				</div>
			) : isActivityWaitExpired ||
				currentDevelopmentActivityIds.length === 0 ? (
				<div className={cls.errorState} role="alert">
					<strong>Не найдена активность Development.</strong>
					<span>Без неё подтверждённые часы разработки нельзя отделить от остальных отчётов.</span>
					<button type="button" onClick={() => window.location.reload()}>
						Перезагрузить страницу
					</button>
				</div>
			) : isLoading ? (
				<div className={cls.loadingState}>
					<Spinner text="Собираем завершённые задачи и подтверждённые часы" />
				</div>
			) : error ? (
				<div className={cls.errorState} role="alert">
					<strong>{error}</strong>
					<span>Данные отчёта не рассчитаны.</span>
					<button type="button" onClick={() => setReloadToken((value) => value + 1)}>
						Повторить загрузку
					</button>
				</div>
			) : (
				<>
					<div className={cls.metricsGrid}>
						<MetricCard
							label="Завершено задач"
							value={String(report.summary.totalTasks)}
							note="По последнему переходу в стадию Done"
						/>
						<MetricCard
							label="План / факт сопоставимых"
							value={`${formatHours(report.summary.planHours)} / ${formatHours(report.summary.actualHours)}`}
							note={`${report.summary.comparableTasks} задач · покрытие по задачам ${formatPercent(report.summary.coveragePercent)} · всего подтверждено ${formatHours(report.summary.confirmedHours)}`}
							tone={report.summary.biasPercent && report.summary.biasPercent > 30 ? "attention" : "neutral"}
						/>
						<MetricCard
							label="Точность оценки ±20%"
							value={
								hasReliableDepartmentSample
									? formatPercent(report.summary.withinBandPercent)
									: "Мало данных"
							}
							note={`Bias ${formatPercent(report.summary.biasPercent, true)} · WAPE ${formatPercent(report.summary.wapePercent)}`}
							tone={
								hasReliableDepartmentSample &&
								(report.summary.withinBandPercent ?? 0) >= 70 &&
								(report.summary.wapePercent ?? 0) <= 30
									? "positive"
									: "neutral"
							}
						/>
						<MetricCard
							label="Положительный перерасход"
							value={formatHours(report.summary.positiveOverrunHours)}
							note={`${report.summary.significantOverruns} значимых · без зачёта экономии других задач`}
							tone={
								!hasReliableDepartmentSample
									? "neutral"
									: report.summary.significantOverruns > 0
									? "attention"
									: "positive"
							}
						/>
						<MetricCard
							label="Давление на часовой бюджет"
							value={formatHours(report.summary.budgetPressureHours)}
							note={`${report.summary.budgetComparableTasks}/${report.summary.budgetedTasks} задач с бюджетом сопоставимы; это не рублёвый убыток`}
							tone={
								report.summary.budgetPressureHours > 0
									? "attention"
									: "neutral"
							}
						/>
					</div>

					<section className={cls.section}>
						<div className={cls.sectionHeading}>
							<div>
								<span className={cls.sectionIndex}>01</span>
								<h2>Решения руководителя</h2>
							</div>
							<p>Сформированы правилами beta из текущей когорты.</p>
						</div>
						<div className={cls.actionsGrid}>
							{report.actions.map((action) => (
								<article
									key={`${action.title}-${action.reason}`}
									className={`${cls.actionCard} ${toneClassNames[action.tone]}`}
								>
									<StatusBadge label="Действие" tone={action.tone} />
									<h3>{action.title}</h3>
									<p>{action.reason}</p>
								</article>
							))}
						</div>
					</section>

					<section className={cls.section}>
						<div className={cls.sectionHeading}>
							<div>
								<span className={cls.sectionIndex}>02</span>
								<h2>Сотрудники</h2>
							</div>
							<p>
								Личный plan/fact только для задач с одним автором отчётов,
								 совпадающим с текущим ответственным.
							</p>
						</div>
						{report.employees.length ? (
							<div className={cls.tableScroll}>
								<table className={cls.dataTable}>
									<thead>
										<tr>
											<th>Сотрудник</th>
											<th>Лично подтверждено</th>
											<th>Участие / ответственный</th>
											<th>Чистая выборка</th>
											<th>План / факт</th>
											<th>Bias / WAPE</th>
											<th>Сигналы участия</th>
											<th>Вывод и действие</th>
										</tr>
									</thead>
									<tbody>
										{report.employees.map((employee) => {
											const signal = employeeSignalMeta[employee.signal];

											return (
												<tr key={employee.id}>
													<td>
														<strong>{employee.title}</strong>
													</td>
													<td>{formatHours(employee.loggedHours)}</td>
													<td>
														{employee.participatedTasks} / {employee.ownedTasks}
													</td>
													<td>
														<strong>
															{employee.personalSampleTasks}/{employee.ownedTasks}
														</strong>
														<span className={cls.cellNote}>
															{formatPercent(employee.personalCoveragePercent)} покрытия
														</span>
													</td>
													<td>
														{employee.personalSampleTasks
															? `${formatHours(employee.planHours)} / ${formatHours(employee.actualHours)}`
															: "—"}
													</td>
													<td>
														{formatPercent(employee.biasPercent, true)} /{" "}
														{formatPercent(employee.wapePercent)}
													</td>
													<td>{employee.participatedSignalTasks}</td>
													<td className={cls.decisionCell}>
														<StatusBadge label={signal.label} tone={signal.tone} />
														<span>{getEmployeeAction(employee)}</span>
													</td>
												</tr>
											);
										})}
									</tbody>
								</table>
							</div>
						) : (
							<TableEmpty>
								В выбранной когорте нет сотрудников с завершёнными задачами или
								 подтверждёнными часами.
							</TableEmpty>
						)}
					</section>

					<section className={cls.section}>
						<div className={cls.sectionHeading}>
							<div>
								<span className={cls.sectionIndex}>03</span>
								<h2>Проекты и часовой бюджет</h2>
							</div>
							<p>
								Показывает давление на часы, но не доказывает денежный убыток.
							</p>
						</div>
						{report.projects.length ? (
							<div className={cls.tableScroll}>
								<table className={cls.dataTable}>
									<thead>
										<tr>
											<th>Проект</th>
											<th>Задачи / данные</th>
											<th>План / факт</th>
											<th>Bias / WAPE</th>
											<th>Перерасход без взаимозачёта</th>
											<th>Бюджет / давление</th>
											<th>Разработчики</th>
											<th>Вывод и действие</th>
										</tr>
									</thead>
									<tbody>
										{report.projects.map((project) => {
											const signal = projectSignalMeta[project.signal];

											return (
												<tr key={project.id}>
													<td>
														<strong>{project.title}</strong>
													</td>
													<td>
														{project.comparableTasks}/{project.totalTasks}
														<span className={cls.cellNote}>
															{formatPercent(project.coveragePercent)} покрытия
														</span>
													</td>
													<td>
														{formatHours(project.planHours)} /{" "}
														{formatHours(project.actualHours)}
													</td>
													<td>
														{formatPercent(project.biasPercent, true)} /{" "}
														{formatPercent(project.wapePercent)}
													</td>
													<td>{formatHours(project.positiveOverrunHours)}</td>
													<td>
														{project.budgetComparableTasks
															? `${formatHours(project.budgetHours)} / +${formatHours(project.budgetPressureHours)}`
															: "—"}
														<span className={cls.cellNote}>
															{project.budgetComparableTasks}/{project.budgetedTasks} задач
														</span>
													</td>
													<td>{project.developers.join(", ") || "—"}</td>
													<td className={cls.decisionCell}>
														<StatusBadge label={signal.label} tone={signal.tone} />
														<span>{getProjectAction(project)}</span>
													</td>
												</tr>
											);
										})}
									</tbody>
								</table>
							</div>
						) : (
							<TableEmpty>В выбранном месяце нет завершённых задач разработки.</TableEmpty>
						)}
					</section>

					<section className={cls.section}>
						<div className={cls.sectionHeading}>
							<div>
								<span className={cls.sectionIndex}>04</span>
								<h2>Задачи для разбора</h2>
							</div>
							<p>
								Порог: |отклонение| ≥ {DEVELOPMENT_REPORT_THRESHOLDS.significantHours} ч
								 и ≥ {DEVELOPMENT_REPORT_THRESHOLDS.significantPercent}% одновременно.
							</p>
						</div>
						{report.signalTasks.length ? (
							<div className={cls.tableScroll}>
								<table className={cls.dataTable}>
									<thead>
										<tr>
											<th>Задача</th>
											<th>Проект / ответственный</th>
											<th>План / факт</th>
											<th>Отклонение</th>
											<th>Кто списывал</th>
											<th>Персональная атрибуция</th>
											<th>Сигнал</th>
										</tr>
									</thead>
									<tbody>
										{report.signalTasks.map((task) => {
											const signal = getTaskSignal(task);

											return (
												<tr key={task.id}>
													<td>
														<button
															type="button"
															className={cls.taskLink}
															onClick={() => openTask(task.id, EntityTypeIds.tasks)}
														>
															{task.title}
														</button>
													</td>
													<td>
														{task.projectTitle}
														<span className={cls.cellNote}>{task.ownerTitle}</span>
													</td>
													<td>
														{formatHours(task.planHours)} / {formatHours(task.factHours)}
													</td>
													<td>
														{formatSignedHours(task.deltaHours)}
														<span className={cls.cellNote}>
															{formatPercent(task.deltaPercent, true)}
														</span>
													</td>
													<td>{getContributors(task)}</td>
													<td>{getAttributionNote(task)}</td>
													<td>
														<StatusBadge label={signal.label} tone={signal.tone} />
													</td>
												</tr>
											);
										})}
									</tbody>
								</table>
							</div>
						) : (
							<TableEmpty>Значимых отклонений по заданному порогу не найдено.</TableEmpty>
						)}
					</section>

					<footer className={cls.methodology}>
						<div>
							<h2>Как читать beta</h2>
							<ul>
								<li>
									Когорта — задачи в Done, последний переход которых попал в месяц,
									 а текущий ответственный входит в текущий состав DEV. Истории состава
									 отдела и immutable closedAt пока нет.
								</li>
								<li>
									Факт — только подтверждённые отчёты с активностью «Разработка» за
									 весь цикл задачи; позднее подтверждение может изменить прошлый месяц.
								</li>
								<li>
									Совместные и переназначенные задачи не входят в персональную точность,
									 но остаются в проекте и отделе.
								</li>
								<li>
									В данных пока нет истории scope, блокеров, автора оценки и себестоимости
									 часа. Оценка, бюджет, проект и ответственный берутся в текущем состоянии,
									 поэтому прошлые периоды не являются неизменяемым snapshot.
								</li>
							</ul>
						</div>
						<div className={cls.qualityGrid}>
							<span>Без оценки: {report.summary.tasksWithoutEstimate}</span>
							<span>Без факта: {report.summary.tasksWithoutConfirmedFact}</span>
							<span>Ожидают подтверждения: {report.quality.pendingReports}</span>
							<span>Неподтверждённых часов: {formatHours(report.quality.pendingReportHours)}</span>
							<span>Совместных задач: {report.quality.multiContributorTasks}</span>
							<span>Смена ответственного: {report.quality.ownerMismatchTasks}</span>
							<span>Задач с авторами вне DEV: {report.quality.tasksWithOutsideDepartmentReports}</span>
							<span>Часов вне текущего DEV: {formatHours(report.quality.ignoredOutsideDepartmentReportHours)}</span>
							<span>Дубликаты отчётов: {report.quality.duplicateReports}</span>
							<span>Конфликты связей: {report.quality.relationConflicts}</span>
						</div>
					</footer>
				</>
			)}
		</section>
	);
};

export default DevelopmentReport;
