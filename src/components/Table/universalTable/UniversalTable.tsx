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
}: UniversalTableProps<T>) => {
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
				{activeItems.length !== 0 ? (
					<table>
						<thead>
							<tr>
								{headers.map((header) => (
									<th key={String(header.key)}>{header.title}</th>
								))}
							</tr>
						</thead>
						<tbody>
							{activeItems.map((item) => {
								const preparedAdditionalData = {
									...additionalData,
									row: item,
								};
								return (
									<tr key={item.id} onClick={() => onRowClick?.(item)}>
										{headers.map((header) => {
											const value = item[header.key];

											return (
												<td key={String(header.key)}>
													{header.render
														? header.render(value, preparedAdditionalData)
														: header.convertFn
															? header.convertFn(value, preparedAdditionalData)
															: String(value ?? "")}
												</td>
											);
										})}
									</tr>
								);
							})}

							{totalRow}
						</tbody>
					</table>
				) : (
					<>
						<Spinner text={fallbackText} />
					</>
				)}
			</div>
		</div>
	);
};
