import cls from "../ReportsCalendar.module.scss";

type PanelSkeletonProps = {
	rows: number;
	variant: "employee" | "project" | "report";
};

export const PanelSkeleton = ({ rows, variant }: PanelSkeletonProps) => (
	<div className={cls.skeletonList} data-variant={variant}>
		{Array.from({ length: rows }, (_, index) => (
			<div key={index} className={cls.skeletonCard}>
				{variant === "employee" && <span className={cls.skeletonAvatar} />}
				<div className={cls.skeletonContent}>
					<span className={cls.skeletonLine} />
					<span className={cls.skeletonLineShort} />
					{variant === "project" && (
						<div className={cls.skeletonPills}>
							<span />
							<span />
							<span />
						</div>
					)}
				</div>
				<span className={cls.skeletonValue} />
			</div>
		))}
	</div>
);
