import { useEffect, useMemo, useState } from "react";
import { FaThumbtack } from "react-icons/fa";
import { NavLink, useLocation } from "react-router";
import {
	APP_TITLE,
	NAVIGATION_GROUPS,
	type NavItem,
	type NavLeaf,
} from "@/shared/constants/const.nav";
import styles from "./AppHeader.module.scss";

const getNavIcon = (item: NavItem) => {
	return item.icon ?? item.label.trim().charAt(0).toUpperCase();
};

const getLeafIcon = (item: NavLeaf) => {
	return item.icon ?? item.label.trim().charAt(0).toUpperCase();
};

const isSectionActive = (pathname: string, item: NavItem) => {
	if (item.type === "link") {
		return pathname === item.to || pathname.startsWith(`${item.to}/`);
	}

	return item.items.some(
		(child) => pathname === child.to || pathname.startsWith(`${child.to}/`),
	);
};

export const AppHeader = () => {
	const [openedKey, setOpenedKey] = useState<string | null>(null);
	const [isSidebarOpen, setIsSidebarOpen] = useState(true);
	const [isSidebarHovered, setIsSidebarHovered] = useState(false);
	const [collapsedSections, setCollapsedSections] = useState<
		Record<string, boolean>
	>({
		"Доп. списки": true,
	});
	const location = useLocation();
	const isSidebarExpanded = isSidebarOpen || isSidebarHovered;
	const isSidebarHoverExpanded = !isSidebarOpen && isSidebarHovered;
	const navItems = useMemo(
		() => NAVIGATION_GROUPS.flatMap((group) => group.items),
		[],
	);

	const activeTopKey = useMemo(() => {
		if (location.pathname.startsWith("/reports/calendar")) {
			return "departments-reports";
		}

		const activeItem = navItems.find((item) =>
			isSectionActive(location.pathname, item),
		);

		return activeItem?.key ?? null;
	}, [location.pathname, navItems]);

	const activeSectionTitle = useMemo(() => {
		return (
			NAVIGATION_GROUPS.find((group) =>
				group.items.some((item) => item.key === activeTopKey),
			)?.title ?? null
		);
	}, [activeTopKey]);

	useEffect(() => {
		const activeDropdown = navItems.find(
			(item) =>
				item.type === "dropdown" && isSectionActive(location.pathname, item),
		);

		if (activeDropdown?.type === "dropdown") {
			setOpenedKey(activeDropdown.key);
		}
	}, [location.pathname, navItems]);

	useEffect(() => {
		if (!activeSectionTitle) {
			return;
		}

		setCollapsedSections((prev) =>
			prev[activeSectionTitle]
				? {
					...prev,
					[activeSectionTitle]: false,
				}
				: prev,
		);
	}, [activeSectionTitle]);

	useEffect(() => {
		document.documentElement.style.setProperty(
			"--app-sidebar-width",
			isSidebarOpen ? "310px" : "72px",
		);

		return () => {
			document.documentElement.style.removeProperty("--app-sidebar-width");
		};
	}, [isSidebarOpen]);

	return (
		<header
			className={[
				styles.sidebar,
				isSidebarExpanded ? styles.sidebarOpened : styles.sidebarCollapsed,
				isSidebarHoverExpanded ? styles.sidebarHoverExpanded : "",
			].join(" ")}
			onMouseEnter={() => setIsSidebarHovered(true)}
			onMouseLeave={() => setIsSidebarHovered(false)}
		>
			<div className={styles.sidebarHeader}>
				<div className={styles.sidebarTitle}>{APP_TITLE}</div>
				<button
					type="button"
					className={styles.menuButton}
					aria-label={
						isSidebarOpen
							? "Открепить боковую панель"
							: "Закрепить боковую панель"
					}
					aria-expanded={isSidebarExpanded}
					aria-pressed={isSidebarOpen}
					title={
						isSidebarOpen
							? "Открепить боковую панель"
							: "Закрепить боковую панель"
					}
					onClick={() => setIsSidebarOpen((prev) => !prev)}
				>
					<FaThumbtack
						aria-hidden="true"
						className={`${styles.pinIcon} ${
							isSidebarOpen ? styles.pinIconPinned : ""
						}`}
					/>
				</button>
			</div>

			<nav className={styles.nav}>
				{NAVIGATION_GROUPS.map((group) => (
					<div key={group.title} className={styles.reportsSection}>
					<button
						type="button"
						className={styles.navSectionButton}
						aria-label={collapsedSections[group.title] ? "Expand section" : "Collapse section"}
						aria-expanded={!collapsedSections[group.title]}
						onClick={() => {
							if (activeSectionTitle === group.title) {
								return;
							}

							setCollapsedSections((prev) => ({
								...prev,
								[group.title]: !prev[group.title],
							}));
						}}
					>
						<span>{group.title}</span>
						<span className={styles.sectionToggleIcon}>
							{collapsedSections[group.title] ? "⌄" : "⌃"}
						</span>
					</button>
						{(!isSidebarExpanded || !collapsedSections[group.title]) &&
							group.items.map((item) => {
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
												linkActive || isActive
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

							const isOpened = isSidebarExpanded && openedKey === item.key;

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
									if (!isSidebarExpanded) {
										setIsSidebarOpen(true);
										setOpenedKey(item.key);
										return;
									}

									setOpenedKey((current) =>
										current === item.key ? null : item.key,
									);
								}}
								title={item.label}
								aria-expanded={isOpened}
							>
								<span className={styles.navIcon}>{icon}</span>
								<span className={styles.navLabel}>{item.label}</span>
								<span className={styles.chevron}>{isOpened ? "⌃" : "⌄"}</span>
							</button>

							{isOpened && (
								<div className={styles.dropdown}>
									{item.items.map((child) =>
										!child.disabled ? (
											<NavLink
												key={child.to}
												to={child.to}
												className={({ isActive: linkActive }) =>
													[
														styles.dropdownLink,
														linkActive ? styles.dropdownLinkActive : "",
													].join(" ")
												}
												title={child.label}
											>
												<span className={styles.dropdownIcon}>
													{getLeafIcon(child)}
												</span>
												<span>{child.label}</span>
											</NavLink>
										) : (
											<div
												key={child.label}
												className={styles.dropdownLinkDisabled}
												title={child.label}
											>
												<span className={styles.dropdownIcon}>
													{getLeafIcon(child)}
												</span>
												<span>{child.label}</span>
											</div>
										),
									)}
								</div>
							)}
								</div>
							);
						})}
					</div>
				))}
			</nav>
		</header>
	);
};
