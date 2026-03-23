import { getClientsFromList } from "../api/getCrmFields";

export const getProjectName = async (id: string) => {
	const projects = await getClientsFromList();

	return projects.find((project) => project.ID === id)?.NAME || "";
};
