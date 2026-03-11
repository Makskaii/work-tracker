import { useEffect, useState } from "react";
import { FormProvider, useForm } from "react-hook-form";
import { useOutletContext } from "react-router";
import {
	ActivityTitle,
	dtoFieldsCodesDailyReports,
} from "@/components/calendar/constants/const";
import type { ReportProps } from "@/components/calendar/types/types";
import { Endpoints } from "@/shared/constants/const";
import { Calendar } from "../../../../components/calendar/Calendar";
import { AsyncSelect } from "../../../../components/form/SelectField";
import type { ReportsContext } from "../../../../shared/types/types";

type ViewCalendar = "month" | "week";

const ReportsCalendar = () => {
	const Context = useOutletContext<ReportsContext>();
	const [view, setView] = useState<ViewCalendar>("month");

	const [groupedByActivity, setGroupByActivity] =
		useState<Record<string, ReportProps[]>>();

	const methods = useForm<{
		userId: string;
	}>({
		mode: "onChange",
		reValidateMode: "onChange",
		defaultValues: {
			userId: Context?.user || "",
		},
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
							placeholder="Сотрудники"
							endpoint={Endpoints.users}
							params={{
								params: {
									filter: {
										"@UF_DEPARTMENT": [23, 25],
									},
									select: [
										"NAME",
										"ID",
										"LAST_NAME",
										"UF_DEPARTMENT",
										"WORK_POSITION",
										"PERSONAL_PHOTO",
									],
								},
							}}
						/>
					</form>
				</FormProvider>

				{groupedByActivity && (
					<div>
						{Object.entries(groupedByActivity).map(([activityId, reports]) => {
							const groupByProjects = reports.reduce(
								(acc, report) => {
									const project = report[dtoFieldsCodesDailyReports.project];

									if (!acc[project]) {
										acc[project] = [report];
									} else {
										acc[project] = [...acc[project], report];
									}

									return acc;
								},
								{} as Record<string, ReportProps[]>,
							);

							return (
								<div
									style={{
										textAlign: "left",
									}}
								>
									<h4> {ActivityTitle[Number(activityId)]}</h4>

									{Object.entries(groupByProjects).map(([projId, reports]) => {
										const timeSpent = reports.reduce((acc, report) => {
											if (report[dtoFieldsCodesDailyReports.timeSpent]) {
												acc +=
													Number(
														report[dtoFieldsCodesDailyReports.timeSpent],
													) ?? 0;
											}
											return acc;
										}, 0);

										return (
											timeSpent !== 0 && (
												<div>
													{
														Context.projects.find(
															(project) => project.ID === projId,
														)?.NAME
													}{" "}
													{timeSpent}ч.
												</div>
											)
										);
									})}
								</div>
							);
						})}
					</div>
				)}
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
				<Calendar
					view={view}
					userId={Context?.user}
					setGroupByActivity={setGroupByActivity}
				/>
			</div>
		</div>
	);
};

export default ReportsCalendar;
