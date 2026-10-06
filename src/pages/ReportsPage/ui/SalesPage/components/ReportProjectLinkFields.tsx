import { useId, useState } from "react";
import { EntityTypeIds } from "@/shared/constants/const";
import { useBitrixSlider } from "@/shared/hooks/useBitrixSlider";
import type { CompanyCreationMode, ReportProjectFormState } from "../model/reportProjectForm";
import type { ReportProjectAutocompleteOption } from "./ReportProjectFileInput";
import styles from "../SalesProfitabilityReport.module.scss";

export type ProjectCreationMode = "new" | "existing";

export type BitrixProjectOption = ReportProjectAutocompleteOption & {
	companyId?: string;
	companyTitle?: string;
	projectGoal?: string;
};

const EntitySearch = ({
	label,
	options,
	selectedId,
	selectedTitle,
	disabled = false,
	onQueryChange,
	onSelect,
}: {
	label: string;
	options: ReportProjectAutocompleteOption[];
	selectedId: string;
	selectedTitle?: string;
	disabled?: boolean;
	onQueryChange: () => void;
	onSelect: (option: ReportProjectAutocompleteOption) => void;
}) => {
	const id = useId();
	const [query, setQuery] = useState<string | null>(null);
	const [open, setOpen] = useState(false);
	const [activeIndex, setActiveIndex] = useState(0);
	const selected = options.find((option) => option.id === selectedId);
	const title = selected?.title ?? selectedTitle ?? "";
	const normalizedQuery = (query ?? "").trim().toLocaleLowerCase("ru");
	const matches = options.filter((option) =>
		`${option.title} ${option.id}`.toLocaleLowerCase("ru").includes(normalizedQuery),
	).slice(0, 12);
	const choose = (option: ReportProjectAutocompleteOption) => {
		onSelect(option);
		setQuery(null);
		setOpen(false);
	};

	return (
		<div
			className={`${styles.reportProjectField} ${styles.reportProjectAutocomplete}`}
			onBlur={(event) => {
				if (!event.currentTarget.contains(event.relatedTarget as Node | null)) {
					setOpen(false);
				}
			}}
		>
			<label htmlFor={id}>{label}</label>
			<input
				id={id}
				role="combobox"
				aria-autocomplete="list"
				aria-expanded={open && !disabled}
				aria-controls={`${id}-options`}
				aria-activedescendant={open && matches[activeIndex] ? `${id}-${matches[activeIndex].id}` : undefined}
				autoComplete="off"
				disabled={disabled}
				placeholder="Поиск по названию или ID"
				value={query ?? title}
				onFocus={() => {
					setOpen(true);
					setActiveIndex(0);
				}}
				onChange={(event) => {
					setQuery(event.target.value);
					setOpen(true);
					setActiveIndex(0);
					onQueryChange();
				}}
				onKeyDown={(event) => {
					if (event.key === "Escape" && open) {
						event.stopPropagation();
						setOpen(false);
					}
					if (event.key === "ArrowDown" || event.key === "ArrowUp") {
						event.preventDefault();
						setOpen(true);
						setActiveIndex((index) => Math.max(0, Math.min(matches.length - 1, index + (event.key === "ArrowDown" ? 1 : -1))));
					}
					if (event.key === "Enter" && open && matches[activeIndex]) {
						event.preventDefault();
						choose(matches[activeIndex]);
					}
				}}
			/>
			{open && !disabled ? (
				<div id={`${id}-options`} role="listbox" className={styles.reportProjectAutocompleteOptions}>
					{matches.length ? matches.map((option, index) => (
						<button
							id={`${id}-${option.id}`}
							key={option.id}
							type="button"
							role="option"
							aria-selected={index === activeIndex}
							onMouseDown={(event) => event.preventDefault()}
							onClick={() => choose(option)}
						>
							{option.title}
						</button>
					)) : <span className={styles.projectLinkHint}>Ничего не найдено</span>}
				</div>
			) : null}
		</div>
	);
};

