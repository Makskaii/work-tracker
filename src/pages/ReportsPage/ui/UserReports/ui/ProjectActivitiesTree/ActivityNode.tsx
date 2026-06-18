import { useState } from "react";
import { treeColors } from "@/pages/ReportsPage/constants/colorTree";
import type { GroupedActivityItem } from "@/pages/ReportsPage/types/types";
import { ReportRow } from "./ReportRow";
import { TreeNode } from "./TreeNode";

type ActivityNodeProps = {
	activity: GroupedActivityItem;
};

export const ActivityNode = ({ activity }: ActivityNodeProps) => {
	const [isExpanded, setIsExpanded] = useState(true);

	return (
		<TreeNode
			level={3}
			title={
				<div
					style={{
						fontSize: "0.9rem",
						color: "var(--color-text)",
					}}
				>
					{activity.activityTitle}
				</div>
			}
			value={`${activity.timeSpent.toFixed(2)} ч.`}
			isExpanded={isExpanded}
			onToggle={() => setIsExpanded((prev) => !prev)}
			styles={treeColors.activity}
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
