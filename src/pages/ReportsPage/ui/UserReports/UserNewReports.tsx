import dayjs from "dayjs";
import { useEffect, useMemo, useState } from "react";
import { useOutletContext } from "react-router";
import {
	dtoFieldsCodesDailyReports,
	dtoFieldsCodesUserReports,
} from "@/components/calendar/constants/const";
import { Modal } from "@/components/modal";
import { StatsModal } from "@/components/statistics/EmployeeStats/StatsModal";
import { UniversalTable } from "@/components/Table/universalTable/UniversalTable";
import { ListItem } from "@/components/userListItem/UserListItem";
import { $api } from "@/shared/config";
import {
	Endpoints,
	EntityTypeIds,
	TASK_SELECT_FIELDS,
} from "@/shared/constants/const";
import { useLoadAllData } from "@/shared/hooks/useLoadAllTasks";
import type { ReportsContext, TaskProps, User } from "@/shared/types/types";
import { getWeekBorders } from "@/shared/utils/statisticUtils/generateWeekBorders";
import { getSrartEndMonthDate } from "@/shared/utils/utils";
import { getTasks } from "../../api/getTasks";
import { headersForDevs } from "../../constants/titleMap";
import type { GroupedFields } from "../../types/types";
import cls from "./UserReports.module.scss";

const getEffectivityPercent = (availableTime: number, timeSpent: number) => {
	if (!availableTime) return 0;

	return Math.round((timeSpent / availableTime) * 100);
};

const getCommentByEffectivity = (effectivity: number) => {
	if (effectivity > 100) return "Перегрузка";
	if (effectivity < 80) return "Недогрузка";
	if (effectivity >= 90) return "Норма";

	return "";
};

export const getUsersTableData = async ({
	users,
	startOfTheWeek,
	endOfTheWeek,
}: {
	users: User[];
	startOfTheWeek: string;
	endOfTheWeek: string;
}): Promise<GroupedFields[]> => {
	const result = await Promise.all(
		users.map(async (user) => {
			const tasksResponse = await getTasks({
				assignedById: user.id,
				[`<=${dtoFieldsCodesUserReports.sprintDateStart}`]: endOfTheWeek,
				[`>=${dtoFieldsCodesUserReports.sprintDateStart}`]: startOfTheWeek,
			});

			const tasks = tasksResponse ?? [];

			if (!tasks.length) {
				return {
					id: String(user.id),
					title: user.title,
					availableTime: 30,
					timeSpent: 0,
					effectivity: "0",
					comment: "",
				};
			}

			const reportsResponses = await Promise.all(
				tasks.map((task: { id: string | number }) =>
					$api.get(Endpoints.crmItems, {
						params: {
							entityTypeId: EntityTypeIds.reports,
							select: [
								"id",
								"title",
								"begindate",
								dtoFieldsCodesDailyReports.title,
								dtoFieldsCodesDailyReports.timeSpent,
								dtoFieldsCodesDailyReports.project,
								dtoFieldsCodesDailyReports.taskId,
								dtoFieldsCodesDailyReports.activityType,
								"assignedById",
								"createdTime",
								"lastActivityTime",
								`parentId${EntityTypeIds.tasks}`,
							],
							filter: {
								[dtoFieldsCodesDailyReports.parentId]: task.id,
								assignedById: user.id,
								">=begindate": startOfTheWeek,
								"<=begindate": endOfTheWeek,
							},
						},
					}),
				),
			);

			const totalTimeSpent = reportsResponses.reduce((userAcc, response) => {
				const reports = response?.data?.result?.items ?? [];

				return (
					userAcc +
					reports.reduce(
						(reportAcc: number, report: Record<string, unknown>) =>
							reportAcc +
							Number(report[dtoFieldsCodesDailyReports.timeSpent] ?? 0),
						0,
					)
				);
			}, 0);

			const effectivity = getEffectivityPercent(30, totalTimeSpent);

			return {
				id: String(user.id),
				title: user.title,
				availableTime: 30,
				timeSpent: totalTimeSpent,
				effectivity: `${effectivity}%`,
				comment: getCommentByEffectivity(effectivity),
			};
		}),
	);

	return result;
};

const today = dayjs();

export const NewUserReports = () => {
	const { users, projects, month, year } = useOutletContext<ReportsContext>();
	const [open, setOpen] = useState(false);
	const [activeUser, setActiveUser] = useState<User>();
	const [showWorkingTable, setShowWorkingTable] = useState(false);
	const [effectivity, setEffectivity] = useState<GroupedFields[]>([]);

	const borders = useMemo(() => getWeekBorders(dayjs(today)), []);

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
				startOfTheWeek: borders.startOfTheWeek,
				endOfTheWeek: borders.endOfTheWeek,
			});

			setEffectivity(fetchvalues);
		};

		if (showWorkingTable) {
			fetch();
		}
	}, [borders.endOfTheWeek, borders.startOfTheWeek, users]);

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
					<UniversalTable<GroupedFields>
						headers={headersForDevs}
						activeItems={effectivity}
					/>
				</Modal>
			)}
		</div>
	);
};
