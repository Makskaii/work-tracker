import { useState } from "react";
import { useFormContext } from "react-hook-form";
import uuid4 from "uuid4";
import { $api } from "@/shared/config";
import { classNames } from "@/shared/utils/utils";
import { formatUserFields } from "../calendar/helpers/formatUserFilds";
import styles from "./f.module.scss";

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
}: {
	name: string;
	placeholder: string;
	endpoint: string;
	// biome-ignore lint/suspicious/noExplicitAny: <explanation>
	params: any;
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

		// await new Promise((resolve) => setTimeout(resolve, 2000)); //Задержка
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
		<div className={styles.container}>
			<select
				{...register(name)}
				onClick={handleClick}
				name={name}
				className={classNames(styles.select, {
					[styles.loadingselect]: loading,
				})}
			>
				<option value="" disabled selected>
					{loading ? `${placeholder}...` : placeholder}
				</option>

				{options.map((item) => (
					<option value={item.id ?? item.id} key={item.id ?? item.id}>
						{item.value ?? item.title}
					</option>
				))}
			</select>
			{loading && <div className={styles.spinner} />}
		</div>
	);
};
