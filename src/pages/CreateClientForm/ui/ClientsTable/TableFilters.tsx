import type { ChangeEvent } from "react";
import { FiChevronDown, FiSearch } from "react-icons/fi";
import styles from "../CreateClientForm.module.scss";

export type ClientStatusFilter = "all" | "active" | "inactive";

export type ClientFilterValues = {
	search: string;
	status: ClientStatusFilter;
};

const statuses = [
	{ id: "all", name: "Все статусы" },
	{ id: "active", name: "Активные" },
	{ id: "inactive", name: "Неактивные" },
] satisfies { id: ClientStatusFilter; name: string }[];

type TableFiltersProps = {
	filters: ClientFilterValues;
	onChange: (filters: ClientFilterValues) => void;
};

export const TableFilters = ({ filters, onChange }: TableFiltersProps) => {
	const handleSearchChange = (event: ChangeEvent<HTMLInputElement>) => {
		onChange({
			...filters,
			search: event.target.value,
		});
	};

	const handleStatusChange = (event: ChangeEvent<HTMLSelectElement>) => {
		onChange({
			...filters,
			status: event.target.value as ClientStatusFilter,
		});
	};

	return (
		<div className={styles.filters}>
			<label className={styles.searchField}>
				<FiSearch className={styles.searchIcon} aria-hidden="true" />
				<input
					className={styles.searchInput}
					type="text"
					placeholder="Поиск по названию или email"
					autoComplete="off"
					value={filters.search}
					onChange={handleSearchChange}
				/>
			</label>

			<label className={styles.selectField}>
				<span className={styles.filterLabel}>Статус</span>
				<select
					className={styles.selectInput}
					value={filters.status}
					onChange={handleStatusChange}
				>
					{statuses.map((item) => (
						<option value={item.id} key={item.id}>
							{item.name}
						</option>
					))}
				</select>
				<FiChevronDown className={styles.selectIcon} aria-hidden="true" />
			</label>
		</div>
	);
};