export const ReportProjectLinkFields = ({
	bitrixProjectOptions,
	companyOptions,
	form,
	onFormChange,
	isCreating = false,
	creationMode = "new",
	onCreationModeChange,
	companyCreationMode = "existing",
	onCompanyCreationModeChange,
	newCompanyTitle = "",
	onNewCompanyTitleChange,
	loading = false,
	error,
	onRetry,
}: {
	bitrixProjectOptions: BitrixProjectOption[];
	companyOptions: ReportProjectAutocompleteOption[];
	form: ReportProjectFormState;
	onFormChange: (form: ReportProjectFormState) => void;
	isCreating?: boolean;
	creationMode?: ProjectCreationMode;
	onCreationModeChange?: (mode: ProjectCreationMode) => void;
	companyCreationMode?: CompanyCreationMode;
	onCompanyCreationModeChange?: (mode: CompanyCreationMode) => void;
	newCompanyTitle?: string;
	onNewCompanyTitleChange?: (title: string) => void;
	loading?: boolean;
	error?: string | null;
	onRetry?: () => void;
}) => {
	const { openTask } = useBitrixSlider();
	const selectedProject = bitrixProjectOptions.find((option) => option.id === form.bitrixProjectId);
	const linked = Boolean(form.bitrixProjectId);
	const companyId = selectedProject ? (selectedProject.companyId ?? "") : form.clientCompanyId;
	const companyTitle = selectedProject
		? selectedProject.companyTitle || companyOptions.find((option) => option.id === companyId)?.title || (companyId ? `Компания #${companyId}` : "Компания в карточке не указана")
		: companyOptions.find((option) => option.id === companyId)?.title || form.clientCompany;
	const showProjectSearch = !isCreating || creationMode === "existing";
	const canCreateCompany = isCreating && creationMode === "new" && !linked;

	return (
		<div className={styles.projectLinkFields}>
			{isCreating ? (
				<label className={styles.reportProjectField}>
					<span>Проект в Битрикс24</span>
					<select
						value={creationMode}
						onChange={(event) => {
							const mode = event.target.value as ProjectCreationMode;
							onCreationModeChange?.(mode);
							onCompanyCreationModeChange?.("existing");
							onNewCompanyTitleChange?.("");
							onFormChange({ ...form, bitrixProjectId: "", clientCompanyId: "", clientCompany: "" });
						}}
					>
						<option value="new">Создать автоматически</option>
						<option value="existing">Выбрать существующий</option>
					</select>
				</label>
			) : null}
			{showProjectSearch ? (
				<EntitySearch
					label="Проект в Битрикс24"
					options={bitrixProjectOptions}
					selectedId={form.bitrixProjectId}
					selectedTitle={form.bitrixProjectId ? `Проект #${form.bitrixProjectId}` : ""}
					disabled={loading}
					onQueryChange={() => onFormChange({ ...form, bitrixProjectId: "", clientCompanyId: "", clientCompany: "" })}
					onSelect={(option) => {
						const project = bitrixProjectOptions.find((item) => item.id === option.id);
						onFormChange({
							...form,
							bitrixProjectId: option.id,
							clientCompanyId: project?.companyId ?? "",
							clientCompany: project?.companyTitle ?? "",
							projectGoal: form.projectGoal.trim() ? form.projectGoal : (project?.projectGoal ?? ""),
							title: form.title.trim() ? form.title : (option.value ?? option.title),
						});
					}}
				/>
			) : <p className={styles.projectLinkHint}>При сохранении появится карточка в «WT Канбан проектов» и связь с Work Tracker.</p>}
			{canCreateCompany ? (
				<label className={styles.reportProjectField}>
					<span>Компания в Битрикс24</span>
					<select
						value={companyCreationMode}
						onChange={(event) => {
							onCompanyCreationModeChange?.(event.target.value as CompanyCreationMode);
							onNewCompanyTitleChange?.("");
							onFormChange({ ...form, clientCompanyId: "", clientCompany: "" });
						}}
					>
						<option value="existing">Выбрать существующую</option>
						<option value="new">Создать новую</option>
					</select>
				</label>
			) : null}
			{canCreateCompany && companyCreationMode === "new" ? (
				<>
					<label className={styles.reportProjectField}>
						<span>Название новой компании</span>
						<input
							required
							maxLength={255}
							value={newCompanyTitle}
							onChange={(event) => onNewCompanyTitleChange?.(event.target.value)}
						/>
					</label>
					<p className={styles.projectLinkHint}>Компания создастся в Битрикс24 при сохранении проекта и будет привязана к его карточке.</p>
				</>
			) : <EntitySearch
				key={linked ? `linked-${form.bitrixProjectId}` : "company"}
				label="Компания клиента"
				options={companyOptions}
				selectedId={companyId}
				selectedTitle={companyTitle}
				disabled={linked || loading}
				onQueryChange={() => onFormChange({ ...form, clientCompanyId: "", clientCompany: "" })}
				onSelect={(option) => onFormChange({ ...form, clientCompanyId: option.id, clientCompany: option.title })}
			/>}
			{linked ? (
				<div className={styles.projectLinkActions}>
					<span className={styles.projectLinkHint}>Компания берётся из карточки проекта в Битрикс24.</span>
					<button type="button" onClick={() => void openTask(form.bitrixProjectId, EntityTypeIds.projects)}>Открыть карточку в Битрикс24</button>
				</div>
			) : !isCreating ? <p className={styles.projectLinkHint}>У этого проекта пока нет связи с Битрикс24. Можно выбрать существующую карточку.</p> : null}
			{loading ? <p className={styles.projectLinkHint}>Загрузка проектов и компаний…</p> : null}
			{error ? <div role="alert" className={styles.projectLinkActions}><span>{error}</span><button type="button" onClick={onRetry}>Повторить загрузку</button></div> : null}
		</div>
	);
};
