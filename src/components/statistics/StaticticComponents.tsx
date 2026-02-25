import { useOutletContext } from "react-router";
import type { ReportsContext } from "../../shared/types/types";
import { convertNumberFormat } from "../../shared/utils";
import { dtoFieldsCodesUserReports as UserCodes } from "../calendar/constants/const";

export const Statistics = () => {
	const { tasks, users } = useOutletContext<ReportsContext>();

	const analitics = Array.from(new Set(tasks?.map((task) => task.createdBy)));
	const developers = Array.from(
		new Set(tasks?.map((task) => task.assignedById)),
	);

	return (
		tasks &&
		users && (
			<div
				style={{
					display: "flex",
					flexDirection: "column",
					textAlign: "start",
					gap: "10px",
				}}
			>
				<div
					style={{
						display: "flex",
						gap: "1rem",
					}}
				>
					<span>Постановщики:</span>

					<div>
						{analitics.map((item) => (
							<div>
								{users.filter((user) => user.id === String(item))[0]?.title}
							</div>
						))}
					</div>
				</div>

				<div
					style={{
						display: "flex",
						gap: "1rem",
					}}
				>
					<span>Разработчики:</span>

					<div>
						{developers.map((item) => (
							<div>
								{users.filter((user) => user.id === String(item))[0]?.title}
							</div>
						))}
					</div>
				</div>

				<span>
					Задач за месяц выполнено:{" "}
					{
						tasks.filter(
							(task) =>
								task.stageId === "DT1072_18:UC_6JNSDG" &&
								task[UserCodes.stage] === "Общая/In Work",
						).length
					}
				</span>

				<span>Доступная емкость команды: {users.length * 160} ч.</span>
				<span>
					Загрузка месяца по емкости команды:{" "}
					{tasks.reduce((acc, task) => {
						return acc + convertNumberFormat(task[UserCodes.estimateTime]);
					}, 0)}{" "}
					ч.
				</span>

				<span>
					Незапланированное время:{" "}
					{users.length * 160 -
						tasks.reduce((acc, task) => {
							return (
								acc + convertNumberFormat(String(task[UserCodes.estimateTime]))
							);
						}, 0)}
				</span>
				<span>
					Выполнение плана:{" "}
					{Math.floor(
						(tasks.filter(
							(task) =>
								task.stageId === "DT1072_18:UC_6JNSDG" &&
								task[UserCodes.stage] === "Общая/In Work",
						).length /
							tasks.length) *
							100,
					)}
					%
				</span>

				{/* <span>Общее кол-во просроченных часов:{
					
				}</span> */}
			</div>
		)
	);
};
