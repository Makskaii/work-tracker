import type { B24Frame } from "@bitrix24/b24jssdk";
import { createContext, useContext } from "react";

type B24ContextValue = {
	b24: B24Frame | null;
};

export const B24Context = createContext<B24ContextValue>({
	b24: null,
});

export const useB24 = () => useContext(B24Context);
