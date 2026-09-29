"use client";

import { useState } from "react";
import { CalendarDays, ChevronLeft, ChevronRight } from "lucide-react";

const months = Array.from({ length: 12 }, (_, index) => ({
  number: index + 1,
  short: new Intl.DateTimeFormat("en-GB", { month: "short" }).format(new Date(2026, index, 1)),
  long: new Intl.DateTimeFormat("en-GB", { month: "long" }).format(new Date(2026, index, 1)),
}));

const valueLabel = (value: string) => new Intl.DateTimeFormat("en-GB", { month: "long", year: "numeric" }).format(new Date(`${value}-01T12:00:00`));

export function MonthYearPicker({ value, onChange, name, label = "Month and year", className = "" }: { value: string; onChange?: (value: string) => void; name?: string; label?: string; className?: string }) {
  const [internalValue, setInternalValue] = useState(value);
  const [open, setOpen] = useState(false);
  const selectedValue = onChange ? value : internalValue;
  const selectedYear = Number(selectedValue.slice(0, 4));
  const selectedMonth = Number(selectedValue.slice(5, 7));
  const [viewYear, setViewYear] = useState(selectedYear);
  const chooseMonth = (month: number) => {
    const next = `${viewYear}-${String(month).padStart(2, "0")}`;
    if (onChange) onChange(next);
    else setInternalValue(next);
    setOpen(false);
  };

  return <div className={`month-year-picker ${className}`} onKeyDown={(event) => { if (event.key === "Escape") setOpen(false); }}>
    <button className="month-year-trigger" type="button" aria-label={label} aria-expanded={open} onClick={() => { setViewYear(selectedYear); setOpen((current) => !current); }}><CalendarDays size={17} /><span>{valueLabel(selectedValue)}</span><ChevronRight className={open ? "is-open" : undefined} size={16} /></button>
    {name && <input type="hidden" name={name} value={selectedValue} />}
    {open && <div className="month-year-popover" role="dialog" aria-label={`Choose ${label.toLowerCase()}`}>
      <div className="month-year-head"><button type="button" aria-label="Previous year" onClick={() => setViewYear((year) => year - 1)}><ChevronLeft size={18} /></button><strong aria-live="polite">{viewYear}</strong><button type="button" aria-label="Next year" onClick={() => setViewYear((year) => year + 1)}><ChevronRight size={18} /></button></div>
      <div className="month-year-grid">{months.map((month) => <button type="button" key={month.number} className={viewYear === selectedYear && month.number === selectedMonth ? "is-selected" : undefined} aria-label={`${month.long} ${viewYear}`} aria-pressed={viewYear === selectedYear && month.number === selectedMonth} onClick={() => chooseMonth(month.number)}>{month.short}</button>)}</div>
    </div>}
  </div>;
}
