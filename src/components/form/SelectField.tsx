import { useFormContext } from "react-hook-form";
import type { AnyObject, User } from "@/shared/types/types";

export const AsyncSelect = ({
	options,
	name,
	placeholder,
}: {
	options: User[] | AnyObject[];
	name: string;
	placeholder: string;
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
			<option value="" disabled>
				{placeholder}
			</option>
			{options?.map((item) => (
				<option
					value={item.id}
					key={item.id}
					style={{
						background:
							item.department === 23 ? "rgb(76, 175, 80, 0.3)" : "#ff9800",
					}}
				>
					{item.title}
				</option>
			))}
		</select>
	);
};
