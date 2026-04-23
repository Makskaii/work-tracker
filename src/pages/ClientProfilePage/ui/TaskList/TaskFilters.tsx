import type { ClientProjectProps } from "@/shared/types/types";
import cls from "./TaskList.module.scss";

export type TaskFilterValues = {
	search: string;
	stage: string;
	project: string;
	client: string;
	onlyWithLinked: boolean;
};

type TaskFiltersProps = {
	value: TaskFilterValues;
	onChange: (value: TaskFilterValues) => void;
	projectOptions: ClientProjectProps[];
	total: number;
	filteredTotal: number;
	isProjectPage?: boolean;
};

export const TaskFilters = ({
	value,
	onChange,
	projectOptions,
	isProjectPage = false,
}: TaskFiltersProps) => {
	const setField = <K extends keyof TaskFilterValues>(
		field: K,
		fieldValue: TaskFilterValues[K],
	) => {
		onChange({
			...value,
			[field]: fieldValue,
		});
	};

	const resetFilters = () => {
		onChange({
			search: "",
			stage: "all",
			project: "all",
			client: "all",
			onlyWithLinked: false,
		});
	};

	return (
		<div className={cls.filters}>
			<div className={cls.filtersGrid}>
				<div className={cls.searchBox}>
					<input
						value={value.search}
						onChange={(event) => setField("search", event.target.value)}
						className={cls.input}
						placeholder="Поиск по задаче, описанию, проекту..."
					/>
				</div>

				{!isProjectPage && (
					<select
						value={value.project}
						onChange={(event) => setField("project", event.target.value)}
						className={cls.select}
					>
						<option value="all">Все проекты</option>
						{projectOptions.map((project) => (
							<option key={project.id} value={project.projectId}>
								{project.title}
							</option>
						))}
					</select>
				)}

				<button
					type="button"
					className={cls.resetButton}
					onClick={resetFilters}
				>
					Сбросить
				</button>
			</div>
		</div>
	);
};
