"use client";

import Link from "next/link";
import { useState } from "react";
import { Save, Trash2 } from "lucide-react";
import type { DiaryEntry } from "@/types/diary";
import { moods } from "@/types/diary";
import { displayDate, formatDateEntry, moodLabel, parseDisplayDate, today } from "@/lib/utils";

export function MoodSelector({ initial, disabled = false }: { initial?: string | null; disabled?: boolean }) {
  return <div className="mood-selector">{moods.map((mood) => <label className="mood-choice" key={mood}><input type="radio" name="mood" value={mood} defaultChecked={initial === mood} disabled={disabled} /><span>{moodLabel(mood)}</span></label>)}</div>;
}

export function TagInput({ initial = [], disabled = false }: { initial?: string[]; disabled?: boolean }) {
  const [value, setValue] = useState(initial.join(", "));
  return <input name="tags" value={value} onChange={(event) => setValue(event.target.value)} placeholder="morning, gratitude, little wins" disabled={disabled} />;
}

export function DiaryEditor({ entry, action, deleteAction, readOnly = false }: { entry?: DiaryEntry; action: (data: FormData) => void | Promise<void>; deleteAction?: (data: FormData) => void | Promise<void>; readOnly?: boolean }) {
  const [dateDraft, setDateDraft] = useState(() => displayDate(entry?.entry_date ?? today()));
  const [dateError, setDateError] = useState<string | null>(null);
  const [titleDraft, setTitleDraft] = useState(entry?.title ?? "");
  const [titleError, setTitleError] = useState<string | null>(null);
  const validDate = parseDisplayDate(dateDraft);

  const updateDate = (value: string) => {
    const formatted = formatDateEntry(value);
    setDateDraft(formatted);
    setDateError(formatted.length === 10 && !parseDisplayDate(formatted) ? "Please enter a valid date in DD/MM/YYYY format." : null);
  };

  return <div className="page-sheet glass"><form action={action} noValidate onSubmit={(event) => {
    if (readOnly) { event.preventDefault(); return; }
    const nextDateError = validDate ? null : "Please enter a valid date in DD/MM/YYYY format.";
    const nextTitleError = titleDraft.trim() ? null : "Please enter a title.";
    setDateError(nextDateError);
    setTitleError(nextTitleError);
    if (nextDateError || nextTitleError) event.preventDefault();
  }}><div className="form-grid"><label className={`field ${dateError ? "invalid" : ""}`}><span className="field-label">Date <small>DD/MM/YYYY</small></span><input id="entry-date" type="text" inputMode="numeric" autoComplete="off" placeholder="dd/mm/yyyy" maxLength={10} value={dateDraft} onChange={(event) => updateDate(event.target.value)} onBlur={() => setDateError(validDate ? null : "Please enter a valid date in DD/MM/YYYY format.")} aria-invalid={Boolean(dateError)} aria-describedby={dateError ? "entry-date-error" : undefined} required disabled={readOnly} />{dateError && <small id="entry-date-error" className="field-message" role="alert">{dateError}</small>}<input type="hidden" name="entry_date" value={validDate ?? ""} /></label><label className={`field ${titleError ? "invalid" : ""}`} htmlFor="entry-title"><span className="field-label">Title <small>Required</small></span><input id="entry-title" name="title" value={titleDraft} onChange={(event) => { setTitleDraft(event.target.value); setTitleError(null); }} placeholder="Give this day a name" maxLength={120} required aria-invalid={Boolean(titleError)} aria-describedby={titleError ? "entry-title-error" : undefined} disabled={readOnly} />{titleError && <small id="entry-title-error" className="field-message" role="alert">{titleError}</small>}</label><label className="field full"><span>How did the day feel?</span><MoodSelector initial={entry?.mood} disabled={readOnly} /></label><label className="field full"><span>Tags</span><TagInput initial={entry?.tags} disabled={readOnly} /><small className="font-normal opacity-60">Separate thoughts with commas.</small></label><label className="field full"><span>Your story</span><textarea name="content" defaultValue={entry?.content} placeholder="The weather, the feeling, the tiny thing you want to remember..." required disabled={readOnly} /></label></div><div className="form-actions"><Link href="/diary" className="button button-quiet">{readOnly ? "Back" : "Cancel"}</Link>{!readOnly && <button className="button button-dark" type="submit" disabled={!validDate}><Save size={18} />Save entry</button>}</div></form>{deleteAction && !readOnly && <form action={deleteAction} className="mt-6 border-t border-[rgba(37,77,50,.14)] pt-5"><button className="text-sm font-bold text-[#8d4238]" type="submit"><Trash2 className="mr-1 inline" size={15} />Delete this entry</button></form>}</div>;
}
