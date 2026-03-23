export const connectProjectIds = (
	taskProjects: {
		ID: string;
		VALUE: string;
	}[],
	title: string,
) => {
	return taskProjects.find((proj) => {
		return proj.VALUE === title;
	})?.ID;
};
