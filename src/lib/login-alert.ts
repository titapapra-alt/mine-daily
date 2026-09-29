import { randomUUID } from "node:crypto";
import { ownerEmail } from "@/lib/supabase/config";

type LoginAlert = {
  ipAddress: string;
  userAgent: string;
  signedInAt: Date;
};

export async function sendLoginAlert({ ipAddress, userAgent, signedInAt }: LoginAlert) {
  const apiKey = process.env.RESEND_API_KEY;
  const to = ownerEmail;
  const from = process.env.LOGIN_ALERT_FROM_EMAIL || "Mine Security <onboarding@resend.dev>";

  if (!apiKey || !to) throw new Error("Login alert email is not configured.");

  const bangkokTime = new Intl.DateTimeFormat("th-TH", {
    dateStyle: "full",
    timeStyle: "long",
    timeZone: "Asia/Bangkok",
  }).format(signedInAt);

  const response = await fetch("https://api.resend.com/emails", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${apiKey}`,
      "Content-Type": "application/json",
      "Idempotency-Key": `mine-login-${randomUUID()}`,
    },
    body: JSON.stringify({
      from,
      to: [to],
      subject: "Mine security alert: successful sign-in",
      text: [
        "A successful sign-in to Mine was detected.",
        "",
        `Time (Bangkok): ${bangkokTime}`,
        `Time (UTC): ${signedInAt.toISOString()}`,
        `IP address: ${ipAddress}`,
        `Device: ${userAgent}`,
        "",
        "If this was not you, change the account password immediately and revoke active sessions in Supabase.",
      ].join("\n"),
    }),
    cache: "no-store",
    signal: AbortSignal.timeout(8_000),
  });

  if (!response.ok) throw new Error(`Login alert provider returned ${response.status}.`);
}
