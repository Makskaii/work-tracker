export type PackageState = "overdue" | "empty" | "ending" | "active";

export type PackagePurchase = {
	id: number;
	date: string;
	hours: number;
	remaining: number;
	state: string;
	amount: number | null;
	comment: string | null;
	consumptions: PackageConsumption[];
};

export type PackageConsumption = {
	id: number;
	hours: number;
	report: {
		bitrixReportId: string;
		bitrixTaskId: string | null;
		taskTitle: string | null;
		bitrixResponsibleId: string | null;
		responsibleName: string | null;
		bitrixCompanyId: string | null;
		companyName: string | null;
		projectTitle: string | null;
		bitrixActivityId: string | null;
		activityTitle: string | null;
		reportDate: string;
		reportTitle: string | null;
		reportDescription: string | null;
	};
};

export type ClientPackage = {
	id: number;
	client: string;
	lastCharge: string;
	remainingHours: number;
	state: PackageState;
	status: string;
	statusHint: string;
	progress: number;
	purchases: PackagePurchase[];
};

export type SupportProjectOption = {
	id: number;
	title: string;
};
