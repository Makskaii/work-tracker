import { useEffect, useMemo, useRef, useState } from "react";
import { NavLink, useLocation } from "react-router";
import {
	APP_TITLE,
	NAV_ITEMS,
	type NavItem,
} from "@/shared/constants/const.nav";
import styles from "./AppHeader.module.scss";

const NAV_ICON_MAP: Record<string, string> = {
	"departments-reports": "▦",
	"clients-desk": "♟",
	"client accounts": "C",
	"sprint-planner": "S",
};

const getNavIcon = (item: NavItem) => {
	return NAV_ICON_MAP[item.key] ?? item.label.trim().charAt(0).toUpperCase();
};

const isSectionActive = (pathname: string, item: NavItem) => {
	if (item.type === "link") {
		return pathname.startsWith(item.to);
	}

	return item.sections.some((section) => {
		if (section.items?.some((child) => pathname.startsWith(child.to))) {
			return true;
		}

		if (
			section.groups?.some((group) =>
				group.items.some((child) => pathname.startsWith(child.to)),
			)
		) {
			return true;
		}

		return false;
	});
};

export const AppHeader = () => {
	const [openedKey, setOpenedKey] = useState<string | null>(null);
	const [isSidebarOpen, setIsSidebarOpen] = useState(false);

	const rootRef = useRef<HTMLElement | null>(null);
	const location = useLocation();

	const activeTopKey = useMemo(() => {
		return (
			NAV_ITEMS.find((item) => isSectionActive(location.pathname, item))?.key ??
			null
		);
	}, [location.pathname]);

	useEffect(() => {
		setOpenedKey(null);
		setIsSidebarOpen(false);
	}, [location.pathname]);

	useEffect(() => {
		document.documentElement.style.setProperty(
			"--app-sidebar-width",
			isSidebarOpen ? "280px" : "72px",
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

					<nav className={styles.nav}>
						{NAV_ITEMS.map((item) => {
							const isActive = activeTopKey === item.key;
							const icon = getNavIcon(item);

							if (item.type === "link") {
								return !item.disabled ? (
									<NavLink
										key={item.key}
										to={item.to}
										className={({ isActive: linkActive }) =>
											[
												styles.navItem,
												linkActive || isActive ? styles.navItemActive : "",
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

							const isOpened = openedKey === item.key;

							return (
								<div key={item.key} className={styles.navItemWrapper}>
									<button
										type="button"
										className={[
											styles.navItem,
											isActive ? styles.navItemActive : "",
											isOpened ? styles.navItemOpened : "",
										].join(" ")}
										onClick={() => {
											if (!isSidebarOpen) {
												setIsSidebarOpen(true);
												setOpenedKey(item.key);
												return;
											}

											const nextValue = openedKey === item.key ? null : item.key;
											setOpenedKey(nextValue);
										}}
										title={item.label}
									>
										<span className={styles.navIcon}>{icon}</span>
										<span className={styles.navLabel}>{item.label}</span>
										<span className={styles.chevron}>{isOpened ? "-" : "+"}</span>
									</button>

									{isSidebarOpen && isOpened && (
										<div className={styles.dropdown}>
											{item.sections.map((section) => (
												<div key={section.title} className={styles.section}>
													<div className={styles.sectionTitle}>
														{section.title}
													</div>

													{section.items?.length ? (
														<div className={styles.linksList}>
															{section.items.map((child) =>
																!child.disabled ? (
																	<NavLink
																		key={child.to}
																		to={child.to}
																		className={({ isActive: linkActive }) =>
																			[
																				styles.dropdownLink,
																				linkActive
																					? styles.dropdownLinkActive
																					: "",
																			].join(" ")
																		}
																	>
																		{child.label}
																	</NavLink>
																) : (
																	<div
																		key={child.label}
																		className={styles.dropdownLinkDisabled}
																	>
																		{child.label}
																	</div>
																),
															)}
														</div>
													) : null}

													{section.groups?.length ? (
														<div className={styles.groupList}>
															{section.groups.map((group) => (
																<div key={group.title} className={styles.group}>
																	<div className={styles.groupTitle}>
																		{group.title}
																	</div>

																	<div className={styles.linksList}>
																		{group.items.map((child) => (
																			<NavLink
																				key={child.to}
																				to={child.to}
																				className={({ isActive: linkActive }) =>
																					[
																						styles.dropdownLink,
																						linkActive
																							? styles.dropdownLinkActive
																							: "",
																					].join(" ")
																				}
																			>
																				{child.label}
																			</NavLink>
																		))}
																	</div>
																</div>
															))}
														</div>
													) : null}
												</div>
											))}
										</div>
									)}
								</div>
							);
						})}
					</nav>
		</header>
	);
};
