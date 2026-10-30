import { NextRequest, NextResponse } from "next/server";
import { authenticatedAdmin } from "@/lib/server-auth";
import { getSupabaseAdmin } from "@/lib/supabase/admin";
type Json = Record<string, unknown>;
function validate(item: unknown, index: number) {
  if (!item || typeof item !== "object") return { error: "Element nie jest obiektem", index };
  const row = item as Json; const difficulties = ["Easy", "Medium", "Hard"]; const types = ["code", "completion"];
  if (typeof row.title !== "string" || row.title.trim().length < 3 || typeof row.description !== "string" || !difficulties.includes(String(row.difficulty)) || !types.includes(String(row.type))) return { error: "Brak poprawnego title, description, difficulty lub type", index };
  if (row.type === "code") { if (typeof row.initial_code !== "string" || !Array.isArray(row.test_cases) || row.test_cases.length < 2) return { error: "Zadanie code wymaga initial_code i minimum 2 test_cases", index }; if (!row.test_cases.every((test) => test && typeof test === "object" && typeof (test as Json).input === "string" && typeof (test as Json).expected === "string")) return { error: "Każdy test wymaga stringów input i expected", index }; if (row.random_tests !== undefined) { const random = row.random_tests as Json; if (!random || !Number.isInteger(random.cases_per_run) || Number(random.cases_per_run) < 1 || Number(random.cases_per_run) > 50 || typeof random.generator !== "string" || typeof random.oracle !== "string") return { error: "random_tests wymaga cases_per_run (1-50), generator i oracle", index }; } }
  if (row.type === "completion") { const config = row.completion as Json; if (!config || typeof config.template !== "string" || !Array.isArray(config.blanks) || !config.blanks.length) return { error: "Zadanie completion wymaga completion.template i completion.blanks", index }; if (!config.blanks.every((blank) => blank && typeof blank === "object" && Number.isInteger((blank as Json).slot) && typeof (blank as Json).label === "string" && Array.isArray((blank as Json).accepted) && ((blank as Json).accepted as unknown[]).every((answer) => typeof answer === "string"))) return { error: "Niepoprawna definicja luki completion", index }; if (row.test_cases !== undefined && (!Array.isArray(row.test_cases) || !row.test_cases.every((test) => test && typeof test === "object" && typeof (test as Json).input === "string" && typeof (test as Json).expected === "string"))) return { error: "Przykłady completion w test_cases wymagają stringów input i expected", index }; }
  if (row.briefing !== undefined) { const briefing = row.briefing as Json; if (!briefing || typeof briefing !== "object" || (briefing.instructions !== undefined && typeof briefing.instructions !== "string") || (briefing.hint !== undefined && typeof briefing.hint !== "string") || (briefing.steps !== undefined && (!Array.isArray(briefing.steps) || !briefing.steps.every((step) => typeof step === "string"))) || (briefing.definition_of_done !== undefined && (!Array.isArray(briefing.definition_of_done) || !briefing.definition_of_done.every((rule) => typeof rule === "string")))) return { error: "briefing wymaga tekstowych instructions/hint oraz tablic tekstów steps i definition_of_done", index }; }
  return null;
}
export async function POST(request: NextRequest) {
  if (!await authenticatedAdmin(request)) return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  let body: unknown;
  try { body = await request.json(); } catch { return NextResponse.json({ error: "Niepoprawny format JSON" }, { status: 400 }); }
  const wrapped = body && typeof body === "object" && !Array.isArray(body) ? (body as Json).challenges : undefined;
  const challenges = Array.isArray(wrapped) ? wrapped : Array.isArray(body) ? body : [body];
  if (!challenges.length || challenges.length > 500) return NextResponse.json({ error: "Paczka musi zawierać od 1 do 500 zadań" }, { status: 400 });
  for (let index = 0; index < challenges.length; index++) { const problem = validate(challenges[index], index); if (problem) return NextResponse.json(problem, { status: 400 }); }
  const rows = challenges.map((value: Json) => ({ title: String(value.title).trim(), description: String(value.description).trim(), difficulty: value.difficulty, challenge_type: value.type, initial_code: value.type === "completion" ? String((value.completion as Json).template) : value.initial_code, test_cases: Array.isArray(value.test_cases) ? value.test_cases : [], tests_per_run: value.tests_per_run ?? 3, completion_config: value.type === "completion" ? value.completion : null, random_test_config: value.type === "code" ? value.random_tests ?? null : null, briefing_config: value.briefing ?? null }));
  const { data, error } = await getSupabaseAdmin().from("challenges").insert(rows).select("id");
  return error ? NextResponse.json({ error: error.message }, { status: 500 }) : NextResponse.json({ inserted: data.length }, { status: 201 });
}
