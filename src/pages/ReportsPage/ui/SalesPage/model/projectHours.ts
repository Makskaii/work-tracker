import { getProjectFactHours, getProjectPlanHours } from "./profitabilityUtils";
import type { ProfitabilityProject } from "./types";

export type ProjectAutomaticHours = {
	developmentFactHours: number;
	developmentPlanHours: number;
};

export const getProjectAutomaticHours = (
	projects: ProfitabilityProject[],
): ProjectAutomaticHours =>
	projects.reduce<ProjectAutomaticHours>(
		(total, project) => ({
			developmentFactHours:
				total.developmentFactHours + getProjectFactHours(project.reports),
			developmentPlanHours:
				total.developmentPlanHours + getProjectPlanHours(project.tasks),
		}),
		{
			developmentFactHours: 0,
			developmentPlanHours: 0,
		},
	);

export const getHoursProgress = (planHours: number, factHours: number) =>
	planHours > 0 ? (factHours / planHours) * 100 : 0;
