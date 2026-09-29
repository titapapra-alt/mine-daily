"use client";

import Image from "next/image";
import { useCallback, useEffect, useMemo, useState } from "react";
import { Activity, ArrowLeft, CalendarDays, Check, ChevronLeft, ChevronRight, Coffee, Droplets, Dumbbell, Maximize2, Minimize2, Moon, Pencil, Plus, Save, Sparkles, Trash2, Utensils, X } from "lucide-react";
import { dateLabel, displayDate, formatDateEntry, isQuarterHour, parseDisplayDate, today } from "@/lib/utils";
import { type DayData, type Exercise, type Meal, createExercise, createMeal, deleteExercise, deleteMeal, getDailyRecord, saveDailyRecord, updateExercise, updateMeal } from "@/lib/daily-data";
import { QuarterHourTimeInput } from "@/components/quarter-hour-time-input";

type Modal = "today" | "calories" | "exercise" | "mealRecords" | "exerciseRecords" | null;
type DeleteTarget = { kind: "meal"; item: Meal } | { kind: "exercise"; item: Exercise };
type MealField = keyof Omit<Meal, "id">;
type MealErrors = Partial<Record<MealField, string>>;
type ExerciseErrors = Partial<Record<"type", string>>;
const exerciseTypes = ["Weight Training", "HIIT", "Badminton", "Running", "Yoga", "Stretching"];
const parts = ["Full Body", "Upper", "Core", "Lower", "Arms", "Back", "Legs", "Glutes"];
const emptyDay = (date = today()): DayData => ({ date, sleep: "", weight: "", ifHour: "", seedCycling: "", water: false, poo: false, caffeine: false, period: false, note: "", meals: [], exercises: [] });
const seedCyclingLabel = (phase: DayData["seedCycling"]) => phase === "phase_1"
  ? "Pumpkin + Flax seeds"
  : phase === "phase_2" ? "Sunflower + Black sesame seeds" : "Not selected";
const currentHour = () => `${String(new Date().getHours()).padStart(2, "0")}:00`;
const wordLimit = (value: string) => { const words = value.match(/\S+\s*/g) ?? []; return words.length <= 200 ? value : words.slice(0, 200).join(""); };
const quality = (total: number) => total <= 1500 ? ["Excellent", "excellent"] : total <= 1700 ? ["Very Good", "very-good"] : total <= 1800 ? ["So so", "so-so"] : total <= 2100 ? ["Be careful", "careful"] : total <= 2500 ? ["Over", "over"] : ["Dangerous", "dangerous"];
const compareMealsByTime = (first: Meal, second: Meal) => {
  if (!first.time) return second.time ? 1 : 0;
  if (!second.time) return -1;
  return first.time.localeCompare(second.time);
};

