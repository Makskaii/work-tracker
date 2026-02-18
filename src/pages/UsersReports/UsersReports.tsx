import { useEffect, useState } from "react";
import { FormProvider, useForm } from "react-hook-form";
import { useOutletContext } from "react-router";
import { Calendar } from "../../components/calendar/Calendar";
import { AsyncSelect } from "../../components/form/SelectField";
import type { ContextType } from "../ReportsPage";

type ViewCalendar = "month" | "week";

const UsersReports = () => {
	const Context = useOutletContext<ContextType>();
	const [view, setView] = useState<ViewCalendar>("month");

	const methods = useForm<{
		userId: string;
	}>({
		mode: "onChange",
		reValidateMode: "onChange",
	});

	const { handleSubmit } = methods;

	const handleChange = handleSubmit((data) => {
		Context?.setUser(data.userId);
	});

	useEffect(() => {
		return () => {
			Context?.setUser("");
		};
	}, [Context?.setUser]);

	return (
		<div
			style={{
				display: "flex",
				height: "100%",
				padding: "1rem",
			}}
		>
			<div
				style={{
					flex: 1,
				}}
			>
				<FormProvider {...methods}>
					<form onChange={handleChange}>
						<AsyncSelect
							name="userId"
							options={Context?.users ?? []}
							placeholder="Сотрудники"
						/>
					</form>
				</FormProvider>
			</div>
			<div
				style={{
					flex: 4,
					overflow: "hidden",
					borderLeft: "1px solid #ccc",
				}}
			>
				<div
					style={{
						display: "flex",
						gap: "1rem",
						borderBottom: "1px solid #ccc",
						padding: "0.5rem 2rem",
						justifyContent: "space-between",
					}}
				>
					<div
						style={{
							display: "flex",
							gap: "1rem",
						}}
					>
						<button onClick={() => setView("month")}>Месяц</button>
						<button onClick={() => setView("week")}>Неделя</button>
					</div>
				</div>

				<Calendar view={view} />
			</div>
		</div>
	);
};

export default UsersReports;
