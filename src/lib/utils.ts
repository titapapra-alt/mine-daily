export const today = () => new Intl.DateTimeFormat("en-CA", { timeZone: "Asia/Bangkok" }).format(new Date());
export const dateLabel = (date: string) => new Intl.DateTimeFormat("en-GB", { day: "2-digit", month: "2-digit", year: "numeric" }).format(new Date(`${date}T12:00:00`));
export const shortDateLabel = (date: string) => new Intl.DateTimeFormat("en-GB", { day: "2-digit", month: "2-digit" }).format(new Date(`${date}T12:00:00`));
export const displayDate = (value: string) => { const [year, month, day] = value.split("-"); return year && month && day ? `${day}/${month}/${year}` : ""; };
export const formatDateEntry = (value: string) => { const digits = value.replace(/\D/g, "").slice(0, 8); return [digits.slice(0, 2), digits.slice(2, 4), digits.slice(4, 8)].filter(Boolean).join("/"); };
export const parseDisplayDate = (value: string) => {
  const match = /^(\d{2})\/(\d{2})\/(\d{4})$/.exec(value);
  if (!match) return null;
  const [, day, month, year] = match;
  const parsed = new Date(Date.UTC(Number(year), Number(month) - 1, Number(day)));
  if (parsed.getUTCFullYear() !== Number(year) || parsed.getUTCMonth() !== Number(month) - 1 || parsed.getUTCDate() !== Number(day)) return null;
  return `${year}-${month}-${day}`;
};
export const isQuarterHour = (value: string) => /^([01]\d|2[0-3]):(00|15|30|45)$/.test(value);
export const clip = (text: string, length = 148) => text.length > length ? `${text.slice(0, length).trimEnd()}…` : text;
export const moodLabel = (mood: string | null) => mood ? mood[0].toUpperCase() + mood.slice(1) : "Unmarked";
