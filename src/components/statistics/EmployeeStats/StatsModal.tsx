import dayjs from "dayjs";
import { useEffect, useMemo, useState } from "react";
import { Link, useOutletContext } from "react-router";
import type { ContextType } from "../../../pages/ReportsPage";
import { $api } from "../../../shared/config";
import { Endpoints, TASK_SELECT_FIELDS } from "../../../shared/constants/const";
import type { TaskProps, User } from "../../../shared/types/types";
import { getWeekBorders } from "../../../shared/utils/statisticUtils/generateWeekBorders";
import { UserCard } from "../../userCard/UserCard";
import { EmployeeStats } from "./EmployeeStats";
import { TasksList } from "./TasksList";

export const StatsModal = ({ user }: { user: User }) => {
	const [date, _setDate] = useState<dayjs.Dayjs | Date>(dayjs());
	const borders = useMemo(() => getWeekBorders(dayjs(date)), [date]);
	const { setUser } = useOutletContext<ContextType>();

	const [tasks, setTasks] = useState<TaskProps[]>([]);

	useEffect(() => {
		const getTasks = async () => {
			try {
				const response = await $api.get(Endpoints.reports, {
					params: {
						entityTypeId: 1072,

						select: TASK_SELECT_FIELDS,
						filter: {
							"<=createdTime": borders.endOfTheWeek,
							">=createdTime": borders.startOfTheWeek,
							assignedById: user.id,
						},
					},
				});

				setTasks(response.data.result.items);
			} catch {
				console.log("Ошибка при получении списка сотрудников");
			}
		};

		getTasks();
	}, [user, borders]);

	return (
		<div
			style={{
				display: "flex",
				flexDirection: "column",
			}}
		>
			<div
				style={{
					display: "flex",
				}}
			>
				<div
					style={{
						display: "flex",
						gap: "1rem",
						flex: 1,
						padding: "1rem",
					}}
				>
					<UserCard user={user} />
					<div
						style={{
							padding: "1rem",
							cursor: "pointer",
						}}
						onClick={() => setUser(user.id)}
					>
						<Link to="/reports/employees"> Календарь отчетов</Link>
					</div>
				</div>

				<div
					style={{
						display: "flex",
						gap: "2rem",
						flex: 1,
						padding: "1rem",
						alignItems: "center",
						justifyContent: "center",
					}}
				>
					<button
						onClick={() => console.log(dayjs(borders.startOfTheWeek).day())}
					>
						prev
					</button>
					<div>select sprint</div>
					<button
						onClick={() => console.log(dayjs(borders.endOfTheWeek).format())}
					>
						next
					</button>
				</div>
			</div>

			<div
				style={{
					display: "flex",
				}}
			>
				<div
					style={{
						flex: 1,
						padding: "1rem",
						height: "calc(100vh * 0.65)",
						overflowY: "auto",
					}}
				>
					<div
						style={{
							marginBottom: "1rem",
							position: "sticky",
							top: 0,
							background: "white",
							padding: "0.5rem 0",
						}}
					>
						Задачи спринта:
					</div>
					<TasksList tasks={tasks} />
				</div>
				<div
					style={{
						flex: 1,
						padding: "1rem",
					}}
				>
					<EmployeeStats tasks={tasks} />
				</div>
			</div>
		</div>
	);
};
