import { $api } from "@/shared/config";
import { Endpoints, EntityTypeIds } from "@/shared/constants/const";

type CompanyFromCrm = {
	id: string | number;
	title?: string | null;
};

type CrmItemListResponse<T> = {
	result?: {
		items?: T[];
	};
	next?: number | null;
};

export const fetchCompanyTitlesByIds = async (ids: number[]) => {
	const limit = 50;
	let start = 0;
	let next: number | null | undefined = 0;
	const titleById = new Map<number, string>();

	while (next !== null) {
		const response = await $api.get<CrmItemListResponse<CompanyFromCrm>>(
			Endpoints.crmItems,
			{
				params: {
					entityTypeId: EntityTypeIds.companies,
					select: ["id", "title"],
					filter: {
						"@id": ids.map(String),
					},
					start,
				},
			},
		);

		for (const company of response.data.result?.items ?? []) {
			const id = Number(company.id);
			const title = String(company.title ?? "").trim();

			if (id && title) {
				titleById.set(id, title);
			}
		}

		next = response.data.next ?? null;
		start = next ?? start + limit;
	}

	return titleById;
};
