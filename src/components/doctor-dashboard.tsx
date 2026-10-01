"use client";

import { useMemo, useState } from "react";
import { createPortal } from "react-dom";
import { useRouter } from "next/navigation";
import { MapPin, Pencil, Plus, RotateCcw, Save, Search, Stethoscope, Trash2, WalletCards, X } from "lucide-react";
import { createDoctorVisitAction, deleteDoctorVisitAction, updateDoctorVisitAction } from "@/app/(app)/doctor/actions";
import { MonthYearPicker } from "@/components/month-year-picker";
import { dateLabel, displayDate, formatDateEntry, parseDisplayDate, today } from "@/lib/utils";
import type { DoctorVisit, DoctorVisitInput } from "@/types/doctor";

type Draft = { visit_date: string; location: string; department: string; doctor_name: string; description: string; net_price: string };
type DraftErrors = Partial<Record<"visit_date" | "location" | "net_price", string>>;
type FormModal = { kind: "form"; visit: DoctorVisit | null } | { kind: "delete"; visit: DoctorVisit } | null;

const emptyDraft = (): Draft => ({ visit_date: displayDate(today()), location: "", department: "", doctor_name: "", description: "", net_price: "" });
const toDraft = (visit: DoctorVisit): Draft => ({ ...visit, visit_date: displayDate(visit.visit_date), net_price: visit.net_price === null ? "" : String(visit.net_price) });
const sortVisits = (visits: DoctorVisit[]) => [...visits].sort((a, b) => a.visit_date.localeCompare(b.visit_date) || a.id.localeCompare(b.id));
const money = new Intl.NumberFormat("th-TH", { style: "currency", currency: "THB", minimumFractionDigits: 0, maximumFractionDigits: 2 });

