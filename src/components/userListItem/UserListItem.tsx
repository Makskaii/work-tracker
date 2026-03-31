import { memo } from "react";
import type {
	ClientListItems,
	TaskProps,
	User,
} from "../../shared/types/types";
import { TaskCodes as UserCodes } from "../calendar/constants/const";
import { UserCard } from "../userCard/UserCard";
import cls from "./UserItem.module.scss";

export const ListItem = memo(function ListIten({
	user,
	task,
	projects,
	onClick,
}: {
	user: User;
	task?: TaskProps;
	projects: ClientListItems[];
	onClick: () => void;
}) {
	return (
		<div
			className={cls.item}
			style={{
				display: "flex",
				padding: "1rem",
				cursor: "pointer",
				borderRadius: "10px",
				textAlign: "center",
				alignItems: "center",
				gap: "1rem",
			}}
			onClick={() => {
				onClick();
			}}
		>
			<UserCard user={user} />
			<div
				style={{
					flex: 1,
					minWidth: 0,

					height: "100%",
				}}
			>
				{task && (
					<div
						style={{
							overflow: "hidden",
							textOverflow: "ellipsis",
							whiteSpace: "nowrap",
							minWidth: "0px",
							borderRadius: "10px",
						}}
					>
						{task.title}
					</div>
				)}
			</div>
			<div
				style={{
					flex: 1,
					textAlign: "end",
				}}
			>
				{projects.find((proj) => proj.ID === task?.[UserCodes.project])?.NAME}
			</div>
		</div>
	);
});
