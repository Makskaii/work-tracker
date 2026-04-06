import type { User } from "../../shared/types/types";

export const UserCard = ({ user }: { user: User }) => {
	return (
		<div
			style={{
				display: "flex",
				alignItems: "center",
				gap: "10px",
				flex: 1,
			}}
		>
			<img
				src={user.photo}
				width={"35px"}
				height={"35px"}
				style={{
					borderRadius: "50%",
				}}
				alt={user.title + "photo"}
			/>
			<div
				style={{
					display: "flex",
					flexDirection: "column",
					textAlign: "start",
				}}
			>
				<span>{user.title}</span>
				{/* <span
					style={{
						color: "#bdbbbb",
					}}
				>
					{user.position}
				</span> */}
			</div>
		</div>
	);
};
