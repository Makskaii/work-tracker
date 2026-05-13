import { useCallback, useEffect, useState } from "react";
import { CheckPermission } from "@/components/protectedRoute/CheckPermission";
import { getClientsFromList } from "@/shared/api/getCrmFields";
import { $backendApi } from "@/shared/config/axios/axios.config";
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
	const [clients, setClients] = useState<ClientsTable[]>([]);
	const [filters, setFilters] = useState<ClientFilterValues>(initialFilters);
	const [projects, setProjects] = useState<
		{
			id: string;
			name: string;
		}[]
	>([]);

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

	useEffect(() => {
		const fetchProjects = async () => {
			const response = await getClientsFromList();

			setProjects(
				response.map((proj) => {
					return {
						id: proj.ID,
						name: proj.NAME,
					};
				}),
			);
		};

		fetchProjects();
	}, []);

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
					projects={projects}
				/>
			)}
		</CheckPermission>
	);
};
