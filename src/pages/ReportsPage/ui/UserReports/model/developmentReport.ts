export const DEVELOPMENT_REPORT_THRESHOLDS = {
	withinBandPercent: 20,
	significantHours: 4,
	significantPercent: 30,
	criticalHours: 8,
	criticalPercent: 50,
	minimumPersonalSample: 3,
	minimumPersonalCoveragePercent: 60,
	repeatedSignalMinimumCases: 2,
	repeatedSignalMinimumRatePercent: 33,
} as const;

export type DevelopmentTaskInput = {
	id: unknown;
	title: unknown;
	ownerId: unknown;
	projectId: unknown;
	planHours: unknown;
	budgetHours?: unknown;
};

export type DevelopmentReportInput = {
	id: unknown;
	parentTaskId: unknown;
	legacyTaskId: unknown;
	employeeId: unknown;
	hours: unknown;
	isConfirmed: boolean;
	isDevelopment: boolean;
	isDepartmentEmployee: boolean;
};

export type NamedEntity = {
	id: string;
	title: string;
};

export type DevelopmentReportDirection =
	| "within_band"
	| "underestimated"
	| "overestimated"
	| "insufficient_data";

export type EmployeeSignal =
	| "insufficient_data"
	| "isolated_signal"
	| "repeated_signal"
	| "calibration_signal"
	| "stable_sample";

export type ProjectSignal =
	| "insufficient_data"
	| "review_overrun"
	| "calibrate_estimates"
	| "stable_sample";

export type ManagementActionTone = "attention" | "positive" | "neutral";

export type AggregateMetrics = {
	totalTasks: number;
	comparableTasks: number;
	coveragePercent: number | null;
	planHours: number;
	actualHours: number;
	confirmedHours: number;
	deltaHours: number;
	biasPercent: number | null;
	wapePercent: number | null;
	withinBandPercent: number | null;
	positiveOverrunHours: number;
	significantOverruns: number;
	significantUnderruns: number;
	criticalDeviations: number;
	budgetedTasks: number;
	budgetComparableTasks: number;
	budgetCoveragePercent: number | null;
	budgetHours: number;
	actualAgainstBudgetHours: number;
	budgetPressureHours: number;
};

export type DevelopmentTaskMetric = {
	id: string;
	title: string;
	ownerId: string;
	ownerTitle: string;
	projectId: string;
	projectTitle: string;
	planHours: number;
	budgetHours: number;
	factHours: number;
	pendingHours: number;
	outsideDepartmentHours: number;
	deltaHours: number | null;
	deltaPercent: number | null;
	direction: DevelopmentReportDirection;
	isComparable: boolean;
	isSignificantDeviation: boolean;
	isSignificantOverrun: boolean;
	isSignificantUnderrun: boolean;
	isCriticalDeviation: boolean;
	contributors: Array<NamedEntity & { hours: number }>;
	unknownAuthorHours: number;
	personalOwnerId: string | null;
	attributionIssue:
		| "multiple_contributors"
		| "owner_mismatch"
		| "unknown_author"
		| null;
};

export type EmployeeDevelopmentMetric = {
	id: string;
	title: string;
	ownedTasks: number;
	participatedTasks: number;
	loggedHours: number;
	personalSampleTasks: number;
	personalCoveragePercent: number | null;
	planHours: number;
	actualHours: number;
	deltaHours: number;
	biasPercent: number | null;
	wapePercent: number | null;
	withinBandPercent: number | null;
	significantOverruns: number;
	significantUnderruns: number;
	participatedSignalTasks: number;
	signal: EmployeeSignal;
};

export type ProjectDevelopmentMetric = AggregateMetrics & {
	id: string;
	title: string;
	developers: string[];
	signal: ProjectSignal;
};

