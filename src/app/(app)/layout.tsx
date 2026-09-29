import { Navbar } from "@/components/navbar";
import { isLocalPreview, isLocalReadOnly, isSupabaseConfigured } from "@/lib/supabase/config";
import { requireUser } from "@/lib/supabase/server";
import { redirect } from "next/navigation";
export default async function AppLayout({ children }: { children: React.ReactNode }) { if (!isLocalPreview) { if (!isSupabaseConfigured) redirect("/login"); await requireUser(); } return <main className="storybook"><div className="shell"><Navbar />{isLocalReadOnly && <p className="local-read-only-banner" role="status">Local read-only · Viewing Production data</p>}{children}</div></main>; }
