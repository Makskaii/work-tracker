import { convertToDate } from "@/shared/utils";
import type { Deal } from "../../types/deals.types";
import { SalesCodes } from "../../types/types";
import styles from "./DealCard.module.scss";

type DealCardProps = {
	deal: Deal;
	analyticName?: string;
	createdByName?: string;
	onClick?: () => void;
};

const formatMoney = (value?: string | number) => {
	const num = Number(value);

	if (!Number.isFinite(num)) return "—";

	return new Intl.NumberFormat("ru-RU", {
		style: "currency",
		currency: "RUB",
		maximumFractionDigits: 0,
	}).format(num);
};

export const DealCard = ({ deal, analyticName, onClick }: DealCardProps) => {
	const isNewDeal = String(deal.isNew) === "Y" || String(deal.isNew) === "1";

	return (
		<article
			className={styles.card}
			onClick={(e) => {
				e.stopPropagation();
				onClick?.();
			}}
		>
			<div className={styles.header}>
				<div className={styles.titleBlock}>
					<div className={styles.titleRow}>
						<h3 className={styles.title}>{deal.title}</h3>

						{isNewDeal ? <span className={styles.newBadge}>NEW</span> : null}
					</div>
				</div>

				<div className={styles.amountBlock}>
					<span className={styles.amountLabel}>Сумма сделки</span>
					<span className={styles.amountValue}>
						{formatMoney(deal.opportunity)}
					</span>
				</div>
			</div>

			<div className={styles.content}>
				<div className={styles.grid}>
					<div className={styles.item}>
						<span className={styles.label}>Аналитик</span>
						<span className={styles.value}>{analyticName}</span>
					</div>

					<div className={styles.item}>
						<span className={styles.label}>Дата создания</span>
						<span className={styles.value}>
							{convertToDate(deal.createdTime)}
						</span>
					</div>

					<div className={styles.item}>
						<span className={styles.label}>Смета</span>
						<span className={styles.value}>
							{formatMoney(deal[SalesCodes.estimateCost]?.split("|")[0])}
						</span>
					</div>

					<div className={styles.item}>
						<span className={styles.label}>КП</span>
						<span className={styles.value}>
							{formatMoney(deal[SalesCodes.totalCost]?.split("|")[0])}
						</span>
					</div>
				</div>

				<div className={styles.footer}>
					<div className={styles.flags}>
						<span
							className={`${styles.flag} ${
								deal[SalesCodes.ppoSuccess] ? styles.flagSuccess : ""
							}`}
						>
							ППО: {deal[SalesCodes.ppoSuccess] ? "да" : "нет"}
						</span>

						<span
							className={`${styles.flag} ${
								deal[SalesCodes.kpSuccess] ? styles.flagSuccess : ""
							}`}
						>
							КП: {deal[SalesCodes.kpSuccess] ? "да" : "нет"}
						</span>
					</div>

					<div className={styles.files}>
						Файлов сметы: {deal[SalesCodes.costFile]?.length ?? 0}
					</div>
				</div>
			</div>
		</article>
	);
};