export type DevelopmentReportQuality = {
	duplicateReports: number;
	ignoredUnconfirmedReports: number;
	ignoredNonDevelopmentReports: number;
	ignoredOutsideDepartmentReports: number;
	ignoredOutsideDepartmentReportHours: number;
	invalidHoursReports: number;
	relationConflicts: number;
	orphanReports: number;
	orphanReportHours: number;
	unknownAuthorReports: number;
	pendingReports: number;
	pendingReportHours: number;
	tasksWithPendingReports: number;
	tasksWithOutsideDepartmentReports: number;
	multiContributorTasks: number;
	ownerMismatchTasks: number;
	unknownAuthorTasks: number;
};

export type ManagementAction = {
	title: string;
	reason: string;
	tone: ManagementActionTone;
};

export type DevelopmentReportResult = {
	summary: AggregateMetrics & {
		tasksWithoutEstimate: number;
		tasksWithoutConfirmedFact: number;
	};
	employees: EmployeeDevelopmentMetric[];
	projects: ProjectDevelopmentMetric[];
	tasks: DevelopmentTaskMetric[];
	signalTasks: DevelopmentTaskMetric[];
	quality: DevelopmentReportQuality;
	actions: ManagementAction[];
};

type NormalizedReport = {
	id: string;
	taskId: string;
	employeeId: string;
	hours: number;
};

const normalizeId = (value: unknown): string => {
	if (typeof value === "number") {
		return Number.isFinite(value) && value > 0 ? String(value) : "";
	}

	return typeof value === "string" ? value.trim() : "";
};

export const parseDevelopmentHours = (value: unknown): number => {
	if (typeof value === "number") {
		return Number.isFinite(value) && value > 0 ? value : 0;
	}

	if (typeof value !== "string") {
		return 0;
	}

	const parsed = Number(value.trim().replaceAll(" ", "").replace(",", "."));

	return Number.isFinite(parsed) && parsed > 0 ? parsed : 0;
};

const getPercent = (numerator: number, denominator: number): number | null =>
	denominator > 0 ? (numerator / denominator) * 100 : null;

const sum = <T,>(items: T[], getValue: (item: T) => number): number =>
	items.reduce((total, item) => total + getValue(item), 0);

const uniqueById = <T extends { id: string }>(items: T[]): T[] =>
	Array.from(new Map(items.map((item) => [item.id, item])).values());

const getDirection = ({
	isComparable,
	deltaHours,
	deltaPercent,
}: {
	isComparable: boolean;
	deltaHours: number;
	deltaPercent: number;
}): DevelopmentReportDirection => {
	if (!isComparable) {
		return "insufficient_data";
	}

	if (
		Math.abs(deltaPercent) <=
		DEVELOPMENT_REPORT_THRESHOLDS.withinBandPercent
	) {
		return "within_band";
	}

	return deltaHours > 0 ? "underestimated" : "overestimated";
};

export const isSignificantDevelopmentDeviation = ({
	deltaHours,
	deltaPercent,
}: {
	deltaHours: number;
	deltaPercent: number;
}): boolean =>
	Math.abs(deltaHours) >= DEVELOPMENT_REPORT_THRESHOLDS.significantHours &&
	Math.abs(deltaPercent) >=
		DEVELOPMENT_REPORT_THRESHOLDS.significantPercent;

const isCriticalDevelopmentDeviation = ({
	deltaHours,
	deltaPercent,
}: {
	deltaHours: number;
	deltaPercent: number;
}): boolean =>
	Math.abs(deltaHours) >= DEVELOPMENT_REPORT_THRESHOLDS.criticalHours &&
	Math.abs(deltaPercent) >= DEVELOPMENT_REPORT_THRESHOLDS.criticalPercent;

