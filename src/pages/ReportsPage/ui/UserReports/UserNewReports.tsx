import { useState } from "react";
import { useOutletContext } from "react-router";
import { Modal } from "@/components/modal";
import { Spinner } from "@/components/spinner/Spinner";
import { StatsModal } from "@/components/statistics/EmployeeStats/StatsModal";
import { ListItem } from "@/components/userListItem/UserListItem";
import {
	DEPARTMENT_IDS,
	Endpoints,
	EntityTypeIds,
	TASK_SELECT_FIELDS,
} from "@/shared/constants/const";
import { useLoadAllData } from "@/shared/hooks/useLoadAllTasks";
import type { ReportsContext, TaskProps, User } from "@/shared/types/types";
import cls from "./UserReports.module.scss";

export const NewUserReports = () => {
	const { users, projects } = useOutletContext<ReportsContext>();
	const [open, setOpen] = useState(false);
	const [activeUser, setActiveUser] = useState<User>();

	const { data, loading } = useLoadAllData<TaskProps>({
		initialEndpoint: Endpoints.crmItems,
		initialFilters: {
			params: {
				entityTypeId: EntityTypeIds.tasks,

				select: TASK_SELECT_FIELDS,
				filter: {
					stageId: "DT1072_18:CLIENT",
				},
			},
		},
	});

	if (loading) {
		return <Spinner text="Загружаем данные по сотрудникам" />;
	}

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
						{users
							.filter((user) => user.department === DEPARTMENT_IDS.DEV)
							.map((user) => (
								<ListItem
									key={user.id}
									user={user}
									task={data.find(
										(task) => task.assignedById === Number(user.id),
									)}
									projects={projects}
									onClick={() => setActiveUser(user)}
								/>
							))}
					</div>
				</div>
			</div>

			{activeUser && (
				<Modal
					isOpen={open}
					onClose={() => setOpen(false)}
					size="covered"
					innerScroll
				>
					<StatsModal user={activeUser} />
				</Modal>
			)}
		</div>
	);
};
