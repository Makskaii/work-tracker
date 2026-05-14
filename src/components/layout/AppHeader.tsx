import { useEffect, useMemo, useRef, useState } from "react";
import { NavLink, useLocation } from "react-router";
import { APP_TITLE, NAV_ITEMS } from "@/shared/constants/const.nav";
import styles from "./AppHeader.module.scss";

type NavLeaf = {
	label: string;
	to: string;
};

type NavGroup = {
	title: string;
	items: NavLeaf[];
};

type NavSection = {
	title: string;
	items?: NavLeaf[];
	groups?: NavGroup[];
};

type NavItem =
	| {
			key: string;
			label: string;
			type: "link";
			to: string;
	  }
	| {
			key: string;
			label: string;
			type: "mega";
			sections: NavSection[];
	  };

const DROPDOWN_WIDTH = 820;
const VIEWPORT_GAP = 16;

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

	const rootRef = useRef<HTMLDivElement | null>(null);
	const location = useLocation();

	const buttonRefs = useRef<Record<string, HTMLButtonElement | null>>({});

	const activeTopKey = useMemo(() => {
		return (
			NAV_ITEMS.find((item) => isSectionActive(location.pathname, item))?.key ??
			null
		);
	}, [location.pathname]);

	useEffect(() => {
		setOpenedKey(null);
	}, []);

	useEffect(() => {
		const handleClickOutside = (event: MouseEvent) => {
			if (!rootRef.current) return;

			if (!rootRef.current.contains(event.target as Node)) {
				setOpenedKey(null);
			}
		};

		document.addEventListener("mousedown", handleClickOutside);

		return () => {
			document.removeEventListener("mousedown", handleClickOutside);
		};
	}, []);

	return (
		<header className={styles.header} ref={rootRef}>
			<div className={styles.inner}>
				<div className={styles.brand}>{APP_TITLE}</div>

				<nav className={styles.nav}>
					{NAV_ITEMS.map((item) => {
						const isActive = activeTopKey === item.key;

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
								>
									{item.label}
								</NavLink>
							) : (
								<div key={item.key}> {item.label}</div>
							);
						}

						const isOpened = openedKey === item.key;

						return (
							<div key={item.key} className={styles.navItemWrapper}>
								<button
									ref={(node) => {
										buttonRefs.current[item.key] = node;
									}}
									type="button"
									className={[
										styles.navItem,
										isActive ? styles.navItemActive : "",
										isOpened ? styles.navItemOpened : "",
									].join(" ")}
									onClick={() => {
										const nextValue = openedKey === item.key ? null : item.key;
										setOpenedKey(nextValue);
									}}
								>
									{item.label}
									<span className={styles.chevron}>{isOpened ? "−" : "+"}</span>
								</button>

								{isOpened && (
									<div
										className={styles.dropdown}
										style={{
											right: 0,
											width: `min(${DROPDOWN_WIDTH}px, calc(100vw - ${
												VIEWPORT_GAP * 2
											}px))`,
										}}
									>
										<div className={styles.dropdownGrid}>
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
																	<div>{child.label}</div>
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
									</div>
								)}
							</div>
						);
					})}
				</nav>
			</div>
		</header>
	);
};