const aggregateTasks = (tasks: DevelopmentTaskMetric[]): AggregateMetrics => {
	const comparableTasks = tasks.filter((task) => task.isComparable);
	const planHours = sum(comparableTasks, (task) => task.planHours);
	const actualHours = sum(comparableTasks, (task) => task.factHours);
	const deltaHours = actualHours - planHours;
	const absoluteDeviationHours = sum(comparableTasks, (task) =>
		Math.abs(task.factHours - task.planHours),
	);
	const withinBandTasks = comparableTasks.filter(
		(task) => task.direction === "within_band",
	);
	const tasksWithBudget = tasks.filter((task) => task.budgetHours > 0);
	const budgetComparableTasks = tasksWithBudget.filter(
		(task) =>
			task.factHours > 0 &&
			task.pendingHours === 0 &&
			task.outsideDepartmentHours === 0,
	);

	return {
		totalTasks: tasks.length,
		comparableTasks: comparableTasks.length,
		coveragePercent: getPercent(comparableTasks.length, tasks.length),
		planHours,
		actualHours,
		confirmedHours: sum(tasks, (task) => task.factHours),
		deltaHours,
		biasPercent: getPercent(deltaHours, planHours),
		wapePercent: getPercent(absoluteDeviationHours, planHours),
		withinBandPercent: getPercent(
			withinBandTasks.length,
			comparableTasks.length,
		),
		positiveOverrunHours: sum(comparableTasks, (task) =>
			Math.max(task.factHours - task.planHours, 0),
		),
		significantOverruns: comparableTasks.filter(
			(task) => task.isSignificantOverrun,
		).length,
		significantUnderruns: comparableTasks.filter(
			(task) => task.isSignificantUnderrun,
		).length,
		criticalDeviations: comparableTasks.filter(
			(task) => task.isCriticalDeviation,
		).length,
		budgetedTasks: tasksWithBudget.length,
		budgetComparableTasks: budgetComparableTasks.length,
		budgetCoveragePercent: getPercent(
			budgetComparableTasks.length,
			tasksWithBudget.length,
		),
		budgetHours: sum(budgetComparableTasks, (task) => task.budgetHours),
		actualAgainstBudgetHours: sum(
			budgetComparableTasks,
			(task) => task.factHours,
		),
		budgetPressureHours: sum(budgetComparableTasks, (task) =>
			Math.max(task.factHours - task.budgetHours, 0),
		),
	};
};

const getEmployeeSignal = ({
	personalSampleTasks,
	personalCoveragePercent,
	significantOverruns,
	significantUnderruns,
	wapePercent,
	withinBandPercent,
}: {
	personalSampleTasks: number;
	personalCoveragePercent: number | null;
	significantOverruns: number;
	significantUnderruns: number;
	wapePercent: number | null;
	withinBandPercent: number | null;
}): EmployeeSignal => {
	const hasEnoughData =
		personalSampleTasks >=
			DEVELOPMENT_REPORT_THRESHOLDS.minimumPersonalSample &&
		(personalCoveragePercent ?? 0) >=
			DEVELOPMENT_REPORT_THRESHOLDS.minimumPersonalCoveragePercent;

	if (!hasEnoughData) {
		return "insufficient_data";
	}

	const overrunRate =
		getPercent(significantOverruns, personalSampleTasks) ?? 0;

	if (
		significantOverruns >=
			DEVELOPMENT_REPORT_THRESHOLDS.repeatedSignalMinimumCases &&
		overrunRate >=
			DEVELOPMENT_REPORT_THRESHOLDS.repeatedSignalMinimumRatePercent
	) {
		return "repeated_signal";
	}

	if (significantOverruns > 0) {
		return "isolated_signal";
	}

	const underrunRate =
		getPercent(significantUnderruns, personalSampleTasks) ?? 0;

	if (
		significantUnderruns > 0 ||
		underrunRate >=
			DEVELOPMENT_REPORT_THRESHOLDS.repeatedSignalMinimumRatePercent ||
		(wapePercent ?? 0) >
			DEVELOPMENT_REPORT_THRESHOLDS.significantPercent ||
		(withinBandPercent ?? 0) < 70
	) {
		return "calibration_signal";
	}

	return "stable_sample";
};

