"use client";

import { useMemo, useState } from "react";
import { createPortal } from "react-dom";
import { CalendarCheck2, Check, Circle, Clock3, Pencil, Plus, Save, Target, Trash2, X } from "lucide-react";
import { createGoalAction, deleteGoalAction, toggleGoalAction, updateGoalAction } from "@/app/(app)/goals/actions";
import type { GoalChecklist, GoalChecklistInput, GoalTargetType } from "@/types/goal";

type MainTab = "day" | "period";
type Draft = { targetType: GoalTargetType; periodValue: string; title: string; description: string };
type DraftErrors = Partial<Record<"periodValue" | "title" | "description", string>>;
type Modal = { kind: "form"; goal: GoalChecklist | null } | { kind: "delete"; goal: GoalChecklist } | null;

const pad = (value: number) => String(value).padStart(2, "0");
const localISODate = (date = new Date()) => `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}`;
const startOfLocalWeek = (date = new Date()) => { const value = new Date(date); const day = value.getDay() || 7; value.setDate(value.getDate() - day + 1); return localISODate(value); };
const currentPeriodValue = (type: GoalTargetType) => type === "day" ? localISODate() : type === "week" ? weekInputFromDate(startOfLocalWeek()) : type === "month" ? localISODate().slice(0, 7) : localISODate().slice(0, 4);
const emptyDraft = (type: GoalTargetType): Draft => ({ targetType: type, periodValue: currentPeriodValue(type), title: "", description: "" });

function weekInputFromDate(value: string) {
  const date = new Date(`${value}T00:00:00Z`);
  const thursday = new Date(date);
  thursday.setUTCDate(date.getUTCDate() + 4 - (date.getUTCDay() || 7));
  const year = thursday.getUTCFullYear();
  const yearStart = new Date(Date.UTC(year, 0, 1));
  const week = Math.ceil((((thursday.getTime() - yearStart.getTime()) / 86400000) + 1) / 7);
  return `${year}-W${pad(week)}`;
}

function mondayFromWeek(value: string) {
  const match = /^(\d{4})-W(\d{2})$/.exec(value);
  if (!match) return "";
  const year = Number(match[1]);
  const week = Number(match[2]);
  const januaryFourth = new Date(Date.UTC(year, 0, 4));
  const monday = new Date(januaryFourth);
  monday.setUTCDate(januaryFourth.getUTCDate() - (januaryFourth.getUTCDay() || 7) + 1 + (week - 1) * 7);
  return monday.toISOString().slice(0, 10);
}

const periodStartFromDraft = (draft: Draft) => draft.targetType === "day"
  ? draft.periodValue
  : draft.targetType === "week"
    ? mondayFromWeek(draft.periodValue)
    : draft.targetType === "month" ? `${draft.periodValue}-01` : `${draft.periodValue}-01-01`;

const periodValueFromGoal = (goal: GoalChecklist) => goal.target_type === "day"
  ? goal.period_start
  : goal.target_type === "week"
    ? weekInputFromDate(goal.period_start)
    : goal.target_type === "month" ? goal.period_start.slice(0, 7) : goal.period_start.slice(0, 4);

const periodLabel = (goal: GoalChecklist) => {
  const start = new Date(`${goal.period_start}T12:00:00Z`);
  if (goal.target_type === "day") return new Intl.DateTimeFormat("en-GB", { weekday: "short", day: "2-digit", month: "short", year: "numeric", timeZone: "UTC" }).format(start);
  if (goal.target_type === "week") {
    const end = new Date(start); end.setUTCDate(start.getUTCDate() + 6);
    return `${weekInputFromDate(goal.period_start).replace("-W", " · Week ")} · ${new Intl.DateTimeFormat("en-GB", { day: "2-digit", month: "short", timeZone: "UTC" }).format(start)}–${new Intl.DateTimeFormat("en-GB", { day: "2-digit", month: "short", timeZone: "UTC" }).format(end)}`;
  }
  if (goal.target_type === "month") return new Intl.DateTimeFormat("en-GB", { month: "long", year: "numeric", timeZone: "UTC" }).format(start);
  return goal.period_start.slice(0, 4);
};

