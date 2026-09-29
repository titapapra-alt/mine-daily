"use server";

import { headers } from "next/headers";
import { redirect } from "next/navigation";
import { clearLoginFailures } from "@/lib/login-rate-limit";
import { ownerEmail } from "@/lib/supabase/config";
import { createClient } from "@/lib/supabase/server";

const resetPath = "/reset-password";

export async function updatePassword(formData: FormData) {
  const password = String(formData.get("password") || "");
  const confirmation = String(formData.get("confirmation") || "");

  if (password.length < 8 || password.length > 128) {
    redirect(`${resetPath}?error=${encodeURIComponent("Password must be between 8 and 128 characters.")}`);
  }
  if (password !== confirmation) {
    redirect(`${resetPath}?error=${encodeURIComponent("Passwords do not match.")}`);
  }

  const supabase = await createClient();
  const { data: { user }, error: userError } = await supabase.auth.getUser();
  if (userError || !user || user.email?.toLowerCase() !== ownerEmail) {
    await supabase.auth.signOut();
    redirect(`/login?error=${encodeURIComponent("This recovery session is invalid or has expired.")}`);
  }

  const { error } = await supabase.auth.updateUser({ password });
  if (error) {
    console.error("Password update failed:", error.message);
    redirect(`${resetPath}?error=${encodeURIComponent("Could not update the password. Please request a new reset link.")}`);
  }

  const requestHeaders = await headers();
  const forwardedFor = requestHeaders.get("x-forwarded-for")?.split(",")[0];
  const ipAddress = requestHeaders.get("cf-connecting-ip") || forwardedFor || requestHeaders.get("x-real-ip");
  if (ipAddress) clearLoginFailures(ipAddress.trim().slice(0, 240).toLowerCase());

  await supabase.auth.signOut();
  redirect(`/login?message=${encodeURIComponent("Password updated. Sign in with your new password.")}`);
}
