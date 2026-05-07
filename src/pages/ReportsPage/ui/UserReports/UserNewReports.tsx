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
import { Piecework } from "./Piecework";
import cls from "./UserReports.module.scss";

type UserReportsTab = "staff" | "piecework";

export const NewUserReports = () => {
	const { users, projects } = useOutletContext<ReportsContext>();
	const [open, setOpen] = useState(false);
	const [activeUser, setActiveUser] = useState<User>();
	const [activeTab, setActiveTab] = useState<UserReportsTab>("staff");

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
		<div className={cls.page}>
			<div className={cls.tabs} role="tablist" aria-label="Тип оплаты">
				<button
					type="button"
					role="tab"
					aria-selected={activeTab === "staff"}
					className={`${cls.tabButton} ${
						activeTab === "staff" ? cls.tabButtonActive : ""
					}`}
					onClick={() => setActiveTab("staff")}
				>
					Штат
				</button>
				<button
					type="button"
					role="tab"
					aria-selected={activeTab === "piecework"}
					className={`${cls.tabButton} ${
						activeTab === "piecework" ? cls.tabButtonActive : ""
					}`}
					onClick={() => setActiveTab("piecework")}
				>
					Сдельная оплата
				</button>
			</div>

			{activeTab === "staff" && (
				<div className={cls.container} role="tabpanel">
					<div className={cls.staffList}>
						<div className={cls.staffHeader}>
							<span>Сотрудник</span>
							<span>Задача в работе</span>
							<span>Проект</span>
						</div>
						<div className={cls.staffBody}>
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
				</div>
			)}

			{activeTab === "piecework" && (
				<div className={cls.pieceworkTab} role="tabpanel">
					<Piecework />
				</div>
			)}

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
