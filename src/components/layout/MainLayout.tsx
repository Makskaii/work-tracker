import type { B24Frame } from "@bitrix24/b24jssdk";
import { initializeB24Frame, LoggerFactory } from "@bitrix24/b24jssdk";
import { useEffect, useRef, useState } from "react";
import { Outlet, useLocation, useNavigate } from "react-router";
import { getWorkTrackerDepartmentAccess } from "@/shared/api/getDepartments";
import { B24Context } from "@/shared/config/bitrixProvider/bitrixContext";
import {
	DEPARTMENT_IDS,
	REPORT_ACCESS_USER_IDS,
} from "@/shared/constants/const";
import { type CurrentUserDepartmentInfo } from "@/shared/hooks/useCurrentBitrixUser";
import { ability } from "../../shared/config/ability/casl";
import { Spinner } from "../spinner/Spinner";
import { AppHeader } from "./AppHeader";

const devMode =
	typeof import.meta !== "undefined" && (import.meta.env?.DEV ?? false);

const $logger = LoggerFactory.createForBrowser("MyApp", devMode);

type AbilityRule = {
	action: string;
	subject: string;
};

type BitrixFrameStatus = "loading" | "ready" | "unavailable";

const addRuleIfMissing = (rules: AbilityRule[], rule: AbilityRule) => {
	const exists = rules.some(
		(item) => item.action === rule.action && item.subject === rule.subject,
	);

	if (!exists) {
		rules.push(rule);
	}
};

const BitrixFrameUnavailable = () => (
	<div
		style={{
			alignItems: "center",
			background: "#0d0f11",
			color: "#e5e7eb",
			display: "flex",
			height: "100%",
			justifyContent: "center",
			minHeight: "100vh",
			padding: "24px",
			textAlign: "center",
		}}
	>
		<div style={{ maxWidth: 520 }}>
			<h1 style={{ fontSize: 24, lineHeight: 1.25, margin: "0 0 12px" }}>
				Не удалось подключиться к Битрикс24
			</h1>
			<p style={{ fontSize: 16, lineHeight: 1.5, margin: 0 }}>
				Не удалось получить сессию приложения. Обновите приложение, чтобы
				повторить подключение с вашими правами.
			</p>
			<button
				type="button"
				onClick={() => window.location.reload()}
				style={{ marginTop: 16 }}
			>
				Подключиться заново
			</button>
		</div>
	</div>
);

