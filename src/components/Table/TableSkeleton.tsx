/** biome-ignore-all lint/suspicious/noExplicitAny: <s> */
import { TablePagination } from "../pagination/Pagination";
import cls from "./Table.module.scss";
import type { TableTemplate } from "./types";

// Определяем интерфейс для колонок

export const TableSkeleton = ({
	template,
	setPage,
	page,
}: {
	template: TableTemplate;
	setPage: (page: number) => void;
	page: number;
}) => {
	return (
		<div className={cls.tableWrapper}>
			<div
				style={{
					display: "flex",
					alignSelf: "flex-start",

					justifyContent: "space-between",
					width: "100%",
				}}
			>
				<span
					style={{
						padding: "0.3rem 1rem",
						fontWeight: "bolder",
					}}
				>
					{template.title}
				</span>
			</div>
			<div className={cls.container}>
				<table>
					<thead>
						<tr>
							{template.columns.map((column) => (
								<th
									style={{
										textAlign: "center",
									}}
									key={column.key}
								>
									{column.name}
								</th>
							))}
						</tr>
					</thead>
					<tbody>
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
			<TablePagination page={page} setPage={setPage} />
		</div>
	);
};
