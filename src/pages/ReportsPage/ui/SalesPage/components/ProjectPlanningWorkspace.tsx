import { useCallback, useState } from "react";
import type { ProjectGanttStage, ReportProject } from "../model/types";
import { buildGanttPlanning, formatGanttHours, GANTT_CATEGORY_LABELS, isWorkStage, type GanttPlanningTotal } from "../model/ganttPlanning";
import { AutonomousProjectGantt } from "./AutonomousProjectGantt";
import styles from "../SalesProfitabilityReport.module.scss";
import planningStyles from "./ProjectPlanning.module.scss";

const percent = (value: number | null) => value === null ? "—" : `${value.toLocaleString("ru-RU", { maximumFractionDigits: 1 })}%`;
function ProgressBar({ value, label }: { value: number | null; label: string }) {
  return <div className={styles.projectHoursStageProgressBar} role="progressbar" aria-label={label}
    aria-valuemin={0} aria-valuemax={100} aria-valuenow={value ?? undefined} aria-valuetext={value === null ? "Недостаточно оценок" : percent(value)}>
    <span style={{ width: `${value ?? 0}%` }} />
  </div>;
}
function Metrics({ value }: { value: GanttPlanningTotal }) {
  return <div className={styles.projectHoursStageMetrics}>
    <div><span>Плановый объём</span><strong>{formatGanttHours(value.plannedHours)}</strong></div>
    <div><span>Завершённый объём</span><strong>{formatGanttHours(value.plannedHours === null ? null : value.completedHours)}</strong></div>
    <div><span>Осталось по плану</span><strong>{formatGanttHours(value.remainingHours)}</strong></div>
  </div>;
}
export function ProjectGanttProgress({ stages, error, onSelectStage, projectStatus }: {
  stages: ProjectGanttStage[] | null; error: string | null; onSelectStage: (stageId: number) => void;
  projectStatus?: ReportProject["projectStatus"];
}) {
  if (error) return <section className={styles.projectHoursSection} role="alert">{error}. Сводка этапов недоступна, нулевые значения не подставлены.</section>;
  if (stages === null) return <section className={styles.projectHoursSection} aria-busy="true">Загрузка этапов и плановых часов…</section>;
  const { overall, categories } = buildGanttPlanning(stages);
  const firstUnestimatedStage = stages.find((stage) => isWorkStage(stage) && stage.plannedHours === null && !stage.isGroup)
    ?? stages.find((stage) => isWorkStage(stage) && stage.plannedHours === null);
  const openStages = stages.filter((stage) => isWorkStage(stage) && stage.groupStatus !== "completed");
  return <section className={`${styles.projectHoursSection} ${planningStyles.summary}`} aria-label="План и готовность этапов">
    <div className={styles.projectHoursOverview}>
      <div className={styles.projectHoursHeading}><span>Итог</span><h3>План и готовность проекта</h3>
        <p>Завершённость отмечает пользователь. Вес работы — её плановые часы.</p>
      </div>
      <strong className={planningStyles.overallPercent}>{percent(overall.progress)}</strong>
    </div>
    <ProgressBar value={overall.progress} label="Готовность проекта по ручным статусам" />
    <Metrics value={overall} />
    {overall.missingEstimates > 0 && <p className={planningStyles.warning}>
      {overall.progress === null ? "Процент не рассчитан: у этапов нет плановых часов." : `План неполный: без оценки ${overall.missingEstimates}. Процент учитывает только оценённый объём.`}
      {firstUnestimatedStage && <> <button type="button" className={planningStyles.inlineAction} onClick={() => onSelectStage(firstUnestimatedStage.id)}>Перейти к этапу и указать часы</button></>}
    </p>}
    {overall.roots.length > 0 && overall.progress === null && overall.missingEstimates === 0 && <p className={planningStyles.warning}>Процент не рассчитан: суммарные плановые часы равны нулю.</p>}
    {projectStatus === "completed" && openStages.length > 0 && <p className={planningStyles.warning}>
      Проект завершён, но статусы этапов ещё не отмечены. Проверьте их в Ганте: незавершённых этапов {openStages.length}.
      {" "}<button type="button" className={planningStyles.inlineAction} onClick={() => onSelectStage(openStages[0].id)}>Проверить этапы</button>
    </p>}
    {!overall.roots.length && <p>Добавьте этапы в Ганте и укажите плановые часы.</p>}
    <div className={styles.projectHoursStageCards}>
      {categories.filter((value) => value.category !== "other" || value.roots.length > 0).map((value) => <article key={value.category} className={styles.projectHoursStageCard}>
        <div className={styles.projectHoursStageCardHeader}><strong>{GANTT_CATEGORY_LABELS[value.category]}</strong><span>{percent(value.progress)}</span></div>
        <ProgressBar value={value.progress} label={`Готовность: ${GANTT_CATEGORY_LABELS[value.category]}`} />
        <Metrics value={value} />
        <div className={planningStyles.stageLinks}>
          {value.roots.map((item) => <div key={item.stage.id}>
            <button type="button" onClick={() => onSelectStage(item.stage.id)} title="Показать этап в Ганте">{item.stage.title}</button>
            <span>{formatGanttHours(item.plannedHours)} · {percent(item.progress)}</span>
            {item.needsParentClosure && <small>Все подэтапы завершены. Сам этап ещё не закрыт.</small>}
            {item.stage.groupStatus === "completed" && item.openChildren > 0 && <small className={planningStyles.warning}>Этап закрыт, открытых подэтапов: {item.openChildren}.</small>}
            {item.overallocatedToChildren > 0 && <small className={planningStyles.warning}>Оценки подэтапов превышают план на {formatGanttHours(item.overallocatedToChildren)}.</small>}
          </div>)}
          {!value.roots.length && <small>Этапы этой категории не созданы.</small>}
        </div>
      </article>)}
    </div>
    <p className={planningStyles.sourceNote}>Это доля завершённого планового объёма, не расход часов. Фактические даты и часы по этапам появятся после привязки «Ежедневной отчётности».</p>
  </section>;
}

export function ProjectPlanningWorkspace({ project, onPaymentsChanged, showProgress = true }: {
  project: ReportProject; onPaymentsChanged?: () => void; showProgress?: boolean;
}) {
  const [snapshot, setSnapshot] = useState<{ stages: ProjectGanttStage[] | null; error: string | null }>({ stages: null, error: null });
  const [focusStage, setFocusStage] = useState<{ id: number; revision: number } | null>(null);
  const onPlanningChange = useCallback((stages: ProjectGanttStage[] | null, error: string | null) => setSnapshot({ stages, error }), []);
  return <>
    {showProgress && <ProjectGanttProgress {...snapshot} projectStatus={project.projectStatus} onSelectStage={(id) => setFocusStage((previous) => ({ id, revision: (previous?.revision ?? 0) + 1 }))} />}
    <AutonomousProjectGantt project={project} onPaymentsChanged={onPaymentsChanged} onPlanningChange={onPlanningChange} focusStage={focusStage} />
  </>;
}
