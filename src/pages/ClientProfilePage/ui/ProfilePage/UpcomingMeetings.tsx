import cls from "./UpcomingMeetings.module.scss";

type MeetingItem = {
	id: string;
	title: string;
	dateText: string;
	status?: string;
};

type UpcomingMeetingsProps = {
	items?: MeetingItem[];
	onCreateRequest?: () => void;
};

const mockMeetings: MeetingItem[] = [
	{
		id: "1",
		title: "Еженедельная синхронизация",
		dateText: "Дата будет добавлена позже",
		status: "Скоро",
	},
];

export const UpcomingMeetings = ({
	items = mockMeetings,
	onCreateRequest,
}: UpcomingMeetingsProps) => {
	return (
		<section className={cls.card}>
			<div className={cls.header}>
				<h3 className={cls.title}>Ближайшие встречи</h3>

				<button
					type="button"
					className={cls.requestButton}
					onClick={onCreateRequest}
				>
					Оставить заявку
				</button>
			</div>

			<div className={cls.heroCard}>
				<div className={cls.heroIcon}>🗓️</div>
				<div className={cls.heroTitle}>Информация появится позже</div>
				<div className={cls.heroText}>
					Блок в разработке. Здесь будут встречи, редактирование и создание
					новых записей.
				</div>
			</div>

			<div className={cls.list}>
				{items.map((item) => (
					<div key={item.id} className={cls.listItem}>
						<div className={cls.listItemMain}>
							<div className={cls.listItemTitle}>{item.title}</div>
							<div className={cls.listItemDate}>{item.dateText}</div>
						</div>

						{item.status ? (
							<span className={cls.statusBadge}>{item.status}</span>
						) : null}
					</div>
				))}
			</div>
		</section>
	);
};
