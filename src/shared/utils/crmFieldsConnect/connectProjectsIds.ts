export const connectProjectIds = (
	taskProjects: {
		ID: string;
		VALUE: string;
	}[],
	title: string,
) => {
	return taskProjects.find((proj) => {
		console.log(proj.VALUE, { title });
		return proj.VALUE === title;
	})?.ID;
};
