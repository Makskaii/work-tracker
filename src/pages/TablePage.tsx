import { useState } from "react";
import { Button } from "../components/buttons/ButtonComponent";
import { Table } from "../components/Table/TableComponent";
import { MainTemplate } from "../components/Table/templates";
import { Endpoints } from "../shared/constants/const";
import { useLoadData } from "../shared/hooks/useLoadData";

export const DataPage = () => {
	const [template, setTemplate] = useState<keyof typeof MainTemplate>("tasks");

	const { data, loading, page, total, next, setEndpoint, setPage } =
		useLoadData("tasks.task.list");

	return (
		<div
			style={{
				display: "flex",
				flexDirection: "column",
				gap: "1rem",
				padding: "1rem",
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
					<Button
						onClick={() => {
							setEndpoint(Endpoints.tasks);
							setTemplate("tasks");
							if (page !== 1) {
								setPage(1);
							}
						}}
						text="Задачи"
					/>

					{/* <Button
						onClick={() => {
							setEndpoint(Endpoints.users);
							setTemplate("users");
							if (page !== 1) {
								setPage(1);
							}
						}}
						text="Сотрудники"
					/>
					<Button
						onClick={() => {
							setEndpoint(Endpoints.groups);
							setTemplate("groups");
							if (page !== 1) {
								setPage(1);
							}
						}}
						text="Проекты"
					/> */}
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
				<Table
					isLoading={loading}
					data={data}
					template={MainTemplate[template]}
					setPage={setPage}
					page={page}
					total={total}
					next={next}
				/>
			</div>
		</div>
	);
};
