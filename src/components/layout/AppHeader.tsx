import { useEffect, useMemo, useState } from "react";
import { NavLink, useLocation } from "react-router";
import {
	APP_TITLE,
	NAV_ITEMS,
	type NavItem,
	type NavLeaf,
} from "@/shared/constants/const.nav";
import styles from "./AppHeader.module.scss";

const getNavIcon = (item: NavItem) => {
	if (item.type === "section") return "";

	return item.icon ?? item.label.trim().charAt(0).toUpperCase();
};

const getLeafIcon = (item: NavLeaf) => {
	return item.icon ?? item.label.trim().charAt(0).toUpperCase();
};

const isSectionActive = (pathname: string, item: NavItem) => {
	if (item.type === "section") {
		return false;
	}

	if (item.type === "link") {
		if (item.key === "departments-reports") {
			return pathname.startsWith("/reports");
		}

		return pathname.startsWith(item.to);
	}

	return item.items.some((child) => pathname.startsWith(child.to));
};

export const AppHeader = () => {
	const [openedKey, setOpenedKey] = useState<string | null>(null);
	const [isSidebarOpen, setIsSidebarOpen] = useState(false);
	const location = useLocation();

	const activeTopKey = useMemo(() => {
		const activeItem = NAV_ITEMS.find((item) =>
			isSectionActive(location.pathname, item),
		);

		return activeItem && activeItem.type !== "section" ? activeItem.key : null;
	}, [location.pathname]);

	useEffect(() => {
		const activeDropdown = NAV_ITEMS.find(
			(item) =>
				item.type === "dropdown" && isSectionActive(location.pathname, item),
		);

		if (activeDropdown?.type === "dropdown") {
			setOpenedKey(activeDropdown.key);
		}
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
			className={[
				styles.sidebar,
				isSidebarOpen ? styles.sidebarOpened : styles.sidebarCollapsed,
			].join(" ")}
		>
			<div className={styles.sidebarHeader}>
				<div className={styles.sidebarTitle}>{APP_TITLE}</div>
				<button
					type="button"
					className={styles.menuButton}
					aria-label={isSidebarOpen ? "Close navigation" : "Open navigation"}
					aria-expanded={isSidebarOpen}
					onClick={() => setIsSidebarOpen((prev) => !prev)}
				>
					<span />
					<span />
					<span />
				</button>
			</div>

			<nav className={styles.nav}>
				{NAV_ITEMS.map((item) => {
					if (item.type === "section") {
						return (
							<div key={item.title} className={styles.navSectionTitle}>
								<span>{item.title}</span>
								<span className={styles.sectionChevron}>⌄</span>
							</div>
						);
					}

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

					const isOpened = isSidebarOpen && openedKey === item.key;

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
			</nav>
		</header>
	);
};
