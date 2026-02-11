import { useEffect, useState } from "react";
import { createPortal } from "react-dom";
import { getModalHeight, getModalWidth } from "./helpers/getSize";
import cls from "./Modal.module.scss";

export default function Modal({
	children,
	size,
	isOpen,
	onClose,
	innerScroll,
}: {
	innerScroll?: boolean;
	isOpen?: boolean;
	interceptor?: boolean;
	children: React.ReactNode;
	size?: "full" | "covered" | "small";
	onClose?(): void;
}) {
	const [mounted, setMounted] = useState(false);

	useEffect(() => {
		setMounted(true);
	}, []);

	if (!isOpen) return null;
	if (!mounted) return null;

	const handleDelete = () => {
		if (onClose) onClose();
	};

	return createPortal(
		<div className={cls.modalContainer} onClick={handleDelete}>
			<dialog
				open={isOpen}
				className={cls.modal}
				style={{
					height: getModalHeight(size),
					maxWidth: getModalWidth(size),
					overflowX: innerScroll ? "auto" : "unset",
				}}
				onClick={(e) => e.stopPropagation()}
				onClose={handleDelete}
			>
				{children}
			</dialog>
		</div>,
		document.body,
	);
}