export function DoctorDashboard({ initialVisits, localPreview = false, readOnly = false }: { initialVisits: DoctorVisit[]; localPreview?: boolean; readOnly?: boolean }) {
  const router = useRouter();
  const currentYear = today().slice(0, 4);
  const currentYearStart = `${currentYear}-01`;
  const currentYearEnd = `${currentYear}-12`;
  const [visits, setVisits] = useState(() => sortVisits(initialVisits));
  const [fromMonth, setFromMonth] = useState(currentYearStart);
  const [toMonth, setToMonth] = useState(currentYearEnd);
  const [query, setQuery] = useState("");
  const [modal, setModal] = useState<FormModal>(null);
  const [draft, setDraft] = useState<Draft>(emptyDraft);
  const [errors, setErrors] = useState<DraftErrors>({});
  const [saving, setSaving] = useState(false);
  const [dataError, setDataError] = useState<string | null>(null);

  const yearly = useMemo(() => {
    const groups = visits.reduce<Record<string, { visits: number; paid: number }>>((result, visit) => {
      const year = visit.visit_date.slice(0, 4);
      const current = result[year] ?? { visits: 0, paid: 0 };
      result[year] = { visits: current.visits + 1, paid: current.paid + (visit.net_price ?? 0) };
      return result;
    }, {});
    return Object.entries(groups)
      .filter(([year]) => year >= "2024")
      .sort(([a], [b]) => b.localeCompare(a))
      .map(([year, summary]) => ({ year, ...summary }));
  }, [visits]);

  const filteredVisits = useMemo(() => {
    const normalizedQuery = query.trim().toLocaleLowerCase("th-TH");
    return visits.filter((visit) => {
      const visitMonth = visit.visit_date.slice(0, 7);
      if (visitMonth < fromMonth || visitMonth > toMonth) return false;
      if (!normalizedQuery) return true;
      return `${visit.description} ${visit.location}`.toLocaleLowerCase("th-TH").includes(normalizedQuery);
    });
  }, [fromMonth, query, toMonth, visits]);

  const filteredByYear = useMemo(() => {
    const groups = filteredVisits.reduce<Record<string, DoctorVisit[]>>((result, visit) => {
      const year = visit.visit_date.slice(0, 4);
      (result[year] ??= []).push(visit);
      return result;
    }, {});
    return Object.entries(groups)
      .sort(([a], [b]) => a.localeCompare(b))
      .map(([year, yearVisits]) => ({
        year,
        visits: yearVisits,
        paid: yearVisits.reduce((sum, visit) => sum + (visit.net_price ?? 0), 0),
      }));
  }, [filteredVisits]);

  const totalPaid = visits.reduce((sum, visit) => sum + (visit.net_price ?? 0), 0);
  const openAdd = () => { setDraft(emptyDraft()); setErrors({}); setDataError(null); setModal({ kind: "form", visit: null }); };
  const openEdit = (visit: DoctorVisit) => { setDraft(toDraft(visit)); setErrors({}); setDataError(null); setModal({ kind: "form", visit }); };
  const closeModal = () => { if (saving) return; setModal(null); setErrors({}); };
  const clearError = (field: keyof DraftErrors) => setErrors((current) => { if (!current[field]) return current; const next = { ...current }; delete next[field]; return next; });
  const clearFilters = () => { setFromMonth(currentYearStart); setToMonth(currentYearEnd); setQuery(""); };
  const changeFromMonth = (value: string) => { setFromMonth(value); if (value > toMonth) setToMonth(value); };
  const changeToMonth = (value: string) => { setToMonth(value); if (value < fromMonth) setFromMonth(value); };

  const saveVisit = async () => {
    if (saving || modal?.kind !== "form") return;
    const nextErrors: DraftErrors = {};
    const parsedVisitDate = parseDisplayDate(draft.visit_date);
    if (!parsedVisitDate) nextErrors.visit_date = "Please enter a valid date in DD/MM/YYYY format.";
    if (!draft.location.trim()) nextErrors.location = "Please enter a location.";
    const parsedPrice = draft.net_price.trim() === "" ? null : Number(draft.net_price);
    if (parsedPrice !== null && (!Number.isFinite(parsedPrice) || parsedPrice < 0)) nextErrors.net_price = "Please enter a valid amount of 0 or more.";
    setErrors(nextErrors);
    if (Object.keys(nextErrors).length) return;

    const input: DoctorVisitInput = {
      visit_date: parsedVisitDate!,
      location: draft.location.trim(),
      department: draft.department.trim(),
      doctor_name: draft.doctor_name.trim(),
      description: draft.description.trim(),
      net_price: parsedPrice,
    };
    setSaving(true);
    setDataError(null);
    try {
      const saved = localPreview
        ? { id: modal.visit?.id ?? crypto.randomUUID(), ...input }
        : modal.visit ? await updateDoctorVisitAction(modal.visit.id, input) : await createDoctorVisitAction(input);
      setVisits((current) => sortVisits(modal.visit ? current.map((visit) => visit.id === saved.id ? saved : visit) : [saved, ...current]));
      setModal(null);
      setErrors({});
    } catch (error) {
      setDataError(error instanceof Error ? error.message : "Could not save this doctor visit.");
    } finally {
      setSaving(false);
    }
  };

  const deleteVisit = async () => {
    if (saving || modal?.kind !== "delete") return;
    const visitToDelete = modal.visit;
    setSaving(true);
    setDataError(null);
    try {
      const deletedId = localPreview ? visitToDelete.id : await deleteDoctorVisitAction(visitToDelete.id);
      setVisits((current) => current.filter((visit) => visit.id !== deletedId));
      setModal(null);
      if (!localPreview) router.refresh();
    } catch (error) {
      setDataError(error instanceof Error ? error.message : "Could not delete this doctor visit.");
    } finally {
      setSaving(false);
    }
  };

  return <section className="doctor-page page-sheet glass">
    <div className="section-head doctor-head">
      <div><p className="eyebrow" style={{ color: "var(--leaf)" }}>Health history</p><h1 className="section-title">Doctor visits.</h1><p className="section-subtitle">Costs, appointments, and care notes in one place.</p></div>
      {!readOnly && <button className="button button-dark" type="button" onClick={openAdd}><Plus size={19} />Add visit</button>}
    </div>

    {dataError && <p className="notice" role="alert">{dataError}</p>}

    <div className="doctor-overview" aria-label="Doctor visit totals">
      <article><span>Total visits</span><strong>{visits.length.toLocaleString()}</strong><Stethoscope size={20} /></article>
      <article><span>Total paid</span><strong>{money.format(totalPaid)}</strong><WalletCards size={20} /></article>
    </div>

    <section className="doctor-year-section">
      <div className="doctor-section-title"><div><p className="eyebrow" style={{ color: "var(--leaf)" }}>Yearly summary</p><h2>Visits and spending by year</h2></div></div>
      <div className="doctor-year-grid">{yearly.map((summary) => <article key={summary.year}><span>{summary.year}</span><strong>{money.format(summary.paid)}</strong><small>{summary.visits.toLocaleString()} visit{summary.visits === 1 ? "" : "s"}</small></article>)}</div>
    </section>

    <section className="doctor-records">
      <div className="doctor-section-title"><div><p className="eyebrow" style={{ color: "var(--leaf)" }}>Visit history</p><h2>Records by year</h2></div><span>{filteredVisits.length.toLocaleString()} of {visits.length.toLocaleString()}</span></div>
      <div className="doctor-filter-bar glass">
        <div className="doctor-month-field"><span>From</span><MonthYearPicker value={fromMonth} onChange={changeFromMonth} label="From month and year" className="doctor-month-picker" /></div>
        <div className="doctor-month-field"><span>To</span><MonthYearPicker value={toMonth} onChange={changeToMonth} label="To month and year" className="doctor-month-picker" /></div>
        <label className="doctor-search"><span>Search description or location</span><span><Search size={17} /><input type="search" value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Search visits" /></span></label>
        <button className="button button-quiet doctor-clear" type="button" onClick={clearFilters} disabled={fromMonth === currentYearStart && toMonth === currentYearEnd && !query}><RotateCcw size={17} />Clear</button>
      </div>

      {filteredVisits.length ? <div className="doctor-record-years">{filteredByYear.map((group) => <section className="doctor-record-year" key={group.year} aria-labelledby={`doctor-record-year-${group.year}`}>
        <div className="doctor-record-year-head"><h3 id={`doctor-record-year-${group.year}`}>{group.year}</h3><span>{group.visits.length.toLocaleString()} visit{group.visits.length === 1 ? "" : "s"} · {money.format(group.paid)}</span></div>
        <div className="doctor-table-wrap"><table className="doctor-table"><thead><tr><th>Date</th><th>Visit</th><th>Location</th><th>Doctor</th><th className="doctor-price">Paid</th><th><span className="sr-only">Actions</span></th></tr></thead><tbody>{group.visits.map((visit) => <tr key={visit.id}><td data-label="Date"><time dateTime={visit.visit_date}>{dateLabel(visit.visit_date)}</time></td><td data-label="Visit"><strong>{visit.department || "Department not recorded"}</strong><small>{visit.description || "No description"}</small></td><td data-label="Location"><span className="doctor-location"><MapPin size={15} />{visit.location}</span></td><td data-label="Doctor">{visit.doctor_name || "—"}</td><td data-label="Paid" className="doctor-price">{visit.net_price === null ? "—" : money.format(visit.net_price)}</td><td className="doctor-row-actions">{!readOnly && <><button type="button" onClick={() => openEdit(visit)} aria-label={`Edit visit at ${visit.location}`}><Pencil size={16} /></button><button className="danger" type="button" onClick={() => { setDataError(null); setModal({ kind: "delete", visit }); }} aria-label={`Delete visit at ${visit.location}`}><Trash2 size={16} /></button></>}</td></tr>)}</tbody></table></div>
      </section>)}</div> : <div className="doctor-empty"><Stethoscope size={26} /><strong>No visits found</strong><span>Try another month range or search term.</span></div>}
    </section>

    {modal?.kind === "form" && createPortal(<div className="modal-backdrop doctor-modal-backdrop" role="presentation" onMouseDown={closeModal}><section className="daily-modal doctor-modal glass" role="dialog" aria-modal="true" aria-labelledby="doctor-modal-title" onMouseDown={(event) => event.stopPropagation()}><header><div><p className="eyebrow" style={{ color: "var(--leaf)" }}>Doctor visit</p><h2 id="doctor-modal-title">{modal.visit ? "Edit visit" : "Add visit"}</h2></div><button className="icon-button" type="button" onClick={closeModal} aria-label="Close"><X size={19} /></button></header><form className="modal-form" noValidate onSubmit={(event) => { event.preventDefault(); void saveVisit(); }}>
      <div className="doctor-form-grid">
        <label className={`field ${errors.visit_date ? "invalid" : ""}`}><span className="field-label">Date <small>DD/MM/YYYY</small></span><input type="text" inputMode="numeric" autoComplete="off" placeholder="dd/mm/yyyy" maxLength={10} value={draft.visit_date} onChange={(event) => { setDraft({ ...draft, visit_date: formatDateEntry(event.target.value) }); clearError("visit_date"); }} onBlur={() => { if (!parseDisplayDate(draft.visit_date)) setErrors((current) => ({ ...current, visit_date: "Please enter a valid date in DD/MM/YYYY format." })); }} aria-invalid={Boolean(errors.visit_date)} />{errors.visit_date && <small className="field-message" role="alert">{errors.visit_date}</small>}</label>
        <label className={`field ${errors.location ? "invalid" : ""}`}><span className="field-label">Location <small>Required</small></span><input value={draft.location} maxLength={200} onChange={(event) => { setDraft({ ...draft, location: event.target.value }); clearError("location"); }} placeholder="Hospital or clinic" aria-invalid={Boolean(errors.location)} />{errors.location && <small className="field-message" role="alert">{errors.location}</small>}</label>
        <label className="field"><span>Department</span><input value={draft.department} maxLength={200} onChange={(event) => setDraft({ ...draft, department: event.target.value })} placeholder="Department or treatment type" /></label>
        <label className="field"><span>Doctor name</span><input value={draft.doctor_name} maxLength={200} onChange={(event) => setDraft({ ...draft, doctor_name: event.target.value })} placeholder="Optional" /></label>
        <label className={`field ${errors.net_price ? "invalid" : ""}`}><span>Net price</span><input type="number" inputMode="decimal" min="0" max="100000000" step="0.01" value={draft.net_price} onChange={(event) => { setDraft({ ...draft, net_price: event.target.value }); clearError("net_price"); }} placeholder="0.00" aria-invalid={Boolean(errors.net_price)} />{errors.net_price && <small className="field-message" role="alert">{errors.net_price}</small>}</label>
        <label className="field full"><span>Description</span><textarea className="short-area" value={draft.description} maxLength={3000} onChange={(event) => setDraft({ ...draft, description: event.target.value })} placeholder="Symptoms, treatment, or notes" /></label>
      </div>
      <button className="button button-dark justify-center" type="submit" disabled={saving}>{saving ? "Saving…" : <><Save size={18} />{modal.visit ? "Save changes" : "Add visit"}</>}</button>
    </form></section></div>, document.body)}

    {modal?.kind === "delete" && createPortal(<div className="modal-backdrop doctor-modal-backdrop" role="presentation" onMouseDown={closeModal}><section className="daily-modal doctor-delete-modal glass" role="alertdialog" aria-modal="true" aria-labelledby="doctor-delete-title" onMouseDown={(event) => event.stopPropagation()}><header><div><p className="eyebrow" style={{ color: "var(--brown)" }}>Delete record</p><h2 id="doctor-delete-title">Delete this visit?</h2></div><button className="icon-button" type="button" onClick={closeModal} aria-label="Close"><X size={19} /></button></header><p><strong>{dateLabel(modal.visit.visit_date)}</strong> at {modal.visit.location}</p><p>This cannot be undone.</p>{dataError && <p className="notice" role="alert">{dataError}</p>}<div className="doctor-delete-actions"><button className="button button-quiet" type="button" onClick={closeModal} disabled={saving}>Cancel</button><button className="button doctor-danger-button" type="button" onClick={() => void deleteVisit()} disabled={saving}><Trash2 size={18} />{saving ? "Deleting…" : "Delete visit"}</button></div></section></div>, document.body)}
  </section>;
}
