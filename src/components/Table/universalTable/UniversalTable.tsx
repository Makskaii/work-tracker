import { Fragment, useState } from "react";
import { Spinner } from "@/components/spinner/Spinner";
import type { UniversalTableProps } from "@/shared/types/table";
import cls from "../Table.module.scss";

export const UniversalTable = <T extends { id: string; parentId?: number }>({
	headers,
	activeItems,
	additionalData,
	totalRow,
	fallbackText = "Загрузка...",
	onRowClick,
	expandable = false,
	renderExpandedRow,
	isRowExpandable,
	loading,
}: UniversalTableProps<T>) => {
	const [expandedRowId, setExpandedRowId] = useState<string | null>(null);

	const handleRowClick = (item: T) => {
		onRowClick?.(item);

		if (!expandable) return;

		const canExpand = isRowExpandable ? isRowExpandable(item) : true;
		if (!canExpand) return;

		setExpandedRowId((prev) => (prev === item.id ? null : item.id));
	};

	return (
		<div
			style={{
				display: "flex",
				flexDirection: "column",
				padding: "1rem",
				height: "100%",
			}}
		>
			<div className={cls.container}>
				{!loading ? (
					<table>
						<thead>
							<tr>
								{headers.map((header, index) => (
									<th
										key={String(header.key)}
										className={index === 0 ? cls.stickyColumn : undefined}
									>
										{header.title}
									</th>
								))}
							</tr>
						</thead>

						<tbody>
							{activeItems.map((item) => {
								const preparedAdditionalData = {
									...additionalData,
									row: item,
								};

								const isExpanded = expandedRowId === item.id;
								const canExpand = isRowExpandable
									? isRowExpandable(item)
									: expandable;

								return (
									<Fragment key={item.id}>
										<tr
											key={item.id}
											onClick={() => handleRowClick(item)}
											style={{
												cursor: canExpand || onRowClick ? "pointer" : "default",
											}}
										>
											{headers.map((header) => {
												const value = item[header.key];

												return (
													<td key={String(header.key)}>
														{header.render
															? header.render(value, preparedAdditionalData)
															: header.convertFn
																? header.convertFn(
																		value,
																		preparedAdditionalData,
																	)
																: String(value ?? "")}
													</td>
												);
											})}
										</tr>

										{isExpanded && renderExpandedRow ? (
											<tr key={`${item.id}-expanded`}>
												<td colSpan={headers.length}>
													{renderExpandedRow(item)}
												</td>
											</tr>
										) : null}
									</Fragment>
								);
							})}

							{totalRow}
						</tbody>
					</table>
				) : (
					<Spinner text={fallbackText} />
				)}
			</div>
		</div>
	);
};
