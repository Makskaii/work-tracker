import type { B24Frame } from "@bitrix24/b24jssdk";
import { initializeB24Frame, LoggerFactory } from "@bitrix24/b24jssdk";
import { useEffect, useRef, useState } from "react";
import { Outlet, useNavigate } from "react-router";
import { getDepartmentsHeads } from "@/shared/api/getDepartments";
import { B24Context } from "@/shared/config/bitrixProvider/bitrixContext";
import { DEPARTMENT_IDS } from "@/shared/constants/const";
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
			background: "#f8fafc",
			color: "#1f2937",
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
				Приложение доступно только внутри Битрикс24
			</h1>
			<p style={{ fontSize: 16, lineHeight: 1.5, margin: 0 }}>
				Откройте его из вашего портала Битрикс24. Прямой переход по публичной
				ссылке заблокирован.
			</p>
		</div>
	</div>
);

export const MainLayout = () => {
	const b24Ref = useRef<B24Frame | null>(null);
	const [b24, setB24] = useState<B24Frame | null>(null);
	const [frameStatus, setFrameStatus] =
		useState<BitrixFrameStatus>("loading");
	const navigate = useNavigate();

	useEffect(() => {
		let isMounted = true;

		const getCurrentUserDepartmentInfo = async (
			frame: B24Frame,
		): Promise<CurrentUserDepartmentInfo | null> => {
			if (!frame) return null;

			const response = await frame.actions.v2.call.make({
				method: "user.current",
			});
			const user = response?.getData?.()?.result;

			if (!user) return null;

			return {
				userId: Number(user.ID) || null,
				departmentIds: Array.isArray(user.UF_DEPARTMENT)
					? user.UF_DEPARTMENT.map((id: string | number) => Number(id))
					: [],
			};
		};

		const init = async () => {
			try {
				const nextRules: AbilityRule[] = [];
				let redirectTo: string | null = null;

				if (devMode) {
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
				} catch (error) {
					$logger.error("Failed to initialize Bitrix24 frame", { error });

					if (isMounted) {
						ability.update([]);
						setB24(null);
						setFrameStatus("unavailable");
					}

					return;
				}

				if (!isMounted) {
					frame.destroy();
					return;
				}

				b24Ref.current = frame;

				const data = new Set((await getDepartmentsHeads()).filter(Boolean));

				const currUser = await getCurrentUserDepartmentInfo(frame);

				if (!isMounted) {
					frame.destroy();
					return;
				}

				if (
					(currUser?.userId && data.has(String(currUser.userId))) ||
					currUser?.userId === 16
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

					if (redirectTo) {
						navigate(redirectTo, { replace: true });
					}
				}
			} catch (error) {
				$logger.error("Some problems", { error });

				if (isMounted) {
					ability.update([]);
					setFrameStatus("ready");
				}
			}
		};

		void init();

		return () => {
			isMounted = false;
			b24Ref.current?.destroy();
			b24Ref.current = null;
		};
	}, [navigate]);

	if (frameStatus === "loading") {
		return <Spinner />;
	}

	if (frameStatus === "unavailable") {
		return <BitrixFrameUnavailable />;
	}

	return (
		<B24Context.Provider value={{ b24 }}>
			<div
				style={{
					display: "flex",
					flexDirection: "column",
					height: "100%",
					minHeight: 0,
				}}
			>
				<AppHeader />

				<main
					style={{
						flex: 1,
						minHeight: 0,
						overflow: "auto",
						padding: "20px 24px",
					}}
				>
					<Outlet />
				</main>
			</div>
		</B24Context.Provider>
	);
};
