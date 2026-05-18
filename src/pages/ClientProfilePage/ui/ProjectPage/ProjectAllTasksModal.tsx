import { useEffect, useState } from "react";
import { TaskCodes } from "@/components/calendar/constants/const";
import type { ReportProps } from "@/components/calendar/types/types";
import { Modal } from "@/components/modal";
import { getItems } from "@/pages/ReportsPage/api/getTasks";
import { TASK_STAGE_IDS } from "@/pages/ReportsPage/constants/statuses";
import { EntityTypeIds, TASK_SELECT_FIELDS } from "@/shared/constants/const";
import type { Status, TaskProps, User } from "@/shared/types/types";
import { TaskList } from "../TaskList/TaskList";

type Props = {
	open: boolean;
	onClose: () => void;
	projectId: string;
	companyId?: string;
	projectName: string;
	users: User[];
	statuses: Status[];
	reports: ReportProps[];
};

export const ProjectAllTasksModal = ({
	open,
	onClose,
	projectId,
	companyId,
}: Props) => {
	const [tasks, setTasks] = useState<TaskProps[]>([]);

	useEffect(() => {
		if (!open || !projectId) return;

		const fetchTasks = async () => {
			try {
				const response = await getItems<TaskProps>({
					typeId: EntityTypeIds.tasks,
					filters: {
						[TaskCodes.parentproject]: projectId,
						...(companyId ? { [TaskCodes.company]: companyId } : {}),
						"!stageId": TASK_STAGE_IDS.BUNDLE,
					},
					select: TASK_SELECT_FIELDS,
				});

				setTasks(response.sort((a, b) => a.stageId.localeCompare(b.stageId)));
			} catch (err) {
				console.error(err);
			}
		};

		fetchTasks();
	}, [open, projectId, companyId]);

	return (
		<Modal isOpen={open} onClose={onClose} size="full" innerScroll>
			<TaskList tasks={tasks} isProject />
		</Modal>
	);
};
