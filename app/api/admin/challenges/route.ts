import { NextRequest, NextResponse } from "next/server";
import { authenticatedAdmin } from "@/lib/server-auth";
import { getSupabaseAdmin } from "@/lib/supabase/admin";
export async function POST(request: NextRequest) {
  if (!await authenticatedAdmin(request)) return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  const body = await request.json(); const allowed = ["Easy", "Medium", "Hard"];
  if (typeof body.title !== "string" || body.title.trim().length < 3 || typeof body.description !== "string" || typeof body.initial_code !== "string" || !allowed.includes(body.difficulty) || !Array.isArray(body.test_cases)) return NextResponse.json({ error: "Invalid challenge" }, { status: 400 });
  const testsValid = body.test_cases.length > 0 && body.test_cases.every((item: unknown) => typeof item === "object" && item !== null && typeof (item as Record<string, unknown>).input === "string" && typeof (item as Record<string, unknown>).expected === "string");
  if (!testsValid) return NextResponse.json({ error: "At least one valid test is required" }, { status: 400 });
  const { data, error } = await getSupabaseAdmin().from("challenges").insert({ title: body.title.trim(), description: body.description.trim(), difficulty: body.difficulty, initial_code: body.initial_code, test_cases: body.test_cases }).select().single();
  return error ? NextResponse.json({ error: "Could not save challenge" }, { status: 500 }) : NextResponse.json(data, { status: 201 });
}
