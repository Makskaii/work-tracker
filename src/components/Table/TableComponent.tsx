import { use } from "react";
import type { AnyObject } from "../../shared/types/types";
import { TablePagination } from "../pagination/Pagination";
import cls from "./Table.module.scss";
import type { TableTemplate } from "./types";

export const textFilter = () => {
	return <input type="text" />;
};

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
								<th key={column.key}>
									<div
										style={{
											display: "flex",
											flexDirection: "column",
										}}
									>
										{column.name}
										{column.filter?.()}
									</div>
								</th>
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
				total={fetchedData.data.total}
				next={fetchedData.data.next}
			/>
		</div>
	);
};
