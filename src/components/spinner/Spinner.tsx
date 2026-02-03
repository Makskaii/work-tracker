import cls from "./Spinner.module.scss";

export const Spinner = () => {
	return (
		<div className={cls.container}>
			<h3>Loading...</h3>
			<div className={cls.spinner}></div>
		</div>
	);
};
