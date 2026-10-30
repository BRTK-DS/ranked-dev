import "server-only";
import { createClient } from "@supabase/supabase-js";
import { normalizeSupabaseUrl } from "./url";
export function getSupabaseAdmin() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL; const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !key) throw new Error("Server Supabase environment variables are missing.");
  return createClient(normalizeSupabaseUrl(url), key.trim(), { auth: { persistSession: false, autoRefreshToken: false } });
}
