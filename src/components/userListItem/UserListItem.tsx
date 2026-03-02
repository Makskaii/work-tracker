import { memo } from "react";
import type { TaskProps } from "../../shared/types/types";
import { dtoFieldsCodesUserReports as UserCodes } from "../calendar/constants/const";
import { UserCard } from "../userCard/UserCard";
import cls from "./UserItem.module.scss";

export const ListItem = memo(function ListIten({
	user,
	task,
	projects,
	onClick,
}: {
	user: {
		id: string;
		value: string;
		title: string;
		position: string;
		photo: string;
	};
	task?: TaskProps;
	projects: {
		ID: string;
		NAME: string;
	}[];
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
				{
					projects.find((proj) => Number(proj.ID) === task?.[UserCodes.project])
						?.NAME
				}
			</div>
		</div>
	);
});
