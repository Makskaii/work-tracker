/** biome-ignore-all lint/suspicious/noExplicitAny: <for avoiding errors> */
import type { TableTemplate, TemplateName } from "../types";
import { GroupsColumns, TasksColumns, UsersColumns } from "./tableTemplates";

export const MainTemplate: { [k in TemplateName]: TableTemplate } = {
	tasks: { title: "Задачи", columns: TasksColumns, path: "result.tasks" },
	groups: {
		title: "Проекты",
		columns: GroupsColumns,
		path: "result",
		beforeEdit: (groups: any[]) => {
			const groupsMapped = groups.map((group) => ({
				...group,
				id: group.ID,
			}));

			return groupsMapped;
		},
	},
	users: {
		title: "Пользователи",
		columns: UsersColumns,
		path: "result",
		beforeEdit: (users: any[]) => {
			const usersMapped = users.map((user) => ({
				...user,
				id: user.ID,
				NAME: `${user.NAME} ${user.LAST_NAME}`,
			}));

			return usersMapped;
		},
	},
};
