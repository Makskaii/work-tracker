import { useFormContext } from "react-hook-form";

export const AsyncSelect = ({
	options,
	name,
	placeholder,
}: {
	options: {
		ID?: string;
		VALUE?: string;
		id?: string;
		value?: string;
		title?: string;
	}[];
	name: string;
	placeholder?: string;
}) => {
	const { register } = useFormContext();

	return (
		<select
			{...register(name)}
			style={{
				border: "none",
				backgroundColor: "white",
				boxShadow: "rgba(99, 99, 99, 0.2) 0px 2px 8px 0px",
				borderRadius: "0.5rem",
				padding: "0.5rem",
				color: "black",
				maxWidth: "200px",
			}}
		>
			<option selected value={""}>
				{placeholder}
			</option>
			{options?.map((item) => (
				<option value={item.ID ?? item.id} key={item.ID ?? item.id}>
					{item.VALUE ?? item.title}
				</option>
			))}
		</select>
	);
};
