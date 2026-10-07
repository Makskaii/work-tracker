import type { ReportProjectFormState } from "../model/reportProjectForm";
import { ReportProjectInput } from "./ReportProjectFileInput";

export const ReportProjectPlanningFields = ({
	form,
	onFormChange,
	variant = "modal",
}: {
	form: ReportProjectFormState;
	onFormChange: (form: ReportProjectFormState) => void;
	variant?: "modal" | "details";
}) => (
	<>
		<ReportProjectInput
			form={form}
			label="Дата начала проекта"
			name="projectStartDate"
			onFormChange={onFormChange}
			type="date"
			variant={variant}
		/>
		<ReportProjectInput
			form={form}
			label="Дата окончания проекта по договору"
			min={form.projectStartDate || undefined}
			name="contractEndDate"
			onFormChange={onFormChange}
			type="date"
			variant={variant}
		/>
		<ReportProjectInput
			form={form}
			label="Куплено часов"
			min={0}
			name="summaryPurchasedHours"
			onFormChange={onFormChange}
			type="number"
			variant={variant}
		/>
	</>
);
