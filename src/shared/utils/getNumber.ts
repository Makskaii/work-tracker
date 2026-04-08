export const getFixedNumber = (number: number | string, fixed: number = 2) => {
	if (!number) return "0";

	if (typeof number === "number") return number.toFixed(fixed);

	if (typeof number === "string") {
		return Number(number).toFixed(fixed);
	}

	return String(number);
};
