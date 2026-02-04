/** biome-ignore-all lint/suspicious/noExplicitAny: <s> */
import cls from "./Table.module.scss";
import type { ColumnConfig } from "./templates/tableTemplates";

// Определяем интерфейс для колонок

export const TableSkeleton = ({ columns }: { columns: ColumnConfig[] }) => {
	return (
		<div className={cls.tableWrapper}>
			<div className={cls.container}>
				<table>
					<thead>
						<tr>
							{columns.map((column) => (
								<th key={column.key}>{column.name}</th>
							))}
						</tr>
					</thead>
					<tbody>
						{/* Skeleton rows */}
						{Array.from({ length: 6 }).map((_, index) => (
							<tr key={`skeleton-${index}`} className={cls.skeleton}>
								{columns.map((column) => (
									<td key={column.key + "-skeleton-" + index}>
										<div
											style={{
												height: "3rem",
											}}
										/>
									</td>
								))}
							</tr>
						))}
					</tbody>
				</table>
			</div>
		</div>
	);
};
