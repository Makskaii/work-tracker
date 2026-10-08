import { useB24 } from "../config/bitrixProvider/bitrixContext";
import { EntityTypeIds } from "../constants/const";

const getBitrixPortalOrigin = () => {
	const apiUrl = import.meta.env.VITE_API_URL;

	if (!apiUrl) return window.location.origin;

	try {
		return new URL(apiUrl).origin;
	} catch {
		return window.location.origin;
	}
};

export const useBitrixSlider = () => {
	const { b24, mode, portalOrigin } = useB24();
	const pendingCards = useRef(new Set<() => void>());
	useEffect(() => () => {
		for (const cancel of pendingCards.current) cancel();
		pendingCards.current.clear();
	}, []);

	const openCrmItem = async (
		itemId: number | string,
		entityId: number = EntityTypeIds.tasks,
		type: "task" | "common" = "task",
	) => {
		const path = `/crm/${type === "task" ? `type/${entityId}` : "deal"}/details/${itemId}/`;

		if (mode === "employee") {
			return new Promise<{ isClose: boolean }>((resolve, reject) => {
				// Keep a handle solely to detect closure. Remove the opener before
				// navigating so the portal tab cannot control this application.
				const card = window.open("about:blank", "_blank");
				if (!card) { reject(new Error("Разрешите открытие вкладок для карточек Битрикс24")); return; }
				card.opener = null;
				card.location.replace(`${portalOrigin ?? getBitrixPortalOrigin()}${path}`);
				let leftApp = document.hidden || !document.hasFocus();
				const cleanup = () => {
					window.removeEventListener("blur", away);
					window.removeEventListener("focus", returned);
					document.removeEventListener("visibilitychange", visibility);
					window.clearInterval(timer);
				};
				const cancel = () => { cleanup(); pendingCards.current.delete(cancel); resolve({ isClose: false }); };
				const finish = () => { cleanup(); pendingCards.current.delete(cancel); resolve({ isClose: true }); };
				const away = () => { leftApp = true; };
				const returned = () => { if (leftApp && !document.hidden) finish(); };
				const visibility = () => { if (document.hidden) away(); else returned(); };
				window.addEventListener("blur", away);
				window.addEventListener("focus", returned);
				document.addEventListener("visibilitychange", visibility);
				const timer = window.setInterval(() => { try { if (card.closed) finish(); } catch { /* Cross-origin closure may be restricted; returning to the app still refreshes. */ } }, 750);
				pendingCards.current.add(cancel);
			});
		}
		if (!b24?.slider) {
			return window.open(`${getBitrixPortalOrigin()}${path}`, "_blank", "noopener,noreferrer");
		}

		const url = b24.slider.getUrl(path);
		return b24.slider.openPath(url, 1100);
	};

	return {
		b24,
		openTask: openCrmItem,
	};
};
import { useEffect, useRef } from "react";
