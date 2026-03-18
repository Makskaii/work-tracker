import { useB24 } from "../config/bitrixProvider/bitrixContext";

export type CurrentUserDepartmentInfo = {
	userId: number | null;
	departmentIds: number[];
};

export const useCurrentBitrixUser = () => {
	const { b24 } = useB24();

	const getCurrentUserDepartmentInfo =
		async (): Promise<CurrentUserDepartmentInfo | null> => {
			if (!b24) return null;

			const response = await b24.actions.v2.call.make({
				method: "user.current",
			});
			const user = response?.getData?.()?.result;

			if (!user) return null;

			return {
				userId: Number(user.ID) || null,
				departmentIds: Array.isArray(user.UF_DEPARTMENT)
					? user.UF_DEPARTMENT.map((id: string | number) => Number(id))
					: [],
			};
		};

	return {
		getCurrentUserDepartmentInfo,
	};
};
