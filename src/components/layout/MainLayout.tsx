import { Outlet } from "react-router";

export const MainLayout = () => {
	return (
		<div style={{ display: "flex", height: "100%" }}>
			<main
				style={{
					width: "100%",
					display: "flex",
					flexDirection: "column",
					overflow: "hidden",
				}}
			>
				<Outlet />
			</main>
		</div>
	);
};