const getProjectSignal = (metrics: AggregateMetrics): ProjectSignal => {
	if (metrics.significantOverruns > 0 || metrics.budgetPressureHours > 0) {
		return "review_overrun";
	}

	if (
		metrics.comparableTasks <
			DEVELOPMENT_REPORT_THRESHOLDS.minimumPersonalSample ||
		(metrics.coveragePercent ?? 0) <
			DEVELOPMENT_REPORT_THRESHOLDS.minimumPersonalCoveragePercent
	) {
		return "insufficient_data";
	}

	if (
		metrics.significantUnderruns > 0 ||
		(metrics.wapePercent ?? 0) >
			DEVELOPMENT_REPORT_THRESHOLDS.significantPercent ||
		(metrics.withinBandPercent ?? 0) < 70
	) {
		return "calibrate_estimates";
	}

	return "stable_sample";
};

const joinNames = (items: string[]): string => {
	const visibleItems = items.slice(0, 3);
	const suffix = items.length > visibleItems.length ? ` и ещё ${items.length - 3}` : "";

	return `${visibleItems.join(", ")}${suffix}`;
};

const buildManagementActions = ({
	summary,
	employees,
	projects,
	signalTasks,
	quality,
}: {
	summary: AggregateMetrics & {
		tasksWithoutEstimate: number;
		tasksWithoutConfirmedFact: number;
	};
	employees: EmployeeDevelopmentMetric[];
	projects: ProjectDevelopmentMetric[];
	signalTasks: DevelopmentTaskMetric[];
	quality: DevelopmentReportQuality;
}): ManagementAction[] => {
	if (!summary.totalTasks) {
		return [
			{
				title: "Не принимать решений по периоду",
				reason: "В выбранном месяце нет завершённых задач разработки.",
				tone: "neutral",
			},
		];
	}

	const actions: ManagementAction[] = [];
	const incompleteTasks =
		summary.totalTasks - summary.comparableTasks;

	if (incompleteTasks > 0) {
		actions.push({
			title: "Закрыть пробелы в данных",
			reason: `${incompleteTasks} из ${summary.totalTasks} завершённых задач нельзя сравнить: без оценки — ${summary.tasksWithoutEstimate}, без подтверждённого факта — ${summary.tasksWithoutConfirmedFact}, с неподтверждёнными часами — ${quality.tasksWithPendingReports}, с часами вне текущего DEV — ${quality.tasksWithOutsideDepartmentReports}.`,
			tone: "attention",
		});
	}

	const repeatedEmployees = employees.filter(
		(employee) => employee.signal === "repeated_signal",
	);

	if (repeatedEmployees.length) {
		actions.push({
			title: "Разобрать несколько сигналов в когорте",
			reason: `${joinNames(repeatedEmployees.map((employee) => employee.title))}: проверить декомпозицию, изменение объёма, блокеры и качество входных требований. Это ещё не межмесячная повторяемость; корректирующая мера допустима только после подтверждения управляемой причины.`,
			tone: "attention",
		});
	}

	if (signalTasks.length > 0) {
		actions.push({
			title: "Разобрать значимые отклонения",
			reason: `Перерасход: ${summary.significantOverruns}; сильная переоценка: ${summary.significantUnderruns}. Начать с: ${joinNames(signalTasks.map((task) => task.title))}. Один кейс не является основанием для кадрового решения.`,
			tone: "attention",
		});
	}

	const pressuredProjects = projects.filter(
		(project) => project.budgetPressureHours > 0,
	);

	if (pressuredProjects.length) {
		actions.push({
			title: "Проверить давление на часовой бюджет",
			reason: `${joinNames(pressuredProjects.map((project) => project.title))}: подтвердить состав работ, изменения scope и тип договора перед выводом о потере денег.`,
			tone: "attention",
		});
	}

	if (
		summary.comparableTasks >= 5 &&
		(summary.wapePercent ?? 0) >
			DEVELOPMENT_REPORT_THRESHOLDS.significantPercent
	) {
		actions.push({
			title: "Калибровать оценки отдела",
			reason: `WAPE ${Math.round(summary.wapePercent ?? 0)}% показывает нестабильность оценок. Разобрать отклонения по типам задач и обновить правила декомпозиции/резерва.`,
			tone: "attention",
		});
	}

	const calibrationEmployees = employees.filter(
		(employee) => employee.signal === "calibration_signal",
	);
	const calibrationProjects = projects.filter(
		(project) => project.signal === "calibrate_estimates",
	);

	if (calibrationEmployees.length || calibrationProjects.length) {
		actions.push({
			title: "Проверить калибровку оценок",
			reason: `Сотрудники: ${joinNames(calibrationEmployees.map((employee) => employee.title)) || "—"}. Проекты: ${joinNames(calibrationProjects.map((project) => project.title)) || "—"}. Сильный недорасход и низкая доля ±20% — тоже неточная оценка, а не автоматический успех.`,
			tone: "neutral",
		});
	}

	const stableEmployees = employees.filter(
		(employee) => employee.signal === "stable_sample",
	);

	if (stableEmployees.length) {
		actions.push({
			title: "Зафиксировать отсутствие сильных сигналов",
			reason: `${joinNames(stableEmployees.map((employee) => employee.title))}: по текущей выборке вмешательство не требуется; сложность задач и межмесячную динамику проверить отдельно.`,
			tone: "positive",
		});
	}

	if (
		quality.relationConflicts > 0 ||
		quality.orphanReports > 0 ||
		quality.duplicateReports > 0
	) {
		actions.push({
			title: "Проверить связи отчётов с задачами",
			reason: `Дубликаты: ${quality.duplicateReports}; конфликты связей: ${quality.relationConflicts}; отчёты без найденной задачи: ${quality.orphanReports}.`,
			tone: "attention",
		});
	}

	if (!actions.length) {
		const hasInsufficientSample =
			employees.some((employee) => employee.signal === "insufficient_data") ||
			projects.some((project) => project.signal === "insufficient_data");

		actions.push(
			hasInsufficientSample
				? {
						title: "Не делать вывод по малой выборке",
						reason: "Данные заполнены, но сопоставимых кейсов недостаточно для устойчивого управленческого вывода.",
						tone: "neutral",
					}
				: {
						title: "Не менять процесс по этой когорте",
						reason: "Сильных сигналов и пробелов данных не найдено. Повторить проверку в следующем месяце.",
						tone: "positive",
					},
		);
	}

	return actions;
};

