import cls from "./Button.module.scss";

interface ButtopProps {
	text: string;
	onClick?: () => void;
}

export const Button = ({ text, onClick }: ButtopProps) => {
	return (
		<button onClick={onClick} className={cls.button} role="button">
			{text}
		</button>
	);
};
