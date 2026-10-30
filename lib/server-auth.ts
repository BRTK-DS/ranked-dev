import { NextRequest } from "next/server";
import { getSupabaseAdmin } from "./supabase/admin";
export async function authenticatedUser(request: NextRequest) {
  const token = request.headers.get("authorization")?.replace(/^Bearer\s+/i, "");
  if (!token) return null;
  const { data, error } = await getSupabaseAdmin().auth.getUser(token);
  return error ? null : data.user;
}
export async function authenticatedAdmin(request: NextRequest) {
  const user = await authenticatedUser(request); if (!user) return null;
  const { data } = await getSupabaseAdmin().from("profiles").select("is_admin").eq("id", user.id).single();
  return data?.is_admin ? user : null;
}
