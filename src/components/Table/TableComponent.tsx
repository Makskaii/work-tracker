import { use } from "react";
import type { AnyObject } from "../../shared/types/types";
import { TablePagination } from "../pagination/Pagination";
import cls from "./Table.module.scss";
import type { TableTemplate } from "./types";

export const Table = ({
	data,
	template,
	setPage,
	page,
}: {
	data: Promise<AnyObject>;
	template: TableTemplate;
	setPage: (page: number) => void;
	page: number;
}) => {
	const fetchedData = use(data);

	const getItemsToRender = () => {
		switch (template.path) {
			case "result.tasks":
				return fetchedData.data.result?.tasks || [];
			default:
				return fetchedData.data.result || [];
		}
	};

	const itemsToRender =
		template.beforeEdit?.(getItemsToRender()) ?? getItemsToRender();

	return (
		<div className={cls.tableWrapper}>
			{template.title}
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
						{/** biome-ignore lint/suspicious/noExplicitAny: <s> */}
						{itemsToRender.map((item: any) => (
							<tr key={item.id}>
								{template.columns.map((column) => (
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
			<TablePagination
				page={page}
				setPage={setPage}
				total={fetchedData.total}
				next={fetchedData.next}
			/>
		</div>
	);
};
