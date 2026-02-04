export const TablePagination = ({
	next,
	total,
}: {
	next: number;
	total: number;
}) => {
	const totalPages = Math.floor(total / next + 1);

	return (
		<div style={{ display: "flex", color: "black" }}>
			{Array.from({ length: totalPages }).map((_item, index) => (
				<div>{index}</div>
			))}
		</div>
	);
};
