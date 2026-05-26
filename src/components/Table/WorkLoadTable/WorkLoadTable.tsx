/** biome-ignore-all lint/suspicious/noExplicitAny: <for tb> */
import { Spinner } from "@/components/spinner/Spinner";
import type {
	ActivityListItem,
	GroupedFields,
} from "@/pages/ReportsPage/types/types";
import type { AnyObject } from "@/shared/types/types";
import { getFixedNumber } from "@/shared/utils/getNumber";
import cls from "../Table.module.scss";
import { TableCell } from "../universalTable/TableCellDecoration";

export type HeaderGroup = {
	key: string;
	title: string;
	background: string;
};

export type Header<T> = {
	title: string;
	key: keyof T | string;
	render?: (
		value: any,
		additionalData?: Record<string, any>,
	) => React.ReactNode;
	convertFn?: (
		value: any,
		additionalData?: Record<string, any>,
	) => React.ReactNode;
	group?: HeaderGroup;
	isSummary?: boolean;
	summaryKeys?: string[];
};

export type UniversalTableProps<T extends { id: string }> = {
	headers: Header<T>[];
	activeItems: T[];
	additionalData?: AnyObject;
	totalRow?: React.ReactNode;
	onRowClick?: (item: T) => void;
	fallbackText?: string;
};

const ACTIVITY_GROUPS: Record<string, { title: string; background: string }> = {
	"0": {
		title: "Clients paid",
		background: "#063d43",
	},
	"1": {
		title: "Company paid",
		background: "#102036",
	},
	"2": {
		title: "Unpaid",
		background: "rgba(247, 163, 19, 0.14)",
	},
};

const isVisibleActivity = (activity: ActivityListItem) => {
	const propertyValue = activity.PROPERTY_89
		? Object.values(activity.PROPERTY_89)[0]
		: undefined;

	return propertyValue !== "1";
};

const getActivityGroupMeta = (sort: string) => {
	return (
		ACTIVITY_GROUPS[sort] ?? {
			title: "Other",
			background: "var(--color-surface-hover)",
		}
	);
};

export const getHeadersForDevs = (
	activities: ActivityListItem[],
): Header<GroupedFields>[] => {
	const visibleActivities = activities.filter(isVisibleActivity);

	const groupedActivities = visibleActivities.reduce<
		Record<string, ActivityListItem[]>
	>((acc, activity) => {
		const sortKey = activity.SORT ?? "unknown";

		if (!acc[sortKey]) {
			acc[sortKey] = [];
		}

		acc[sortKey].push(activity);
		return acc;
	}, {});

	const sortedGroupKeys = Object.keys(groupedActivities).sort(
		(a, b) => Number(a) - Number(b),
	);

	const activityHeaders: Header<GroupedFields>[] = sortedGroupKeys.flatMap(
		(sortKey) => {
			const groupMeta = getActivityGroupMeta(sortKey);
			const groupActivities = groupedActivities[sortKey];

			const headers: Header<GroupedFields>[] = groupActivities.map(
				(activity) => {
					const header: Header<GroupedFields> = {
						title: activity.NAME,
						key: String(activity.ID),
						group: {
							key: sortKey,
							title: groupMeta.title,
							background: groupMeta.background,
						},
						convertFn: (value) => getFixedNumber(value),
					};

					if (activity.NAME === "Разработка") {
						header.render = (value, additionalData) => (
							<TableCell
								value={value}
								styles={{
									color:
										Number(value) < (additionalData?.day ?? 0) * 6 ? "red" : "",
								}}
							/>
						);
					}

					return header;
				},
			);

			headers.push({
				title: "Summary",
				key: `summary_${sortKey}`,
				isSummary: true,
				summaryKeys: groupActivities.map((activity) => String(activity.ID)),
				group: {
					key: sortKey,
					title: groupMeta.title,
					background: groupMeta.background,
				},
				render: (value, additionalData) => {
					if (additionalData?.summary) {
						return <TableCell value={getFixedNumber(value)} />;
					}

					const row = additionalData?.row as GroupedFields | undefined;

					if (!row) return <TableCell value="0" />;

					const total = groupActivities.reduce((sum, activity) => {
						const currentValue = Number(row[String(activity.ID)] ?? 0);
						return sum + currentValue;
					}, 0);

					return <TableCell value={getFixedNumber(total)} />;
				},
			});

			return headers;
		},
	);

	return [
		{
			title: "Cотрудник",
			key: "title",
		},
		{
			title: "План часов",
			key: "availableTime",
		},
		{
			title: "Загрузка",
			key: "effectivity",
		},
		...activityHeaders,
		{
			title: "Факт часов",
			key: "timeSpent",
			render: (value, additionalData) => (
				<TableCell
					value={value}
					styles={{
						color: Number(value) < (additionalData?.day ?? 0) * 8 ? "red" : "",
					}}
				/>
			),
		},
		{
			title: "Комментарий",
			key: "comment",
		},
	];
};

