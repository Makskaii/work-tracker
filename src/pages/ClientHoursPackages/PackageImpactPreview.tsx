import styles from "./ClientHoursPackagesPage.module.scss";
import type { PackageImpact } from "./supportAnalyst.api";
const hours = (value: number) =>
	`${new Intl.NumberFormat("ru-RU", { maximumFractionDigits: 2 }).format(value)} ч`;
export const PackageImpactPreview = ({ impact }: { impact: PackageImpact }) => (
	<div className={styles.impactPreview}>
		<strong>Как изменятся остатки</strong>
		{impact.packages
			.filter((item) => item.affected || item.id === impact.packageId)
			.map((item) => (
				<div className={styles.impactRow} key={item.id}>
					<span>Пакет №{item.id}</span>
					<span>
						{item.before ? hours(item.before.remainingHours) : "—"} →{" "}
						<b>
							{item.after ? hours(item.after.remainingHours) : "Пакет удалён"}
						</b>
					</span>
				</div>
			))}
		{impact.movedReportCount > 0 && (
			<p>
				Перераспределится {hours(impact.movedHours)} из{" "}
				{impact.movedReportCount} отчётов. Работы и фактические часы сохранятся.
			</p>
		)}
		{impact.unallocatedHoursAfter > 0 && (
			<p className={styles.formError}>
				{hours(impact.unallocatedHoursAfter)} останется без пакета. Списания
				появятся после добавления пакета.
			</p>
		)}
	</div>
);
