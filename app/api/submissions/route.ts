import { NextRequest, NextResponse } from "next/server";
import { authenticatedUser } from "@/lib/server-auth";
import { getSupabaseAdmin } from "@/lib/supabase/admin";
export const runtime = "nodejs";
export async function POST(request: NextRequest) {
  const user = await authenticatedUser(request); if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const body = await request.json();
  if (typeof body.challenge_id !== "string" || typeof body.code !== "string" || body.code.length > 100_000) return NextResponse.json({ error: "Invalid submission" }, { status: 400 });
  const { data: challenge } = await getSupabaseAdmin().from("challenges").select("id,title").eq("id", body.challenge_id).single();
  if (!challenge) return NextResponse.json({ error: "Challenge not found" }, { status: 404 });
  // The browser's public-test result is deliberately ignored. A trusted judge must finalize this row.
  const { data, error } = await getSupabaseAdmin().from("submissions").insert({ user_id: user.id, challenge_id: challenge.id, code: body.code, status: "queued" }).select("id,challenge_id,status,execution_time_ms,created_at").single();
  if (error) return NextResponse.json({ error: "Could not queue submission" }, { status: 500 });
  return NextResponse.json({ ...data, challenges: { title: challenge.title } }, { status: 201 });
}
