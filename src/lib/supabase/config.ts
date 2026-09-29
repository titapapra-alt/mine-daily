export const isSupabaseConfigured = Boolean(process.env.NEXT_PUBLIC_SUPABASE_URL && process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY);
export const isLoginAlertConfigured = Boolean(process.env.RESEND_API_KEY);
export const isLocalPreview = process.env.LOCAL_PREVIEW === "true";
export const isLocalReadOnly = process.env.NODE_ENV === "development" && process.env.NEXT_PUBLIC_LOCAL_READ_ONLY === "true";
export const assertLocalWritable = () => {
  if (isLocalReadOnly) throw new Error("Local is connected to Production in read-only mode.");
};
export const ownerEmail = "titapa.pra@gmail.com";
export const env = () => {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY;
  if (!url || !key) throw new Error("Supabase environment variables are not configured.");
  return { url, key };
};