export const MainLayout = () => {
	const [b24, setB24] = useState<B24Frame | null>(null);
	const [frameStatus, setFrameStatus] = useState<BitrixFrameStatus>("loading");
	const navigate = useNavigate();
	const location = useLocation();
	const initialPathname = useRef(location.pathname).current;

	useEffect(() => {
		let isMounted = true;
		let initializedFrame: B24Frame | null = null;

		const getCurrentUserDepartmentInfo = async (
			frame: B24Frame,
		): Promise<CurrentUserDepartmentInfo | null> => {
			if (!frame) return null;

			const response = await frame.actions.v2.call.make({
				method: "user.current",
			});
			const user = response?.getData?.()?.result;

			if (!user) return null;

			const departments = Array.isArray(user.UF_DEPARTMENT)
				? user.UF_DEPARTMENT
				: [user.UF_DEPARTMENT];
			return {
				userId: Number(user.ID) || null,
				departmentIds: departments
					.map((id: string | number) => Number(id))
					.filter((id: number) => Number.isFinite(id) && id > 0),
			};
		};

		const init = async () => {
			try {
				const nextRules: AbilityRule[] = [];
				let redirectTo: string | null = null;

				if (!devMode && window.self === window.top) {
					window.location.replace("/marketplace/app/3/");
					return;
				}

				// A development build embedded in the portal still needs the real
				// signed-in user's SDK session. Only standalone previews bypass it.
				if (devMode && window.self === window.top) {
					addRuleIfMissing(nextRules, {
						action: "read",
						subject: "post",
					});

					addRuleIfMissing(nextRules, {
						action: "create-client",
						subject: "client",
					});

					ability.update(nextRules);

					if (isMounted) {
						setFrameStatus("ready");
					}

					return;
				}

				let frame: B24Frame;

				try {
					frame = await initializeB24Frame();
				} catch {
					$logger.error("Failed to initialize Bitrix24 frame");

					if (isMounted) {
						ability.update([]);
						setB24(null);
						setFrameStatus("unavailable");
					}

					return;
				}

				if (!isMounted) {
					return;
				}

				initializedFrame = frame;
				// User/department lookups determine UI roles, not SDK readiness.
				// A failed lookup must not discard the initialized portal session.
				setB24(frame);

				const [headsResult, userResult] = await Promise.allSettled([
					getWorkTrackerDepartmentAccess(),
					getCurrentUserDepartmentInfo(frame),
				]);
				const departmentHeads =
					headsResult.status === "fulfilled" ? headsResult.value.heads : [];
				const reportDepartmentIds = new Set([
					DEPARTMENT_IDS.DEV,
					DEPARTMENT_IDS.ANALYTICS,
					...(headsResult.status === "fulfilled"
						? headsResult.value.reportDepartmentIds
						: []),
				]);
				const currUser =
					userResult.status === "fulfilled" ? userResult.value : null;
				const data = new Set(departmentHeads.filter(Boolean).map(String));
				const isAdmin = frame.auth?.isAdmin === true;

				if (!isMounted) {
					return;
				}

				if (
					isAdmin ||
					(currUser?.userId &&
						(data.has(String(currUser.userId)) ||
							REPORT_ACCESS_USER_IDS.has(currUser.userId)))
				) {
					addRuleIfMissing(nextRules, {
						action: "read",
						subject: "post",
					});
					addRuleIfMissing(nextRules, {
						action: "create-client",
						subject: "client",
					});
				}

				if (
					currUser?.userId &&
					currUser.departmentIds.some((id) => reportDepartmentIds.has(id))
				) {
					addRuleIfMissing(nextRules, { action: "read", subject: "post" });
				}

				if (currUser?.userId === 10 || currUser?.userId === 16) {
					addRuleIfMissing(nextRules, {
						action: "read",
						subject: `employee-${currUser?.userId}`,
					});

					redirectTo = `/employee/${currUser.userId}/stats`;
				}

				if (currUser?.departmentIds.includes(DEPARTMENT_IDS.ANALYTICS)) {
					addRuleIfMissing(nextRules, {
						action: "create-client",
						subject: "client",
					});
					redirectTo = "/create-client-form";
				}

				if (currUser?.departmentIds.includes(DEPARTMENT_IDS.SALES)) {
					addRuleIfMissing(nextRules, {
						action: "create-client",
						subject: "client",
					});
					redirectTo = "/reports/sales";
				}

				ability.update(nextRules);

				if (isMounted) {
					setB24(frame);
					setFrameStatus("ready");

					if (
						redirectTo &&
						(initialPathname === "/" || initialPathname === "/reports")
					) {
						navigate(redirectTo, { replace: true });
					}
				}
			} catch {
				$logger.error("Failed to load Bitrix24 user permissions");

				if (isMounted) {
					ability.update([]);
					setFrameStatus(initializedFrame ? "ready" : "unavailable");
				}
			}
		};

		void init();

		return () => {
			isMounted = false;
			// initializeB24Frame owns a document-wide singleton. Destroying it
			// here breaks later mounts and StrictMode: the loader returns the
			// same frame with its message subscription already removed.
		};
	}, [navigate, initialPathname]);

	if (frameStatus === "loading") {
		return <Spinner />;
	}

	if (frameStatus === "unavailable") {
		return <BitrixFrameUnavailable />;
	}

	return (
		<B24Context.Provider value={{ b24, status: b24 ? "ready" : "standalone" }}>
			<div
				style={{
					display: "flex",
					flexDirection: "column",
					height: "100%",
					minHeight: 0,
					overflow: "hidden",
					background: "transparent",
				}}
			>
				<AppHeader />

				<main
					style={{
						flex: 1,
						boxSizing: "border-box",
						minHeight: 0,
						minWidth: 0,
						overflow: "auto",
						width: "100%",
						padding: "0 0 0 var(--app-sidebar-width, 72px)",
						background: "#0d0f11",
						transition: "padding-left 0.2s ease",
					}}
				>
					<div
						style={{
							boxSizing: "border-box",
							minWidth: 0,
							width: "100%",
						}}
					>
						<Outlet />
					</div>
				</main>
			</div>
		</B24Context.Provider>
	);
};