const sortGoals = (goals: GoalChecklist[]) => [...goals].sort((a, b) => b.period_start.localeCompare(a.period_start) || a.title.localeCompare(b.title));
const targetLabels: Record<GoalTargetType, string> = { day: "Day", week: "Week", month: "Month", year: "Year" };

export function GoalsChecklist({ initialGoals, localPreview = false, readOnly = false }: { initialGoals: GoalChecklist[]; localPreview?: boolean; readOnly?: boolean }) {
  const [goals, setGoals] = useState(() => sortGoals(initialGoals));
  const [mainTab, setMainTab] = useState<MainTab>("day");
  const [periodType, setPeriodType] = useState<Exclude<GoalTargetType, "day">>("week");
  const [modal, setModal] = useState<Modal>(null);
  const [draft, setDraft] = useState<Draft>(() => emptyDraft("day"));
  const [errors, setErrors] = useState<DraftErrors>({});
  const [savingId, setSavingId] = useState<string | null>(null);
  const [savingForm, setSavingForm] = useState(false);
  const [dataError, setDataError] = useState<string | null>(null);

  const visibleGoals = useMemo(() => goals.filter((goal) => mainTab === "day" ? goal.target_type === "day" : goal.target_type === periodType), [goals, mainTab, periodType]);
  const completed = visibleGoals.filter((goal) => goal.is_complete).length;
  const completion = visibleGoals.length ? Math.round((completed / visibleGoals.length) * 100) : 0;

  const openAdd = () => { const type = mainTab === "day" ? "day" : periodType; setDraft(emptyDraft(type)); setErrors({}); setDataError(null); setModal({ kind: "form", goal: null }); };
  const openEdit = (goal: GoalChecklist) => { setDraft({ targetType: goal.target_type, periodValue: periodValueFromGoal(goal), title: goal.title, description: goal.description }); setErrors({}); setDataError(null); setModal({ kind: "form", goal }); };
  const closeModal = () => { if (savingForm) return; setModal(null); setErrors({}); setDataError(null); };
  const clearError = (field: keyof DraftErrors) => setErrors((current) => { if (!current[field]) return current; const next = { ...current }; delete next[field]; return next; });

  const saveGoal = async () => {
    if (savingForm || modal?.kind !== "form") return;
    const nextErrors: DraftErrors = {};
    const periodStart = periodStartFromDraft(draft);
    const title = draft.title.trim();
    const description = draft.description.trim();
    if (!periodStart) nextErrors.periodValue = "Choose a valid target period.";
    if (!title) nextErrors.title = "Enter a target.";
    else if (title.length > 160) nextErrors.title = "Target must not exceed 160 characters.";
    if (description.length > 1000) nextErrors.description = "Description must not exceed 1,000 characters.";
    setErrors(nextErrors);
    if (Object.keys(nextErrors).length) return;
    setSavingForm(true); setDataError(null);
    try {
      const input: GoalChecklistInput = { target_type: draft.targetType, period_start: periodStart, title, description: draft.targetType === "day" ? "" : description, is_complete: modal.goal?.is_complete ?? false };
      const saved = localPreview
        ? { id: modal.goal?.id ?? crypto.randomUUID(), ...input }
        : modal.goal ? await updateGoalAction(modal.goal.id, input) : await createGoalAction(input);
      setGoals((current) => sortGoals(modal.goal ? current.map((goal) => goal.id === saved.id ? saved : goal) : [...current, saved]));
      setModal(null);
    } catch (error) { setDataError(error instanceof Error ? error.message : "Could not save this goal."); }
    finally { setSavingForm(false); }
  };

  const toggleGoal = async (goal: GoalChecklist) => {
    if (savingId || readOnly) return;
    const nextComplete = !goal.is_complete;
    setSavingId(goal.id); setDataError(null);
    try {
      const updated = localPreview ? { ...goal, is_complete: nextComplete } : await toggleGoalAction(goal.id, nextComplete);
      setGoals((current) => current.map((item) => item.id === updated.id ? updated : item));
    } catch (error) { setDataError(error instanceof Error ? error.message : "Could not update this goal."); }
    finally { setSavingId(null); }
  };

  const deleteGoal = async () => {
    if (savingForm || modal?.kind !== "delete") return;
    const target = modal.goal;
    setSavingForm(true); setDataError(null);
    try {
      const deletedId = localPreview ? target.id : await deleteGoalAction(target.id);
      setGoals((current) => current.filter((goal) => goal.id !== deletedId));
      setModal(null);
    } catch (error) { setDataError(error instanceof Error ? error.message : "Could not delete this goal."); }
    finally { setSavingForm(false); }
  };

  return <section className="goals-page page-sheet glass">
    <header className="goals-head"><div><p className="eyebrow" style={{ color: "var(--leaf)" }}>Personal targets</p><h1 className="section-title">Goals checklist.</h1><p className="section-subtitle">Turn intentions into small, checkable promises.</p></div>{!readOnly && <button className="button button-dark" type="button" onClick={openAdd}><Plus size={18} />Add target</button>}</header>
    {readOnly && <p className="notice" role="status">Goals are view-only while local read-only mode is active.</p>}
    {dataError && !modal && <p className="notice" role="alert">{dataError}</p>}

    <div className="goal-main-tabs" role="tablist" aria-label="Goal checklist type">
      <button type="button" role="tab" aria-selected={mainTab === "day"} className={mainTab === "day" ? "is-active" : ""} onClick={() => setMainTab("day")}><CalendarCheck2 size={18} />Day</button>
      <button type="button" role="tab" aria-selected={mainTab === "period"} className={mainTab === "period" ? "is-active" : ""} onClick={() => setMainTab("period")}><Target size={18} />Week · Month · Year</button>
    </div>

    {mainTab === "period" && <div className="goal-period-tabs" role="tablist" aria-label="Target period">{(["week", "month", "year"] as const).map((type) => <button type="button" role="tab" aria-selected={periodType === type} className={periodType === type ? "is-active" : ""} onClick={() => setPeriodType(type)} key={type}>{targetLabels[type]}</button>)}</div>}

    <div className="goal-summary" aria-label="Visible goal progress"><article><span>Targets</span><strong>{visibleGoals.length}</strong></article><article><span>Complete</span><strong>{completed}</strong></article><article><span>Progress</span><strong>{completion}%</strong></article></div>

    {mainTab === "day" ? <DayGoalsTable goals={visibleGoals} readOnly={readOnly} savingId={savingId} toggle={toggleGoal} edit={openEdit} remove={(goal) => { setDataError(null); setModal({ kind: "delete", goal }); }} add={openAdd} /> : <PeriodGoalsList goals={visibleGoals} readOnly={readOnly} savingId={savingId} toggle={toggleGoal} edit={openEdit} remove={(goal) => { setDataError(null); setModal({ kind: "delete", goal }); }} add={openAdd} type={periodType} />}

    {modal?.kind === "form" && createPortal(<div className="modal-backdrop" role="presentation" onMouseDown={closeModal}><section className="daily-modal goal-modal glass" role="dialog" aria-modal="true" aria-labelledby="goal-modal-title" onMouseDown={(event) => event.stopPropagation()}><header><div><p className="eyebrow" style={{ color: "var(--leaf)" }}>Goals checklist</p><h2 id="goal-modal-title">{modal.goal ? "Edit target" : "Add target"}</h2></div><button className="icon-button" type="button" onClick={closeModal} aria-label="Close"><X size={19} /></button></header><form className="modal-form" noValidate onSubmit={(event) => { event.preventDefault(); void saveGoal(); }}>
      {mainTab === "period" && !modal.goal && <label className="field" htmlFor="goal-type"><span>Target for</span><select id="goal-type" value={draft.targetType} onChange={(event) => { const targetType = event.target.value as GoalTargetType; setDraft(emptyDraft(targetType)); setErrors({}); }}><option value="week">Week</option><option value="month">Month</option><option value="year">Year</option></select></label>}
      <GoalPeriodField draft={draft} error={errors.periodValue} setValue={(periodValue) => { setDraft({ ...draft, periodValue }); clearError("periodValue"); }} />
      <label className={`field ${errors.title ? "invalid" : ""}`} htmlFor="goal-title"><span className="field-label">Target <small>Required</small></span><input id="goal-title" value={draft.title} maxLength={160} onChange={(event) => { setDraft({ ...draft, title: event.target.value }); clearError("title"); }} placeholder="Walk for 30 minutes" aria-invalid={Boolean(errors.title)} aria-describedby={errors.title ? "goal-title-error" : undefined} />{errors.title && <small className="field-message" id="goal-title-error" role="alert">{errors.title}</small>}</label>
      {draft.targetType !== "day" && <label className={`field ${errors.description ? "invalid" : ""}`} htmlFor="goal-description"><span>Description</span><textarea id="goal-description" className="goal-description" value={draft.description} maxLength={1000} onChange={(event) => { setDraft({ ...draft, description: event.target.value }); clearError("description"); }} placeholder="Why this matters or how you plan to do it…" aria-invalid={Boolean(errors.description)} aria-describedby={errors.description ? "goal-description-error" : undefined} />{errors.description && <small className="field-message" id="goal-description-error" role="alert">{errors.description}</small>}</label>}
      {dataError && <p className="notice" role="alert">{dataError}</p>}
      <button className="button button-dark justify-center" type="submit" disabled={savingForm}>{savingForm ? "Saving…" : <><Save size={18} />{modal.goal ? "Save changes" : "Add target"}</>}</button>
    </form></section></div>, document.body)}

    {modal?.kind === "delete" && createPortal(<div className="modal-backdrop" role="presentation" onMouseDown={closeModal}><section className="daily-modal goal-delete-modal glass" role="alertdialog" aria-modal="true" aria-labelledby="goal-delete-title" onMouseDown={(event) => event.stopPropagation()}><header><div><p className="eyebrow" style={{ color: "var(--brown)" }}>Delete target</p><h2 id="goal-delete-title">Remove this target?</h2></div><button className="icon-button" type="button" onClick={closeModal} aria-label="Close"><X size={19} /></button></header><p><strong>{modal.goal.title}</strong></p><p>{periodLabel(modal.goal)} · This cannot be undone.</p>{dataError && <p className="notice" role="alert">{dataError}</p>}<div className="goal-delete-actions"><button className="button button-quiet" type="button" onClick={closeModal} disabled={savingForm}>Cancel</button><button className="button button-danger" type="button" onClick={() => void deleteGoal()} disabled={savingForm}><Trash2 size={17} />{savingForm ? "Deleting…" : "Delete target"}</button></div></section></div>, document.body)}
  </section>;
}

