import { Fragment, useMemo } from "react";
import { Link, useLocation } from "react-router";
import styles from "./Breadcrumbs.module.scss";

type BreadcrumbItem = {
	label: string;
	to: string;
	isLast: boolean;
};

const PATH_LABELS: Record<string, string> = {
	"create-client-form": "Клиенты",
	"client-profile": "Client's Desk",
	"sprint-planner": "Sprint Planner",

	"departments-reports": "Departments' Reports",
	commercial: "Комм направление",
	product: "Пр направление",
	"activity-report": "Отчет по активности",

	"sales-report": "Отчёт продаж",
	"analytics-report": "Отчет аналитики",

	dev: "Отд. разраб",
	load: "Загрузка",
	employees: "Сотрудники",

	pm: "Отдел проджекта",
	statuses: "Статусы",
	projects: "Проекты",
};

const formatSegmentLabel = (segment: string) => {
	if (PATH_LABELS[segment]) {
		return PATH_LABELS[segment];
	}

	return segment
		.replace(/[-_]/g, " ")
		.replace(/\b\w/g, (char) => char.toUpperCase());
};

export const Breadcrumbs = () => {
	const location = useLocation();

	const breadcrumbs = useMemo<BreadcrumbItem[]>(() => {
		const segments = location.pathname.split("/").filter(Boolean);

		if (!segments.length) {
			return [];
		}

		return segments.map((segment, index) => {
			const to = `/${segments.slice(0, index + 1).join("/")}`;

			return {
				label: formatSegmentLabel(segment),
				to,
				isLast: index === segments.length - 1,
			};
		});
	}, [location.pathname]);

	if (!breadcrumbs.length) {
		return null;
	}

	return (
		<nav className={styles.breadcrumbs} aria-label="Breadcrumb">
			{breadcrumbs.map((item) => (
				<Fragment key={item.to}>
					{item.isLast ? (
						<span className={styles.current}>{item.label}</span>
					) : (
						<>
							<Link to={item.to} className={styles.link}>
								{item.label}
							</Link>
							<span className={styles.separator}>/</span>
						</>
					)}
				</Fragment>
			))}
		</nav>
	);
};
