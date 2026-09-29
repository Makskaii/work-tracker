import { FiEdit3 } from "react-icons/fi";
import type { PackagePurchase } from "./clientHoursPackages.types";
import styles from "./ClientHoursPackagesPage.module.scss";
const hours = (value: number) =>
	`${new Intl.NumberFormat("ru-RU", { maximumFractionDigits: 2 }).format(value)} ч`;
export const SupportPackageBalances = ({
	purchases,
	selectedPurchaseId,
	onSelectPackage,
	onEditPackage,
}: {
	purchases: PackagePurchase[];
	selectedPurchaseId: number | null;
	onSelectPackage: (id: number | null) => void;
	onEditPackage: (purchase: PackagePurchase) => void;
}) => {
	if (!purchases.length) return null;
	if (selectedPurchaseId != null)
		return (
			<button
				className={styles.inlineAction}
				type="button"
				onClick={() => onSelectPackage(null)}
			>
				← Все пакеты проекта
			</button>
		);
	return (
		<section className={styles.packageBalances} aria-label="Остатки по пакетам">
			<h2>Пакеты проекта</h2>
			<div className={styles.balanceTableScroll}>
				<table>
					<thead>
						<tr>
							<th scope="col">Пакет</th>
							<th scope="col">Куплено</th>
							<th scope="col">Списано</th>
							<th scope="col">Остаток</th>
							<th scope="col">
								<span className={styles.srOnly}>Действия</span>
							</th>
						</tr>
					</thead>
					<tbody>
						{purchases
							.toSorted(
								(first, second) =>
									first.date.localeCompare(second.date) || first.id - second.id,
							)
							.map((purchase) => (
								<tr key={purchase.id}>
									<th scope="row">
										<button
											className={styles.balancePackageLink}
											type="button"
											onClick={() => onSelectPackage(purchase.id)}
											aria-label={`Выбрать пакет №${purchase.id}`}
										>
											№{purchase.id}{" "}
											<small>
												{new Date(
													`${purchase.date.slice(0, 10)}T12:00:00`,
												).toLocaleDateString("ru-RU")}
											</small>
										</button>
									</th>
									<td>{hours(purchase.hours)}</td>
									<td>
										{hours(
											purchase.consumptions.reduce(
												(sum, item) => sum + item.hours,
												0,
											),
										)}
									</td>
									<td
										className={
											purchase.remaining < 0
												? styles.overdue
												: purchase.remaining === 0
													? styles.empty
													: styles.active
										}
									>
										{hours(purchase.remaining)}
									</td>
									<td>
										<button
											className={styles.inlineAction}
											type="button"
											onClick={() => onEditPackage(purchase)}
											aria-label={`Изменить пакет №${purchase.id}`}
										>
											<FiEdit3 aria-hidden="true" />
										</button>
									</td>
								</tr>
							))}
					</tbody>
				</table>
			</div>
		</section>
	);
};
