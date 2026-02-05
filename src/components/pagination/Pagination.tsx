export const TablePagination = ({
	setPage,
	page,
	next,
}: {
	page: number;
	setPage: (page: number) => void;
	total?: number;
	next?: number;
}) => {
	return (
		<div
			style={{
				display: "flex",
				color: "black",
				justifyContent: "space-between",
				gap: "10px",
				padding: "1rem",
				alignItems: "center",
			}}
		>
			<div>
				<button
					style={{
						backgroundColor: "white",
						color: "black",
					}}
					onClick={() => setPage(page - 1)}
					disabled={page <= 1}
				>
					Назад
				</button>
				<span> Страница {page} </span>
				<button
					disabled={!next}
					style={{
						backgroundColor: "white",
						color: "black",
					}}
					onClick={() => setPage(page + 1)}
				>
					Вперёд
				</button>
			</div>
		</div>
	);
};
