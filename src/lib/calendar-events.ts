import "server-only";

import { assertLocalWritable } from "@/lib/supabase/config";
import { requireUser } from "@/lib/supabase/server";
import type { CalendarEvent, CalendarEventInput } from "@/types/calendar";

type RawCalendarEvent = {
  id: string;
  event_date: string;
  event_time: string | null;
  detail: string;
};

const mapEvent = (event: RawCalendarEvent): CalendarEvent => ({
  id: event.id,
  date: event.event_date,
  time: event.event_time?.slice(0, 5) ?? null,
  detail: event.detail,
});

export async function getCalendarEvents(startDate: string, endDate: string) {
  const { supabase } = await requireUser();
  const { data, error } = await supabase
    .from("calendar_events")
    .select("id, event_date, event_time, detail")
    .gte("event_date", startDate)
    .lte("event_date", endDate)
    .order("event_date")
    .order("event_time", { nullsFirst: true });
  if (error) throw error;
  return (data ?? []).map((event) => mapEvent(event as RawCalendarEvent));
}

export async function createCalendarEvent(event: CalendarEventInput) {
  assertLocalWritable();
  const { supabase, userId } = await requireUser();
  const { data, error } = await supabase
    .from("calendar_events")
    .insert({
      user_id: userId,
      event_date: event.date,
      event_time: event.time || null,
      detail: event.detail.trim(),
    })
    .select("id, event_date, event_time, detail")
    .single();
  if (error) throw error;
  return mapEvent(data as RawCalendarEvent);
}

export async function updateCalendarEvent(id: string, event: CalendarEventInput) {
  assertLocalWritable();
  const { supabase, userId } = await requireUser();
  const { data, error } = await supabase
    .from("calendar_events")
    .update({
      event_date: event.date,
      event_time: event.time || null,
      detail: event.detail.trim(),
    })
    .eq("id", id)
    .eq("user_id", userId)
    .select("id, event_date, event_time, detail")
    .single();
  if (error) throw error;
  return mapEvent(data as RawCalendarEvent);
}

export async function deleteCalendarEvent(id: string) {
  assertLocalWritable();
  const { supabase, userId } = await requireUser();
  const { error } = await supabase
    .from("calendar_events")
    .delete()
    .eq("id", id)
    .eq("user_id", userId);
  if (error) throw error;
}

export async function migrateLegacyCalendarEvents(events: CalendarEventInput[]) {
  if (!events.length) return;
  assertLocalWritable();
  const { supabase, userId } = await requireUser();
  const dates = Array.from(new Set(events.map((event) => event.date)));
  const { data, error: readError } = await supabase
    .from("calendar_events")
    .select("event_date, event_time, detail")
    .in("event_date", dates);
  if (readError) throw readError;

  const keyOf = (event: { event_date: string; event_time: string | null; detail: string }) =>
    `${event.event_date}|${event.event_time?.slice(0, 5) ?? ""}|${event.detail.trim()}`;
  const existing = new Set((data ?? []).map((event) => keyOf(event)));
  const pending = events.filter((event) => {
    const key = keyOf({ event_date: event.date, event_time: event.time, detail: event.detail });
    if (existing.has(key)) return false;
    existing.add(key);
    return true;
  });
  if (!pending.length) return [];

  const { data: inserted, error: insertError } = await supabase.from("calendar_events").insert(pending.map((event) => ({
    user_id: userId,
    event_date: event.date,
    event_time: event.time || null,
    detail: event.detail.trim(),
  }))).select("id, event_date, event_time, detail");
  if (insertError) throw insertError;
  return (inserted ?? []).map((event) => mapEvent(event as RawCalendarEvent));
}
