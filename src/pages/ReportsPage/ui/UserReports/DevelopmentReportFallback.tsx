import { useOutletContext } from "react-router";
import type { ReportsContext } from "@/shared/types/types";

const fallbackRows = [
	{ title: "Планирование спринта", value: "42 ч", status: "В работе" },
	{ title: "Разработка задач", value: "128 ч", status: "Мок" },
	{ title: "Код-ревью и релизы", value: "24 ч", status: "Мок" },
];

const DevelopmentReportFallback = () => {
	const { tasks, users, projects } = useOutletContext<ReportsContext>();
	const hasLiveData =
		tasks.length > 0 || users.length > 0 || projects.length > 0;
	const rows = hasLiveData
		? [
				{
					title: "Задачи разработки",
					value: String(tasks.length),
					status: "Из контекста",
				},
				{
					title: "Сотрудники",
					value: String(users.length),
					status: "Из контекста",
				},
				{
					title: "Проекты",
					value: String(projects.length),
					status: "Из контекста",
				},
			]
		: fallbackRows;

	return (
		<section
			style={{
				display: "grid",
				gap: 16,
				padding: 24,
				border: "1px solid var(--color-border)",
				borderRadius: 18,
				background: "rgba(15, 28, 44, 0.9)",
				textAlign: "left",
			}}
		>
			<div>
				<h2 style={{ margin: 0, fontSize: 24 }}>Отчет разработки</h2>
				<p style={{ margin: "6px 0 0", color: "var(--color-muted)" }}>
					Моковый fallback до подключения полноценного отчета.
				</p>
			</div>

			<div
				style={{
					display: "grid",
					gridTemplateColumns: "repeat(auto-fit, minmax(180px, 1fr))",
					gap: 12,
				}}
			>
				{rows.map((row) => (
					<article
						key={row.title}
						style={{
							padding: 16,
							border: "1px solid var(--color-border)",
							borderRadius: 12,
							background: "var(--color-surface-soft)",
						}}
					>
						<div style={{ color: "var(--color-muted)", fontWeight: 800 }}>
							{row.title}
						</div>
						<strong style={{ display: "block", marginTop: 8, fontSize: 28 }}>
							{row.value}
						</strong>
						<span style={{ color: "var(--color-accent)", fontWeight: 900 }}>
							{row.status}
						</span>
					</article>
				))}
			</div>
		</section>
	);
};

export default DevelopmentReportFallback;
