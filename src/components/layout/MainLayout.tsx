import type { B24Frame } from "@bitrix24/b24jssdk";
import { initializeB24Frame, LoggerFactory } from "@bitrix24/b24jssdk";
import { useEffect, useRef } from "react";
import { NavLink, Outlet } from "react-router";
import { ability } from "../../shared/config/ability/casl";

const devMode =
	typeof import.meta !== "undefined" && (import.meta.env?.DEV ?? false);
const $logger = LoggerFactory.createForBrowser("MyApp", devMode);

export const MainLayout = () => {
	const b24Ref = useRef<B24Frame | null>(null);

	useEffect(() => {
		let isMounted = true;

		async function init() {
			try {
				const b24 = await initializeB24Frame();
				if (!isMounted) {
					b24.destroy();
					return;
				}
				b24Ref.current = b24;

				if (b24.auth.isAdmin && ability && !devMode) {
					ability.update([
						{
							action: "read",
							subject: "post",
						},
					]);
				}
			} catch (error) {
				$logger.error("Some problems", { error });
			}
		}

		init();

		if (devMode) {
			ability.update([
				{
					action: "read",
					subject: "post",
				},
			]);
		}

		return () => {
			isMounted = false;
			b24Ref.current?.destroy();
		};
	}, []);

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
