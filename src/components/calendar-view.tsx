"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useMemo, useRef, useState, useTransition } from "react";
import { CalendarPlus, ChevronDown, Clock3, Pencil, Plus, Save, Trash2, X } from "lucide-react";
import type { DiaryEntry } from "@/types/diary";
import { dateLabel, isQuarterHour, today } from "@/lib/utils";
import { QuarterHourTimeInput } from "@/components/quarter-hour-time-input";
import { createCalendarEventAction, deleteCalendarEventAction, migrateLegacyCalendarEventsAction, updateCalendarEventAction } from "@/app/(app)/calendar/actions";
import { isLocalReadOnly } from "@/lib/supabase/config";
import type { CalendarEvent, CalendarEventInput } from "@/types/calendar";

type EventField = "time" | "detail";
type EventErrors = Partial<Record<EventField, string>>;

const currentHour = () => `${String(new Date().getHours()).padStart(2, "0")}:00`;
const wordLimit = (value: string) => {
  const words = value.match(/\S+\s*/g) ?? [];
  return words.length <= 200 ? value : words.slice(0, 200).join("");
};
const sortEvents = (items: CalendarEvent[]) => [...items].sort((a, b) => (a.time ?? "").localeCompare(b.time ?? ""));
const groupEvents = (items: CalendarEvent[]) => items.reduce<Record<string, CalendarEvent[]>>((grouped, event) => {
  grouped[event.date] = sortEvents([...(grouped[event.date] ?? []), event]);
  return grouped;
}, {});

