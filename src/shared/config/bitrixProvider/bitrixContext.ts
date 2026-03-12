import type { B24Frame } from "@bitrix24/b24jssdk";
import { createContext, useContext } from "react";

export const B24Context = createContext<B24Frame | null>(null);

export const useB24Frame = () => useContext(B24Context);
