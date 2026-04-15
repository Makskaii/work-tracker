import { useEffect, useRef, useState } from "react";
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
	children: React.ReactNode;
	size?: "full" | "covered" | "small";
	onClose?(): void;
}) {
	const [mounted, setMounted] = useState(false);
	const modalRef = useRef<HTMLDialogElement>(null);

	useEffect(() => {
		setMounted(true);
	}, []);

	useEffect(() => {
		if (isOpen) {
			document.body.classList.add("modal-open");

			document.body.dataset.scrollY = window.scrollY.toString();
			document.body.style.top = `-${window.scrollY}px`;

			return () => {
				document.body.classList.remove("modal-open");
				const scrollY = document.body.dataset.scrollY;
				document.body.style.top = "";
				if (scrollY) {
					window.scrollTo(0, parseInt(scrollY, 10));
				}
			};
		}
	}, [isOpen]);

	useEffect(() => {
		const handleEscape = (e: KeyboardEvent) => {
			if (e.key === "Escape" && onClose) {
				onClose();
			}
		};

		if (isOpen) {
			document.addEventListener("keydown", handleEscape);
		}

		return () => {
			document.removeEventListener("keydown", handleEscape);
		};
	}, [isOpen, onClose]);

	if (!isOpen) return null;
	if (!mounted) return null;

	const handleBackdropClick = (e: React.MouseEvent) => {
		if (e.target === e.currentTarget && onClose) {
			onClose();
		}
	};

	return createPortal(
		<div className={cls.modalContainer} onClick={handleBackdropClick}>
			<dialog
				ref={modalRef}
				open={isOpen}
				className={cls.modal}
				style={{
					height: getModalHeight(size),
					maxWidth: getModalWidth(size),
					overflow: innerScroll ? "auto" : "hidden",
				}}
				onClick={(e) => e.stopPropagation()}
			>
				{size === "full" && (
					<div
						style={{
							display: "flex",
							justifyContent: "flex-end",
						}}
					>
						<button onClick={() => onClose?.()}>Назад</button>
					</div>
				)}
				{children}
			</dialog>
		</div>,
		document.body,
	);
}
