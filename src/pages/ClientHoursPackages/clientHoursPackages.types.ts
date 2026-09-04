export type PackageState = "overdue" | "empty" | "ending" | "active";

export type PackagePurchase = {
	id: number;
	date: string;
	hours: number;
	remaining: number;
	state: string;
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
	purchases?: PackagePurchase[];
};
