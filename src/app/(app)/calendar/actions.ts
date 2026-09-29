"use server";

import { createCalendarEvent, deleteCalendarEvent, migrateLegacyCalendarEvents, updateCalendarEvent } from "@/lib/calendar-events";
import type { CalendarEventInput } from "@/types/calendar";

const datePattern = /^\d{4}-\d{2}-\d{2}$/;
const timePattern = /^(?:[01]\d|2[0-3]):(?:00|15|30|45)$/;

const validateEvent = (event: CalendarEventInput): CalendarEventInput => {
  const detail = event.detail.trim();
  if (!datePattern.test(event.date)) throw new Error("Invalid event date.");
  if (event.time && !timePattern.test(event.time)) throw new Error("Invalid event time.");
  if (!detail || detail.length > 3000) throw new Error("Event detail must contain 1–3,000 characters.");
  return { date: event.date, time: event.time || null, detail };
};

export async function createCalendarEventAction(event: CalendarEventInput) {
  return createCalendarEvent(validateEvent(event));
}

export async function updateCalendarEventAction(id: string, event: CalendarEventInput) {
  if (!/^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(id)) throw new Error("Invalid event ID.");
  return updateCalendarEvent(id, validateEvent(event));
}

export async function deleteCalendarEventAction(id: string) {
  if (!/^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(id)) throw new Error("Invalid event ID.");
  await deleteCalendarEvent(id);
}

export async function migrateLegacyCalendarEventsAction(events: CalendarEventInput[]) {
  if (events.length > 500) throw new Error("Too many legacy events to migrate at once.");
  return migrateLegacyCalendarEvents(events.map(validateEvent));
}
