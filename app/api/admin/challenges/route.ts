import { NextRequest, NextResponse } from "next/server";
import { authenticatedAdmin } from "@/lib/server-auth";
import { getSupabaseAdmin } from "@/lib/supabase/admin";
type Json = Record<string, unknown>;
function validate(item: unknown, index: number) {
  if (!item || typeof item !== "object") return { error: "Element nie jest obiektem", index };
  const row = item as Json; const difficulties = ["Easy", "Medium", "Hard"]; const types = ["code", "completion"];
  if (typeof row.title !== "string" || row.title.trim().length < 3 || typeof row.description !== "string" || !difficulties.includes(String(row.difficulty)) || !types.includes(String(row.type))) return { error: "Brak poprawnego title, description, difficulty lub type", index };
  if (row.type === "code") { if (typeof row.initial_code !== "string" || !Array.isArray(row.test_cases) || row.test_cases.length < 2) return { error: "Zadanie code wymaga initial_code i minimum 2 test_cases", index }; if (!row.test_cases.every((test) => test && typeof test === "object" && typeof (test as Json).input === "string" && typeof (test as Json).expected === "string")) return { error: "Każdy test wymaga stringów input i expected", index }; if (row.random_tests !== undefined) { const random = row.random_tests as Json; if (!random || !Number.isInteger(random.cases_per_run) || Number(random.cases_per_run) < 1 || Number(random.cases_per_run) > 50 || typeof random.generator !== "string" || typeof random.oracle !== "string") return { error: "random_tests wymaga cases_per_run (1-50), generator i oracle", index }; } }
  if (row.type === "completion") { const config = row.completion as Json; if (!config || typeof config.template !== "string" || !Array.isArray(config.blanks) || !config.blanks.length) return { error: "Zadanie completion wymaga completion.template i completion.blanks", index }; if (!config.blanks.every((blank) => blank && typeof blank === "object" && Number.isInteger((blank as Json).slot) && typeof (blank as Json).label === "string" && Array.isArray((blank as Json).accepted) && ((blank as Json).accepted as unknown[]).every((answer) => typeof answer === "string"))) return { error: "Niepoprawna definicja luki completion", index }; }
  return null;
}
export async function POST(request: NextRequest) {
  if (!await authenticatedAdmin(request)) return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  const body = await request.json(); const challenges = Array.isArray(body.challenges) ? body.challenges : [body];
  if (!challenges.length || challenges.length > 500) return NextResponse.json({ error: "Paczka musi zawierać od 1 do 500 zadań" }, { status: 400 });
  for (let index = 0; index < challenges.length; index++) { const problem = validate(challenges[index], index); if (problem) return NextResponse.json(problem, { status: 400 }); }
  const rows = challenges.map((value: Json) => ({ title: String(value.title).trim(), description: String(value.description).trim(), difficulty: value.difficulty, challenge_type: value.type, initial_code: value.type === "completion" ? String((value.completion as Json).template) : value.initial_code, test_cases: value.type === "code" ? value.test_cases : [], tests_per_run: value.tests_per_run ?? 3, completion_config: value.type === "completion" ? value.completion : null, random_test_config: value.type === "code" ? value.random_tests ?? null : null }));
  const { data, error } = await getSupabaseAdmin().from("challenges").insert(rows).select("id");
  return error ? NextResponse.json({ error: error.message }, { status: 500 }) : NextResponse.json({ inserted: data.length }, { status: 201 });
}
