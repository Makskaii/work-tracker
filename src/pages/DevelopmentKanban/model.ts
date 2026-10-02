export type KanbanStage = {
	id: string;
	name: string;
	sort: number;
	terminal?: boolean;
	color?: string;
};

export type KanbanTask = {
	id: string;
	title: string;
	assigneeId: string | null;
	stageId: string;
	projectId: string | null;
	projectTitle: string;
	priority: number | null;
	estimateHours: number | null;
	spentHours: number;
	deadline: string | null;
	redline?: string | null;
};

export type KanbanPerson = {
	id: string;
	name: string;
	photo?: string;
	active: boolean;
	developer: boolean;
};

export type KanbanLane = {
	id: string;
	name: string;
	photo?: string;
	tasks: KanbanTask[];
	sprintTasks: number;
	sprintProjects: number;
	sprintHours: number | null;
	missingEstimates: number;
};

export type KanbanLaneOptions = {
	sprintStageId: string;
	employeeId?: string;
	projectId?: string;
	query?: string;
	onlyOverdue?: boolean;
	now?: Date;
};

export type DeadlineState = "overdue" | "today" | "upcoming" | "none";

export const UNASSIGNED_LANE_ID = "unassigned";

const moscowDateFormatter = new Intl.DateTimeFormat("en-CA", {
	timeZone: "Europe/Moscow",
	year: "numeric",
	month: "2-digit",
	day: "2-digit",
});

const nameCollator = new Intl.Collator("ru", { sensitivity: "base" });

const isCalendarDate = (year: number, month: number, day: number) => {
	if (year < 1 || year > 9999 || month < 1 || month > 12 || day < 1) {
		return false;
	}

	const leap = year % 400 === 0 || (year % 4 === 0 && year % 100 !== 0);
	const monthDays = [
		31,
		leap ? 29 : 28,
		31,
		30,
		31,
		30,
		31,
		31,
		30,
		31,
		30,
		31,
	];
	return day <= monthDays[month - 1];
};

const moscowDay = (date: Date): string | null => {
	if (!Number.isFinite(date.getTime())) {
		return null;
	}

	const parts = moscowDateFormatter.formatToParts(date);
	const part = (type: Intl.DateTimeFormatPartTypes) =>
		parts.find((item) => item.type === type)?.value ?? "";
	return `${part("year").padStart(4, "0")}-${part("month")}-${part("day")}`;
};

// A date-only CRM field is already a Moscow calendar day. Timestamp values
// need an explicit offset so the browser's local timezone cannot shift a day.
const deadlineDay = (value: string | null | undefined): string | null => {
	const trimmed = value?.trim();
	if (!trimmed) {
		return null;
	}

	const date = /^(\d{4})-(\d{2})-(\d{2})$/.exec(trimmed);
	if (date) {
		return isCalendarDate(Number(date[1]), Number(date[2]), Number(date[3]))
			? trimmed
			: null;
	}

	const timestamp =
		/^(\d{4})-(\d{2})-(\d{2})T(\d{2}):(\d{2})(?::(\d{2})(?:\.\d{1,9})?)?(Z|[+-]\d{2}:\d{2})$/i.exec(
			trimmed,
		);
	if (
		!timestamp ||
		!isCalendarDate(
			Number(timestamp[1]),
			Number(timestamp[2]),
			Number(timestamp[3]),
		) ||
		Number(timestamp[4]) > 23 ||
		Number(timestamp[5]) > 59 ||
		Number(timestamp[6] ?? 0) > 59
	) {
		return null;
	}

	return moscowDay(new Date(trimmed));
};

export const getDeadlineState = (
	deadline: string | null | undefined,
	now: Date = new Date(),
): DeadlineState => {
	const day = deadlineDay(deadline);
	const today = moscowDay(now);
	if (!day || !today) {
		return "none";
	}

	return day < today ? "overdue" : day === today ? "today" : "upcoming";
};

export const formatKanbanDate = (
	deadline: string | null | undefined,
): string => {
	const day = deadlineDay(deadline);
	return day ? `${day.slice(8, 10)}.${day.slice(5, 7)}` : "—";
};

const compareIds = (left: string, right: string) => {
	if (/^\d+$/.test(left) && /^\d+$/.test(right)) {
		const leftId = BigInt(left);
		const rightId = BigInt(right);
		if (leftId !== rightId) {
			return leftId < rightId ? -1 : 1;
		}
	}

	return left < right ? -1 : left === right ? 0 : 1;
};

const priorityValue = (priority: number | null) =>
	priority !== null && Number.isFinite(priority)
		? priority
		: Number.POSITIVE_INFINITY;

const earliestTaskDeadline = (task: KanbanTask) => {
	const days = [deadlineDay(task.deadline), deadlineDay(task.redline)].filter(
		(day): day is string => day !== null,
	);
	return days.sort()[0] ?? null;
};

