import type { B24Frame } from "@bitrix24/b24jssdk";
import { initializeB24Frame, LoggerFactory } from "@bitrix24/b24jssdk";
import { useEffect, useRef, useState } from "react";
import { Outlet, useLocation, useNavigate } from "react-router";
import { getWorkTrackerDepartmentAccess } from "@/shared/api/getDepartments";
import { B24Context } from "@/shared/config/bitrixProvider/bitrixContext";
import type { WorkTrackerBitrix } from "@/shared/config/bitrixProvider/bitrixContext";
import { createStandaloneBitrix } from "@/shared/config/bitrixProvider/standaloneBitrix";
import { captureEmployeeCallback, connectEmployeeFrame, getEmployeeSession, logoutEmployee } from "@/shared/config/auth/employeeAuth.api";
import { employeeSessionState, setIframeTokenProvider, type EmployeeSession } from "@/shared/config/auth/employee.sessions";
import { canAccessWorkTrackerPath } from "@/shared/config/ability/routeAccess";
import { WorkTrackerRouteGuard } from "../protectedRoute/WorkTrackerRouteGuard";
import {
	DEPARTMENT_IDS,
	REPORT_ACCESS_USER_IDS,
} from "@/shared/constants/const";
import { type CurrentUserDepartmentInfo } from "@/shared/hooks/useCurrentBitrixUser";
import { getAppNavigationKey, readAppNavigation, saveAppNavigation } from "@/shared/lib/appNavigation";
import { useAppUpdateBlocker } from "@/shared/lib/appUpdates";
import { ability } from "../../shared/config/ability/casl";
import { Spinner } from "../spinner/Spinner";
import { AppHeader } from "./AppHeader";
import { EmployeeLogin } from "./EmployeeLogin";

const devMode =
	typeof import.meta !== "undefined" && (import.meta.env?.DEV ?? false);

const $logger = LoggerFactory.createForBrowser("MyApp", devMode);
if (!devMode) captureEmployeeCallback();

type AbilityRule = {
	action: string;
	subject: string;
};

type BitrixFrameStatus = "loading" | "ready" | "unavailable" | "login";

