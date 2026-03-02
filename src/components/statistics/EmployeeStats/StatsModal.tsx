import dayjs from "dayjs";
import { useEffect, useMemo, useState } from "react";
import { Link, useOutletContext } from "react-router";
import { groupTasksByProject } from "../../../pages/ReportsPage/helpers/groupTasks";
import type { TGroupedTasks } from "../../../pages/ReportsPage/ui/ProgressReports/types";
import { $api } from "../../../shared/config";
import {
	Endpoints,
	EntityTypeIds,
	TASK_SELECT_FIELDS,
} from "../../../shared/constants/const";
import type {
	ReportsContext,
	TaskProps,
	User,
} from "../../../shared/types/types";
import { getWeekBorders } from "../../../shared/utils/statisticUtils/generateWeekBorders";
import { UserCard } from "../../userCard/UserCard";
import { EmployeeStats } from "./EmployeeStats";
import { TasksList } from "./TasksList";

const mockdates = [
	"2026.02.02",
	"2026.02.09",
	"2026.02.16",
	"2026.02.23",
	"2026.03.02",
];

export const StatsModal = ({ user }: { user: User }) => {
	const [day, setDay] = useState(mockdates.length - 1);
	const borders = useMemo(() => getWeekBorders(dayjs(mockdates[day])), [day]);
	const { setUser, projects } = useOutletContext<ReportsContext>();
	const [grouped, setGrouped] = useState<TGroupedTasks>({});
	const [tasks, setTasks] = useState<TaskProps[]>([]);

	useEffect(() => {
		const getTasks = async () => {
			try {
				const response = await $api.get(Endpoints.crmItems, {
					params: {
						entityTypeId: EntityTypeIds.tasks,

						select: TASK_SELECT_FIELDS,
						filter: {
							"<=createdTime": borders.endOfTheWeek,
							">=createdTime": borders.startOfTheWeek,
							assignedById: user.id,
						},
					},
				});

				setTasks(response.data.result.items);
				setGrouped(groupTasksByProject(response.data.result.items));
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
						style={{
							background: "white",
							color: "#aeacac",
						}}
						onClick={() => {
							day > 0 && setDay((prev) => prev - 1);
						}}
					>
						пред. спринт
					</button>
					<div>Текущий спринт</div>
					<button
						style={{
							background: "white",
							color: "#aeacac",
						}}
						onClick={() => {
							day < mockdates.length - 1 && setDay((prev) => prev + 1);
						}}
					>
						след. спринт
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
						padding: "0 1rem",
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
						padding: "0 1rem",
					}}
				>
					<EmployeeStats tasks={tasks} />
					{tasks.length !== 0 && (
						<div>
							<div
								style={{
									display: "flex",
									justifyContent: "space-between",
									marginBottom: "1rem",
								}}
							>
								<div> Список проектов:</div>
								<div> Задач в проекте:</div>
							</div>

							<div
								style={{
									display: "flex",
									flexDirection: "column",
									overflowY: "auto",
									height: "calc(100vh * 0.4)",
									background: "#f9fafb",
									padding: "1rem",
									gap: "10px",
									borderRadius: "24px",
								}}
							>
								{Object.entries(grouped).map(([projectId, tasks]) => (
									<div
										style={{
											display: "flex",
											justifyContent: "space-between",
										}}
									>
										<div>
											{
												projects.find((project) => project.ID === projectId)
													?.NAME
											}
										</div>
										<div> {tasks?.length}</div>
									</div>
								))}
							</div>
						</div>
					)}
				</div>
			</div>
		</div>
	);
};
