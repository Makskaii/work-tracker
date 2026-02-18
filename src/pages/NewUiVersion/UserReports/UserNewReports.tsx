// user list
// user name,  current task, project, lastActivity

import { useMemo, useState } from "react";
import { useOutletContext } from "react-router";
import { EmployeeStats } from "../../../components/statistics/EmployeeStats/EmployeeStats";
import { StatsModal } from "../../../components/statistics/EmployeeStats/StatsModal";
import { ListItem } from "../../../components/userListItem/UserListItem";
import type { User } from "../../../shared/types/types";
import type { ContextType } from "../../ReportsPage";
import cls from "./UserReports.module.scss";

export const NewUserReports = () => {
	const { users, tasks, projects } = useOutletContext<ContextType>();
	const [open, setOpen] = useState(false);
	const [activeUser, setActiveUser] = useState<User>();

	const filteredTasks = useMemo(() => {
		return tasks.filter((task) => task.stageId === "DT1072_18:CLIENT");
	}, [tasks]);

	return (
		<div className={cls.container}>
			<div
				style={{
					flex: 2,
					display: "flex",
					flexDirection: "column",
					gap: "10px",
					border: "1px solid #ccc",
					borderRadius: "10px",
					overflowY: "auto",
				}}
			>
				<div
					style={{
						display: "flex",
						justifyContent: "space-between",
						padding: "0 2rem",
						position: "sticky",
						top: 0,
						background: "#ccc",
					}}
				>
					<span>Сотрудник</span>
					<span>Задача в работе</span>
					<span>Проект</span>
				</div>
				<div
					style={{
						padding: "0.5rem",
					}}
				>
					<div
						onClick={(e) => {
							e.stopPropagation();
							setOpen(true);
						}}
					>
						{users.map((user) => (
							<ListItem
								key={user.id}
								user={user}
								task={filteredTasks.find(
									(task) => task.assignedById === Number(user.id),
								)}
								projects={projects}
								onClick={() => setActiveUser(user)}
							/>
						))}
					</div>
				</div>
			</div>
			<div
				style={{
					flex: 1,
				}}
			></div>

			{activeUser && (
				<StatsModal
					open={open}
					onClose={() => setOpen(false)}
					user={activeUser}
				>
					<EmployeeStats />
				</StatsModal>
			)}
		</div>
	);
};
