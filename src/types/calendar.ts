export type CalendarEvent = { id: string; date: string; time: string | null; detail: string };
export type CalendarEventInput = Omit<CalendarEvent, "id">;
