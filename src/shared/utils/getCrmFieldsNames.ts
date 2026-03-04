import { getActivities, getProjectsFromList } from "../api/getCrmFields";

export const getProjectName = async (id: string) => {
	const projects = await getProjectsFromList();

	return projects.find((project) => project.ID === id)?.NAME || "";
};

export const getActivityName = async (id: string) => {
	const activities = await getActivities();

	return activities.find((activity) => activity.ID === id)?.NAME || "";
};
