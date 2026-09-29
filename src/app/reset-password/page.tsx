import { KeyRound, ShieldCheck } from "lucide-react";
import { redirect } from "next/navigation";
import { isSupabaseConfigured, ownerEmail } from "@/lib/supabase/config";
import { createClient } from "@/lib/supabase/server";
import { ResetPasswordForm } from "./reset-password-form";

export default async function ResetPasswordPage({ searchParams }: { searchParams: Promise<{ error?: string }> }) {
  if (!isSupabaseConfigured) redirect(`/login?error=${encodeURIComponent("Supabase is not configured.")}`);

  const supabase = await createClient();
  const { data: { user }, error } = await supabase.auth.getUser();

  if (error || !user || user.email?.toLowerCase() !== ownerEmail) {
    redirect(`/login?error=${encodeURIComponent("Open a valid password reset link from your email first.")}`);
  }

  const params = await searchParams;
  return <main className="storybook reset-wrap"><section className="reset-card glass"><div className="reset-intro"><span className="reset-icon"><ShieldCheck size={28} aria-hidden="true" /></span><p className="eyebrow">Secure account recovery</p><h1>Reset password</h1><p>This recovery link has been verified. Set a new password for your private diary.</p><div className="reset-step"><KeyRound size={18} aria-hidden="true" /><span><strong>Final step</strong><small>You will return to sign in after saving.</small></span></div></div><div className="reset-form-panel"><p className="reset-kicker">New credentials</p><ResetPasswordForm error={params.error} /></div></section></main>;
}
