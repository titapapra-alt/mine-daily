import { createBrowserClient } from "@supabase/ssr";
import { env } from "./config";
export const createClient = () => { const { url, key } = env(); return createBrowserClient(url, key); };
