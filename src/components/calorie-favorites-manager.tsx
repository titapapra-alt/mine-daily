"use client";

import { useState } from "react";
import { createPortal } from "react-dom";
import { Pencil, Plus, Save, Star, Trash2, X } from "lucide-react";
import { createCalorieFavoriteAction, deleteCalorieFavoriteAction, updateCalorieFavoriteAction } from "@/app/(app)/settings/actions";
import type { CalorieFavorite } from "@/types/calorie-favorite";

type Draft = { calories: string; detail: string };
type DraftErrors = Partial<Record<keyof Draft, string>>;
type FavoriteModal = { kind: "form"; favorite: CalorieFavorite | null } | { kind: "delete"; favorite: CalorieFavorite } | null;

const emptyDraft = (): Draft => ({ calories: "", detail: "" });
const sortFavorites = (favorites: CalorieFavorite[]) => [...favorites].sort((a, b) => a.detail.localeCompare(b.detail) || a.calories - b.calories);

export function CalorieFavoritesManager({ initialFavorites, localPreview = false, readOnly = false }: { initialFavorites: CalorieFavorite[]; localPreview?: boolean; readOnly?: boolean }) {
  const [favorites, setFavorites] = useState(() => sortFavorites(initialFavorites));
  const [modal, setModal] = useState<FavoriteModal>(null);
  const [draft, setDraft] = useState<Draft>(emptyDraft);
  const [errors, setErrors] = useState<DraftErrors>({});
  const [saving, setSaving] = useState(false);
  const [dataError, setDataError] = useState<string | null>(null);

  const openAdd = () => { setDraft(emptyDraft()); setErrors({}); setDataError(null); setModal({ kind: "form", favorite: null }); };
  const openEdit = (favorite: CalorieFavorite) => { setDraft({ calories: String(favorite.calories), detail: favorite.detail }); setErrors({}); setDataError(null); setModal({ kind: "form", favorite }); };
  const closeModal = () => { if (saving) return; setModal(null); setErrors({}); setDataError(null); };
  const clearError = (field: keyof Draft) => setErrors((current) => { if (!current[field]) return current; const next = { ...current }; delete next[field]; return next; });

  const saveFavorite = async () => {
    if (saving || modal?.kind !== "form") return;
    const nextErrors: DraftErrors = {};
    const calories = Number(draft.calories);
    const detail = draft.detail.trim();
    if (!draft.calories || !Number.isInteger(calories) || calories < 0 || calories > 20000) nextErrors.calories = "Enter a whole number between 0 and 20,000.";
    if (!detail) nextErrors.detail = "Enter more detail.";
    else if (detail.length > 3000) nextErrors.detail = "More detail must not exceed 3,000 characters.";
    const duplicate = favorites.some((favorite) => favorite.id !== modal.favorite?.id && favorite.calories === calories && favorite.detail.toLocaleLowerCase() === detail.toLocaleLowerCase());
    if (duplicate) nextErrors.detail = "This favorite already exists.";
    setErrors(nextErrors);
    if (Object.keys(nextErrors).length) return;

    setSaving(true);
    setDataError(null);
    try {
      const input = { calories, detail };
      const saved = localPreview
        ? { id: modal.favorite?.id ?? crypto.randomUUID(), ...input }
        : modal.favorite ? await updateCalorieFavoriteAction(modal.favorite.id, input) : await createCalorieFavoriteAction(input);
      setFavorites((current) => sortFavorites(modal.favorite ? current.map((favorite) => favorite.id === saved.id ? saved : favorite) : [...current, saved]));
      setModal(null);
      setErrors({});
    } catch (error) {
      setDataError(error instanceof Error ? error.message : "Could not save this favorite.");
    } finally {
      setSaving(false);
    }
  };

  const deleteFavorite = async () => {
    if (saving || modal?.kind !== "delete") return;
    const target = modal.favorite;
    setSaving(true);
    setDataError(null);
    try {
      const deletedId = localPreview ? target.id : await deleteCalorieFavoriteAction(target.id);
      setFavorites((current) => current.filter((favorite) => favorite.id !== deletedId));
      setModal(null);
    } catch (error) {
      setDataError(error instanceof Error ? error.message : "Could not delete this favorite.");
    } finally {
      setSaving(false);
    }
  };

  return <section className="favorite-master" aria-labelledby="favorite-master-title">
    <div className="favorite-master-head">
      <div><p className="eyebrow" style={{ color: "var(--leaf)" }}>Calories master</p><h2 id="favorite-master-title">Favorite meals</h2><p>Choose one while adding calories to fill both fields instantly.</p></div>
      {!readOnly && <button className="button button-dark" type="button" onClick={openAdd}><Plus size={18} />Add favorite</button>}
    </div>

    {readOnly && <p className="notice" role="status">Favorites are view-only while local read-only mode is active.</p>}
    {dataError && !modal && <p className="notice" role="alert">{dataError}</p>}

    {favorites.length ? <div className="favorite-table-wrap"><table className="favorite-table">
      <thead><tr><th>Calories</th><th>More detail</th><th><span className="sr-only">Actions</span></th></tr></thead>
      <tbody>{favorites.map((favorite) => <tr key={favorite.id}>
        <td data-label="Calories"><strong>{favorite.calories.toLocaleString()} kcal</strong></td>
        <td data-label="More detail">{favorite.detail}</td>
        <td className="favorite-row-actions">{!readOnly && <><button type="button" onClick={() => openEdit(favorite)} aria-label={`Edit ${favorite.detail}`}><Pencil size={16} /></button><button className="danger" type="button" onClick={() => { setDataError(null); setModal({ kind: "delete", favorite }); }} aria-label={`Delete ${favorite.detail}`}><Trash2 size={16} /></button></>}</td>
      </tr>)}</tbody>
    </table></div> : <div className="favorite-empty"><Star size={26} /><strong>No favorites yet</strong><span>Add meals you repeat often to speed up daily entry.</span>{!readOnly && <button className="button button-quiet" type="button" onClick={openAdd}><Plus size={18} />Add your first favorite</button>}</div>}

    {modal?.kind === "form" && createPortal(<div className="modal-backdrop" role="presentation" onMouseDown={closeModal}><section className="daily-modal favorite-modal glass" role="dialog" aria-modal="true" aria-labelledby="favorite-modal-title" onMouseDown={(event) => event.stopPropagation()}><header><div><p className="eyebrow" style={{ color: "var(--leaf)" }}>Calories master</p><h2 id="favorite-modal-title">{modal.favorite ? "Edit favorite" : "Add favorite"}</h2></div><button className="icon-button" type="button" onClick={closeModal} aria-label="Close"><X size={19} /></button></header><form className="modal-form" noValidate onSubmit={(event) => { event.preventDefault(); void saveFavorite(); }}>
      <label className={`field ${errors.calories ? "invalid" : ""}`} htmlFor="favorite-calories"><span className="field-label">Calories <small>Required</small></span><input id="favorite-calories" type="number" inputMode="numeric" min="0" max="20000" step="1" value={draft.calories} onChange={(event) => { setDraft({ ...draft, calories: event.target.value }); clearError("calories"); }} placeholder="400" aria-invalid={Boolean(errors.calories)} aria-describedby={errors.calories ? "favorite-calories-error" : undefined} />{errors.calories && <small className="field-message" id="favorite-calories-error" role="alert">{errors.calories}</small>}</label>
      <label className={`field ${errors.detail ? "invalid" : ""}`} htmlFor="favorite-detail"><span className="field-label">More detail <small>Required</small></span><input id="favorite-detail" value={draft.detail} maxLength={3000} onChange={(event) => { setDraft({ ...draft, detail: event.target.value }); clearError("detail"); }} placeholder="Fried rice" aria-invalid={Boolean(errors.detail)} aria-describedby={errors.detail ? "favorite-detail-error" : undefined} />{errors.detail && <small className="field-message" id="favorite-detail-error" role="alert">{errors.detail}</small>}</label>
      {dataError && <p className="notice" role="alert">{dataError}</p>}
      <button className="button button-dark justify-center" type="submit" disabled={saving}>{saving ? "Saving…" : <><Save size={18} />{modal.favorite ? "Save changes" : "Add favorite"}</>}</button>
    </form></section></div>, document.body)}

    {modal?.kind === "delete" && createPortal(<div className="modal-backdrop" role="presentation" onMouseDown={closeModal}><section className="daily-modal favorite-delete-modal glass" role="alertdialog" aria-modal="true" aria-labelledby="favorite-delete-title" onMouseDown={(event) => event.stopPropagation()}><header><div><p className="eyebrow" style={{ color: "var(--brown)" }}>Delete favorite</p><h2 id="favorite-delete-title">Remove this favorite?</h2></div><button className="icon-button" type="button" onClick={closeModal} aria-label="Close"><X size={19} /></button></header><p><strong>{modal.favorite.detail}</strong> · {modal.favorite.calories.toLocaleString()} kcal</p><p>This removes it from the picker but does not change existing daily records.</p>{dataError && <p className="notice" role="alert">{dataError}</p>}<div className="favorite-delete-actions"><button className="button button-quiet" type="button" onClick={closeModal} disabled={saving}>Cancel</button><button className="button button-danger" type="button" onClick={() => void deleteFavorite()} disabled={saving}><Trash2 size={17} />{saving ? "Deleting…" : "Delete favorite"}</button></div></section></div>, document.body)}
  </section>;
}
