"use client";

type TimeParts = {
  hour: string;
  minute: string;
};

const hours = Array.from({ length: 24 }, (_, index) => String(index + 1).padStart(2, "0"));
const minutes = ["00", "15", "30", "45"];

const parseTime = (value: string): TimeParts => {
  const match = /^(\d{2}):(\d{2})$/.exec(value);
  if (!match) return { hour: "", minute: "" };
  return {
    hour: match[1] === "00" ? "24" : match[1],
    minute: minutes.includes(match[2]) ? match[2] : "",
  };
};

const currentParts = (): TimeParts => {
  const hour24 = new Date().getHours();
  return {
    hour: String(hour24 || 24).padStart(2, "0"),
    minute: "00",
  };
};

const toTime = ({ hour, minute }: TimeParts) => {
  if (!hour || !minute) return "";
  const hour24 = Number(hour) === 24 ? 0 : Number(hour);
  return `${String(hour24).padStart(2, "0")}:${minute}`;
};

export function QuarterHourTimeInput({ id, name, value, onChange, invalid = false, describedBy }: { id: string; name: string; value: string; onChange: (value: string) => void; invalid?: boolean; describedBy?: string }) {
  const parts = parseTime(value);
  const fallback = currentParts();
  const update = (next: Partial<TimeParts>) => onChange(toTime({
    hour: next.hour ?? (parts.hour || fallback.hour),
    minute: next.minute ?? (parts.minute || "00"),
  }));

  return <div className="quarter-hour-time" role="group" aria-label="Time">
    <select id={id} value={parts.hour} aria-label="Time hour" aria-invalid={invalid} aria-describedby={describedBy} onChange={(event) => update({ hour: event.target.value })}>
      {!parts.hour && <option value="">Hour</option>}
      {hours.map((hour) => <option key={hour} value={hour}>{hour}</option>)}
    </select>
    <select value={parts.minute} aria-label="Time minute" aria-invalid={invalid} aria-describedby={describedBy} onChange={(event) => update({ minute: event.target.value })}>
      {!parts.minute && <option value="">Minute</option>}
      {minutes.map((minute) => <option key={minute} value={minute}>{minute}</option>)}
    </select>
    <input type="hidden" name={name} value={value} />
  </div>;
}
