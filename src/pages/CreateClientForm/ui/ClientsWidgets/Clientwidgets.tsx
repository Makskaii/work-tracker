import {
	FiTrendingDown,
	FiTrendingUp,
	FiUserCheck,
	FiUsers,
} from "react-icons/fi";
import type { ClientsTable } from "../ClientsTable/ClientsTable";
import styles from "../CreateClientForm.module.scss";

const calculateStats = (clients: ClientsTable[]) => {
	const totalClients = clients.length;
	const activeClients = clients.filter(
		(client) => client.status === "active",
	).length;
	const inactiveClients = totalClients - activeClients;

	return [
		{
			title: "Всего клиентов",
			value: totalClients,
			icon: FiUsers,
			iconClassName: styles.widgetIconBlue,
		},
		{
			title: "Активные",
			value: activeClients,
			icon: FiTrendingUp,
			iconClassName: styles.widgetIconGreen,
		},
		{
			title: "Неактивные",
			value: inactiveClients,

			icon: FiUserCheck,
			iconClassName: styles.widgetIconOrange,
		},
		{
			title: "Новые за месяц",
			value: "-",

			icon: FiTrendingDown,
			iconClassName: styles.widgetIconPurple,
		},
	];
};

export const Widgets = ({ clients }: { clients: ClientsTable[] }) => {
	return (
		<div className={styles.widgetsGrid}>
			{calculateStats(clients).map((stat) => {
				const Icon = stat.icon;

				return (
					<article className={styles.widgetCard} key={stat.title}>
						<div className={`${styles.widgetIcon} ${stat.iconClassName}`}>
							<Icon aria-hidden="true" />
						</div>
						<div className={styles.widgetBody}>
							<p className={styles.widgetTitle}>{stat.title}</p>
							<strong className={styles.widgetValue}>{stat.value}</strong>
						</div>
					</article>
				);
			})}
		</div>
	);
};
