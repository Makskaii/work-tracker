/** biome-ignore-all lint/suspicious/noExplicitAny: <s> */
import cls from "./Table.module.scss";
import type { TableTemplate } from "./types";

// Определяем интерфейс для колонок

export const TableSkeleton = ({ template }: { template: TableTemplate }) => {
	return (
		<div className={cls.tableWrapper}>
			<div className={cls.container}>
				<table>
					<thead>
						<tr>
							{template.columns.map((column) => (
								<th key={column.key}>{column.name}</th>
							))}
						</tr>
					</thead>
					<tbody>
						{/* Skeleton rows */}
						{Array.from({ length: 6 }).map((_, index) => (
							<tr key={`skeleton-${index}`} className={cls.skeleton}>
								{template.columns.map((column) => (
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
