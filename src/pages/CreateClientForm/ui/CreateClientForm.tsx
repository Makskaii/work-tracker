import { EnumCrmEntityTypeId } from "@bitrix24/b24jssdk";
import { useCallback, useEffect, useState } from "react";
import { CheckPermission } from "@/components/protectedRoute/CheckPermission";
import { $backendApi } from "@/shared/config/axios/axios.config";
import { useB24 } from "@/shared/config/bitrixProvider/bitrixContext";
import { ClientsTable } from "./ClientsTable/ClientsTable";
import {
	type ClientFilterValues,
	type ClientStatusFilter,
	TableFilters,
} from "./ClientsTable/TableFilters";
import { Widgets } from "./ClientsWidgets/Clientwidgets";
import styles from "./CreateClientForm.module.scss";
import { CreateModal } from "./CreateModal/CreateModal";
import { PageHeader } from "./Header/PageHeader";

const initialFilters: ClientFilterValues = {
	search: "",
	status: "all",
};

export type CompanyOption = {
	id: string;
	name: string;
};

type BitrixCompanyItem = {
	id: number | string;
	title?: string;
};

type BitrixCompanyListResponse = {
	items?: BitrixCompanyItem[];
};

const buildClientQueryParams = (filters: ClientFilterValues) => {
	const search = filters.search.trim();
	const params: {
		search?: string;
		status?: Exclude<ClientStatusFilter, "all">;
	} = {};

	if (search) {
		params.search = search;
	}

	if (filters.status !== "all") {
		params.status = filters.status;
	}

	return params;
};

export const ClientForm = () => {
	const { b24 } = useB24();
	const [clients, setClients] = useState<ClientsTable[]>([]);
	const [filters, setFilters] = useState<ClientFilterValues>(initialFilters);

	const [clientForm, setClientForm] = useState<boolean>(false);

	const fetchClients = useCallback(
		async (currentFilters: ClientFilterValues) => {
			const response = await $backendApi.get<ClientsTable[]>("/clients", {
				params: buildClientQueryParams(currentFilters),
			});

			setClients(response.data);
		},
		[],
	);

	const refreshClients = useCallback(() => {
		return fetchClients(filters);
	}, [fetchClients, filters]);

	const searchCompanies = useCallback(
		async (query: string): Promise<CompanyOption[]> => {
			const search = query.trim();

			if (!b24 || search.length < 2) {
				return [];
			}

			const response =
				await b24.actions.v2.call.make<BitrixCompanyListResponse>({
					method: "crm.item.list",
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
				});

			if (!response.isSuccess) {
				console.error(
					"Failed to fetch Bitrix companies",
					response.getErrorMessages(),
				);
				return [];
			}

			const items = response.getData()?.result?.items;

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
		[b24],
	);

	useEffect(() => {
		const timeoutId = window.setTimeout(() => {
			fetchClients(filters);
		}, 300);

		return () => window.clearTimeout(timeoutId);
	}, [fetchClients, filters]);

	return (
		<CheckPermission permission="create-client" subject="client">
			<div className={styles.page}>
				<div className={styles.content}>
					<PageHeader setClientForm={setClientForm} />

					<Widgets clients={clients} />

					<div className={styles.tableSection}>
						<TableFilters filters={filters} onChange={setFilters} />
						{clients.length > 0 ? (
							<ClientsTable
								activeItems={clients}
								onDeleteClient={refreshClients}
								onPurchasedHoursChanged={refreshClients}
								onToggleClientStatus={refreshClients}
							/>
						) : (
							<div>
								<p className={styles.noClientsMessage}>No clients found.</p>
							</div>
						)}
					</div>
				</div>
			</div>

			{clientForm && (
				<CreateModal
					clientForm={clientForm}
					onClientCreated={refreshClients}
					setClientForm={setClientForm}
					searchCompanies={searchCompanies}
				/>
			)}
		</CheckPermission>
	);
};
