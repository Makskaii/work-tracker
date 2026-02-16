import dayjs from "dayjs";
import { dtoFieldsCodesUserReports as UserCodes } from "../../../components/calendar/constants/const";
import { $api } from "../../../shared/config";
import { Endpoints } from "../../../shared/constants/const";
import { getWorkWeeks } from "../../../shared/utils";

export const getTasksByWeek = async (userId: string) => {
	const currMonthWeeks = getWorkWeeks(
		new Date().getMonth(),
		new Date().getFullYear(),
	);

	const result = await Promise.all(
		currMonthWeeks.map((week) =>
			$api.get(Endpoints.reports, {
				params: {
					entityTypeId: 1072,
					select: [
						"id",
						"title",
						"assignedById",
						"createdTime",
						"lastActivityTime",
						"stageId",
						UserCodes.project,
						UserCodes.estimateTime,
						UserCodes.description,
						UserCodes.stage,
					],
					filter: {
						assignedById: userId,
						stageId: "DT1072_18:UC_6JNSDG",
						"<=lastActivityTime": dayjs(week.endOfTheWeek).toISOString(),
						">=lastActivityTime": dayjs(week.startOfTheWeek).toISOString(),
					},
				},
			}),
		),
	);
	return result;
};
