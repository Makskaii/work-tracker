import { PureAbility } from "@casl/ability";
import { createContextualCan } from "@casl/react";
import { createContext } from "react";

export const ability = new PureAbility();

export const AbilityContext = createContext(ability);
export const Can = createContextualCan(AbilityContext.Consumer);
