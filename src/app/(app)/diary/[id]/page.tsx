import { notFound } from "next/navigation";
import { DiaryEditor } from "@/components/diary-editor";
import { entry } from "@/lib/diary";
import { isLocalReadOnly } from "@/lib/supabase/config";
import { deleteDiaryEntry, updateDiaryEntry } from "../actions";
export default async function EntryPage({ params }: { params: Promise<{ id: string }> }) { const { id } = await params; const item = await entry(id); if (!item) notFound(); return <><div className="section-head"><div><p className="eyebrow">A remembered day</p><h1 className="section-title">{isLocalReadOnly ? "View this page." : "Edit this page."}</h1></div></div><DiaryEditor entry={item} action={updateDiaryEntry.bind(null, id)} deleteAction={deleteDiaryEntry.bind(null, id)} readOnly={isLocalReadOnly} /></>; }
