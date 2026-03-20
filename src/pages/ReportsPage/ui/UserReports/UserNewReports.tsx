import dayjs, { Dayjs } from "dayjs";
import { useEffect, useMemo, useState } from "react";
import { useOutletContext } from "react-router";
import { Modal } from "@/components/modal";
import { StatsModal } from "@/components/statistics/EmployeeStats/StatsModal";
import { UniversalTable } from "@/components/Table/universalTable/UniversalTable";
import { ListItem } from "@/components/userListItem/UserListItem";
import {
	Endpoints,
	EntityTypeIds,
	TASK_SELECT_FIELDS,
} from "@/shared/constants/const";
import { useLoadAllData } from "@/shared/hooks/useLoadAllTasks";
import type { ReportsContext, TaskProps, User } from "@/shared/types/types";
import { getWeekBorders } from "@/shared/utils/statisticUtils/generateWeekBorders";
import { getSrartEndMonthDate } from "@/shared/utils/utils";
import { getUsersTableData } from "../../helpers/devsStatsBySprint";
import { getHeadersForDevs } from "../../helpers/getHeadersForDevs";
import type { GroupedFields } from "../../types/types";
import cls from "./UserReports.module.scss";

const today = dayjs();

export const NewUserReports = () => {
	const { users, projects, month, year, activities } =
		useOutletContext<ReportsContext>();
	const [open, setOpen] = useState(false);
	const [activeUser, setActiveUser] = useState<User>();
	const [showWorkingTable, setShowWorkingTable] = useState(false);
	const [effectivity, setEffectivity] = useState<GroupedFields[]>([]);
	const [day, setDay] = useState<Dayjs>(today);

	const tableHeaders = useMemo(() => {
		return getHeadersForDevs(activities ?? []);
	}, [activities]);

	const borders = useMemo(() => getWeekBorders(dayjs(day)), [day]);

	const currMonth = month ?? dayjs().month();
	const currYear = year ?? dayjs().year();

	const { data } = useLoadAllData<TaskProps>({
		initialEndpoint: Endpoints.crmItems,
		initialFilters: {
			params: {
				entityTypeId: EntityTypeIds.tasks,

				select: TASK_SELECT_FIELDS,
				filter: {
					">=createdTime": getSrartEndMonthDate("start", currMonth, currYear),
					"<=createdTime": getSrartEndMonthDate("end", currMonth, currYear),
				},
			},
		},
	});

	const filteredTasks = useMemo(() => {
		return data.filter((task) => task.stageId === "DT1072_18:CLIENT");
	}, [data]);

	useEffect(() => {
		const fetch = async () => {
			const devs = users.filter((user) => user.department === 23);

			const fetchvalues = await getUsersTableData({
				users: devs,
				activities,
				startOfTheWeek: dayjs(borders.startOfTheWeek)
					.subtract(1, "day")
					.format("YYYY-MM-DD"),
				endOfTheWeek: dayjs(borders.endOfTheWeek)
					.subtract(3, "day")
					.format("YYYY-MM-DD"),
			});

			setEffectivity(fetchvalues);
		};

		if (showWorkingTable) {
			fetch();
		}
	}, [
		borders.endOfTheWeek,
		borders.startOfTheWeek,
		users,
		showWorkingTable,
		activities,
	]);

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
							.filter((user) => user.department === 23)
							.map((user) => (
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
			>
				<button
					style={{
						background: "#646cff",
					}}
					onClick={() => setShowWorkingTable(true)}
				>
					Загрузка по сотрудникам
				</button>
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

			{showWorkingTable && (
				<Modal
					isOpen={showWorkingTable}
					onClose={() => setShowWorkingTable(false)}
					size="covered"
					innerScroll
				>
					<div
						style={{
							display: "flex",
							alignItems: "center",
							gap: "1rem",
						}}
					>
						<button
							style={{
								background: "white",
								color: "#aeacac",
							}}
							onClick={() => {
								setDay((prev) => prev.subtract(7, "day"));
							}}
						>
							пред. неделя
						</button>
						<div
							style={{
								display: "flex",
								flexDirection: "column",
								alignItems: "center",
							}}
						>
							<div>
								{dayjs(borders.startOfTheWeek)
									.subtract(1, "day")
									.format("DD.MM")}
								-
								{dayjs(borders.endOfTheWeek).subtract(3, "day").format("DD.MM")}
							</div>
						</div>
						<button
							style={{
								background: "white",
								color: "#aeacac",
							}}
							onClick={() => {
								setDay((prev) => prev.add(7, "day"));
							}}
						>
							след. неделя
						</button>
					</div>
					<UniversalTable<GroupedFields>
						headers={tableHeaders}
						activeItems={effectivity}
						additionalData={{
							day: dayjs().day() - 1,
						}}
					/>
				</Modal>
			)}
		</div>
	);
};
