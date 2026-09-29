import { BookOpen, Leaf } from "lucide-react";
import { redirect } from "next/navigation";
import { isLocalPreview, isLoginAlertConfigured, isSupabaseConfigured, ownerEmail } from "@/lib/supabase/config";
import { LoginForm } from "./login-form";

export default async function LoginPage({ searchParams }: { searchParams: Promise<{ error?: string; message?: string }> }) {
  if (isLocalPreview) redirect("/");
  const params = await searchParams;

  return <main className="storybook login-wrap"><section className="login-card glass"><Leaf size={28} aria-hidden="true" /><p className="eyebrow" style={{ color: "var(--leaf)" }}>A private little place</p><h1>Mine</h1><p className="mb-7">A quiet book for the small stories only you need to keep.</p>{!isSupabaseConfigured && <p className="notice mb-4"><strong>One small setup first.</strong><br />Add the Supabase settings to <code>.env.local</code>.</p>}{isSupabaseConfigured && !isLoginAlertConfigured && <p className="notice mb-4"><strong>Email alerts are unavailable.</strong><br />Login still works, but add <code>RESEND_API_KEY</code> to restore notifications.</p>}<LoginForm configured={isSupabaseConfigured} error={params.error} message={params.message} /><p className="mt-7 flex items-center justify-center gap-2 text-sm opacity-70"><BookOpen size={16} />Successful access is reported to {ownerEmail}.</p></section></main>;
}
