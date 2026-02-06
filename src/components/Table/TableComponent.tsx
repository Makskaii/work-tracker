import {
	classNames,
	getItemId,
	getItemValueByKey,
} from "../../shared/utils/utils";
import { TablePagination } from "../pagination/Pagination";
import cls from "./Table.module.scss";
import {
	type TableTemplate,
	type TGroupsColumns,
	type TTasksColumns,
	type TUsersColumns,
} from "./types";

export const Table = ({
	template,
	setPage,
	page,
	data,
	total,
	next,
	isLoading,
}: {
	data: (TTasksColumns | TGroupsColumns | TUsersColumns)[];
	template: TableTemplate;
	setPage: (page: number) => void;
	page: number;
	total?: number;
	next?: number;
	isLoading: boolean;
}) => {
	const itemsToRender = template.beforeEdit?.(data) ?? data;

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
						{itemsToRender.map((item) => {
							const itemId = getItemId(item);

							return (
								<tr
									key={itemId}
									className={classNames("", {
										[cls.skeleton]: isLoading,
									})}
								>
									{template.columns.map((column) => {
										const titleValue = getItemValueByKey(item, column.key);
										const displayValue = column.convertFn
											? column.convertFn(titleValue)
											: titleValue;

										return (
											<td key={`${column.key}_${itemId}`} title={titleValue}>
												{displayValue}
											</td>
										);
									})}
								</tr>
							);
						})}
					</tbody>
				</table>
			</div>
			<TablePagination
				page={page}
				setPage={setPage}
				total={total}
				next={next}
			/>
		</div>
	);
};
