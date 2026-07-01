import Modal from "@/components/modal/Modal";
import {
	calculatePaymentFields,
	type PaymentFormState,
} from "../model/autonomousPaymentForm";
import type {
	AutonomousPaymentStatus,
	ProjectGanttStage,
} from "../model/types";
import styles from "../SalesProfitabilityReport.module.scss";

export const PaymentModal = ({
	deletingPaymentId,
	form,
	isOpen,
	onClose,
	onDelete,
	onFormChange,
	onSubmit,
	projectAmount,
	stages,
}: {
	deletingPaymentId: number | null;
	form: PaymentFormState;
	isOpen: boolean;
	onClose: () => void;
	onDelete: () => void;
	onFormChange: (value: PaymentFormState) => void;
	onSubmit: (value: PaymentFormState) => void;
	projectAmount?: number | null;
	stages: ProjectGanttStage[];
}) => (
	<Modal isOpen={isOpen} onClose={onClose} size="small">
		<form
			className={styles.ganttFormModal}
			onSubmit={(event) => {
				event.preventDefault();
				onSubmit(form);
			}}
		>
			<h3>{form.id ? "Редактирование оплаты" : "Новая оплата"}</h3>
			<label>
				<span>Стадия</span>
				<select
					value={form.status === "paid" ? "paid" : "todo"}
					onChange={(event) =>
						onFormChange({
							...form,
							status: event.target.value as AutonomousPaymentStatus,
						})
					}
				>
					<option value="paid">Оплачено</option>
					<option value="todo">Неоплачено</option>
				</select>
			</label>
			<label>
				<span>Этап, к которому привязана оплата</span>
				<select
					value={form.stageId ?? ""}
					onChange={(event) => {
						const stageId = Number(event.target.value);

						onFormChange({
							...form,
							stageId,
						});
					}}
				>
					{stages
						.filter((stage) => stage.code !== "payments")
						.map((stage) => (
							<option key={stage.id} value={stage.id}>
								{stage.title}
							</option>
						))}
				</select>
			</label>
			<label>
				<span>Дата оплаты от этапа</span>
				<select
					value={form.paymentAnchor}
					onChange={(event) =>
						onFormChange({
							...form,
							paymentAnchor: event.target.value as PaymentFormState["paymentAnchor"],
						})
					}
				>
					<option value="stage_start">К началу этапа</option>
					<option value="stage_end">К концу этапа</option>
				</select>
			</label>
			<div className={styles.ganttFormGrid}>
				<label>
					<span>Сумма от проекта</span>
					<input
						value={form.amount}
						onChange={(event) =>
							onFormChange({
								...form,
								...calculatePaymentFields({
									amount: event.target.value,
									percent: form.percent,
									projectAmount,
									source: "amount",
								}),
							})
						}
					/>
				</label>
				<label>
					<span>Дней ожидания</span>
					<input
						value={form.waitingDays}
						onChange={(event) =>
							onFormChange({
								...form,
								waitingDays: event.target.value,
							})
						}
					/>
				</label>
			</div>
			<div className={styles.ganttFormActions}>
				{form.id ? (
					<button
						type="button"
						className={styles.ganttFormDeleteButton}
						onClick={onDelete}
					>
						{deletingPaymentId === form.id
							? "Подтвердить удаление"
							: "Удалить"}
					</button>
				) : null}
				<button type="submit">Сохранить</button>
			</div>
		</form>
	</Modal>
);
