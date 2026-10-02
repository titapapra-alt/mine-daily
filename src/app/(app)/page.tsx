import Link from "next/link";
import { ArrowRight } from "lucide-react";
import { entries } from "@/lib/diary";
import { DiaryCard } from "@/components/diary-card";
import { EmptyState } from "@/components/empty-state";
import { DailyTracker } from "@/components/daily-tracker";
import { getCalorieFavorites } from "@/lib/calorie-favorites";
import { isLocalPreview, isLocalReadOnly } from "@/lib/supabase/config";
const datePattern = /^\d{4}-\d{2}-\d{2}$/;
export default async function HomePage({ searchParams }: { searchParams: Promise<{ date?: string }> }) { const [recent, favorites, params] = await Promise.all([entries(5), getCalorieFavorites(), searchParams]); const initialDate = params.date && datePattern.test(params.date) ? params.date : undefined; return <><DailyTracker localPreview={isLocalPreview} readOnly={isLocalReadOnly} initialDate={initialDate} favorites={favorites} /><section className="section"><div className="section-head"><div><h2 className="section-title">Recent pages</h2><p className="section-subtitle">The little moments you chose to keep.</p></div><Link href="/diary" className="button button-quiet compact-action action-white">All entries <ArrowRight size={18} /></Link></div>{recent.length ? <div className="card-grid">{recent.map((item) => <DiaryCard entry={item} key={item.id} />)}</div> : <EmptyState action={!isLocalReadOnly} />}</section></>; }