function GoalPeriodField({ draft, error, setValue }: { draft: Draft; error?: string; setValue: (value: string) => void }) {
  const inputType = draft.targetType === "day" ? "date" : draft.targetType === "week" ? "week" : draft.targetType === "month" ? "month" : "number";
  return <label className={`field ${error ? "invalid" : ""}`} htmlFor="goal-period"><span className="field-label">{targetLabels[draft.targetType]} <small>Required</small></span><input id="goal-period" type={inputType} min={draft.targetType === "year" ? "1900" : undefined} max={draft.targetType === "year" ? "2100" : undefined} step={draft.targetType === "year" ? "1" : undefined} value={draft.periodValue} onChange={(event) => setValue(event.target.value)} aria-invalid={Boolean(error)} aria-describedby={error ? "goal-period-error" : undefined} />{error && <small className="field-message" id="goal-period-error" role="alert">{error}</small>}</label>;
}

function GoalCheck({ goal, disabled, toggle }: { goal: GoalChecklist; disabled: boolean; toggle: (goal: GoalChecklist) => void }) {
  return <label className={`goal-check ${goal.is_complete ? "is-complete" : ""}`}><input type="checkbox" checked={goal.is_complete} disabled={disabled} onChange={() => toggle(goal)} aria-label={`Mark ${goal.title} ${goal.is_complete ? "incomplete" : "complete"}`} /><span aria-hidden="true">{goal.is_complete ? <Check size={18} /> : <Circle size={18} />}</span><small>{disabled ? "Saving…" : goal.is_complete ? "Complete" : "Open"}</small></label>;
}

