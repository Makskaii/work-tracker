/** biome-ignore-all lint/suspicious/noExplicitAny: <s> */
import { use } from "react";
import cls from "./Table.module.scss";

export const TableComponent = ({
	data,
	fields,
}: {
	data: Promise<any>;
	type: string;
	fields: string[];
}) => {
	const fetchedData = use(data);
	const itemsToRender = fetchedData.result.tasks.slice(0, 50);

	return (
		<div className={cls.tableWrapper}>
			<div className={cls.container}>
				<table>
					<thead>
						<tr>
							{fields.map((field) => (
								<th key={field}>{field}</th>
							))}
						</tr>
					</thead>
					<tbody>
						{itemsToRender.map((item: any) => (
							<tr key={item.id}>
								<td
									style={{
										display: "flex",
										flexDirection: "column",
									}}
									title={item.title}
								>
									{item.title}
								</td>

								{item.status && (
									<td>
										<span className={cls.status}>{item.status}</span>
									</td>
								)}

								{item.members && (
									<td>
										<span className={cls.status}>{item.members}</span>
									</td>
								)}

								{(item.date && (
									<td>
										<span className={cls.status}>{item.date}</span>
									</td>
								)) ||
									(item.dateStart && (
										<td>
											<span className={cls.status}>{item.date}</span>
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
