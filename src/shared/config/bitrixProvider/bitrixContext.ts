import type { B24Frame } from "@bitrix24/b24jssdk";
import { createContext, useContext } from "react";

type B24ContextValue = {
	b24: B24Frame | null;
	currentUserId?: number | null;
	status?: "loading" | "ready" | "standalone" | "unavailable";
};

export const B24Context = createContext<B24ContextValue>({
	b24: null,
	status: "unavailable",
});

export const useB24 = () => useContext(B24Context);
