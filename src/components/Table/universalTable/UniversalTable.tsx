import { Spinner } from "@/components/spinner/Spinner";
import type { UniversalTableProps } from "@/shared/types/table";
import cls from "../Table.module.scss";

export const UniversalTable = <T extends { id: string; taskId?: string }>({
	headers,
	activeItems,
	additionalData,
	totalRow,
	onRowClick,
	fallbackText = "Загрузка...",
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
							{activeItems.map((item) => (
								<tr
									key={item.id}
									onDoubleClick={() => onRowClick?.(item.taskId ?? "")}
								>
									{headers.map((header) => {
										const value = item[header.key];

										return (
											<td key={String(header.key)}>
												{header.render
													? header.render(value, additionalData)
													: header.convertFn
														? header.convertFn(value, additionalData)
														: String(value ?? "")}
											</td>
										);
									})}
								</tr>
							))}

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