export const sortKanbanTasks = (tasks: readonly KanbanTask[]): KanbanTask[] => {
	const unique = Array.from(
		new Map(tasks.map((task) => [task.id, task])).values(),
	);
	return unique.sort((left, right) => {
		const leftPriority = priorityValue(left.priority);
		const rightPriority = priorityValue(right.priority);
		if (leftPriority !== rightPriority) {
			return leftPriority < rightPriority ? -1 : 1;
		}

		const leftDeadline = earliestTaskDeadline(left);
		const rightDeadline = earliestTaskDeadline(right);
		if (leftDeadline !== rightDeadline) {
			if (leftDeadline === null) return 1;
			if (rightDeadline === null) return -1;
			return leftDeadline < rightDeadline ? -1 : 1;
		}

		return compareIds(left.id, right.id);
	});
};

export const getSprintStatistics = (
	tasks: readonly KanbanTask[],
	sprintStageId: string,
): Pick<
	KanbanLane,
	"sprintTasks" | "sprintProjects" | "sprintHours" | "missingEstimates"
> => {
	const sprintTasks = sortKanbanTasks(tasks).filter(
		(task) => task.stageId === sprintStageId,
	);
	const projects = new Set(
		sprintTasks.map((task) => task.projectId?.trim()).filter(Boolean),
	);
	let knownEstimates = 0;
	let sprintHours = 0;
	for (const task of sprintTasks) {
		if (
			task.estimateHours !== null &&
			Number.isFinite(task.estimateHours) &&
			task.estimateHours >= 0
		) {
			knownEstimates += 1;
			sprintHours += task.estimateHours;
		}
	}

	return {
		sprintTasks: sprintTasks.length,
		sprintProjects: projects.size,
		sprintHours:
			sprintTasks.length && !knownEstimates
				? null
				: Math.round((sprintHours + Number.EPSILON) * 100) / 100,
		missingEstimates: sprintTasks.length - knownEstimates,
	};
};

export const buildKanbanLanes = (
	tasks: readonly KanbanTask[],
	people: readonly KanbanPerson[],
	options: KanbanLaneOptions,
): KanbanLane[] => {
	const personById = new Map(people.map((person) => [person.id, person]));
	const lanes = new Map<string, KanbanLane>();
	const workloadByLane = new Map<string, KanbanTask[]>();
	const employeeId = options.employeeId?.trim();
	const projectId = options.projectId?.trim();
	const query = options.query?.trim().toLocaleLowerCase("ru") ?? "";
	const now = options.now ?? new Date();
	const laneId = (task: KanbanTask) =>
		task.assigneeId?.trim() || UNASSIGNED_LANE_ID;
	const addLane = (id: string) => {
		if (lanes.has(id)) return;
		const person = personById.get(id);
		lanes.set(id, {
			id,
			name:
				id === UNASSIGNED_LANE_ID
					? "Без ответственного"
					: person?.name?.trim() || `Сотрудник #${id}`,
			photo: person?.photo,
			tasks: [],
			sprintTasks: 0,
			sprintProjects: 0,
			sprintHours: 0,
			missingEstimates: 0,
		});
	};

	for (const person of personById.values()) {
		if (
			person.active &&
			person.developer &&
			(!employeeId || employeeId === person.id)
		) {
			addLane(person.id);
		}
	}

	for (const task of sortKanbanTasks(tasks)) {
		const id = laneId(task);
		if (employeeId && id !== employeeId) continue;
		if (projectId && task.projectId !== projectId) continue;
		const workload = workloadByLane.get(id) ?? [];
		workload.push(task);
		workloadByLane.set(id, workload);
		if (
			options.onlyOverdue &&
			getDeadlineState(task.deadline, now) !== "overdue" &&
			getDeadlineState(task.redline, now) !== "overdue"
		) {
			continue;
		}
		if (query) {
			const searchText = [
				task.id,
				task.title,
				task.projectTitle,
				personById.get(id)?.name ?? "",
			]
				.join(" ")
				.toLocaleLowerCase("ru");
			if (!searchText.includes(query)) continue;
		}

		addLane(id);
		lanes.get(id)?.tasks.push(task);
	}

	for (const lane of lanes.values()) {
		Object.assign(
			lane,
			getSprintStatistics(
				workloadByLane.get(lane.id) ?? [],
				options.sprintStageId,
			),
		);
	}

	return Array.from(lanes.values()).sort((left, right) => {
		if (left.id === right.id) return 0;
		if (left.id === UNASSIGNED_LANE_ID) return 1;
		if (right.id === UNASSIGNED_LANE_ID) return -1;
		return (
			nameCollator.compare(left.name, right.name) ||
			compareIds(left.id, right.id)
		);
	});
};
