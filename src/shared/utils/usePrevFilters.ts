import { useEffect, useRef } from "react";
import type { AnyObject } from "../types/types";

export const usePrevious = (value: AnyObject, initialValue: AnyObject) => {
	const ref = useRef(initialValue);
	useEffect(() => {
		ref.current = value;
	});
	return ref.current;
};
