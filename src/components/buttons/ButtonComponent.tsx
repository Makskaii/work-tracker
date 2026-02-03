import cls from "./Button.module.scss";

interface ButtopProps {
	text: string;
}

export const Button = ({ text }: ButtopProps) => {
	return (
		<button className={cls.button} role="button">
			{text}
		</button>
	);
};
