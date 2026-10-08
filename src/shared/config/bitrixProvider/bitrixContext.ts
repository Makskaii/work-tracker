import type { B24Frame } from "@bitrix24/b24jssdk";
import { createContext, useContext } from "react";

// The standalone application needs only the REST call surface. Portal frames
// additionally retain their real SDK auth and slider APIs.
export type WorkTrackerBitrix = {
	actions: { v2: { call: Pick<B24Frame["actions"]["v2"]["call"], "make"> } };
	auth?: B24Frame["auth"];
	slider?: B24Frame["slider"];
};

type B24ContextValue = {
	b24: WorkTrackerBitrix | null;
	currentUserId?: number | null;
	status?: "loading" | "ready" | "standalone" | "unavailable";
	mode?: "iframe" | "employee" | "preview";
	portalOrigin?: string;
};

export const B24Context = createContext<B24ContextValue>({
	b24: null,
	status: "unavailable",
});

export const useB24 = () => useContext(B24Context);
