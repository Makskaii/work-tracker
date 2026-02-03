import { Suspense } from "react";
import { Button } from "../components/buttons/ButtonComponent";
import { Spinner } from "../components/spinner/Spinner";
import { TableComponent } from "../components/Table/TableComponent";
import { fakeApiCall } from "../config/axios/axios.config";

export const EmptyPage = () => {
	const messagePromise = fakeApiCall();

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
				}}
			>
				<Suspense fallback={<Spinner />}>
					<TableComponent
						data={messagePromise}
						type={"tasks"}
						fields={["Название", "Статус", "Дата создания"]}
					/>
				</Suspense>
			</div>
		</div>
	);
};
