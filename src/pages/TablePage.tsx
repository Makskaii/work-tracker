import { Suspense } from "react";
import { Button } from "../components/buttons/ButtonComponent";
import { TablePagination } from "../components/pagination/Pagination";
import { Table } from "../components/Table/TableComponent";
import { TableSkeleton } from "../components/Table/TableSkeleton";
import { TasksColumns } from "../components/Table/templates/tableTemplates";
import { usePaginatedData } from "../hooks/usePaginatedData";

export const EmptyPage = () => {
	const { dataPromise, setPage, page } = usePaginatedData();

	return (
		<div
			style={{
				display: "flex",
				flexDirection: "column",
				gap: "1rem",
			}}
		>
			<div
				style={{
					display: "flex",
					justifyContent: "space-between",
					padding: "0.5rem",
				}}
			>
				<div
					style={{
						display: "flex",
						gap: "1rem",
					}}
				>
					<Button text="Задачи" />
					<Button text="Сотрудники" />
					<Button text="Проекты" />
					<Button text="Отчеты" />
				</div>
				<div
					style={{
						display: "flex",
						alignItems: "flex-end",
						height: "100%",
					}}
				>
					<input
						style={{
							border: "none",
							backgroundColor: "white",
							boxShadow: "rgba(99, 99, 99, 0.2) 0px 2px 8px 0px",
							borderRadius: "0.5rem",
							minWidth: "20rem",
							padding: "0.5rem",
							color: "black",
						}}
						type="text"
						placeholder="поиск..."
					/>
				</div>
			</div>
			<div
				style={{
					height: "100%",
					display: "flex",
					alignItems: "center",
					justifyContent: "center",
					flexDirection: "column",
				}}
			>
				<Suspense fallback={<TableSkeleton columns={TasksColumns} />}>
					<Table data={dataPromise} columns={TasksColumns} />
				</Suspense>
			</div>
			<TablePagination page={page} setPage={setPage} />
		</div>
	);
};
