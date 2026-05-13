import type { MouseEvent, ReactNode } from "react";
import { useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { getModalHeight, getModalWidth } from "./helpers/getSize";
import cls from "./Modal.module.scss";

type ModalProps = {
	innerScroll?: boolean;
	isOpen?: boolean;
	children: ReactNode;
	size?: "full" | "covered" | "small";
	closeOnBackdropClick?: boolean;
	onClose?(): void;
};

export default function Modal({
	children,
	size,
	isOpen,
	onClose,
	innerScroll,
	closeOnBackdropClick = true,
}: ModalProps) {
	const [mounted, setMounted] = useState(false);
	const modalRef = useRef<HTMLDialogElement>(null);

	useEffect(() => {
		setMounted(true);
	}, []);

	useEffect(() => {
		if (!isOpen) return;

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
	}, [isOpen]);

	useEffect(() => {
		const handleEscape = (event: KeyboardEvent) => {
			if (event.key === "Escape") {
				onClose?.();
			}
		};

		if (isOpen) {
			document.addEventListener("keydown", handleEscape);
		}

		return () => {
			document.removeEventListener("keydown", handleEscape);
		};
	}, [isOpen, onClose]);

	if (!isOpen || !mounted) return null;

	const handleBackdropClick = (event: MouseEvent<HTMLDivElement>) => {
		if (closeOnBackdropClick && event.target === event.currentTarget) {
			onClose?.();
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
				onClick={(event) => event.stopPropagation()}
			>
				{onClose && (
					<button
						type="button"
						className={cls.closeButton}
						onClick={onClose}
						aria-label="Закрыть"
					>
						×
					</button>
				)}
				{children}
			</dialog>
		</div>,
		document.body,
	);
}
