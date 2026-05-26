export const treeColors = {
	client: {
		background:
			"linear-gradient(135deg, rgba(57, 214, 238, 0.16), rgba(22, 36, 55, 0.9))",
		border: "1px solid var(--color-border)",
		boxShadow: "0 8px 18px rgba(1, 8, 14, 0.18)",
	},
	project: {
		background: "var(--color-surface-soft)",
		border: "1px solid var(--color-border)",
	},
	activity: {
		background: "#102036",
		border: "1px solid var(--color-border)",
		boxShadow: "0 1px 4px rgba(1, 8, 14, 0.16)",
	},
	report: {
		background: "var(--color-surface-soft)",
		border: "1px solid var(--color-border)",
	},
	sort: {
		0: {
			background: "var(--color-payment-client-surface)",
			border: "1px solid rgba(67, 232, 127, 0.35)",
			color: "var(--color-payment-client)",
		},
		1: {
			background: "var(--color-payment-company-surface)",
			border: "1px solid rgba(255, 191, 63, 0.35)",
			color: "var(--color-payment-company)",
		},
		2: {
			background: "var(--color-payment-unpaid-surface)",
			border: "1px solid rgba(255, 104, 117, 0.35)",
			color: "var(--color-payment-unpaid)",
		},
	},
};