export const buildDevelopmentReport = ({
	tasks: taskInputs,
	reports: reportInputs,
	developers,
	projects,
}: {
	tasks: DevelopmentTaskInput[];
	reports: DevelopmentReportInput[];
	developers: NamedEntity[];
	projects: NamedEntity[];
}): DevelopmentReportResult => {
	const developerById = new Map(
		developers.map((developer) => [String(developer.id), developer.title]),
	);
	const projectById = new Map(
		projects.map((project) => [String(project.id), project.title]),
	);
	const tasks = uniqueById(
		taskInputs
			.map((task) => ({
				id: normalizeId(task.id),
				title: String(task.title ?? "").trim(),
				ownerId: normalizeId(task.ownerId),
				projectId: normalizeId(task.projectId),
				planHours: parseDevelopmentHours(task.planHours),
				budgetHours: parseDevelopmentHours(task.budgetHours),
			}))
			.filter((task) => task.id),
	);
	const taskIdSet = new Set(tasks.map((task) => task.id));
	const quality: DevelopmentReportQuality = {
		duplicateReports: 0,
		ignoredUnconfirmedReports: 0,
		ignoredNonDevelopmentReports: 0,
		ignoredOutsideDepartmentReports: 0,
		ignoredOutsideDepartmentReportHours: 0,
		invalidHoursReports: 0,
		relationConflicts: 0,
		orphanReports: 0,
		orphanReportHours: 0,
		unknownAuthorReports: 0,
		pendingReports: 0,
		pendingReportHours: 0,
		tasksWithPendingReports: 0,
		tasksWithOutsideDepartmentReports: 0,
		multiContributorTasks: 0,
		ownerMismatchTasks: 0,
		unknownAuthorTasks: 0,
	};
	const seenReportIds = new Set<string>();
	const reports: NormalizedReport[] = [];
	const pendingHoursByTaskId = new Map<string, number>();
	const outsideDepartmentHoursByTaskId = new Map<string, number>();

	for (const report of reportInputs) {
		const reportId = normalizeId(report.id);

		if (reportId && seenReportIds.has(reportId)) {
			quality.duplicateReports += 1;
			continue;
		}

		if (reportId) {
			seenReportIds.add(reportId);
		}

		if (!report.isDevelopment) {
			quality.ignoredNonDevelopmentReports += 1;
			continue;
		}

		const hours = parseDevelopmentHours(report.hours);

		if (hours <= 0) {
			quality.invalidHoursReports += 1;
			continue;
		}

		const parentTaskId = normalizeId(report.parentTaskId);
		const legacyTaskId = normalizeId(report.legacyTaskId);

		if (
			parentTaskId &&
			legacyTaskId &&
			parentTaskId !== legacyTaskId
		) {
			quality.relationConflicts += 1;
		}

		const taskId = parentTaskId || legacyTaskId;

		if (!taskId || !taskIdSet.has(taskId)) {
			quality.orphanReports += 1;
			quality.orphanReportHours += hours;
			continue;
		}

		const employeeId = normalizeId(report.employeeId);

		if (!employeeId) {
			quality.unknownAuthorReports += 1;
		}

		if (!report.isDepartmentEmployee) {
			quality.ignoredOutsideDepartmentReports += 1;
			quality.ignoredOutsideDepartmentReportHours += hours;
			outsideDepartmentHoursByTaskId.set(
				taskId,
				(outsideDepartmentHoursByTaskId.get(taskId) ?? 0) + hours,
			);
			continue;
		}

		if (!report.isConfirmed) {
			quality.ignoredUnconfirmedReports += 1;
			quality.pendingReports += 1;
			quality.pendingReportHours += hours;
			pendingHoursByTaskId.set(
				taskId,
				(pendingHoursByTaskId.get(taskId) ?? 0) + hours,
			);
			continue;
		}

		reports.push({
			id: reportId,
			taskId,
			employeeId,
			hours,
		});
	}

	const reportsByTaskId = new Map<string, NormalizedReport[]>();

	for (const report of reports) {
		reportsByTaskId.set(report.taskId, [
			...(reportsByTaskId.get(report.taskId) ?? []),
			report,
		]);
	}

	const allTaskMetrics: DevelopmentTaskMetric[] = tasks.map((task) => {
		const taskReports = reportsByTaskId.get(task.id) ?? [];
		const pendingHours = pendingHoursByTaskId.get(task.id) ?? 0;
		const outsideDepartmentHours =
			outsideDepartmentHoursByTaskId.get(task.id) ?? 0;
		const contributorHours = new Map<string, number>();
		let unknownAuthorHours = 0;

		for (const report of taskReports) {
			if (!report.employeeId) {
				unknownAuthorHours += report.hours;
				continue;
			}

			contributorHours.set(
				report.employeeId,
				(contributorHours.get(report.employeeId) ?? 0) + report.hours,
			);
		}

		const contributors = Array.from(contributorHours.entries())
			.map(([id, hours]) => ({
				id,
				title: developerById.get(id) ?? `Сотрудник #${id}`,
				hours,
			}))
			.toSorted((left, right) => right.hours - left.hours);
		const factHours = sum(taskReports, (report) => report.hours);
		const isComparable =
			task.planHours > 0 &&
			factHours > 0 &&
			pendingHours === 0 &&
			outsideDepartmentHours === 0;
		const deltaHours = isComparable ? factHours - task.planHours : 0;
		const deltaPercent = isComparable
			? getPercent(deltaHours, task.planHours) ?? 0
			: 0;
		const isSignificantDeviation =
			isComparable &&
			isSignificantDevelopmentDeviation({ deltaHours, deltaPercent });
		const isCriticalDeviation =
			isComparable &&
			isCriticalDevelopmentDeviation({ deltaHours, deltaPercent });
		let attributionIssue: DevelopmentTaskMetric["attributionIssue"] = null;
		let personalOwnerId: string | null = null;

		if (factHours > 0) {
			if (unknownAuthorHours > 0) {
				attributionIssue = "unknown_author";
				quality.unknownAuthorTasks += 1;
			} else if (contributors.length > 1) {
				attributionIssue = "multiple_contributors";
				quality.multiContributorTasks += 1;
			} else if (contributors[0]?.id !== task.ownerId) {
				attributionIssue = "owner_mismatch";
				quality.ownerMismatchTasks += 1;
			} else {
				personalOwnerId = task.ownerId;
			}
		}

		return {
			...task,
			title: task.title || `Задача #${task.id}`,
			ownerTitle:
				developerById.get(task.ownerId) ?? `Сотрудник #${task.ownerId || "?"}`,
			projectTitle: task.projectId
				? (projectById.get(task.projectId) ?? `Проект #${task.projectId}`)
				: "Без проекта",
			factHours,
			pendingHours,
			outsideDepartmentHours,
			deltaHours: isComparable ? deltaHours : null,
			deltaPercent: isComparable ? deltaPercent : null,
			direction: getDirection({
				isComparable,
				deltaHours,
				deltaPercent,
			}),
			isComparable,
			isSignificantDeviation,
			isSignificantOverrun: isSignificantDeviation && deltaHours > 0,
			isSignificantUnderrun: isSignificantDeviation && deltaHours < 0,
			isCriticalDeviation,
			contributors,
			unknownAuthorHours,
			personalOwnerId,
			attributionIssue,
		};
	});
	const taskMetrics = allTaskMetrics.filter(
		(task) =>
			developerById.has(task.ownerId) ||
			task.factHours > 0 ||
			task.pendingHours > 0,
	);
	quality.tasksWithPendingReports = taskMetrics.filter(
		(task) => task.pendingHours > 0,
	).length;
	quality.tasksWithOutsideDepartmentReports = taskMetrics.filter(
		(task) => task.outsideDepartmentHours > 0,
	).length;
	const summaryMetrics = aggregateTasks(taskMetrics);
	const summary = {
		...summaryMetrics,
		tasksWithoutEstimate: taskMetrics.filter((task) => task.planHours <= 0)
			.length,
		tasksWithoutConfirmedFact: taskMetrics.filter((task) => task.factHours <= 0)
			.length,
	};
	const loggedHoursByEmployee = new Map<string, number>();
	const participatedTasksByEmployee = new Map<string, Set<string>>();

	for (const report of reports) {
		if (!report.employeeId) {
			continue;
		}

		loggedHoursByEmployee.set(
			report.employeeId,
			(loggedHoursByEmployee.get(report.employeeId) ?? 0) + report.hours,
		);
		const participatedTasks =
			participatedTasksByEmployee.get(report.employeeId) ?? new Set<string>();

		participatedTasks.add(report.taskId);
		participatedTasksByEmployee.set(report.employeeId, participatedTasks);
	}

	const employeeSignalPriority: Record<EmployeeSignal, number> = {
		repeated_signal: 0,
		isolated_signal: 1,
		calibration_signal: 2,
		insufficient_data: 3,
		stable_sample: 4,
	};
	const employees = developers
		.map((developer): EmployeeDevelopmentMetric | null => {
			const id = String(developer.id);
			const ownedTasks = taskMetrics.filter((task) => task.ownerId === id);
			const participatedTaskIds =
				participatedTasksByEmployee.get(id) ?? new Set<string>();
			const personalTasks = ownedTasks.filter(
				(task) => task.personalOwnerId === id && task.isComparable,
			);
			const personalMetrics = aggregateTasks(personalTasks);
			const personalCoveragePercent = getPercent(
				personalTasks.length,
				ownedTasks.length,
			);
			const participatedSignalTasks = taskMetrics.filter(
				(task) =>
					participatedTaskIds.has(task.id) && task.isSignificantDeviation,
			).length;

			if (!ownedTasks.length && !participatedTaskIds.size) {
				return null;
			}

			return {
				id,
				title: developer.title,
				ownedTasks: ownedTasks.length,
				participatedTasks: participatedTaskIds.size,
				loggedHours: loggedHoursByEmployee.get(id) ?? 0,
				personalSampleTasks: personalTasks.length,
				personalCoveragePercent,
				planHours: personalMetrics.planHours,
				actualHours: personalMetrics.actualHours,
				deltaHours: personalMetrics.deltaHours,
				biasPercent: personalMetrics.biasPercent,
				wapePercent: personalMetrics.wapePercent,
				withinBandPercent: personalMetrics.withinBandPercent,
				significantOverruns: personalMetrics.significantOverruns,
				significantUnderruns: personalMetrics.significantUnderruns,
				participatedSignalTasks,
				signal: getEmployeeSignal({
					personalSampleTasks: personalTasks.length,
					personalCoveragePercent,
					significantOverruns: personalMetrics.significantOverruns,
					significantUnderruns: personalMetrics.significantUnderruns,
					wapePercent: personalMetrics.wapePercent,
					withinBandPercent: personalMetrics.withinBandPercent,
				}),
			};
		})
		.filter(
			(employee): employee is EmployeeDevelopmentMetric => employee !== null,
		)
		.toSorted(
			(left, right) =>
				employeeSignalPriority[left.signal] -
					employeeSignalPriority[right.signal] ||
				right.participatedSignalTasks - left.participatedSignalTasks ||
				left.title.localeCompare(right.title, "ru"),
		);
	const tasksByProject = new Map<string, DevelopmentTaskMetric[]>();

	for (const task of taskMetrics) {
		const projectId = task.projectId || "__without_project__";

		tasksByProject.set(projectId, [
			...(tasksByProject.get(projectId) ?? []),
			task,
		]);
	}

	const projectsResult = Array.from(tasksByProject.entries())
		.map(([id, projectTasks]): ProjectDevelopmentMetric => {
			const metrics = aggregateTasks(projectTasks);
			const developerTitles = Array.from(
				new Set(
					projectTasks.flatMap((task) =>
						task.contributors.map((contributor) => contributor.title),
					),
				),
			).toSorted((left, right) => left.localeCompare(right, "ru"));

			return {
				id,
				title:
					id === "__without_project__"
						? "Без проекта"
						: (projectById.get(id) ?? `Проект #${id}`),
				...metrics,
				developers: developerTitles,
				signal: getProjectSignal(metrics),
			};
		})
		.toSorted(
			(left, right) =>
				right.budgetPressureHours - left.budgetPressureHours ||
				right.significantOverruns - left.significantOverruns ||
				right.positiveOverrunHours - left.positiveOverrunHours ||
				left.title.localeCompare(right.title, "ru"),
		);
	const signalTasks = taskMetrics
		.filter((task) => task.isSignificantDeviation)
		.toSorted(
			(left, right) =>
				Number(right.isCriticalDeviation) -
					Number(left.isCriticalDeviation) ||
				Math.abs(right.deltaHours ?? 0) - Math.abs(left.deltaHours ?? 0),
		);
	const actions = buildManagementActions({
		summary,
		employees,
		projects: projectsResult,
		signalTasks,
		quality,
	});

	return {
		summary,
		employees,
		projects: projectsResult,
		tasks: taskMetrics,
		signalTasks,
		quality,
		actions,
	};
};
