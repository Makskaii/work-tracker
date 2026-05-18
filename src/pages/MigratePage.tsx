import { EnumCrmEntityTypeId } from "@bitrix24/b24jssdk";
import { useCallback, useEffect, useMemo, useState } from "react";
import { ReportCodes, TaskCodes } from "@/components/calendar/constants/const";
import type { ReportProps } from "@/components/calendar/types/types";
import {
	getClientsFromList,
	getProjectsFromList,
} from "@/shared/api/getCrmFields";
import { $api } from "@/shared/config";
import {
	Endpoints,
	EntityTypeIds,
	TASK_SELECT_FIELDS,
} from "@/shared/constants/const";
import { useLoadAllData } from "@/shared/hooks/useLoadAllTasks";
import type {
	ClientListItems,
	ProjectListDto,
	TaskProps,
} from "@/shared/types/types";
import type { CompanyOption } from "./CreateClientForm/ui/CreateClientForm";

type BitrixCompanyItem = {
	id: number | string;
	title?: string;
};

type BitrixCompanyListResponse = {
	result: { items?: BitrixCompanyItem[] };
};

type MigrationState = {
	isRunning: boolean;
	processed: number;
	success: number;
	failed: number;
	error: string | null;
};

const emptyMigrationState: MigrationState = {
	isRunning: false,
	processed: 0,
	success: 0,
	failed: 0,
	error: null,
};

const CRM_ITEM_UPDATE_ENDPOINT = "crm.item.update";

const REPORT_SELECT_FIELDS = [
	"id",
	"title",
	"begindate",
	"assignedById",
	"createdTime",
	"lastActivityTime",
	ReportCodes.title,
	ReportCodes.timeSpent,
	ReportCodes.taskId,
	ReportCodes.project,
	ReportCodes.client,
	ReportCodes.activityType,
	ReportCodes.parentId,
	ReportCodes.show,
	ReportCodes.company,
	ReportCodes.parentproject,
	ReportCodes.taskType,
] as const;

const getSinglePropertyValue = (
	property?: Record<string, string> | null,
): string => {
	if (!property) return "";

	const value = Object.values(property)[0];

	return value ? String(value) : "";
};

const getBitrixErrorMessage = (error: unknown) => {
	if (error instanceof Error) {
		return error.message;
	}

	return "Неизвестная ошибка";
};

