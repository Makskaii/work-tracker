// user list
// user name,  current task, project, lastActivity

import dayjs from "dayjs";
import { useMemo, useState } from "react";
import { useOutletContext } from "react-router";
import { Modal } from "../../../components/modal";
import { StatsModal } from "../../../components/statistics/EmployeeStats/StatsModal";
import { ListItem } from "../../../components/userListItem/UserListItem";
import { Endpoints, TASK_SELECT_FIELDS } from "../../../shared/constants/const";
import { useLoadAllData } from "../../../shared/hooks/useLoadAllTasks";
import type { User } from "../../../shared/types/types";
import { getSrartEndMonthDate } from "../../../shared/utils/utils";
import type { ContextType } from "../../ReportsPage";
import cls from "./UserReports.module.scss";

export const NewUserReports = () => {
	const { users, projects, month, year } = useOutletContext<ContextType>();
	const [open, setOpen] = useState(false);
	const [activeUser, setActiveUser] = useState<User>();

	const currMonth = month ?? dayjs().month();
	const currYear = year ?? dayjs().year();

	const { data } = useLoadAllData(Endpoints.reports, {
		params: {
			entityTypeId: 1072,

			select: TASK_SELECT_FIELDS,
			filter: {
				">=createdTime": getSrartEndMonthDate("start", currMonth, currYear),
				"<=createdTime": getSrartEndMonthDate("end", currMonth, currYear),
			},
		},
	});

	const filteredTasks = useMemo(() => {
		return data.filter((task) => task.stageId === "DT1072_18:CLIENT");
	}, [data]);

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
				<Modal isOpen={open} onClose={() => setOpen(false)} size="covered">
					<StatsModal user={activeUser} />
				</Modal>
			)}
		</div>
	);
};
