import { type CSSProperties, useState } from "react";
import { useFormContext } from "react-hook-form";
import uuid4 from "uuid4";
import { $api } from "@/shared/config";
import type { AnyObject } from "@/shared/types/types";
import { classNames } from "@/shared/utils/utils";
import { formatUserFields } from "../calendar/helpers/formatUserFilds";
import cls from "./f.module.scss";

interface UserOption {
	id: string;
	value?: string;
	title: string;
	position?: string;
	photo?: string;
	department?: number | null;
}

export const AsyncSelect = ({
	name,
	placeholder,
	endpoint,
	params,
	styles,
}: {
	name: string;
	placeholder: string;
	endpoint: string;
	params: AnyObject;
	styles?: CSSProperties;
}) => {
	const { register } = useFormContext();
	const [options, setOptions] = useState<UserOption[]>([
		{
			id: uuid4(),
			title: "Загрузка...",
		},
	]);
	const [loading, setLoading] = useState(false);

	const loadOptions = async () => {
		if (loading) return;

		if (options.length > 1) return;
		setLoading(true);

		try {
			const response = await $api.get(endpoint, params);

			const items = response.data?.result;

			if (!Array.isArray(items) || items.length === 0) {
				console.warn("Expected items to be an array, but got:", items);
				setOptions([
					{
						id: uuid4(),
						title: "Нет данных",
					},
				]);
			} else {
				const formatted = items.map(formatUserFields);

				setOptions(formatted);
			}
		} catch (error) {
			console.error("Failed to fetch developers", error);
			setOptions([
				{
					id: uuid4(),
					title: "Нет данных",
				},
			]);
		} finally {
			setLoading(false);
		}
	};

	const handleClick = () => {
		loadOptions();
	};

	return (
		<div className={cls.container}>
			<select
				{...register(name)}
				onClick={handleClick}
				name={name}
				className={classNames(cls.select, {
					[cls.loadingselect]: loading,
				})}
				style={{ ...styles }}
			>
				<option value="" disabled selected>
					{loading ? `${placeholder}...` : placeholder}
				</option>

				{options.map((item) => (
					<option
						value={item.id ?? item.id}
						key={item.id}
						style={{
							background:
								item.department === 23
									? "var(--color-success-surface)"
									: "var(--color-surface-hover)",
							color: "var(--color-text)",
						}}
					>
						{item.title}
					</option>
				))}
			</select>
			{loading && <div className={cls.spinner} />}
		</div>
	);
};
