"use server";
import { headers } from "next/headers";
import { redirect } from "next/navigation";
import { after } from "next/server";
import { clearLoginFailures, canAttemptLogin, recordLoginFailure } from "@/lib/login-rate-limit";
import { sendLoginAlert } from "@/lib/login-alert";
import { canRequestPasswordReset, recordPasswordResetRequest } from "@/lib/password-reset-rate-limit";
import { ownerEmail } from "@/lib/supabase/config";
import { createClient } from "@/lib/supabase/server";

const invalidLogin = "Unable to sign in. Check the password and try again.";
const unavailableLogin = "Sign-in is temporarily unavailable. Please try again later.";

const safeHeader = (value: string | null, fallback: string) => value?.trim().slice(0, 240) || fallback;

async function requestContext() {
  const requestHeaders = await headers();
  const forwardedFor = requestHeaders.get("x-forwarded-for")?.split(",")[0] ?? null;
  return {
    ipAddress: safeHeader(requestHeaders.get("cf-connecting-ip") || forwardedFor || requestHeaders.get("x-real-ip"), "Unavailable"),
    userAgent: safeHeader(requestHeaders.get("user-agent"), "Unavailable"),
  };
}

function sendLoginAlertAfterResponse(ipAddress: string, userAgent: string) {
  const signedInAt = new Date();
  after(async () => {
    try {
      await sendLoginAlert({ ipAddress, userAgent, signedInAt });
    } catch (error) {
      console.error("Login alert delivery failed:", error instanceof Error ? error.message : "Unknown error");
    }
  });
}

export async function requestPasswordReset() {
  const siteUrl = process.env.NEXT_PUBLIC_SITE_URL;
  const { ipAddress } = await requestContext();
  const rateLimitKey = `reset:${ipAddress.toLowerCase()}`;

  if (!siteUrl) redirect(`/login?error=${encodeURIComponent(unavailableLogin)}`);
  if (!canRequestPasswordReset(rateLimitKey)) {
    redirect(`/login?error=${encodeURIComponent("A reset email was recently requested. Please wait before trying again.")}`);
  }

  const supabase = await createClient();
  const redirectTo = new URL("/auth/callback", siteUrl);
  redirectTo.searchParams.set("next", "/reset-password");
  const { error } = await supabase.auth.resetPasswordForEmail(ownerEmail, { redirectTo: redirectTo.toString() });

  if (error) {
    console.error("Password reset request failed:", error.message);
    redirect(`/login?error=${encodeURIComponent(unavailableLogin)}`);
  }

  recordPasswordResetRequest(rateLimitKey);
  redirect(`/login?message=${encodeURIComponent("Password reset email sent. Open it in this browser to choose a new password.")}`);
}

export async function signIn(formData: FormData) {
  const password = String(formData.get("password") || "");
  const { ipAddress, userAgent } = await requestContext();
  const rateLimitKey = ipAddress.toLowerCase();

  if (!canAttemptLogin(rateLimitKey)) redirect(`/login?error=${encodeURIComponent("Too many sign-in attempts. Please try again in 30 minutes.")}`);
  if (!password || password.length > 128) {
    recordLoginFailure(rateLimitKey);
    redirect(`/login?error=${encodeURIComponent(invalidLogin)}`);
  }

  const supabase = await createClient();
  const { data, error } = await supabase.auth.signInWithPassword({ email: ownerEmail, password });

  if (error || data.user?.email?.toLowerCase() !== ownerEmail) {
    recordLoginFailure(rateLimitKey);
    await new Promise((resolve) => setTimeout(resolve, 700));
    redirect(`/login?error=${encodeURIComponent(invalidLogin)}`);
  }

  clearLoginFailures(rateLimitKey);
  sendLoginAlertAfterResponse(ipAddress, userAgent);
  redirect("/");
}
