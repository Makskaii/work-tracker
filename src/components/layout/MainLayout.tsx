import type { B24Frame } from "@bitrix24/b24jssdk";
import { initializeB24Frame, LoggerFactory } from "@bitrix24/b24jssdk";
import { useEffect, useRef, useState } from "react";
import { NavLink, Outlet, useNavigate } from "react-router";
import { getDepartmentsHeads } from "@/shared/api/getDepartments";
import { B24Context } from "@/shared/config/bitrixProvider/bitrixContext";
import { type CurrentUserDepartmentInfo } from "@/shared/hooks/useCurrentBitrixUser";
import { ability } from "../../shared/config/ability/casl";
import { Spinner } from "../spinner/Spinner";

const devMode =
	typeof import.meta !== "undefined" && (import.meta.env?.DEV ?? false);

const $logger = LoggerFactory.createForBrowser("MyApp", devMode);

type AbilityRule = {
	action: string;
	subject: string;
};

const addRuleIfMissing = (rules: AbilityRule[], rule: AbilityRule) => {
	const exists = rules.some(
		(item) => item.action === rule.action && item.subject === rule.subject,
	);

	if (!exists) {
		rules.push(rule);
	}
};

export const MainLayout = () => {
	const b24Ref = useRef<B24Frame | null>(null);
	const [b24, setB24] = useState<B24Frame | null>(null);
	const [isReady, setIsReady] = useState(false);
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
				const data = new Set((await getDepartmentsHeads()).filter(Boolean));

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
						setIsReady(true);
					}

					return;
				}

				const frame = await initializeB24Frame();

				const currUser = await getCurrentUserDepartmentInfo(frame);

				if (!isMounted) {
					frame.destroy();
					return;
				}

				b24Ref.current = frame;
				setB24(frame);

				if (!isMounted) {
					frame.destroy();
					return;
				}

				if (currUser?.userId && data.has(String(currUser.userId))) {
					addRuleIfMissing(nextRules, {
						action: "read",
						subject: "post",
					});
					addRuleIfMissing(nextRules, {
						action: "create-client",
						subject: "client",
					});
				}

				if (currUser?.departmentIds.includes(25)) {
					addRuleIfMissing(nextRules, {
						action: "create-client",
						subject: "client",
					});
					redirectTo = "/create-client-form";
				}

				ability.update(nextRules);

				if (isMounted) {
					setIsReady(true);

					if (redirectTo) {
						navigate(redirectTo, { replace: true });
					}
				}
			} catch (error) {
				$logger.error("Some problems", { error });

				if (isMounted) {
					ability.update([]);
					setIsReady(true);
				}
			}
		};

		void init();

		return () => {
			isMounted = false;
			b24Ref.current?.destroy();
		};
	}, [navigate]);

	if (!isReady) {
		return <Spinner />;
	}

	return (
		<B24Context.Provider value={{ b24 }}>
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
							paddingBottom: "0.5rem",
							alignItems: "center",
						}}
					>
						<NavLink
							key="create-client-form"
							className={({ isActive, isPending }) =>
								[isPending ? "pending" : "", isActive ? "active" : ""].join(" ")
							}
							to="create-client-form"
							end
						>
							Клиенты
						</NavLink>
					</div>

					<Outlet />
				</main>
			</div>
		</B24Context.Provider>
	);
};
