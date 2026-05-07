import { useEffect, useState } from "react";
import { useParams } from "react-router";
import { CheckPermission } from "@/components/protectedRoute/CheckPermission";
import { $backendApi } from "@/shared/config/axios/axios.config";
import { convertToDate } from "@/shared/utils";
import cls from "./Piecework.module.scss";

type ListItemsDto = {
	id: number;
	employeeId: string;
	activityId: string;
	activityName: string;
	clientId: string;
	clientName: string;
	projectId: string;
	projectName: string;
	comment: string | null;
	hours: string;
	createdAt: string;
	updatedAt: string;
};

export const PieceStatsEmployeeHrs = () => {
	const [data, setData] = useState<ListItemsDto[]>([]);

	const { id } = useParams<{ id: string }>();

	useEffect(() => {
		const fetchD = async () => {
			const res = await $backendApi.get(`employee/${id}`);
			console.log(res);

			setData(res.data);
		};

		fetchD();
	}, [id]);

	return (
		<CheckPermission permission="read" subject={`employee-${id}`}>
			<section className={cls.container}>
				<div className={cls.content}>
					<div className={cls.recordsSection}>
						<div className={cls.recordsHeader}>
							<div className={cls.sectionTitle}>Добавленные записи</div>
							<div className={cls.recordsCounter}>{data.length}</div>
						</div>

						{data.length ? (
							<div className={cls.recordsList}>
								{data.map((record) => (
									<div key={record.id} className={cls.recordCard}>
										<div className={cls.recordTopline}>
											<div>
												<div className={cls.recordEmployee}>ds</div>
												<div className={cls.recordMeta}>sd</div>
											</div>
											<div className={cls.hoursBadge}>{record.hours} ч</div>
										</div>

										<div className={cls.recordDetails}>
											<span>ds</span>
											<span>{convertToDate(record.createdAt)}</span>
										</div>

										<div className={cls.recordComment}>{record.comment}</div>
									</div>
								))}
							</div>
						) : (
							<div className={cls.emptyState}>Пока нет добавленных записей</div>
						)}
					</div>
				</div>
			</section>
		</CheckPermission>
	);
};
