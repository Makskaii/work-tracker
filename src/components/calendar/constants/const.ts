export const months = [
	"Январь",
	"Февраль",
	"Март",
	"Апрель",
	"Май",
	"Июнь",
	"Июль",
	"Август",
	"Сентябрь",
	"Октябрь",
	"Ноябрь",
	"Декабрь",
];

export const years = Array.from({ length: 10 }, (_, i) => 2020 + i);

export enum ReportCodes {
	title = "ufCrm11_1770627903531",
	timeSpent = "ufCrm11_1770627880479",
	taskId = "ufCrm11_1770627808462",
	project = "ufCrm11_1774018669",
	client = "ufCrm11_1772012010",
	activityType = "ufCrm11_1774427281",
	parentId = "parentId1072",
	show = "ufCrm11_1776177558677",
	company = "ufCrm11_1775128268",
	parentproject = "ufCrm11_1775128299",
	taskType = "ufCrm11_1778666750123",
}

export type TaskType = "clients paid" | "company paid" | "unpaid";

export enum ProjectCodes {
	pm = "ASSIGNED_BY_ID",
	analytic = "ufCrm20_1777028495",
	devs = "ufCrm20_1777028537",
	qa = "ufCrm20_1777028582",
	company = "ufCrm20_1774879746",
	parentproject = "ufCrm20_1774856819",
	parentDeal = "parentId2",
	comment = "ufCrm30_1780490532",
	info = "ufCrm30_1780490581",
	incidentDates = "ufCrm30_1780490526415",
	project = "parentId1092",
	incidentCompany = "companyId",
	paymentStage = "stageId",
	paymentStageBinding = "ufCrm31_1780568517",
	paymentPercent = "ufCrm31_1780568744067",
	paymentAmount = "ufCrm31_1780568762673",
	paymentDate = "ufCrm31_1781613488488",
	paymentProject = "parentId1092",
	projectPayment = "parentId1144",
	financialProjectType = "ufCrm20_1781683772",
	projectAmount = "ufCrm20_1781794144345",
}

export const FINANCIAL_PROJECT_TYPE = {
	WATERFALL: "409",
	SUPPORT: "410",
} as const;

export enum TaskCodes {
	description = "ufCrm14_1770731622242",
	stage = "ufCrm14_1770890673468",
	estimateTime = "ufCrm14_1770731674952",
	client = "ufCrm14_1772011269",
	reportDate = "ufCrm14_1771314375250",
	project = "ufCrm14_1774264018",
	timeSpent = "ufCrm14_1771314387497",
	comment = "ufCrm14_1771314401297",
	sprintDateStart = "ufCrm14_1771510367281",
	linkedTasks = "ufCrm14_1775462592",
	hours = "ufCrm14_1776177413413",
	deadline = "ufCrm14_1775128557733",
	company = "ufCrm14_1775127945",
	parentproject = "parentId1092",
	taskType = "ufCrm14_1775231676",
	taskAllowed = "ufCrm14_1779875406638",
}

export enum ActivityType {
	development = 269,
	clientCall = 270,
	analitycsCall = 271,
	dash = 272,
	devsCall = 275,
	notAtWork = 404,
}

export const ReportStageIds = {
	unconfirmed: "DT1060_15:NEW",
	confirmed: "DT1060_15:PREPARATION",
} as const;

export type ReportStageId =
	(typeof ReportStageIds)[keyof typeof ReportStageIds];

export const ActivityTitle: { [key: number]: string } = {
	[ActivityType.development]: "Разработка",
	[ActivityType.clientCall]: "Созвон с клиентом",
	[ActivityType.analitycsCall]: "Внутренний созвон",
	[ActivityType.dash]: "Внутренние коммуникации",
	[ActivityType.devsCall]: "Встреча с разработчиками",
};

export const selectFields = [
	"id",
	"title",
	"begindate",
	ReportCodes.title,
	ReportCodes.timeSpent,
	ReportCodes.project,
	ReportCodes.taskId,
	ReportCodes.activityType,
	ReportCodes.parentId,
	ReportCodes.client,
	ReportCodes.company,
	ReportCodes.parentproject,
	ReportCodes.taskType,
	"assignedById",
	"createdTime",
	"lastActivityTime",
	"stageId",
];
