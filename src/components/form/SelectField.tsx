import { useState } from "react";
import { useFormContext } from "react-hook-form";
import { $api } from "@/shared/config";
import { Endpoints } from "@/shared/constants/const";
import styles from "./f.module.scss";

interface UserOption{
		id: string;
		value: string;
		title: string;
		position?: string;
		photo?: string;
		department?: number;}

export const AsyncSelect = ({
	name,
	placeholder,
}: {
	name: string;
	placeholder: string;
}) => {
	const { register } = useFormContext();
	const [loading, setLoading] = useState(false);
	const [options, setOptions] = useState<UserOption[]>([]);


	const [isLoaded, setIsLoaded] = useState(false);

	const loadOptions = async () => {
		if (options.length > 0 || loading) return;
		setLoading(true);
		try {
			const response = await $api.get(Endpoints.users, {
				params: {
					filter: {
					"@UF_DEPARTMENT": [23, 25],
					},
					select: [
					"NAME",
					"ID",
					"LAST_NAME",
					"UF_DEPARTMENT",
					"WORK_POSITION",
					"PERSONAL_PHOTO",
					],
					},
			});

			const items = response.data?.result;

			if (!Array.isArray(items)) {
				console.warn("Expected items to be an array, but got:", items);
				setOptions([]);
			} else {
				// biome-ignore lint/suspicious/noExplicitAny: <explanation>
				const formatted = items.map((item: any) => ({
					id: item.ID,
					value: `${item.NAME} ${item.LAST_NAME}`,
					title: `${item.NAME} ${item.LAST_NAME}`,
					position: item.WORK_POSITION,
					photo: item.PERSONAL_PHOTO,
					department: Array.isArray(item.UF_DEPARTMENT) ? item.UF_DEPARTMENT[0] : item.UF_DEPARTMENT,
				}));

				setOptions(formatted);
			}
		} catch (error) {
			console.error("Failed to fetch developers", error);
			setOptions([]);
		} finally {
			setLoading(false);
			setIsLoaded(true);
		}
	};

	const handleClick = () => {
		if (!isLoaded && !loading) {
			loadOptions();
		}
	};

	return (
		<div className={styles.container}>
			<select
				{...register(name)}
				onClick={handleClick}				
				className={`${styles.select} ${loading ? styles.loadingSelect : ""}`}
				disabled={loading}
			
			>

				<option value="" disabled selected>
					{loading ? `${placeholder}...` : placeholder}
				</option>

				{loading ? null : options.length > 0 ? (
					options.map((item) => (
						<option value={item.id ?? item.id} key={item.id ?? item.id}>
							{item.value ?? item.title}
						</option>
					))
				) : isLoaded ? (
					<option value="" disabled>
						Нет данных
					</option>
				) : null}
			</select>

			{loading && <div className={styles.spinner} />}
		</div>
	);
};