export function DailyTracker({ localPreview = false, readOnly = false, initialDate = today() }: { localPreview?: boolean; readOnly?: boolean; initialDate?: string }) {
  const [data, setData] = useState<DayData>(() => emptyDay(initialDate));
  const [mealDraft, setMealDraft] = useState({ time: "", calories: "", detail: "" });
  const [editingMealId, setEditingMealId] = useState<string | null>(null);
  const [mealErrors, setMealErrors] = useState<MealErrors>({});
  const [exerciseDraft, setExerciseDraft] = useState({ type: "", part: "", note: "" });
  const [editingExerciseId, setEditingExerciseId] = useState<string | null>(null);
  const [exerciseErrors, setExerciseErrors] = useState<ExerciseErrors>({});
  const [modal, setModal] = useState<Modal>(null);
  const [returnModal, setReturnModal] = useState<"mealRecords" | "exerciseRecords" | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<DeleteTarget | null>(null);
  const [saved, setSaved] = useState(false);
  const [caloriesWide, setCaloriesWide] = useState(false);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const loadDay = useCallback(async (date: string) => {
    setLoading(true); setError(null); setSaved(false);
    if (localPreview) { setData(emptyDay(date)); setLoading(false); return; }
    try { setData(await getDailyRecord(date)); } catch { setData(emptyDay(date)); } finally { setLoading(false); }
  }, [localPreview]);
  useEffect(() => { queueMicrotask(() => { void loadDay(initialDate); }); }, [initialDate, loadDay]);

  const total = useMemo(() => data.meals.reduce((sum, meal) => sum + (Number(meal.calories) || 0), 0), [data.meals]);
  const mealsByTime = useMemo(() => [...data.meals].sort(compareMealsByTime), [data.meals]);
  const [label, tone] = quality(total);
  const patch = (values: Partial<DayData>) => setData((current) => ({ ...current, ...values }));
  const save = async () => { setSaving(true); setError(null); try { if (!localPreview) await saveDailyRecord(data); setSaved(true); setModal(null); } catch (reason) { setError(reason instanceof Error ? reason.message : "Could not save today."); } finally { setSaving(false); } };
  const openCalories = () => { setReturnModal(null); setEditingMealId(null); setMealDraft({ time: currentHour(), calories: "", detail: "" }); setMealErrors({}); setModal("calories"); };
  const editMeal = (meal: Meal) => { setReturnModal("mealRecords"); setEditingMealId(meal.id); setMealDraft({ time: meal.time, calories: meal.calories, detail: meal.detail }); setMealErrors({}); setModal("calories"); };
  const deleteMealFromModal = (meal: Meal) => { setReturnModal("mealRecords"); setModal(null); setDeleteTarget({ kind: "meal", item: meal }); };
  const clearMealError = (field: MealField) => setMealErrors((current) => { if (!current[field]) return current; const next = { ...current }; delete next[field]; return next; });
  const saveMeal = async () => {
    const nextErrors: MealErrors = {};
    if (!mealDraft.time) nextErrors.time = "Please choose a time.";
    else if (!isQuarterHour(mealDraft.time)) nextErrors.time = "Please choose a time in 15-minute intervals.";
    if (!mealDraft.calories) nextErrors.calories = "Please enter calories.";
    if (!mealDraft.detail.trim()) nextErrors.detail = "Please enter a meal detail.";
    setMealErrors(nextErrors);
    if (Object.keys(nextErrors).length) return;
    setSaving(true); setError(null);
    try {
      const meal = editingMealId
        ? localPreview ? { id: editingMealId, ...mealDraft, detail: mealDraft.detail.trim() } : await updateMeal(editingMealId, mealDraft)
        : localPreview ? { id: crypto.randomUUID(), ...mealDraft, detail: mealDraft.detail.trim() } : await createMeal(data, mealDraft);
      setData((current) => ({ ...current, meals: editingMealId ? current.meals.map((item) => item.id === editingMealId ? meal : item) : [...current.meals, meal] }));
      setMealDraft({ time: "", calories: "", detail: "" }); setMealErrors({}); setEditingMealId(null); setModal(returnModal); setReturnModal(null);
    } catch (reason) { setError(reason instanceof Error ? reason.message : `Could not ${editingMealId ? "update" : "add"} this meal.`); } finally { setSaving(false); }
  };
  const openExercise = () => { setReturnModal(null); setEditingExerciseId(null); setExerciseDraft({ type: "", part: "", note: "" }); setExerciseErrors({}); setModal("exercise"); };
  const editExercise = (exercise: Exercise) => { setReturnModal("exerciseRecords"); setEditingExerciseId(exercise.id); setExerciseDraft({ type: exercise.type, part: exercise.part, note: exercise.note }); setExerciseErrors({}); setModal("exercise"); };
  const deleteExerciseFromModal = (exercise: Exercise) => { setReturnModal("exerciseRecords"); setModal(null); setDeleteTarget({ kind: "exercise", item: exercise }); };
  const saveExercise = async () => {
    if (!exerciseDraft.type) { setExerciseErrors({ type: "Please choose an exercise." }); return; }
    setExerciseErrors({}); setSaving(true); setError(null);
    try {
      const exercise = editingExerciseId
        ? localPreview ? { id: editingExerciseId, ...exerciseDraft } : await updateExercise(editingExerciseId, exerciseDraft)
        : localPreview ? { id: crypto.randomUUID(), ...exerciseDraft } : await createExercise(data, exerciseDraft);
      setData((current) => ({ ...current, exercises: editingExerciseId ? current.exercises.map((item) => item.id === editingExerciseId ? exercise : item) : [...current.exercises, exercise] }));
      setExerciseDraft({ type: "", part: "", note: "" }); setExerciseErrors({}); setEditingExerciseId(null); setModal(returnModal); setReturnModal(null);
    } catch (reason) { setError(reason instanceof Error ? reason.message : `Could not ${editingExerciseId ? "update" : "add"} this exercise.`); } finally { setSaving(false); }
  };
  const confirmDelete = async () => {
    if (!deleteTarget) return;
    setSaving(true); setError(null);
    try {
      if (deleteTarget.kind === "meal") {
        if (!localPreview) await deleteMeal(deleteTarget.item.id);
        setData((current) => ({ ...current, meals: current.meals.filter((item) => item.id !== deleteTarget.item.id) }));
      } else {
        if (!localPreview) await deleteExercise(deleteTarget.item.id);
        setData((current) => ({ ...current, exercises: current.exercises.filter((item) => item.id !== deleteTarget.item.id) }));
      }
      setDeleteTarget(null); setModal(returnModal); setReturnModal(null);
    } catch (reason) { setError(reason instanceof Error ? reason.message : `Could not delete this ${deleteTarget.kind}.`); } finally { setSaving(false); }
  };
  const backToMealRecords = () => { setEditingMealId(null); setMealErrors({}); setReturnModal(null); setModal("mealRecords"); };
  const backToExerciseRecords = () => { setEditingExerciseId(null); setExerciseErrors({}); setReturnModal(null); setModal("exerciseRecords"); };
  const closeDelete = () => { setDeleteTarget(null); setModal(returnModal); setReturnModal(null); };
  const onDate = (date: string) => { void loadDay(date); };

  return <section className="dashboard glass">
    <div className="dashboard-head"><div><p className="eyebrow" style={{ color: "var(--leaf)" }}>Daily dashboard</p><h1 className="section-title">Your day, at a glance.</h1><p className="section-subtitle">{dateLabel(data.date)} · one daily record{saved ? " · saved to Supabase" : ""}</p></div><div className="dashboard-tools"><DashboardDatePicker key={data.date} date={data.date} onDate={onDate} loading={loading} /><div className="dashboard-actions"><button className="button button-quiet compact-action" onClick={openCalories} disabled={readOnly}><Utensils size={18} />Calories</button><button className="button button-quiet compact-action" onClick={openExercise} disabled={readOnly}><Dumbbell size={18} />Exercise</button><button className="button button-quiet compact-action" onClick={() => setModal("today")} disabled={readOnly}><Plus size={20} />Today</button></div></div></div>
    {error && <p className="notice" role="alert">{error}</p>}
    <div className="dashboard-grid">
      <article className={`dash-card calorie-card ${caloriesWide ? "is-wide" : ""}`}><div className="widget-top"><span className="card-date">Daily calories</span><span className="widget-tools"><button className="block-edit-button" type="button" onClick={() => setModal("mealRecords")} disabled={readOnly}><Pencil size={14} />Edit</button><button className="widget-size-toggle" onClick={() => setCaloriesWide(!caloriesWide)} aria-label={caloriesWide ? "Make daily calories compact" : "Expand daily calories"}>{caloriesWide ? <Minimize2 size={17} /> : <Maximize2 size={17} />}</button></span></div><strong>{total.toLocaleString()} <small>kcal</small></strong><span className={`quality ${tone}`}><Sparkles size={15} />{label}</span><div className="calorie-meter" aria-label={`${total} calories today`}><i style={{ width: `${Math.min(100, (total / 2500) * 100)}%` }} /></div><div className="calorie-lines">{mealsByTime.length ? mealsByTime.map((meal) => <span key={meal.id}>{meal.time || "—"} · {meal.calories} kcal · {meal.detail}</span>) : <span>{loading ? "Loading today…" : "Nothing added yet."}</span>}</div></article>
      <article className="dash-card scene-card"><Image src="/images/mine-forest-canopy.jpg" alt="Sunlight filtering through a green forest canopy and blue sky" fill sizes="(max-width: 760px) 100vw, 26vw" /><div className="scene-overlay"><span>Quiet moment</span><p>Take the day gently.</p></div></article>
      <article className="dash-card scene-card focus-scene"><Image src="/images/mine-flower-pause.jpg" alt="A person resting among white and orange wildflowers" fill sizes="(max-width: 760px) 100vw, 26vw" /><div className="scene-overlay"><span>Slow focus</span><p>One gentle thing at a time.</p></div></article>
      <Metric label="Sleep" value={data.sleep ? `${Number(data.sleep).toFixed(2)} h` : "—"} hint="rest last night" /><Metric label="Weight" value={data.weight ? `${Number(data.weight).toFixed(2)} kg` : "—"} hint="today's check-in" /><Metric label="IF" value={data.ifHour || "—"} hint="fasting window" />
      <article className="dash-card exercise-card"><div className="widget-top"><span className="card-date">Exercise records</span><button className="block-edit-button" type="button" onClick={() => setModal("exerciseRecords")} disabled={readOnly}><Pencil size={14} />Edit</button></div><strong>{data.exercises.length || "—"}</strong><div className="exercise-lines">{data.exercises.length ? data.exercises.map((item) => <span key={item.id}><b>{item.type}</b>{item.part ? ` · ${item.part}` : ""}{item.note ? ` · ${item.note}` : ""}</span>) : <span>Nothing added yet.</span>}</div><Activity size={22} /></article>
      <article className="dash-card habits-card"><span className="card-date">Todays&apos;s habits</span><div>{[["Water", data.water, <Droplets size={16} key="water" />], ["Poo", data.poo, <PooIcon size={16} key="poo" />], ["Caffeine", data.caffeine, <Coffee size={16} key="caffeine" />], ["Period", data.period, <Moon size={16} key="period" />]].map(([name, checked, icon]) => <span className={checked ? "habit on" : "habit"} key={String(name)}>{icon as React.ReactNode}{String(name)}</span>)}</div></article><article className="dash-card seed-cycling-card"><span className="card-date">Seed Cycling</span><strong>{seedCyclingLabel(data.seedCycling)}</strong></article><article className="dash-card note-card"><span className="card-date">Note</span><p>{data.note || "A small note can hold a whole day."}</p></article>
    </div>
    {modal === "today" && <TodayModal data={data} patch={patch} onDate={onDate} close={() => setModal(null)} save={save} saving={saving} />}{modal === "calories" && <CaloriesModal editing={Boolean(editingMealId)} back={editingMealId ? backToMealRecords : undefined} draft={mealDraft} errors={mealErrors} setDraft={setMealDraft} clearError={clearMealError} close={() => setModal(null)} save={saveMeal} saving={saving} />}{modal === "exercise" && <ExerciseModal editing={Boolean(editingExerciseId)} back={editingExerciseId ? backToExerciseRecords : undefined} draft={exerciseDraft} errors={exerciseErrors} setDraft={setExerciseDraft} clearError={() => setExerciseErrors({})} close={() => setModal(null)} save={saveExercise} saving={saving} />}{modal === "mealRecords" && <MealRecordsModal items={mealsByTime} close={() => setModal(null)} edit={editMeal} remove={deleteMealFromModal} saving={saving} />}{modal === "exerciseRecords" && <ExerciseRecordsModal items={data.exercises} close={() => setModal(null)} edit={editExercise} remove={deleteExerciseFromModal} saving={saving} />}{deleteTarget && <DeleteModal label={deleteTarget.kind === "meal" ? deleteTarget.item.detail : deleteTarget.item.type} close={closeDelete} remove={() => { void confirmDelete(); }} saving={saving} />}
  </section>;
}

