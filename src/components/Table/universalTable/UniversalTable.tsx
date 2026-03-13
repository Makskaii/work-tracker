import type { UniversalTableProps } from "@/shared/types/table";
import cls from "../Table.module.scss";

export const UniversalTable = <T extends { id: string }>({
	headers,
	activeItems,
	additionalData,
	totalRow,
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
							<tr key={item.id}>
								{headers.map((header) => {
									const value = item[header.key];

									return (
										<td key={String(header.key)}>
											{header.convertFn
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
			</div>
		</div>
	);
};
