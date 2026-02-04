/** biome-ignore-all lint/suspicious/noExplicitAny: <s> */
import { use } from "react";
import { TablePagination } from "../pagination/Pagination";
import cls from "./Table.module.scss";
import type { ColumnConfig } from "./templates/tableTemplates";

// Определяем интерфейс для колонок

export const Table = ({
	data,
	columns,
}: {
	data: Promise<any>;
	columns: ColumnConfig[];
}) => {
	const fetchedData = use(data);
	const itemsToRender = fetchedData.result.tasks;
	console.log(fetchedData);
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
						{itemsToRender.map((item: any) => (
							<tr key={item.id}>
								{columns.map((column) => (
									<td
										key={column.key + item.id}
										title={item[column.key]?.toString() || ""}
									>
										{column.convertFn?.(item[column.key]) ?? item[column.key]}
									</td>
								))}
							</tr>
						))}
					</tbody>
				</table>
			</div>
			<TablePagination next={fetchedData.next} total={fetchedData.total} />
		</div>
	);
};