const canRestorePath = (pathname: string) => canAccessWorkTrackerPath(ability, pathname);

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
	const [b24, setB24] = useState<WorkTrackerBitrix | null>(null);
	const [employeeSession, setEmployeeSession] = useState<EmployeeSession | null>(null);
	const [loginError, setLoginError] = useState<string | null>(null);
	const [retryVersion, setRetryVersion] = useState(0);
	const [loggingOut, setLoggingOut] = useState(false);
	const [currentUserId, setCurrentUserId] = useState<number | null>(null);
	const [frameStatus, setFrameStatus] = useState<BitrixFrameStatus>("loading");
	const navigate = useNavigate();
	const location = useLocation();
	const initialPathname = useRef(location.pathname).current;
	const initialSearch = useRef(location.search).current;
	const initialHash = useRef(location.hash).current;
	const pendingRestoredPath = useRef<string | null>(null);
	useAppUpdateBlocker(frameStatus === "loading");
	const isStandaloneEmployee = !devMode && window.self === window.top;

	useEffect(() => employeeSessionState.subscribeExpired(() => {
		if (!isStandaloneEmployee) {
			setLoginError("Не удалось подтвердить сессию Битрикс24. Подключитесь заново, чтобы продолжить работу.");
			return;
		}
		ability.update([]);
		setEmployeeSession(null);
		setCurrentUserId(null);
		setB24(null);
		setLoginError("Сессия завершилась. Войдите через Битрикс24, чтобы продолжить работу.");
		setFrameStatus("login");
	}), [isStandaloneEmployee]);

	useEffect(() => {
		if (frameStatus !== "ready" || !currentUserId) return;
		if (pendingRestoredPath.current) {
			if (location.pathname !== pendingRestoredPath.current) return;
			pendingRestoredPath.current = null;
		}
		if (canRestorePath(location.pathname)) {
			saveAppNavigation(getAppNavigationKey(currentUserId), location.pathname);
		}
	}, [frameStatus, currentUserId, location.pathname]);

	useEffect(() => {
		let isMounted = true;
		let initializedFrame: B24Frame | null = null;
		if (retryVersion > 0) setLoginError(null);

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
			const rawUserId: unknown = user.ID;
			const userId = typeof rawUserId === "number" ||
				(typeof rawUserId === "string" && /^\d+$/.test(rawUserId.trim()))
				? Number(rawUserId) : Number.NaN;
			return {
				userId: Number.isSafeInteger(userId) && userId > 0 ? userId : null,
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
					setIframeTokenProvider(null);
					try {
						const session = await getEmployeeSession();
						if (!isMounted) return;
						ability.update(session.rules);
						setEmployeeSession(session);
						setCurrentUserId(session.user.id);
						setB24(createStandaloneBitrix());
						setLoginError(null);
						setFrameStatus("ready");
						const landing = ["/", "/reports", "/reports/calendar"].includes(initialPathname.toLowerCase().replace(/\/+$/, "") || "/");
						const savedPath = landing ? readAppNavigation(getAppNavigationKey(session.user.id), canRestorePath) : null;
						const returnTo = session.returnTo && canRestorePath(session.returnTo.split(/[?#]/)[0]) ? session.returnTo : null;
						const fallback = ability.can("read", "post") ? "/reports/calendar" : ability.can("read", "sales-report") ? "/reports/sales" : ability.can("create-client", "client") ? "/create-client-form" : ability.can("read", `employee-${session.user.id}`) ? `/employee/${session.user.id}/stats` : null;
						const target = returnTo ?? savedPath ?? (landing && !canRestorePath(initialPathname) ? fallback : null);
						if (target && target !== initialPathname) {
							pendingRestoredPath.current = target.split(/[?#]/)[0];
							navigate(target, { replace: true });
						}
					} catch (cause) {
						if (!isMounted) return;
						ability.update([]);
						setB24(null);
						const status = (cause as { response?: { status?: number } })?.response?.status;
						const friendlyError = cause instanceof Error && /^(Вход не завершён|Не удалось получить вашу учётную запись)/.test(cause.message) ? cause.message : "Не удалось подключиться к Битрикс24. Повторите попытку.";
						setLoginError(status === 401 ? null : status === 403 ? "У вашей учётной записи нет доступа к Work Tracker. Обратитесь к администратору." : friendlyError);
						setFrameStatus("login");
					}
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
				if (frame.auth?.getAuthData) {
					employeeSessionState.set(null);
					let tokenRefresh: Promise<string> | null = null;
					const tokenProvider = async () => {
						const current = frame.auth.getAuthData();
						if (current && current.expires * 1000 > Date.now() + 60_000 && current.access_token) return current.access_token;
						if (!tokenRefresh) tokenRefresh = frame.auth.refreshAuth().then((auth) => {
							if (!auth.access_token) throw new Error("Обновите сессию Битрикс24");
							return auth.access_token;
						}).finally(() => { tokenRefresh = null; });
						return tokenRefresh;
					};
					setIframeTokenProvider(tokenProvider);
					// Cookie setup is optional for the embedded app. Its SDK token
					// authenticates all requests immediately, so this must not delay
					// the existing parallel user/department lookups.
					void tokenProvider().then(connectEmployeeFrame).catch(() => undefined);
				}
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
				const salesDepartmentIds = new Set([
					DEPARTMENT_IDS.SALES,
					...(headsResult.status === "fulfilled" ? headsResult.value.salesDepartmentIds ?? [] : []),
				]);
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

				if (currUser?.userId && currUser.departmentIds.some((id) => salesDepartmentIds.has(id))) {
					addRuleIfMissing(nextRules, {
						action: "read",
						subject: "sales-report",
					});
					addRuleIfMissing(nextRules, {
						action: "create-client",
						subject: "client",
					});
					redirectTo = "/reports/sales";
				}

				ability.update(nextRules);

				if (isMounted) {
					setB24(frame);
					setCurrentUserId(currUser?.userId ?? null);
					setFrameStatus("ready");
					setLoginError(null);

					const normalizedInitialPathname = initialPathname.toLowerCase().replace(/\/+$/, "") || "/";
					const isLanding = ["/", "/reports", "/reports/calendar"].includes(normalizedInitialPathname);
					const savedPath = isLanding && currUser?.userId
						? readAppNavigation(getAppNavigationKey(currUser.userId), canRestorePath)
						: null;
					const isDeniedSalesLanding = isLanding &&
						!canRestorePath(initialPathname) && ability.can("read", "sales-report");
					const target = savedPath ?? (
						initialPathname === "/" || initialPathname === "/reports" || isDeniedSalesLanding ? redirectTo : null
					);
					if (target && target !== initialPathname) {
						pendingRestoredPath.current = target;
						navigate(savedPath || isDeniedSalesLanding ? { pathname: target, search: initialSearch, hash: initialHash } : target, { replace: true });
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
	}, [navigate, initialPathname, initialSearch, initialHash, retryVersion]);

	if (frameStatus === "loading") {
		return <Spinner />;
	}

	if (frameStatus === "unavailable") {
		return <BitrixFrameUnavailable />;
	}
	if (frameStatus === "login") {
		return <EmployeeLogin error={loginError} returnTo={`${location.pathname}${location.search}${location.hash}`} onRetry={() => { setFrameStatus("loading"); setRetryVersion((value) => value + 1); }} />;
	}

	return (
		<B24Context.Provider value={{ b24, currentUserId, status: b24 ? "ready" : "standalone", mode: isStandaloneEmployee ? "employee" : b24 ? "iframe" : "preview", portalOrigin: employeeSession?.portalOrigin }}>
			<div
				style={{
					display: "flex",
					flexDirection: "column",
					height: isStandaloneEmployee ? "100dvh" : "100%",
					minHeight: 0,
					overflow: "hidden",
					background: "transparent",
				}}
			>
				<AppHeader />
				{!isStandaloneEmployee && loginError && <div role="alert" style={{ background: "#332321", color: "#ffcebe", padding: "12px 24px 12px calc(var(--app-sidebar-width, 72px) + 24px)", display: "flex", alignItems: "center", justifyContent: "space-between", gap: 16 }}><span>{loginError}</span><button type="button" onClick={() => { setFrameStatus("loading"); setRetryVersion((value) => value + 1); }}>Подключиться заново</button></div>}
				{isStandaloneEmployee && employeeSession && <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 16, flexShrink: 0, minHeight: 52, padding: "10px 24px 10px calc(var(--app-sidebar-width, 72px) + 24px)", background: "#11181b", borderBottom: "1px solid #26363c", color: "#a7b7bd", boxSizing: "border-box" }}>
					<span>Work Tracker <span style={{ color: "#e5e7eb", marginLeft: 16 }}>{employeeSession.user.name}</span></span>
					<div style={{ display: "flex", alignItems: "center", gap: 12 }}>{loginError && <span role="alert">{loginError}</span>}<button type="button" disabled={loggingOut} onClick={async () => {
						setLoggingOut(true);
						try {
							await logoutEmployee();
							ability.update([]); setB24(null); setCurrentUserId(null); setEmployeeSession(null); setLoginError(null); setFrameStatus("login");
						} catch { setLoginError("Не удалось выйти. Повторите попытку."); } finally { setLoggingOut(false); }
					}}>{loggingOut ? "Выходим…" : "Выйти"}</button></div>
				</div>}

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
							<WorkTrackerRouteGuard pathname={location.pathname}>
								<Outlet />
							</WorkTrackerRouteGuard>
					</div>
				</main>
			</div>
		</B24Context.Provider>
	);
};
