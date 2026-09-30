import { createRoot } from "react-dom/client";
import { ProjectPlanningWorkspace } from "../src/pages/ReportsPage/ui/SalesPage/components/ProjectPlanningWorkspace";
import type { ReportProject } from "../src/pages/ReportsPage/ui/SalesPage/model/types";
const project = { id: 31, title: "Browser fixture", projectType: "waterfall", projectAmount: 10000 } as ReportProject;
const nested = new URLSearchParams(window.location.search).has("nested");
const root = document.getElementById("root");
if (!root) throw new Error("Fixture root missing");
createRoot(root).render(<div id="scrollport" style={nested ? { marginTop: 36, height: 640, overflow: "auto" } : undefined}>
  <div style={{ height: 180 }}>Above Gantt</div>
  <ProjectPlanningWorkspace project={project} />
  <div id="after-gantt" style={{ height: 1200 }}>After Gantt</div>
</div>);
