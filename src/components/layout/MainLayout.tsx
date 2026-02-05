import { NavLink, Outlet } from "react-router";

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
				<div
					style={{
						display: "flex",
						gap: "1rem",
						padding: "0 1rem",
						boxShadow: "rgba(33, 35, 38, 0.1) 0px 17px 11px -5px",
						paddingBottom: "0.5rem",
						alignItems: "center",
					}}
				>
					<NavLink
						className={({ isActive, isPending }) =>
							[isPending ? "pending" : "", isActive ? "active" : ""].join(" ")
						}
						to="/data"
						end
					>
						Данные
					</NavLink>
					/
					<NavLink
						className={({ isActive, isPending }) =>
							[isPending ? "pending" : "", isActive ? "active" : ""].join(" ")
						}
						to="/reports"
						end
					>
						Отчеты
					</NavLink>
				</div>
				<Outlet />
			</main>
		</div>
	);
};
