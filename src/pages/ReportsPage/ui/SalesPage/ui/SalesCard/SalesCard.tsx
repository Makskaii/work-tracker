import { useId, useMemo, useState } from "react";
import type { Deal } from "@/pages/ReportsPage/types/deals.types";
import { EntityTypeIds } from "@/shared/constants/const";
import { useBitrixSlider } from "@/shared/hooks/useBitrixSlider";
import type { User } from "@/shared/types/types";
import cls from "./SalesCard.module.scss";
import { SalesItem } from "./SalesItem";

export const SalesCard = ({
	user,
	deals,
	isTotal = false,
}: {
	user: User;
	deals: Deal[];
	isTotal: boolean;
}) => {
	const [expanded, setExpanded] = useState(false);
	const listId = useId();
	const { openTask } = useBitrixSlider();
	const title = user.title?.trim() || "Неизвестный пользователь";
	const initials = title
		.split(/\s+/)
		.slice(0, 2)
		.map((part) => part[0])
		.join("");
	const opportunity = useMemo(
		() =>
			deals.reduce((sum, deal) => {
				const amount = Number(deal.opportunity);
				return sum + (Number.isFinite(amount) ? amount : 0);
			}, 0),
		[deals],
	);

	return (
		<section className={cls.card}>
			<button
				type="button"
				className={cls.summary}
				aria-expanded={expanded}
				aria-controls={listId}
				onClick={() => setExpanded((previous) => !previous)}
			>
				<span className={cls.avatar} aria-hidden="true">
					{user.photo ? (
						<img src={user.photo} alt="" loading="lazy" />
					) : (
						initials
					)}
				</span>
				<span className={cls.person}>
					<span className={cls.personName}>{title}</span>
					<span className={cls.personMeta}>
						<span>Сделок: {deals.length}</span>
						{isTotal && (
							<span className={cls.total}>
								{opportunity.toLocaleString("ru-RU", {
									maximumFractionDigits: 2,
								})}{" "}
								₽
							</span>
						)}
					</span>
				</span>
				<span
					className={`${cls.chevron} ${expanded ? cls.chevronExpanded : ""}`}
					aria-hidden="true"
				>
					⌄
				</span>
			</button>
			<div id={listId} className={cls.dealList} hidden={!expanded}>
				{deals.length ? (
					deals.map((deal) => (
						<SalesItem
							key={deal.id}
							deal={deal}
							onTitleClick={() =>
								openTask(deal.id, EntityTypeIds.default, "common")
							}
						/>
					))
				) : (
					<p className={cls.empty}>За выбранный период сделок нет.</p>
				)}
			</div>
		</section>
	);
};
