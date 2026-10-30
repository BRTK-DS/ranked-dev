export function normalizeSupabaseUrl(value: string) {
  const parsed = new URL(value.trim());
  if (parsed.protocol !== "https:" || !parsed.hostname.endsWith(".supabase.co")) {
    throw new Error("NEXT_PUBLIC_SUPABASE_URL must be a https://*.supabase.co address.");
  }
  return parsed.origin;
}
