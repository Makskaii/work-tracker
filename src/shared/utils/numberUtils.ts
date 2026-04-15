export const convertNumberFormat = (value: string | number): number => {
	console.log({ value });
	if (typeof value === "number") {
		return value;
	}

	const normalizedValue = value.replace(",", ".");

	const number = parseFloat(normalizedValue);

	if (value === "-" || value === "") return 0;

	if (isNaN(number)) {
		throw new Error(`Invalid number format: ${value}`);
	}

	return number;
};
