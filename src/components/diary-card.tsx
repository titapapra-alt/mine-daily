import Link from "next/link";
import { ArrowUpRight } from "lucide-react";
import type { DiaryEntry } from "@/types/diary";
import { clip, dateLabel, moodLabel } from "@/lib/utils";
export function DiaryCard({ entry }: { entry: DiaryEntry }) { return <Link href={`/diary/${entry.id}`} className="diary-card" aria-label={`Read ${entry.title}`}><div className="flex items-start justify-between gap-2"><span className="card-date">{dateLabel(entry.entry_date)}</span><ArrowUpRight size={18} /></div><h3 className="card-title">{entry.title}</h3><p className="card-copy">{clip(entry.content)}</p><div className="tags"><span className="mood">{moodLabel(entry.mood)}</span>{entry.tags.slice(0, 3).map((tag) => <span className="tag" key={tag}>#{tag}</span>)}</div></Link>; }
