import { getProjectsFromList } from "../api/getCrmFields";

export const getProjectName = async (id: string) => {
	const projects = await getProjectsFromList();

	return projects.find((project) => project.ID === id)?.NAME || "";
};
