import { useState } from "react";
import { useFormContext } from "react-hook-form";
import { $api } from "@/shared/config";
import { Endpoints } from "@/shared/constants/const";
import styles from "./f.module.scss";

export const AsyncSelect = ({
	name,
	placeholder,
}: {
	name: string;
	placeholder: string;
}) => {
	const { register } = useFormContext();
	const [loading, setLoading] = useState(false);
	const [options, setOptions] = useState<
		Array<{
			ID?: string;
			VALUE?: string;
			id?: string;
			value?: string;
			title?: string;
		}>
	>([]);

	const [isLoaded, setIsLoaded] = useState(false);

	const loadOptions = async () => {
		if (options.length > 0 || loading) return;
		setLoading(true);
		try {
			const response = await $api.get(Endpoints.users, {
				params: {
					UF_DEPARTMENT: 23,
				},
			});

			const items = response.data?.result;

			if (!Array.isArray(items)) {
				console.warn("Expected items to be an array, but got:", items);
				setOptions([]);
			} else {
				// biome-ignore lint/suspicious/noExplicitAny: <explanation>
				const formatted = items.map((item: any) => ({
					ID: item.ID ?? item.id,
					VALUE: item.NAME ?? item.VALUE ?? item.title ?? "Без имени",
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
				className={loading ? styles.loadingSelect : ""}
				style={{
					border: "none",
					backgroundColor: "white",
					boxShadow: "rgba(99, 99, 99, 0.2) 0px 2px 8px 0px",
					borderRadius: "0.5rem",
					padding: "0.5rem",
					color: "black",
					width: "200px",
					opacity: loading ? 0.7 : 1,
					cursor: loading ? "wait" : "pointer",
					outline: "none",
				}}
				disabled={loading}
			
			>
				{/* {loading ? (
					<option value="" disabled>
						{placeholder}...
					</option>
				) : options.length > 0 ? (
					options.map((item) => (
						<option value={item.ID ?? item.id} key={item.ID ?? item.id}>
							{item.VALUE ?? item.title}
						</option>
					))
				) : isLoaded ? (
					<option value="" disabled>
						Нет данных
					</option>
				) : (
					<option value="" disabled>
						{placeholder}
					</option>
				)} */}

				<option value="" disabled selected>
					{loading ? `${placeholder}...` : placeholder}
				</option>

				{loading ? null : options.length > 0 ? (
					options.map((item) => (
						<option value={item.ID ?? item.id} key={item.ID ?? item.id}>
							{item.VALUE ?? item.title}
						</option>
					))
				) : isLoaded ? (
					<option value="" disabled>
						Нет данных
					</option>
				) : null}
			</select>

			{loading && <div className={styles.spinner} />}
			<style>{`
				select option:first-child {
					display: none;
			}
				select:disabled option[value=""][disabled]:not(:first-child) {
					display: none;
			}
			`}</style>
		</div>
	);
};
