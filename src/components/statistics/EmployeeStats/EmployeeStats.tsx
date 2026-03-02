import { statsFields } from "@/shared/constants/const";
import type { TaskProps } from "@/shared/types/types";
import { getStatsByEmplyee } from "@/shared/utils/statisticUtils/getStatsByEmplyee";
import cls from "./Emplyee.module.scss";

export const EmployeeStats = ({ tasks }: { tasks: TaskProps[] }) => {
	const stats = getStatsByEmplyee(tasks, statsFields);

	const estimateTime = stats.find(
		(stat) => stat.title === "Всего задач",
	)?.estimateTime;

	const SpentTime = stats.find(
		(stat) => stat.title === "Выполнено задач",
	)?.estimateTime;

	return (
		<div>
			<div className={cls.headerContainer}>
				<span> Загруженность {estimateTime}/40 ч.</span>
				<span> {estimateTime && `Ререзв ${40 - estimateTime}ч.`}</span>
				<span> Выполнено {`${SpentTime} / ${estimateTime}ч.`}</span>
			</div>
			<div className={cls.container}>
				{stats.map((stat) => (
					<div key={stat.title} className={cls.statCard}>
						<div className={cls.statLabel}>{stat.title} </div>
						<div className={cls.statValue}>{stat.value.length}</div>
					</div>
				))}

				{tasks.length !== 0 && (
					<div className={cls.statCard}>
						<div className={cls.statLabel}>Эффективность:</div>
						<div className={cls.statValue}>
							{(
								(tasks.filter((task) => task.stageId === "DT1072_18:UC_6JNSDG")
									.length /
									tasks.length) *
								100
							).toFixed(2)}
							%
						</div>
					</div>
				)}
			</div>
		</div>
	);
};
