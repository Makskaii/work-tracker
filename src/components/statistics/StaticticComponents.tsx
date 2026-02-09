import { useOutletContext } from "react-router";
import type { ContextType } from "../../pages/ReportsPage";
import { DateStats } from "./DateStats";
import { TasksStatistics } from "./TasksStats";
import { TimeStats } from "./TimeStats";

export const Statistics = ({ type }: { type: "tasks" | "time" | "date" }) => {
	const Context = useOutletContext<ContextType>();

	switch (type) {
		case "tasks":
			return <TasksStatistics tasks={Context?.tasks} />;
		case "time":
			return <TimeStats tasks={Context?.tasks} />;
		case "date":
			return <DateStats tasks={Context?.tasks} />;
	}
};
