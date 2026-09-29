import { createServerClient } from "@supabase/ssr";
import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { env } from "./config";
export async function createClient() {
  const store = await cookies(); const { url, key } = env();
  return createServerClient(url, key, { cookies: { getAll: () => store.getAll(), setAll: (items) => { try { items.forEach(({ name, value, options }) => store.set(name, value, options)); } catch { /* Server Components cannot write cookies. */ } } } });
}
export async function requireUser() {
  const supabase = await createClient(); const { data, error } = await supabase.auth.getClaims();
  const userId = data?.claims?.sub;
  if (error || !userId) redirect("/login");
  return { supabase, userId };
}