export const MigratePage = () => {
	const [projectSearch, setProjectSearch] = useState("");
	const [selectedProjectId, setSelectedProjectId] = useState("");
	const [legacyProjectSearch, setLegacyProjectSearch] = useState("");
	const [selectedLegacyProjectId, setSelectedLegacyProjectId] = useState("");
	const [companySearch, setCompanySearch] = useState("");
	const [selectedCompanyId, setSelectedCompanyId] = useState("");
	const [companies, setCompanies] = useState<CompanyOption[]>([]);
	const [isCompanySearchLoading, setIsCompanySearchLoading] = useState(false);
	const [projects, setProjects] = useState<ClientListItems[]>([]);
	const [legacyProjects, setLegacyProjects] = useState<ProjectListDto[]>([]);
	const [isProjectsLoading, setIsProjectsLoading] = useState(false);
	const [isLegacyProjectsLoading, setIsLegacyProjectsLoading] = useState(false);
	const [migration, setMigration] =
		useState<MigrationState>(emptyMigrationState);
	const [projectMigration, setProjectMigration] =
		useState<MigrationState>(emptyMigrationState);
	const [reportCompanyMigration, setReportCompanyMigration] =
		useState<MigrationState>(emptyMigrationState);
	const [reportProjectMigration, setReportProjectMigration] =
		useState<MigrationState>(emptyMigrationState);

	const searchCompanies = useCallback(
		async (query: string): Promise<CompanyOption[]> => {
			const search = query.trim();

			const response = await $api.get<BitrixCompanyListResponse>(
				Endpoints.crmItems,
				{
					params: {
						entityTypeId: EnumCrmEntityTypeId.company,
						select: ["id", "title"],
						filter: {
							"=%title": `%${search}%`,
						},
						order: {
							title: "ASC",
						},
					},
				},
			);

			const items = response.data?.result?.items;

			if (!Array.isArray(items)) {
				return [];
			}

			return items
				.filter((company) => company.title)
				.slice(0, 20)
				.map((company) => ({
					id: String(company.id),
					name: String(company.title),
				}));
		},
		[],
	);

	const {
		data: tasks,
		loading: isTasksLoading,
		error: tasksError,
		total: tasksTotal,
		setFilters,
	} = useLoadAllData<TaskProps>({
		initialEndpoint: Endpoints.crmItems,
		initialFilters: {
			params: {
				entityTypeId: EntityTypeIds.tasks,
				select: TASK_SELECT_FIELDS,
				filter: {
					[TaskCodes.client]: "__migration_empty__",
				},
			},
		},
	});

	const {
		data: projectTasks,
		loading: isProjectTasksLoading,
		error: projectTasksError,
		total: projectTasksTotal,
		setFilters: setProjectTasksFilters,
	} = useLoadAllData<TaskProps>({
		initialEndpoint: Endpoints.crmItems,
		initialFilters: {
			params: {
				entityTypeId: EntityTypeIds.tasks,
				select: TASK_SELECT_FIELDS,
				filter: {
					[TaskCodes.project]: "__migration_empty__",
				},
			},
		},
	});

	const {
		data: clientReports,
		loading: isClientReportsLoading,
		error: clientReportsError,
		total: clientReportsTotal,
		setFilters: setClientReportsFilters,
	} = useLoadAllData<ReportProps>({
		initialEndpoint: Endpoints.crmItems,
		initialFilters: {
			params: {
				entityTypeId: EntityTypeIds.reports,
				select: REPORT_SELECT_FIELDS,
				filter: {
					[ReportCodes.client]: "__migration_empty__",
				},
			},
		},
	});

	const {
		data: projectReports,
		loading: isProjectReportsLoading,
		error: projectReportsError,
		total: projectReportsTotal,
		setFilters: setProjectReportsFilters,
	} = useLoadAllData<ReportProps>({
		initialEndpoint: Endpoints.crmItems,
		initialFilters: {
			params: {
				entityTypeId: EntityTypeIds.reports,
				select: REPORT_SELECT_FIELDS,
				filter: {
					[ReportCodes.project]: "__migration_empty__",
				},
			},
		},
	});

	const filteredProjects = useMemo(() => {
		const search = projectSearch.trim().toLowerCase();

		if (!search) {
			return projects;
		}

		return projects.filter((project) =>
			String(project.NAME ?? "")
				.toLowerCase()
				.includes(search),
		);
	}, [projectSearch, projects]);

	const filteredLegacyProjects = useMemo(() => {
		const search = legacyProjectSearch.trim().toLowerCase();

		const projectsWithParent = legacyProjects.filter((project) =>
			Boolean(getSinglePropertyValue(project.PROPERTY_87)),
		);

		if (!search) {
			return projectsWithParent;
		}

		return projectsWithParent.filter((project) =>
			String(project.NAME ?? "")
				.toLowerCase()
				.includes(search),
		);
	}, [legacyProjectSearch, legacyProjects]);

	const selectedProject = useMemo(
		() => projects.find((project) => String(project.ID) === selectedProjectId),
		[projects, selectedProjectId],
	);

	const selectedLegacyProject = useMemo(
		() =>
			legacyProjects.find(
				(project) => String(project.ID) === selectedLegacyProjectId,
			),
		[legacyProjects, selectedLegacyProjectId],
	);

	const selectedLegacyProjectParentId = useMemo(
		() => getSinglePropertyValue(selectedLegacyProject?.PROPERTY_87),
		[selectedLegacyProject],
	);

	const selectedCompany = useMemo(
		() => companies.find((company) => String(company.id) === selectedCompanyId),
		[companies, selectedCompanyId],
	);

	useEffect(() => {
		const fetchProjects = async () => {
			setIsProjectsLoading(true);

			try {
				const response = await getClientsFromList();
				setProjects(response);
			} catch (error) {
				console.error("Failed to fetch projects from list", error);
				setProjects([]);
			} finally {
				setIsProjectsLoading(false);
			}
		};

		fetchProjects();
	}, []);

	useEffect(() => {
		const fetchLegacyProjects = async () => {
			setIsLegacyProjectsLoading(true);

			try {
				const response = await getProjectsFromList();
				setLegacyProjects(response);
			} catch (error) {
				console.error("Failed to fetch legacy projects from list", error);
				setLegacyProjects([]);
			} finally {
				setIsLegacyProjectsLoading(false);
			}
		};

		fetchLegacyProjects();
	}, []);

	useEffect(() => {
		if (!selectedProjectId) {
			return;
		}

		setMigration(emptyMigrationState);
		setReportCompanyMigration(emptyMigrationState);
		setFilters({
			params: {
				entityTypeId: EntityTypeIds.tasks,
				select: TASK_SELECT_FIELDS,
				filter: {
					[TaskCodes.client]: selectedProjectId,
				},
			},
		});
		setClientReportsFilters({
			params: {
				entityTypeId: EntityTypeIds.reports,
				select: REPORT_SELECT_FIELDS,
				filter: {
					[ReportCodes.client]: selectedProjectId,
				},
			},
		});
	}, [selectedProjectId, setClientReportsFilters, setFilters]);

	useEffect(() => {
		if (!selectedLegacyProjectId) {
			return;
		}

		setProjectMigration(emptyMigrationState);
		setReportProjectMigration(emptyMigrationState);
		setProjectTasksFilters({
			params: {
				entityTypeId: EntityTypeIds.tasks,
				select: TASK_SELECT_FIELDS,
				filter: {
					[TaskCodes.project]: selectedLegacyProjectId,
				},
			},
		});
		setProjectReportsFilters({
			params: {
				entityTypeId: EntityTypeIds.reports,
				select: REPORT_SELECT_FIELDS,
				filter: {
					[ReportCodes.project]: selectedLegacyProjectId,
				},
			},
		});
	}, [
		selectedLegacyProjectId,
		setProjectReportsFilters,
		setProjectTasksFilters,
	]);

	useEffect(() => {
		const search = companySearch.trim();

		setSelectedCompanyId("");

		if (search.length < 2) {
			setCompanies([]);
			setIsCompanySearchLoading(false);
			return;
		}

		let isActual = true;
		setIsCompanySearchLoading(true);

		const timeoutId = window.setTimeout(() => {
			searchCompanies(search)
				.then((items) => {
					if (isActual) {
						setCompanies(items);
					}
				})
				.catch((error) => {
					console.error("Failed to search Bitrix companies", error);

					if (isActual) {
						setCompanies([]);
					}
				})
				.finally(() => {
					if (isActual) {
						setIsCompanySearchLoading(false);
					}
				});
		}, 350);

		return () => {
			isActual = false;
			window.clearTimeout(timeoutId);
		};
	}, [companySearch, searchCompanies]);

	const updateTaskFields = async (
		taskId: string,
		fields: Record<string, string>,
	) => {
		const response = await $api.post(CRM_ITEM_UPDATE_ENDPOINT, {
			entityTypeId: EntityTypeIds.tasks,
			id: taskId,
			fields,
		});

		if (response.data?.error) {
			throw new Error(
				response.data.error_description ??
					response.data.error ??
					"Bitrix вернул ошибку",
			);
		}
	};

	const updateReportFields = async (
		reportId: string,
		fields: Record<string, string>,
	) => {
		const response = await $api.post(CRM_ITEM_UPDATE_ENDPOINT, {
			entityTypeId: EntityTypeIds.reports,
			id: reportId,
			fields,
		});

		if (response.data?.error) {
			throw new Error(
				response.data.error_description ??
					response.data.error ??
					"Bitrix вернул ошибку",
			);
		}
	};

	const updateTaskCompany = async (taskId: string, companyId: string) => {
		await updateTaskFields(taskId, {
			[TaskCodes.company]: companyId,
		});
	};

	const updateTaskParentProject = async (
		taskId: string,
		parentProjectId: string,
	) => {
		await updateTaskFields(taskId, {
			[TaskCodes.parentproject]: parentProjectId,
		});
	};

	const updateReportCompany = async (reportId: string, companyId: string) => {
		await updateReportFields(reportId, {
			[ReportCodes.company]: companyId,
		});
	};

	const updateReportParentProject = async (
		reportId: string,
		parentProjectId: string,
	) => {
		await updateReportFields(reportId, {
			[ReportCodes.parentproject]: parentProjectId,
		});
	};

	const runMigration = async () => {
		if (!selectedProjectId || !selectedCompanyId || tasks.length === 0) {
			return;
		}

		setMigration({
			...emptyMigrationState,
			isRunning: true,
		});

		let success = 0;
		let failed = 0;

		for (const task of tasks) {
			try {
				await updateTaskCompany(String(task.id), selectedCompanyId);
				success += 1;
			} catch (error) {
				failed += 1;
				console.error(`Failed to migrate task ${task.id}`, error);
			}

			setMigration({
				isRunning: true,
				processed: success + failed,
				success,
				failed,
				error: null,
			});
		}

		setMigration({
			isRunning: false,
			processed: success + failed,
			success,
			failed,
			error: failed > 0 ? "Часть задач не удалось обновить" : null,
		});
	};

	const runReportCompanyMigration = async () => {
		if (
			!selectedProjectId ||
			!selectedCompanyId ||
			clientReports.length === 0
		) {
			return;
		}

		setReportCompanyMigration({
			...emptyMigrationState,
			isRunning: true,
		});

		let success = 0;
		let failed = 0;

		for (const report of clientReports) {
			try {
				await updateReportCompany(String(report.id), selectedCompanyId);
				success += 1;
			} catch (error) {
				failed += 1;
				console.error(`Failed to migrate report company ${report.id}`, error);
			}

			setReportCompanyMigration({
				isRunning: true,
				processed: success + failed,
				success,
				failed,
				error: null,
			});
		}

		setReportCompanyMigration({
			isRunning: false,
			processed: success + failed,
			success,
			failed,
			error: failed > 0 ? "Часть отчетов не удалось обновить" : null,
		});
	};

	const runProjectMigration = async () => {
		if (
			!selectedLegacyProjectId ||
			!selectedLegacyProjectParentId ||
			projectTasks.length === 0
		) {
			return;
		}

		setProjectMigration({
			...emptyMigrationState,
			isRunning: true,
		});

		let success = 0;
		let failed = 0;

		for (const task of projectTasks) {
			try {
				await updateTaskParentProject(
					String(task.id),
					selectedLegacyProjectParentId,
				);
				success += 1;
			} catch (error) {
				failed += 1;
				console.error(
					`Failed to migrate task parent project ${task.id}`,
					error,
				);
			}

			setProjectMigration({
				isRunning: true,
				processed: success + failed,
				success,
				failed,
				error: null,
			});
		}

		setProjectMigration({
			isRunning: false,
			processed: success + failed,
			success,
			failed,
			error: failed > 0 ? "Часть задач не удалось обновить" : null,
		});
	};

	const runReportProjectMigration = async () => {
		if (
			!selectedLegacyProjectId ||
			!selectedLegacyProjectParentId ||
			projectReports.length === 0
		) {
			return;
		}

		setReportProjectMigration({
			...emptyMigrationState,
			isRunning: true,
		});

		let success = 0;
		let failed = 0;

		for (const report of projectReports) {
			try {
				await updateReportParentProject(
					String(report.id),
					selectedLegacyProjectParentId,
				);
				success += 1;
			} catch (error) {
				failed += 1;
				console.error(
					`Failed to migrate report parent project ${report.id}`,
					error,
				);
			}

			setReportProjectMigration({
				isRunning: true,
				processed: success + failed,
				success,
				failed,
				error: null,
			});
		}

		setReportProjectMigration({
			isRunning: false,
			processed: success + failed,
			success,
			failed,
			error: failed > 0 ? "Часть отчетов не удалось обновить" : null,
		});
	};

	const canRunMigration =
		Boolean(selectedProjectId) &&
		Boolean(selectedCompanyId) &&
		tasks.length > 0 &&
		!isTasksLoading &&
		!migration.isRunning;

	const canRunReportCompanyMigration =
		Boolean(selectedProjectId) &&
		Boolean(selectedCompanyId) &&
		clientReports.length > 0 &&
		!isClientReportsLoading &&
		!reportCompanyMigration.isRunning;

	const canRunProjectMigration =
		Boolean(selectedLegacyProjectId) &&
		Boolean(selectedLegacyProjectParentId) &&
		projectTasks.length > 0 &&
		!isProjectTasksLoading &&
		!projectMigration.isRunning;

	const canRunReportProjectMigration =
		Boolean(selectedLegacyProjectId) &&
		Boolean(selectedLegacyProjectParentId) &&
		projectReports.length > 0 &&
		!isProjectReportsLoading &&
		!reportProjectMigration.isRunning;

	return (
		<div
			style={{
				display: "flex",
				flexDirection: "column",
				gap: "1rem",
				maxWidth: "48rem",
			}}
		>
			<h3 style={{ margin: 0 }}>Миграция компании в задачах</h3>

			<section
				style={{
					display: "flex",
					flexDirection: "column",
					gap: "0.5rem",
				}}
			>
				<h5 style={{ textAlign: "left", margin: 0 }}>1. Выберите проект</h5>

				<input
					value={projectSearch}
					onChange={(event) => setProjectSearch(event.target.value)}
					style={{
						border: "1px solid #d6d6d6",
						borderRadius: "0.5rem",
						padding: "0.5rem",
						minHeight: "2.5rem",
					}}
					type="text"
					placeholder="Поиск по списку проектов"
					autoComplete="off"
				/>

				<select
					value={selectedProjectId}
					onChange={(event) => setSelectedProjectId(event.target.value)}
					disabled={isProjectsLoading}
					style={{
						width: "100%",
						padding: "1rem",
						borderRadius: "10px",
					}}
				>
					<option value="">
						{isProjectsLoading ? "Загружаем проекты..." : "Выберите проект"}
					</option>
					{filteredProjects.map((project) => (
						<option value={project.ID} key={project.ID}>
							{project.NAME}
						</option>
					))}
				</select>
			</section>

			<section
				style={{
					display: "flex",
					flexDirection: "column",
					gap: "0.5rem",
				}}
			>
				<h5 style={{ textAlign: "left", margin: 0 }}>
					2. Выберите компанию Bitrix24
				</h5>

				<input
					value={companySearch}
					onChange={(event) => setCompanySearch(event.target.value)}
					style={{
						border: "1px solid #d6d6d6",
						borderRadius: "0.5rem",
						padding: "0.5rem",
						minHeight: "2.5rem",
					}}
					type="text"
					placeholder="Начните вводить название компании"
					autoComplete="off"
				/>

				{isCompanySearchLoading && (
					<div style={{ marginBottom: "0.5rem" }}>Поиск...</div>
				)}
				{companySearch.trim().length === 1 && (
					<div style={{ marginBottom: "0.5rem" }}>
						Введите минимум 2 символа
					</div>
				)}
				{companySearch.trim().length >= 2 &&
					!isCompanySearchLoading &&
					companies.length === 0 && (
						<div style={{ marginBottom: "0.5rem" }}>Компании не найдены</div>
					)}

				<select
					value={selectedCompanyId}
					onChange={(event) => setSelectedCompanyId(event.target.value)}
					disabled={companies.length === 0 || isCompanySearchLoading}
					style={{
						width: "100%",
						padding: "1rem",
						borderRadius: "10px",
					}}
				>
					<option value="">Выберите компанию</option>
					{companies.map((item) => (
						<option value={item.id} key={item.id}>
							{item.name}
						</option>
					))}
				</select>
			</section>

			<section
				style={{
					border: "1px solid #d6d6d6",
					borderRadius: "8px",
					padding: "1rem",
					display: "flex",
					flexDirection: "column",
					gap: "0.5rem",
				}}
			>
				<div>
					Проект: <strong>{selectedProject?.NAME ?? "проект не выбран"}</strong>
				</div>
				<div>
					Компания:{" "}
					<strong>{selectedCompany?.name ?? "компания не выбрана"}</strong>
				</div>
				<div>
					Задач найдено:{" "}
					<strong>{isTasksLoading ? "загружаем..." : tasks.length}</strong>
					{!isTasksLoading && tasksTotal !== tasks.length
						? ` из ${tasksTotal}`
						: ""}
				</div>
				<div>
					Успешно обновлено: <strong>{migration.success}</strong>
				</div>
				<div>
					Обработано:{" "}
					<strong>
						{migration.processed} / {tasks.length}
					</strong>
				</div>
				<div>
					Ошибок: <strong>{migration.failed}</strong>
				</div>

				{tasksError && <div style={{ color: "#b00020" }}>{tasksError}</div>}
				{migration.error && (
					<div style={{ color: "#b00020" }}>{migration.error}</div>
				)}

				<button
					type="button"
					onClick={() => {
						runMigration().catch((error) => {
							setMigration((prev) => ({
								...prev,
								isRunning: false,
								error: getBitrixErrorMessage(error),
							}));
						});
					}}
					disabled={!canRunMigration}
					style={{
						alignSelf: "flex-start",
						padding: "0.75rem 1rem",
						borderRadius: "8px",
						border: "none",
						cursor: canRunMigration ? "pointer" : "not-allowed",
						opacity: canRunMigration ? 1 : 0.6,
					}}
				>
					{migration.isRunning ? "Мигрируем..." : "Проставить компанию"}
				</button>

				<div
					style={{
						borderTop: "1px solid #d6d6d6",
						marginTop: "0.5rem",
						paddingTop: "0.75rem",
						display: "flex",
						flexDirection: "column",
						gap: "0.5rem",
					}}
				>
					<h5 style={{ textAlign: "left", margin: 0 }}>
						Отчеты по этому клиенту
					</h5>
					<div>
						Отчетов найдено:{" "}
						<strong>
							{isClientReportsLoading ? "загружаем..." : clientReports.length}
						</strong>
						{!isClientReportsLoading &&
						clientReportsTotal !== clientReports.length
							? ` из ${clientReportsTotal}`
							: ""}
					</div>
					<div>
						Успешно обновлено: <strong>{reportCompanyMigration.success}</strong>
					</div>
					<div>
						Обработано:{" "}
						<strong>
							{reportCompanyMigration.processed} / {clientReports.length}
						</strong>
					</div>
					<div>
						Ошибок: <strong>{reportCompanyMigration.failed}</strong>
					</div>

					{clientReportsError && (
						<div style={{ color: "#b00020" }}>{clientReportsError}</div>
					)}
					{reportCompanyMigration.error && (
						<div style={{ color: "#b00020" }}>
							{reportCompanyMigration.error}
						</div>
					)}

					<button
						type="button"
						onClick={() => {
							runReportCompanyMigration().catch((error) => {
								setReportCompanyMigration((prev) => ({
									...prev,
									isRunning: false,
									error: getBitrixErrorMessage(error),
								}));
							});
						}}
						disabled={!canRunReportCompanyMigration}
						style={{
							alignSelf: "flex-start",
							padding: "0.75rem 1rem",
							borderRadius: "8px",
							border: "none",
							cursor: canRunReportCompanyMigration ? "pointer" : "not-allowed",
							opacity: canRunReportCompanyMigration ? 1 : 0.6,
						}}
					>
						{reportCompanyMigration.isRunning
							? "Мигрируем отчеты..."
							: "Проставить компанию в отчетах"}
					</button>
				</div>
			</section>

			<section
				style={{
					display: "flex",
					flexDirection: "column",
					gap: "0.5rem",
					borderTop: "1px solid #d6d6d6",
					paddingTop: "1rem",
				}}
			>
				<h3 style={{ margin: 0 }}>Миграция проекта в parentId1092</h3>
				<h5 style={{ textAlign: "left", margin: 0 }}>
					1. Выберите проект из старого списка
				</h5>

				<input
					value={legacyProjectSearch}
					onChange={(event) => setLegacyProjectSearch(event.target.value)}
					style={{
						border: "1px solid #d6d6d6",
						borderRadius: "0.5rem",
						padding: "0.5rem",
						minHeight: "2.5rem",
					}}
					type="text"
					placeholder="Поиск по списку проектов"
					autoComplete="off"
				/>

				<select
					value={selectedLegacyProjectId}
					onChange={(event) => setSelectedLegacyProjectId(event.target.value)}
					disabled={isLegacyProjectsLoading}
					style={{
						width: "100%",
						padding: "1rem",
						borderRadius: "10px",
					}}
				>
					<option value="">
						{isLegacyProjectsLoading
							? "Загружаем проекты..."
							: "Выберите проект"}
					</option>
					{filteredLegacyProjects.map((project) => (
						<option value={project.ID} key={project.ID}>
							{project.NAME}
						</option>
					))}
				</select>
			</section>

			<section
				style={{
					border: "1px solid #d6d6d6",
					borderRadius: "8px",
					padding: "1rem",
					display: "flex",
					flexDirection: "column",
					gap: "0.5rem",
				}}
			>
				<div>
					Проект из списка:{" "}
					<strong>{selectedLegacyProject?.NAME ?? "проект не выбран"}</strong>
				</div>
				<div>
					Старый ID проекта:{" "}
					<strong>{selectedLegacyProject?.ID ?? "не выбран"}</strong>
				</div>
				<div>
					Новый parentId1092:{" "}
					<strong>{selectedLegacyProjectParentId || "не найден"}</strong>
				</div>
				<div>
					Задач найдено:{" "}
					<strong>
						{isProjectTasksLoading ? "загружаем..." : projectTasks.length}
					</strong>
					{!isProjectTasksLoading && projectTasksTotal !== projectTasks.length
						? ` из ${projectTasksTotal}`
						: ""}
				</div>
				<div>
					Успешно обновлено: <strong>{projectMigration.success}</strong>
				</div>
				<div>
					Обработано:{" "}
					<strong>
						{projectMigration.processed} / {projectTasks.length}
					</strong>
				</div>
				<div>
					Ошибок: <strong>{projectMigration.failed}</strong>
				</div>

				{projectTasksError && (
					<div style={{ color: "#b00020" }}>{projectTasksError}</div>
				)}
				{projectMigration.error && (
					<div style={{ color: "#b00020" }}>{projectMigration.error}</div>
				)}

				<button
					type="button"
					onClick={() => {
						runProjectMigration().catch((error) => {
							setProjectMigration((prev) => ({
								...prev,
								isRunning: false,
								error: getBitrixErrorMessage(error),
							}));
						});
					}}
					disabled={!canRunProjectMigration}
					style={{
						alignSelf: "flex-start",
						padding: "0.75rem 1rem",
						borderRadius: "8px",
						border: "none",
						cursor: canRunProjectMigration ? "pointer" : "not-allowed",
						opacity: canRunProjectMigration ? 1 : 0.6,
					}}
				>
					{projectMigration.isRunning
						? "Мигрируем..."
						: "Проставить parentId1092"}
				</button>

				<div
					style={{
						borderTop: "1px solid #d6d6d6",
						marginTop: "0.5rem",
						paddingTop: "0.75rem",
						display: "flex",
						flexDirection: "column",
						gap: "0.5rem",
					}}
				>
					<h5 style={{ textAlign: "left", margin: 0 }}>
						Отчеты по этому проекту
					</h5>
					<div>
						Отчетов найдено:{" "}
						<strong>
							{isProjectReportsLoading ? "загружаем..." : projectReports.length}
						</strong>
						{!isProjectReportsLoading &&
						projectReportsTotal !== projectReports.length
							? ` из ${projectReportsTotal}`
							: ""}
					</div>
					<div>
						Успешно обновлено: <strong>{reportProjectMigration.success}</strong>
					</div>
					<div>
						Обработано:{" "}
						<strong>
							{reportProjectMigration.processed} / {projectReports.length}
						</strong>
					</div>
					<div>
						Ошибок: <strong>{reportProjectMigration.failed}</strong>
					</div>

					{projectReportsError && (
						<div style={{ color: "#b00020" }}>{projectReportsError}</div>
					)}
					{reportProjectMigration.error && (
						<div style={{ color: "#b00020" }}>
							{reportProjectMigration.error}
						</div>
					)}

					<button
						type="button"
						onClick={() => {
							runReportProjectMigration().catch((error) => {
								setReportProjectMigration((prev) => ({
									...prev,
									isRunning: false,
									error: getBitrixErrorMessage(error),
								}));
							});
						}}
						disabled={!canRunReportProjectMigration}
						style={{
							alignSelf: "flex-start",
							padding: "0.75rem 1rem",
							borderRadius: "8px",
							border: "none",
							cursor: canRunReportProjectMigration ? "pointer" : "not-allowed",
							opacity: canRunReportProjectMigration ? 1 : 0.6,
						}}
					>
						{reportProjectMigration.isRunning
							? "Мигрируем отчеты..."
							: "Проставить parentproject в отчетах"}
					</button>
				</div>
			</section>
		</div>
	);
};
