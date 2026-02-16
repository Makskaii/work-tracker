export const convertNumberFormat = (value: string | number): number => {
	if (typeof value === "number") {
		return value;
	}

	const normalizedValue = value.replace(",", ".");

	const number = Number(normalizedValue);

	if (isNaN(number)) {
		throw new Error(`Invalid number format: ${value}`);
	}

	return number;
};
