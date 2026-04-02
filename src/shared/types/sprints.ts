export type SprintTaskSnapshotDto = {
	id: string;
	sprintCode: string;
	sprintStartDate: string;
	sprintEndDate: string;

	taskId: number;
	title: string;
	description: string | null;

	employeeId: number | null;
	employeeName: string | null;

	departmentId?: number | null;
	departmentName?: string | null;

	projectId: number | null;
	projectName: string | null;

	clientId: number | null;
	clientName: string | null;

	stageId: string | null;
	stageName: string | null;

	isCompleted: boolean;
	isOverdue: boolean;
	isActive: boolean;

	addedDuringSprint: boolean;
	removedDuringSprint: boolean;

	estimatedHours: string;
	spentHours: string;

	sprintDateStart: string[] | null;

	taskCreatedAt: string | null;
	taskUpdatedAt: string | null;
	movedAt: string | null;
	closedAt: string | null;
	lastSyncedAt: string | null;

	createdAt: string;
	updatedAt: string;

	raw: Record<string, unknown> | null;
};

export type TasksByProjectActiveDto = {
	projectId: number | null;
	projectName: string | null;
	count: number;
	completedTasks: number;
	taskIds: number[];
};

export type SprintEmployeeSummaryDto = {
	tasksTotal: number;
	completedTasks: number;
	notCompletedTasks: number;
	overdueTasks: number;
	estimatedHoursSum: number;
};

export type CurrentSprintDeveloperStatsItemDto = {
	employeeId: number | null;
	employeeName: string | null;

	departmentId?: number | null;
	departmentName?: string | null;

	summaryActive: SprintEmployeeSummaryDto;
	summaryInactive: SprintEmployeeSummaryDto;

	tasksByProjectActive: TasksByProjectActiveDto[];

	activeItems: SprintTaskSnapshotDto[];
	inactiveItems: SprintTaskSnapshotDto[];
};

export type CurrentSprintDevelopersStatsResponseDto = {
	sprintCode: string;
	count: number;
	items: CurrentSprintDeveloperStatsItemDto[];
};
