import dayjs from "dayjs";
import { type ReactNode, useMemo, useState } from "react";
import type { User } from "../../../shared/types/types";
import { getWeekBorders } from "../../../shared/utils/statisticUtils/generateWeekBorders";
import Modal from "../../modal/Modal";
import { UserCard } from "../../userCard/UserCard";
import { TasksList } from "./TasksList";

export const StatsModal = ({
	open,
	onClose,
	children,
	user,
}: {
	open: boolean;
	onClose: (open: boolean) => void;
	children: ReactNode;
	user: User;
}) => {
	const [date, _setDate] = useState<dayjs.Dayjs | Date>(dayjs());
	const borders = useMemo(() => getWeekBorders(dayjs(date)), [date]);

	return (
		<Modal isOpen={open} onClose={() => onClose(false)} size="covered">
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
						<div>Календарь отчетов</div>
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
						<TasksList userId={user.id} borders={borders} />
					</div>
					<div
						style={{
							flex: 1,
							padding: "1rem",
						}}
					>
						{children}
					</div>
				</div>
			</div>
		</Modal>
	);
};