type HeaderGroupRow = {
	key: string;
	title: string;
	colSpan: number;
	background: string;
};

const isNumericLike = (value: unknown) => {
	if (value === null || value === undefined || value === "") return false;
	return !Number.isNaN(Number(value));
};

export const WorkLoadTable = <T extends { id: string; parentId?: number }>({
	headers,
	activeItems,
	additionalData,
	totalRow,
	fallbackText = "Загрузка...",
	onRowClick,
}: UniversalTableProps<T>) => {
	const groupedHeaders = headers.filter((header) => header.group);

	const buildTopRow = () => {
		const result: Array<
			| {
					type: "plain";
					header: (typeof headers)[number];
			  }
			| {
					type: "group";
					group: HeaderGroupRow;
			  }
		> = [];

		let index = 0;

		while (index < headers.length) {
			const header = headers[index];

			if (!header.group) {
				result.push({
					type: "plain",
					header,
				});
				index += 1;
				continue;
			}

			const currentGroupKey = header.group.key;
			let colSpan = 0;

			while (
				index < headers.length &&
				headers[index].group?.key === currentGroupKey
			) {
				colSpan += 1;
				index += 1;
			}

			result.push({
				type: "group",
				group: {
					key: header.group.key,
					title: header.group.title,
					colSpan,
					background: header.group.background,
				},
			});
		}

		return result;
	};

	const getSummaryValue = (header: (typeof headers)[number]) => {
		if (header.key === "title") return "Итого";

		if (header.isSummary && header.summaryKeys?.length) {
			return activeItems.reduce((total, item) => {
				const groupSum = header.summaryKeys?.reduce((acc, key) => {
					return acc + Number(item[key as keyof T] ?? 0);
				}, 0);

				return total + Number(groupSum ?? 0);
			}, 0);
		}

		const values = activeItems.map((item) => item[header.key as keyof T]);
		const hasNumericValues = values.some(isNumericLike);

		if (!hasNumericValues) return "";

		return values.reduce((sum, value) => sum + Number(value ?? 0), 0);
	};

	const topRow = buildTopRow();
	const hasGroups = headers.some((header) => header.group);

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
							{hasGroups ? (
								<>
									<tr>
										{topRow.map((item, index) => {
											if (item.type === "plain") {
												return (
													<th
														key={String(item.header.key)}
														rowSpan={2}
														className={
															index === 0 ? cls.stickyColumn : undefined
														}
													>
														{item.header.title}
													</th>
												);
											}

											return (
												<th
													key={item.group.key}
													colSpan={item.group.colSpan}
													style={{
														background: item.group.background,
														textAlign: "center",
													}}
												>
													{item.group.title}
												</th>
											);
										})}
									</tr>

									<tr>
										{groupedHeaders.map((header) => (
											<th
												key={String(header.key)}
												style={{
													background: header.group?.background ?? undefined,
												}}
											>
												{header.title}
											</th>
										))}
									</tr>
								</>
							) : (
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
							)}
						</thead>

						<tbody>
							{activeItems.map((item) => {
								const preparedAdditionalData = {
									...additionalData,
									row: item,
								};

								return (
									<tr key={item.id} onClick={() => onRowClick?.(item)}>
										{headers.map((header, index) => {
											const value = item[header.key as keyof T];

											return (
												<td
													key={String(header.key)}
													className={index === 0 ? cls.stickyColumn : undefined}
													style={{
														background: header.group?.background ?? undefined,
													}}
												>
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

							<tr className={cls.summaryRow}>
								{headers.map((header, index) => {
									const summaryValue = getSummaryValue(header);

									const preparedAdditionalData = {
										...additionalData,
										row: null,
										summary: true,
										activeItems,
									};

									return (
										<td
											key={String(header.key)}
											className={index === 0 ? cls.stickyColumn : undefined}
											style={{
												background: header.group?.background ?? undefined,
												fontWeight: 700,
											}}
										>
											{header.render
												? header.render(summaryValue, preparedAdditionalData)
												: header.convertFn
													? header.convertFn(
															summaryValue,
															preparedAdditionalData,
														)
													: String(summaryValue ?? "")}
										</td>
									);
								})}
							</tr>

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