export function CalendarView({ year, month, entries, initialEvents }: { year: number; month: number; entries: DiaryEntry[]; initialEvents: CalendarEvent[] }) {
  const router = useRouter();
  const starts = (new Date(year, month, 1).getDay() + 6) % 7;
  const days = new Date(year, month + 1, 0).getDate();
  const monthName = new Intl.DateTimeFormat("en-US", { month: "long", year: "numeric" }).format(new Date(year, month));
  const [events, setEvents] = useState<Record<string, CalendarEvent[]>>(() => groupEvents(initialEvents));
  const [selectedDate, setSelectedDate] = useState<string | null>(null);
  const [addingDate, setAddingDate] = useState<string | null>(null);
  const [editingEvent, setEditingEvent] = useState<CalendarEvent | null>(null);
  const [draft, setDraft] = useState({ time: "", detail: "" });
  const [eventErrors, setEventErrors] = useState<EventErrors>({});
  const [dataError, setDataError] = useState<string | null>(null);
  const [savingEvent, setSavingEvent] = useState(false);
  const [deletingEventId, setDeletingEventId] = useState<string | null>(null);
  const migrationStarted = useRef(false);
  const [navigationPending, startTransition] = useTransition();
  const dates = useMemo(() => Array.from({ length: days }, (_, index) => `${year}-${String(month + 1).padStart(2, "0")}-${String(index + 1).padStart(2, "0")}`), [year, month, days]);

  useEffect(() => {
    if (isLocalReadOnly || migrationStarted.current) return;
    migrationStarted.current = true;
    const legacyKeys = Object.keys(window.localStorage).filter((key) => key.startsWith("mine-calendar-events-"));
    const migratedKeys: string[] = [];
    const legacyEvents: CalendarEventInput[] = [];
    legacyKeys.forEach((key) => {
      const date = key.replace("mine-calendar-events-", "");
      try {
        const items = JSON.parse(window.localStorage.getItem(key) ?? "[]") as Array<{ time?: string | null; detail?: string }>;
        items.forEach((item) => {
          if (item.detail?.trim()) legacyEvents.push({ date, time: item.time || null, detail: item.detail.trim() });
        });
        migratedKeys.push(key);
      } catch {
        // Keep malformed legacy data untouched so it can be inspected manually.
      }
    });
    if (!legacyEvents.length) return;

    startTransition(() => {
      void migrateLegacyCalendarEventsAction(legacyEvents).then((inserted = []) => {
        migratedKeys.forEach((key) => window.localStorage.removeItem(key));
        setEvents((current) => inserted.reduce<Record<string, CalendarEvent[]>>((next, event) => {
          if (dates.includes(event.date)) next[event.date] = sortEvents([...(next[event.date] ?? []), event]);
          return next;
        }, { ...current }));
      }).catch((error) => setDataError(error instanceof Error ? error.message : "Could not migrate legacy calendar events."));
    });
  }, [dates, startTransition]);

  const daysWithDiary = new Set(entries.map((entry) => entry.entry_date));
  const activeEvents = selectedDate ? events[selectedDate] ?? [] : [];
  const activeDiary = selectedDate ? entries.find((entry) => entry.entry_date === selectedDate) : undefined;
  const navigateMonth = (offset: -1 | 1) => {
    if (navigationPending) return;
    const next = new Date(year, month + offset, 1);
    startTransition(() => router.push(`/calendar?month=${next.getMonth()}&year=${next.getFullYear()}`));
  };
  const openEventModal = (date: string) => {
    setAddingDate(date);
    setEditingEvent(null);
    setDraft({ time: currentHour(), detail: "" });
    setEventErrors({});
  };
  const openEditEventModal = (event: CalendarEvent) => {
    setAddingDate(event.date);
    setEditingEvent(event);
    setDraft({ time: event.time ?? "", detail: event.detail });
    setEventErrors({});
  };
  const closeEventModal = () => {
    setAddingDate(null);
    setEditingEvent(null);
    setDraft({ time: "", detail: "" });
    setEventErrors({});
  };
  const clearEventError = (field: EventField) => setEventErrors((current) => {
    if (!current[field]) return current;
    const next = { ...current };
    delete next[field];
    return next;
  });
  const saveEvent = async () => {
    if (savingEvent) return;
    const nextErrors: EventErrors = {};
    if (draft.time && !isQuarterHour(draft.time)) nextErrors.time = "Please choose a time in 15-minute intervals.";
    if (!draft.detail.trim()) nextErrors.detail = "Please enter event details.";
    setEventErrors(nextErrors);
    if (!addingDate || Object.keys(nextErrors).length) return;

    setSavingEvent(true);
    setDataError(null);
    try {
      const input = { date: addingDate, time: draft.time || null, detail: draft.detail.trim() };
      if (editingEvent) {
        const updated = await updateCalendarEventAction(editingEvent.id, input);
        setEvents((current) => ({ ...current, [addingDate]: sortEvents((current[addingDate] ?? []).map((item) => item.id === updated.id ? updated : item)) }));
      } else {
        const created = await createCalendarEventAction(input);
        setEvents((current) => ({ ...current, [addingDate]: sortEvents([...(current[addingDate] ?? []), created]) }));
      }
      setSelectedDate(addingDate);
      setAddingDate(null);
      setEditingEvent(null);
      setDraft({ time: "", detail: "" });
      setEventErrors({});
    } catch (error) {
      setDataError(error instanceof Error ? error.message : "Could not save this event.");
    } finally {
      setSavingEvent(false);
    }
  };
  const removeEvent = async (date: string, id: string) => {
    if (deletingEventId) return;
    setDeletingEventId(id);
    setDataError(null);
    try {
      await deleteCalendarEventAction(id);
      setEvents((current) => ({ ...current, [date]: (current[date] ?? []).filter((item) => item.id !== id) }));
    } catch (error) {
      setDataError(error instanceof Error ? error.message : "Could not delete this event.");
    } finally {
      setDeletingEventId(null);
    }
  };

  return <>
    <div className="section-head">
      <div><p className="eyebrow">Pages across time</p><h1 className="section-title">{monthName}</h1></div>
      <div className="flex gap-2" aria-busy={navigationPending}>
        <button className="button button-quiet" type="button" disabled={navigationPending} onClick={() => navigateMonth(-1)}>Previous</button>
        <button className="button button-quiet" type="button" disabled={navigationPending} onClick={() => navigateMonth(1)}>{navigationPending ? "Loading…" : "Next"}</button>
      </div>
    </div>
    {dataError && <p className="notice" role="alert">{dataError}</p>}
    <div className="calendar event-calendar">
      {["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"].map((day) => <span className="weekday" key={day}>{day}</span>)}
      {Array.from({ length: starts }, (_, index) => <span className="calendar-day blank" key={`blank-${index}`} />)}
      {dates.map((date) => {
        const count = events[date]?.length ?? 0;
        const expanded = selectedDate === date;
        return <div className={`calendar-cell ${count > 0 ? "has-events" : ""} ${date === today() ? "today" : ""} ${expanded ? "selected" : ""}`} key={date}>
          <button className="calendar-open" onClick={() => setSelectedDate(expanded ? null : date)} aria-expanded={expanded} aria-label={`Show events for ${dateLabel(date)}`}>
            <span>{Number(date.slice(-2))}</span>
            {count > 0 && <small className="calendar-event-count"><b>{count}</b><span> event{count > 1 ? "s" : ""}</span></small>}
            {daysWithDiary.has(date) && <i className="calendar-diary-dot" title="Diary entry" />}
          </button>
          <button className="calendar-add" disabled={isLocalReadOnly} onClick={() => openEventModal(date)} aria-label={`Add event on ${dateLabel(date)}`}><Plus size={15} /></button>
        </div>;
      })}
    </div>
    {selectedDate && <section className="calendar-detail glass">
      <div className="calendar-detail-head">
        <div><p className="eyebrow" style={{ color: "var(--leaf)" }}>Day details</p><h2>{dateLabel(selectedDate)}</h2></div>
        <div className="flex items-center gap-2">
          <button className="button button-quiet" disabled={isLocalReadOnly} onClick={() => openEventModal(selectedDate)}><CalendarPlus size={17} />Add event</button>
          <button className="icon-button" onClick={() => setSelectedDate(null)} aria-label="Collapse day details"><ChevronDown size={19} /></button>
        </div>
      </div>
      {activeDiary && <Link className="calendar-diary-entry" href={`/diary?date=${selectedDate}`}>
        <span>Daily entry</span>
        <strong>{activeDiary.title}</strong>
      </Link>}
      {activeEvents.length ? <div className="event-list">{activeEvents.map((event) => <article className="event-row" key={event.id}>
        <span className="event-time">{event.time ? <><Clock3 size={15} />{event.time}</> : "Any time"}</span><p>{event.detail}</p>
        <span className="event-actions"><button disabled={isLocalReadOnly || Boolean(deletingEventId)} onClick={() => openEditEventModal(event)} aria-label={`Edit ${event.detail}`}><Pencil size={16} /></button><button className="danger" disabled={isLocalReadOnly || Boolean(deletingEventId)} onClick={() => void removeEvent(selectedDate, event.id)} aria-label={`Delete ${event.detail}`}><Trash2 size={16} /></button></span>
      </article>)}</div> : <div className="event-empty">No events yet. Add a small plan, thought, or reminder for this day.</div>}
    </section>}
    {addingDate && <div className="modal-backdrop" role="presentation" onMouseDown={closeEventModal}>
      <section className="daily-modal glass" role="dialog" aria-modal="true" aria-labelledby="event-title" onMouseDown={(event) => event.stopPropagation()}>
        <header>
          <div><p className="eyebrow" style={{ color: "var(--leaf)" }}>{dateLabel(addingDate)}</p><h2 id="event-title">{editingEvent ? "Edit event" : "Add event"}</h2></div>
          <button className="icon-button" onClick={closeEventModal} aria-label="Close"><X size={19} /></button>
        </header>
        <form className="modal-form" noValidate onSubmit={(event) => { event.preventDefault(); void saveEvent(); }}>
          <div className={`field ${eventErrors.time ? "invalid" : ""}`}>
            <label className="field-label" htmlFor="event-time"><span>Time</span><small>Optional</small></label>
            <span className="event-time-input">
              <QuarterHourTimeInput id="event-time" name="time" value={draft.time} invalid={Boolean(eventErrors.time)} describedBy={eventErrors.time ? "event-time-error" : undefined} onChange={(time) => { setDraft({ ...draft, time }); clearEventError("time"); }} />
              <button className="event-time-clear" type="button" disabled={!draft.time} onClick={() => { setDraft({ ...draft, time: "" }); clearEventError("time"); }} aria-label="Clear time"><X size={17} /></button>
            </span>
            {eventErrors.time && <small className="field-message" id="event-time-error" role="alert">{eventErrors.time}</small>}
          </div>
          <label className={`field ${eventErrors.detail ? "invalid" : ""}`} htmlFor="event-detail">
            <span className="field-label">Detail <small>Required</small></span>
            <textarea id="event-detail" name="detail" className="short-area" required value={draft.detail} aria-invalid={Boolean(eventErrors.detail)} aria-describedby={eventErrors.detail ? "event-detail-error" : "event-detail-hint"} onChange={(event) => { setDraft({ ...draft, detail: wordLimit(event.target.value) }); clearEventError("detail"); }} placeholder="What is happening?" />
            {eventErrors.detail && <small className="field-message" id="event-detail-error" role="alert">{eventErrors.detail}</small>}
          </label>
          <p className="text-sm opacity-60" id="event-detail-hint">Up to 200 words.</p>
          <button className="button button-dark justify-center" type="submit" disabled={savingEvent}>{savingEvent ? "Saving…" : editingEvent ? <><Save size={18} />Save changes</> : <><Plus size={18} />Add event</>}</button>
        </form>
      </section>
    </div>}
  </>;
}
