export const AsyncSelect = () => {
	return (
		<select
			name="select"
			value={["first", "second", "third"]}
			style={{
				border: "none",
				backgroundColor: "white",
				boxShadow: "rgba(99, 99, 99, 0.2) 0px 2px 8px 0px",
				borderRadius: "0.5rem",
				padding: "0.5rem",
				color: "black",
			}}
		/>
	);
};