function Metric({ label, value, hint }: { label: string; value: string; hint: string }) { return <article className="dash-card"><span className="card-date">{label}</span><strong>{value}</strong><p>{hint}</p></article>; }
function DashboardDatePicker({ date, onDate, loading }: { date: string; onDate: (date: string) => void; loading: boolean }) {
  const [draft, setDraft] = useState(() => displayDate(date));
  const [invalid, setInvalid] = useState(false);
  const [calendarOpen, setCalendarOpen] = useState(false);
  const [viewMonth, setViewMonth] = useState(() => date.slice(0, 7));
  const updateDraft = (value: string) => {
    const formatted = formatDateEntry(value);
    const parsed = parseDisplayDate(formatted);
    setDraft(formatted);
    setInvalid(formatted.length === 10 && !parsed);
    if (parsed && parsed !== date) onDate(parsed);
  };
  const [viewYear, viewMonthNumber] = viewMonth.split("-").map(Number);
  const daysInMonth = new Date(viewYear, viewMonthNumber, 0).getDate();
  const leadingDays = (new Date(viewYear, viewMonthNumber - 1, 1).getDay() + 6) % 7;
  const monthLabel = new Intl.DateTimeFormat("en-GB", { month: "long", year: "numeric" }).format(new Date(viewYear, viewMonthNumber - 1, 1));
  const shiftMonth = (offset: number) => {
    const next = new Date(viewYear, viewMonthNumber - 1 + offset, 1);
    setViewMonth(`${next.getFullYear()}-${String(next.getMonth() + 1).padStart(2, "0")}`);
  };
  const selectDay = (day: number) => {
    const selected = `${viewMonth}-${String(day).padStart(2, "0")}`;
    setCalendarOpen(false);
    if (selected !== date) onDate(selected);
  };
  return <div className={`dashboard-date-picker ${invalid ? "invalid" : ""}`}><span>View date</span><span className="dashboard-date-controls"><input className="dashboard-date-text" type="text" inputMode="numeric" autoComplete="off" placeholder="dd/mm/yyyy" maxLength={10} value={draft} onChange={(event) => updateDraft(event.target.value)} onBlur={() => { if (!parseDisplayDate(draft)) { setDraft(displayDate(date)); setInvalid(false); } }} disabled={loading} aria-label="View dashboard date" aria-invalid={invalid} /><button className="dashboard-calendar-trigger" type="button" onClick={() => { setViewMonth(date.slice(0, 7)); setCalendarOpen((open) => !open); }} disabled={loading} aria-label="Choose dashboard date from calendar" aria-expanded={calendarOpen} aria-controls="dashboard-calendar-popover"><CalendarDays size={17} /></button></span>{calendarOpen && <div className="dashboard-calendar-popover" id="dashboard-calendar-popover" role="dialog" aria-label="Choose dashboard date"><div className="dashboard-calendar-head"><button type="button" onClick={() => shiftMonth(-1)} aria-label="Previous month"><ChevronLeft size={18} /></button><strong aria-live="polite">{monthLabel}</strong><button type="button" onClick={() => shiftMonth(1)} aria-label="Next month"><ChevronRight size={18} /></button></div><div className="dashboard-calendar-grid" role="grid"><span>Mon</span><span>Tue</span><span>Wed</span><span>Thu</span><span>Fri</span><span>Sat</span><span>Sun</span>{Array.from({ length: leadingDays }, (_, index) => <i key={`blank-${index}`} aria-hidden="true" />)}{Array.from({ length: daysInMonth }, (_, index) => { const day = index + 1; const iso = `${viewMonth}-${String(day).padStart(2, "0")}`; return <button type="button" key={iso} className={iso === date ? "is-selected" : iso === today() ? "is-today" : undefined} onClick={() => selectDay(day)} aria-label={dateLabel(iso)} aria-pressed={iso === date}>{day}</button>; })}</div></div>}</div>;
}
function ModalShell({ title, children, close, back }: { title: string; children: React.ReactNode; close: () => void; back?: () => void }) { return <div className="modal-backdrop" role="presentation" onMouseDown={close}><section className="daily-modal glass" role="dialog" aria-modal="true" aria-labelledby="modal-title" onMouseDown={(event) => event.stopPropagation()}><header><div>{back && <button className="modal-back-button" type="button" onClick={back}><ArrowLeft size={16} />Back</button>}<p className="eyebrow" style={{ color: "var(--leaf)" }}>Daily record</p><h2 id="modal-title">{title}</h2></div><button className="icon-button" onClick={close} aria-label="Close"><X size={19} /></button></header>{children}</section></div>; }
function TodayModal({ data, patch, onDate, close, save, saving }: { data: DayData; patch: (value: Partial<DayData>) => void; onDate: (date: string) => void; close: () => void; save: () => void; saving: boolean }) {
  const [dateDraft, setDateDraft] = useState(() => displayDate(data.date));
  const [dateError, setDateError] = useState<string | null>(null);
  const updateDate = (value: string) => {
    const formatted = formatDateEntry(value);
    const parsed = parseDisplayDate(formatted);
    setDateDraft(formatted);
    setDateError(formatted.length === 10 && !parsed ? "Please enter a valid date." : null);
    if (parsed && parsed !== data.date) onDate(parsed);
  };
  const validDate = parseDisplayDate(dateDraft);
  return <ModalShell title="Add today" close={close}><div className="modal-form"><label className={`field ${dateError ? "invalid" : ""}`} htmlFor="today-date"><span className="field-label">Date <small>DD/MM/YYYY</small></span><input id="today-date" name="date" type="text" inputMode="numeric" autoComplete="off" placeholder="dd/mm/yyyy" maxLength={10} value={dateDraft} aria-invalid={Boolean(dateError)} aria-describedby={dateError ? "today-date-error" : undefined} onChange={(event) => updateDate(event.target.value)} onBlur={() => { if (!validDate) setDateError("Please enter a valid date in DD/MM/YYYY format."); }} />{dateError && <small className="field-message" id="today-date-error" role="alert">{dateError}</small>}</label><div className="mini-grid"><label className="field"><span>Sleep hour</span><input type="number" step="0.01" min="0" value={data.sleep} onChange={(event) => patch({ sleep: event.target.value })} placeholder="0.00" /></label><label className="field"><span>Weight</span><input type="number" step="0.01" min="0" value={data.weight} onChange={(event) => patch({ weight: event.target.value })} placeholder="0.00" /></label></div><label className="field"><span>IF hour</span><input value={data.ifHour} onChange={(event) => patch({ ifHour: event.target.value.replace(/[^0-9/]/g, "") })} placeholder="16/8" /></label><label className="field" htmlFor="seed-cycling"><span>Seed Cycling</span><select id="seed-cycling" name="seedCycling" value={data.seedCycling} onChange={(event) => patch({ seedCycling: event.target.value as DayData["seedCycling"] })}><option value="">Choose phase</option><option value="phase_1">Phase 1 — Pumpkin + Flax seeds</option><option value="phase_2">Phase 2 — Sunflower + Black sesame seeds</option></select></label><div className="tracker-switches"><Toggle label="Water" icon={<Droplets size={17} />} checked={data.water} onClick={() => patch({ water: !data.water })} /><Toggle label="Poo" icon={<PooIcon size={17} />} checked={data.poo} onClick={() => patch({ poo: !data.poo })} /><Toggle label="Caffeine" icon={<Coffee size={17} />} checked={data.caffeine} onClick={() => patch({ caffeine: !data.caffeine })} /><Toggle label="Period" icon={<Moon size={17} />} checked={data.period} onClick={() => patch({ period: !data.period })} /></div><label className="field"><span>Note</span><textarea className="short-area" value={data.note} onChange={(event) => patch({ note: wordLimit(event.target.value) })} placeholder="Anything you want to remember?" /></label><button className="button button-dark justify-center" onClick={save} disabled={saving || !validDate}><Save size={18} />{saving ? "Saving…" : "Save today"}</button></div></ModalShell>;
}
function CaloriesModal({ editing, back, draft, errors, setDraft, clearError, close, save, saving }: { editing: boolean; back?: () => void; draft: Omit<Meal, "id">; errors: MealErrors; setDraft: (value: Omit<Meal, "id">) => void; clearError: (field: MealField) => void; close: () => void; save: () => void; saving: boolean }) {
  return <ModalShell title={editing ? "Edit calories" : "Add calories"} close={close} back={back}><form className="modal-form" noValidate onSubmit={(event) => { event.preventDefault(); void save(); }}><label className={`field ${errors.time ? "invalid" : ""}`} htmlFor="meal-time"><span className="field-label">Time <small>Required</small></span><QuarterHourTimeInput id="meal-time" name="time" value={draft.time} invalid={Boolean(errors.time)} describedBy={errors.time ? "meal-time-error" : undefined} onChange={(time) => { setDraft({ ...draft, time }); clearError("time"); }} />{errors.time && <small className="field-message" id="meal-time-error" role="alert">{errors.time}</small>}</label><label className={`field ${errors.calories ? "invalid" : ""}`} htmlFor="meal-calories"><span className="field-label">Calories <small>Required</small></span><input id="meal-calories" name="calories" type="number" min="0" step="1" placeholder="400" required value={draft.calories} aria-invalid={Boolean(errors.calories)} aria-describedby={errors.calories ? "meal-calories-error" : undefined} onChange={(event) => { setDraft({ ...draft, calories: event.target.value }); clearError("calories"); }} />{errors.calories && <small className="field-message" id="meal-calories-error" role="alert">{errors.calories}</small>}</label><label className={`field ${errors.detail ? "invalid" : ""}`} htmlFor="meal-detail"><span className="field-label">Meal detail <small>Required</small></span><input id="meal-detail" name="detail" placeholder="Fried rice" required value={draft.detail} aria-invalid={Boolean(errors.detail)} aria-describedby={errors.detail ? "meal-detail-error" : undefined} onChange={(event) => { setDraft({ ...draft, detail: event.target.value }); clearError("detail"); }} />{errors.detail && <small className="field-message" id="meal-detail-error" role="alert">{errors.detail}</small>}</label><button className="button button-dark justify-center" type="submit" disabled={saving}>{editing ? <Save size={18} /> : <Plus size={18} />}{saving ? "Saving…" : editing ? "Save changes" : "Add to today"}</button></form></ModalShell>;
}
function ExerciseModal({ editing, back, draft, errors, setDraft, clearError, close, save, saving }: { editing: boolean; back?: () => void; draft: Omit<Exercise, "id">; errors: ExerciseErrors; setDraft: (value: Omit<Exercise, "id">) => void; clearError: () => void; close: () => void; save: () => void; saving: boolean }) { return <ModalShell title={editing ? "Edit exercise" : "Add exercise"} close={close} back={back}><form className="modal-form" noValidate onSubmit={(event) => { event.preventDefault(); void save(); }}><label className={`field ${errors.type ? "invalid" : ""}`} htmlFor="exercise-type"><span className="field-label">Exercise <small>Required</small></span><select id="exercise-type" name="exercise" value={draft.type} required aria-invalid={Boolean(errors.type)} aria-describedby={errors.type ? "exercise-type-error" : undefined} onChange={(event) => { setDraft({ ...draft, type: event.target.value, part: "" }); clearError(); }}><option value="">Choose exercise</option>{exerciseTypes.map((item) => <option key={item}>{item}</option>)}</select>{errors.type && <small className="field-message" id="exercise-type-error" role="alert">{errors.type}</small>}</label><label className="field"><span>Exercise part</span><select name="exercisePart" value={draft.part} disabled={!draft.type} onChange={(event) => setDraft({ ...draft, part: event.target.value })}><option value="">Choose part (optional)</option>{parts.map((item) => <option key={item}>{item}</option>)}</select></label><label className="field"><span>Exercise note</span><textarea name="exerciseNote" className="short-area" value={draft.note} onChange={(event) => setDraft({ ...draft, note: wordLimit(event.target.value) })} placeholder="What did you do? (optional)" /></label><button className="button button-dark justify-center" type="submit" disabled={saving}>{editing ? <Save size={18} /> : <Dumbbell size={18} />}{saving ? "Saving…" : editing ? "Save changes" : "Add exercise"}</button></form></ModalShell>; }
function MealRecordsModal({ items, close, edit, remove, saving }: { items: Meal[]; close: () => void; edit: (item: Meal) => void; remove: (item: Meal) => void; saving: boolean }) { return <ModalShell title="Daily calories" close={close}><div className="records-manager"><p className="records-manager-hint">Choose a meal record to edit or delete.</p>{items.length ? <div className="records-manager-list">{items.map((item) => <div className="records-manager-row" key={item.id}><span><strong>{item.detail}</strong><small>{item.time || "—"} · {item.calories} kcal</small></span><RecordActions label={item.detail} disabled={saving} edit={() => edit(item)} remove={() => remove(item)} /></div>)}</div> : <div className="records-manager-empty">No calorie records for this day.</div>}</div></ModalShell>; }
function ExerciseRecordsModal({ items, close, edit, remove, saving }: { items: Exercise[]; close: () => void; edit: (item: Exercise) => void; remove: (item: Exercise) => void; saving: boolean }) { return <ModalShell title="Exercise records" close={close}><div className="records-manager"><p className="records-manager-hint">Choose an exercise record to edit or delete.</p>{items.length ? <div className="records-manager-list">{items.map((item) => <div className="records-manager-row" key={item.id}><span><strong>{item.type}</strong><small>{[item.part, item.note].filter(Boolean).join(" · ") || "No extra detail"}</small></span><RecordActions label={item.type} disabled={saving} edit={() => edit(item)} remove={() => remove(item)} /></div>)}</div> : <div className="records-manager-empty">No exercise records for this day.</div>}</div></ModalShell>; }
function RecordActions({ label, disabled, edit, remove }: { label: string; disabled: boolean; edit: () => void; remove: () => void }) { return <span className="record-actions"><button className="record-action" type="button" disabled={disabled} onClick={edit} aria-label={`Edit ${label}`} title="Edit"><Pencil size={15} /></button><button className="record-action danger" type="button" disabled={disabled} onClick={remove} aria-label={`Delete ${label}`} title="Delete"><Trash2 size={15} /></button></span>; }
function DeleteModal({ label, close, remove, saving }: { label: string; close: () => void; remove: () => void; saving: boolean }) { return <ModalShell title="Delete record?" close={close}><div className="delete-confirm"><p><strong>{label}</strong> will be removed permanently.</p><div className="delete-confirm-actions"><button className="button button-quiet" type="button" onClick={close} disabled={saving}>Cancel</button><button className="button button-danger" type="button" onClick={remove} disabled={saving}><Trash2 size={17} />{saving ? "Deleting…" : "Delete"}</button></div></div></ModalShell>; }
function PooIcon({ size = 16 }: { size?: number }) { return <svg aria-hidden="true" focusable="false" width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M9 8.5c-.5-2 1-4 3.1-4 .7 0 1-.7.7-1.3l-.4-.7c2.3.5 3.7 2.7 3.1 5 1.8.2 3.2 1.7 3.2 3.6 0 .8-.3 1.5-.7 2.1 1.2.7 2 2 2 3.5 0 2.1-1.7 3.8-3.8 3.8H7.7A3.7 3.7 0 0 1 4 16.8c0-1.8 1.3-3.4 3-3.7a3 3 0 0 1-.6-1.8A2.8 2.8 0 0 1 9 8.5Z"/><path d="M9.5 14h.01M14.5 14h.01M9.5 17c.7.6 1.5.9 2.5.9s1.8-.3 2.5-.9"/></svg>; }
function Toggle({ label, icon, checked, onClick }: { label: string; icon: React.ReactNode; checked: boolean; onClick: () => void }) { return <button type="button" className={`tracker-toggle ${checked ? "on" : ""}`} onClick={onClick} aria-pressed={checked}>{icon}<span>{label}</span>{checked && <Check size={15} />}</button>; }