function GoalActions({ goal, readOnly, edit, remove }: { goal: GoalChecklist; readOnly: boolean; edit: (goal: GoalChecklist) => void; remove: (goal: GoalChecklist) => void }) {
  if (readOnly) return null;
  return <span className="goal-row-actions"><button type="button" onClick={() => edit(goal)} aria-label={`Edit ${goal.title}`}><Pencil size={16} /></button><button className="danger" type="button" onClick={() => remove(goal)} aria-label={`Delete ${goal.title}`}><Trash2 size={16} /></button></span>;
}

function GoalEmpty({ label, readOnly, add }: { label: string; readOnly: boolean; add: () => void }) {
  return <div className="goal-empty"><Target size={28} /><strong>No {label.toLowerCase()} targets yet</strong><span>Add one intention you can clearly mark complete.</span>{!readOnly && <button className="button button-quiet" type="button" onClick={add}><Plus size={18} />Add target</button>}</div>;
}

function DayGoalsTable({ goals, readOnly, savingId, toggle, edit, remove, add }: { goals: GoalChecklist[]; readOnly: boolean; savingId: string | null; toggle: (goal: GoalChecklist) => void; edit: (goal: GoalChecklist) => void; remove: (goal: GoalChecklist) => void; add: () => void }) {
  if (!goals.length) return <GoalEmpty label="Day" readOnly={readOnly} add={add} />;
  return <div className="goal-day-table-wrap"><table className="goal-day-table"><thead><tr><th>Date</th><th>Target</th><th>Complete</th><th><span className="sr-only">Actions</span></th></tr></thead><tbody>{goals.map((goal) => <tr className={goal.is_complete ? "is-complete" : ""} key={goal.id}><td data-label="Date">{periodLabel(goal)}</td><td data-label="Target"><strong>{goal.title}</strong></td><td data-label="Complete"><GoalCheck goal={goal} disabled={readOnly || savingId === goal.id} toggle={toggle} /></td><td><GoalActions goal={goal} readOnly={readOnly} edit={edit} remove={remove} /></td></tr>)}</tbody></table></div>;
}

function PeriodGoalsList({ goals, type, readOnly, savingId, toggle, edit, remove, add }: { goals: GoalChecklist[]; type: Exclude<GoalTargetType, "day">; readOnly: boolean; savingId: string | null; toggle: (goal: GoalChecklist) => void; edit: (goal: GoalChecklist) => void; remove: (goal: GoalChecklist) => void; add: () => void }) {
  if (!goals.length) return <GoalEmpty label={targetLabels[type]} readOnly={readOnly} add={add} />;
  return <div className="goal-period-list">{goals.map((goal) => <article className={`goal-period-card ${goal.is_complete ? "is-complete" : ""}`} key={goal.id}><div className="goal-period-card-head"><span><Clock3 size={16} />{periodLabel(goal)}</span><GoalActions goal={goal} readOnly={readOnly} edit={edit} remove={remove} /></div><h3>{goal.title}</h3><p>{goal.description || "No description added."}</p><GoalCheck goal={goal} disabled={readOnly || savingId === goal.id} toggle={toggle} /></article>)}</div>;
}
