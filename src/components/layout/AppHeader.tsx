import { useEffect, useMemo, useRef, useState } from "react";
import { NavLink, useLocation } from "react-router";
import {
	APP_TITLE,
	EXTRA_NAV_ITEMS,
	NAV_ITEMS,
	type NavItem,
} from "@/shared/constants/const.nav";
import styles from "./AppHeader.module.scss";

const NAV_ICON_MAP: Record<string, string> = {
	"departments-reports": "▦",
	"client-app": "♟",
	"clients-desk": "C",
	"client-accounts": "A",
	"sprint-planner": "S",
	"reports-sections": "О",
};

const getNavIcon = (item: NavItem) => {
	return NAV_ICON_MAP[item.key] ?? item.label.trim().charAt(0).toUpperCase();
};

const isSectionActive = (pathname: string, item: NavItem) => {
	if (item.type === "link") {
		return pathname === item.to;
	}

	return item.sections.some((section) => {
		return (
			section.items?.some((child) => pathname.startsWith(child.to)) ?? false
		);
	});
};

export const AppHeader = () => {
	const [openedKey, setOpenedKey] = useState<string | null>(null);
	const [isSidebarOpen, setIsSidebarOpen] = useState(true);
	const [isExtraListsOpen, setIsExtraListsOpen] = useState(true);

	const rootRef = useRef<HTMLElement | null>(null);
	const location = useLocation();
	const isReportsArea = location.pathname.startsWith("/reports");

	const activeTopKey = useMemo(() => {
		return (
			NAV_ITEMS.find((item) => isSectionActive(location.pathname, item))?.key ??
			null
		);
	}, [location.pathname]);

	useEffect(() => {
		const reportsItem = NAV_ITEMS.find((item) => item.key === "reports-sections");

		if (reportsItem?.type !== "mega") {
			return;
		}

		const calendarSection = reportsItem.sections[0];
		const isCalendarSectionActive =
			calendarSection.items?.some((child) =>
				location.pathname.startsWith(child.to),
			) ?? false;

		setOpenedKey(isCalendarSectionActive ? calendarSection.title : null);
	}, [location.pathname]);

	useEffect(() => {
		document.documentElement.style.setProperty(
			"--app-sidebar-width",
			isSidebarOpen ? "320px" : "72px",
		);

		return () => {
			document.documentElement.style.removeProperty("--app-sidebar-width");
		};
	}, [isSidebarOpen]);

	return (
		<header
			ref={rootRef}
			className={[
				styles.sidebar,
				isSidebarOpen ? styles.sidebarOpened : styles.sidebarCollapsed,
			].join(" ")}
		>
			<div className={styles.sidebarHeader}>
				{isSidebarOpen ? (
					<button
						type="button"
						className={styles.closeButton}
						aria-label="Close navigation"
						aria-expanded={isSidebarOpen}
						onClick={() => setIsSidebarOpen(false)}
					>
						x
					</button>
				) : (
					<button
						type="button"
						className={styles.menuButton}
						aria-label="Open navigation"
						aria-expanded={isSidebarOpen}
						onClick={() => setIsSidebarOpen(true)}
					>
						<span />
						<span />
						<span />
					</button>
				)}

				<div className={styles.sidebarTitle}>{APP_TITLE}</div>
			</div>

			<nav className={`${styles.nav} ${styles.sidebarScroll}`}>
				{NAV_ITEMS.map((item) => {
					const isActive = activeTopKey === item.key;
					const icon = getNavIcon(item);

					if (item.type === "link") {
						const isReportRoot = item.key === "departments-reports";

						return !item.disabled ? (
							<NavLink
								key={item.key}
								to={item.to}
								className={({ isActive: linkActive }) =>
									[
										styles.navItem,
										(item.key === "clients-desk" ? false : linkActive) ||
										isActive ||
										(isReportRoot && isReportsArea)
											? styles.navItemActive
											: "",
									].join(" ")
								}
								title={item.label}
							>
								<span className={styles.navIcon}>{icon}</span>
								<span className={styles.navLabel}>{item.label}</span>
							</NavLink>
						) : (
							<div
								key={item.key}
								className={styles.navItemDisabled}
								title={item.label}
							>
								<span className={styles.navIcon}>{icon}</span>
								<span className={styles.navLabel}>{item.label}</span>
							</div>
						);
					}

					if (!isReportsArea) {
						return null;
					}

					return (
						<div key={item.key} className={styles.reportsSection}>
							<div className={styles.sidebarSectionHeading}>{item.label}</div>

							{item.sections.map((section) => {
								const isSectionOpened = openedKey === section.title;
								const hasActiveChild =
									section.items?.some((child) =>
										location.pathname.startsWith(child.to),
									) ?? false;

								if (section.title === "Календарь сотрудников") {
									return (
										<div key={section.title} className={styles.navItemWrapper}>
											<button
												type="button"
												className={[
													styles.navItem,
													hasActiveChild ? styles.navItemParentActive : "",
												].join(" ")}
												onClick={() => {
													if (!isSidebarOpen) {
														setIsSidebarOpen(true);
														setOpenedKey(section.title);
														return;
													}

													setOpenedKey((currentValue) =>
														currentValue === section.title ? null : section.title,
													);
												}}
											>
												<span className={styles.navIcon}>К</span>
												<span className={styles.navLabel}>{section.title}</span>
												<span className={styles.chevron}>
													{isSectionOpened ? "˄" : "˅"}
												</span>
											</button>

											{isSidebarOpen && isSectionOpened && (
												<div className={styles.sidebarSubmenu}>
													{section.items?.map((child) => (
														<NavLink
															key={child.to}
															to={child.to}
															className={({ isActive: linkActive }) =>
																[
																	styles.dropdownLink,
																	linkActive ? styles.dropdownLinkActive : "",
																].join(" ")
															}
														>
															<span className={styles.submenuIcon}>
																{child.label.trim().charAt(0).toUpperCase()}
															</span>
															<span className={styles.submenuLabel}>{child.label}</span>
														</NavLink>
													))}
												</div>
											)}
										</div>
									);
								}

								return section.items?.map((child) => (
									<NavLink
										key={child.to}
										to={child.to}
										className={({ isActive: linkActive }) =>
											[
												styles.navItem,
												linkActive ? styles.navItemActive : "",
											].join(" ")
										}
										title={child.label}
									>
										<span className={styles.navIcon}>
											{child.label.trim().charAt(0).toUpperCase()}
										</span>
										<span className={styles.navLabel}>{child.label}</span>
									</NavLink>
								));
							})}
						</div>
					);
				})}

				{isSidebarOpen && isReportsArea && (
					<div className={styles.extraLists}>
						<button
							type="button"
							className={styles.extraListsToggle}
							onClick={() => setIsExtraListsOpen((prev) => !prev)}
						>
							<span>доп. списки</span>
							<span>{isExtraListsOpen ? "˄" : "˅"}</span>
						</button>

						{isExtraListsOpen && (
							<div className={styles.extraListsItems}>
								{EXTRA_NAV_ITEMS.map((item) =>
									!item.disabled ? (
										<NavLink
											key={item.to}
											to={item.to}
											className={({ isActive }) =>
												[
													styles.navItem,
													isActive ? styles.navItemActive : "",
												].join(" ")
											}
										>
											<span className={styles.navIcon}>
												{item.label.trim().charAt(0).toUpperCase()}
											</span>
											<span className={styles.navLabel}>{item.label}</span>
										</NavLink>
									) : (
										<div key={item.label} className={styles.navItemDisabled}>
											<span className={styles.navIcon}>
												{item.label.trim().charAt(0).toUpperCase()}
											</span>
											<span className={styles.navLabel}>{item.label}</span>
										</div>
									),
								)}
							</div>
						)}
					</div>
				)}
			</nav>
		</header>
	);
};
