export const getModalWidth = (size?: string) => {
	switch (size) {
		case "full":
			return "100%";
		case "covered":
			return "75%";
		case "small":
			return "50%";
		default:
			return "500px";
	}
};

export const getModalHeight = (size?: string) => {
	switch (size) {
		case "full":
			return "100%";
		case "covered":
			return "90%";

		default:
			return "auto";
	}
};
