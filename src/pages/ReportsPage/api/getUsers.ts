import { $api } from "@/shared/config";
import { Endpoints } from "@/shared/constants/const";

export const getUsers = async (
  signal?: AbortSignal,
  { throwOnError = false } = {},
): Promise<
  {
    ID: string;
    NAME: string;
    LAST_NAME: string;
    UF_DEPARTMENT: number[];
    WORK_POSITION: string;
    PERSONAL_PHOTO: string;
  }[]
> => {
  try {
    const response = await $api.get(Endpoints.users, {
      params: {
        select: [
          "NAME",
          "ID",
          "LAST_NAME",
          "UF_DEPARTMENT",
          "WORK_POSITION",
          "PERSONAL_PHOTO",
        ],
      },
      signal,
    });

    const items = response.data?.result;

    if (!Array.isArray(items)) {
      if (throwOnError) {
        throw new Error(response.data?.error_description || "Не удалось получить сотрудников из Битрикс24");
      }
      console.warn("Expected items to be an array, but got:", items);
      return [];
    }

    return items;
  } catch (error) {
    if (signal?.aborted) {
      return [];
    }

    if (throwOnError) throw error;

    console.error("Failed to fetch users", error);
    return [];
  }
};
