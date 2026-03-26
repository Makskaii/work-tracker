import { useState } from "react";
import type { GroupedActivityItem } from "@/pages/ReportsPage/types/types";
import { ReportRow } from "./ReportRow";
import { TreeNode } from "./TreeNode";

type ActivityNodeProps = {
	activity: GroupedActivityItem;
};

export const ActivityNode = ({ activity }: ActivityNodeProps) => {
	const [isExpanded, setIsExpanded] = useState(false);

	return (
		<TreeNode
			level={3}
			title={
				<div
					style={{
						fontSize: "0.9rem",
						color: "#374151",
					}}
				>
					{activity.activityTitle}
				</div>
			}
			value={`${activity.timeSpent} ч.`}
			isExpanded={isExpanded}
			onToggle={() => setIsExpanded((prev) => !prev)}
		>
			<div
				style={{
					paddingLeft: "1.5rem",
					display: "flex",
					flexDirection: "column",
					gap: "0.35rem",
				}}
			>
				{activity.reports.map((report) => (
					<ReportRow
						key={report.id}
						date={report.begindate}
						timeSpent={report.timeSpent}
						id={report.id}
					/>
				))}
			</div>
		</TreeNode>
	);
};
