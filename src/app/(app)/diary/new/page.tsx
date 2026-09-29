import Link from "next/link";
import { X } from "lucide-react";
import { DiaryEditor } from "@/components/diary-editor";
import { createDiaryEntry } from "../actions";
import { redirect } from "next/navigation";
import { isLocalReadOnly } from "@/lib/supabase/config";
export default function NewDiaryPage() { if (isLocalReadOnly) redirect("/diary"); return <><div className="section-head"><div><p className="eyebrow">A new page</p><h1 className="section-title">Tell today&apos;s story.</h1></div><Link className="icon-button" href="/diary" aria-label="Close new daily"><X size={20} /></Link></div><DiaryEditor action={createDiaryEntry} /></>; }
