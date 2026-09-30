import { $backendApi } from "../src/shared/config/axios/axios.config";
import type { ProjectGanttStage, ProjectGanttEvent } from "../src/pages/ReportsPage/ui/SalesPage/model/types";

/** Local, in-memory fixture: never sends changes to a real project. */
export function installPlanningFixture() {
 const stage = (id: number, title: string, values: Partial<ProjectGanttStage> = {}): ProjectGanttStage => ({ id, title, projectId: "31", code: `stage-${id}`, stageType: "development", plannedHours: null, groupStatus: "not_started", parentStageId: null, isDefault: false, isGroup: false, dependsOnStageId: null, dependencyAnchor: null, durationDays: null, sortOrder: id, createdAt: "", updatedAt: "", ...values });
 let stages = [stage(99, "Оплаты", { code: "payments", stageType: "payments", isDefault: true, sortOrder: 0 }),
 stage(1, "Нераспределённые этапы", { isGroup: true, stageType: null }),
 stage(2, "Написание ТЗ", { parentStageId: 1, stageType: "tz_writing" }),
 stage(3, "Утверждение ТЗ", { parentStageId: 1, stageType: "tz_signing" }),
 stage(4, "Разработка", { isGroup: true, plannedHours: 80, groupStatus: "in_progress" }),
 stage(5, "Настройка CRM", { parentStageId: 4, plannedHours: 20, groupStatus: "completed" }),
 stage(6, "Разработка модуля защищённого маскирования номера с проверкой, что полный телефон не отображается в интерфейсе, в коде страницы и технических запросах браузера", { parentStageId: 4, plannedHours: 60 }),
 stage(7, "Обучение и передача системы", { isGroup: true, stageType: "education", plannedHours: 12 }),
 stage(8, "Обучение сотрудников", { parentStageId: 7, stageType: "education", plannedHours: 16 }),
 stage(9, "Доработка инструкции", { parentStageId: 7, stageType: "education" })];
 let events: ProjectGanttEvent[] = [2,3,5,6,8].map((id) => ({id, projectId: "31", stageId: id, title: `План ${id}`, eventKind: "duration", planStartDate: "2026-09-14", planEndDate: "2026-11-20", factStartDate: null, factEndDate: null, sortOrder: id, createdAt: "", updatedAt: ""}));
 $backendApi.defaults.adapter = async (config) => {
  const url = config.url ?? "";
  const payload = typeof config.data === "string" ? JSON.parse(config.data) : config.data;
  if (config.method === "patch") {
   const id = Number(url.split("/").at(-1));
   if (url.includes("/stages/")) stages = stages.map(item => item.id === id ? {...item, ...payload} : item);
   else events = events.map(item => item.id === id ? {...item, ...payload} : item);
  }
  const data = url.includes("/stages/") ? stages.find(item => item.id === Number(url.split("/").at(-1))) : url.endsWith("/stages") ? stages : url.endsWith("/events") ? events : [];
  return {data: structuredClone(data), status: 200, statusText: "OK", config, headers: {}};
 };
}

