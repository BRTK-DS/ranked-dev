"use client";
import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import {
  Activity,
  CheckCircle2,
  ChevronRight,
  Code2,
  Crown,
  Flame,
  Gauge,
  LogOut,
  Play,
  Send,
  Shield,
  Sparkles,
  Swords,
  TerminalSquare,
  Trash2,
  Trophy,
  XCircle,
  Zap,
} from "lucide-react";
import { useAuth } from "./auth-provider";
import { Button } from "./ui/button";
import { Badge } from "./ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "./ui/card";
import { Progress } from "./ui/progress";
import { getSupabaseBrowserClient } from "@/lib/supabase/client";
import { demoChallenges } from "@/lib/demo";
import type { Challenge, Submission } from "@/lib/types";
import { getChallengeLanguage } from "@/lib/challenge-language";
import { CodeEditor } from "./code-editor";

type TestResult = { ok: boolean; label: string; time: number };
const difficulty = {
  Easy: "text-emerald-400 border-emerald-500/30 bg-emerald-500/10",
  Medium: "text-amber-300 border-amber-500/30 bg-amber-500/10",
  Hard: "text-rose-400 border-rose-500/30 bg-rose-500/10",
};

export function Arena() {
  const { session, profile, loading, signOut, refreshProfile } = useAuth();
  const [challenges, setChallenges] = useState<Challenge[]>(demoChallenges);
  const [selected, setSelected] = useState(demoChallenges[0]);
  const [code, setCode] = useState(demoChallenges[0].initial_code);
  const [results, setResults] = useState<TestResult[]>([]);
  const [completionValues, setCompletionValues] = useState<Record<number, string>>({});
  const [consoleLines, setConsoleLines] = useState<string[]>([
    "Konsola jest gotowa. Kliknij Run tests albo użyj Ctrl+Enter.",
  ]);
  const [history, setHistory] = useState<Submission[]>([]);
  const [combo, setCombo] = useState(0);
  const [submitting, setSubmitting] = useState(false);
  const [playMode, setPlayMode] = useState<"random" | "ranked" | "training" | "arena">("arena");
  const [languageFilter, setLanguageFilter] = useState("all");
  useEffect(() => {
    const db = getSupabaseBrowserClient();
    const requestedMode = new URLSearchParams(window.location.search).get("mode");
    if (requestedMode === "random" || requestedMode === "ranked" || requestedMode === "training") setPlayMode(requestedMode);
    void db
      .from("challenges")
      .select("*")
      .order("created_at")
      .then(({ data }) => {
        if (data?.length) {
          const localized = data.map((challenge) => {
            const beginnerVersion = demoChallenges.find(
              (demo) => demo.id === challenge.id,
            );
            return beginnerVersion ?? challenge;
          });
          const requestedId = new URLSearchParams(window.location.search).get("challenge");
          const initial = localized.find((challenge) => challenge.id === requestedId) ?? localized[0];
          setChallenges(localized);
          setSelected(initial);
          setCode(initial.initial_code);
        }
      });
    if (!session) return;
    void db
      .from("submissions")
      .select(
        "id,challenge_id,status,execution_time_ms,created_at,challenges(title)",
      )
      .order("created_at", { ascending: false })
      .limit(5)
      .then(({ data }) => setHistory((data as unknown as Submission[]) ?? []));
  }, [session]);
  function choose(item: Challenge) {
    setSelected(item);
    setCode(item.initial_code);
    setResults([]);
    setCompletionValues({});
    setConsoleLines([
      "Konsola wyczyszczona. Uruchom testy dla nowego zadania.",
    ]);
  }
  function runTests() {
    const started = performance.now();
    const logs: string[] = ["> Uruchamiam testy publiczne..."];
    if (selected.challenge_type === "completion" && selected.completion_config) {
      const next = selected.completion_config.blanks.map((blank, index) => {
        const value = (completionValues[blank.slot] ?? "").trim();
        const ok = blank.accepted.some((answer) => answer.trim() === value);
        logs.push(`Luka ${index + 1} (${blank.label}): ${ok ? "PASS ✓" : "FAIL ✗"}`);
        return { ok, label: `${blank.label}: ${ok ? "poprawnie" : "spróbuj ponownie"}`, time: 0 };
      });
      setConsoleLines(logs);
      setResults(next);
      const passed = next.every((item) => item.ok);
      setCombo(passed ? combo + 1 : 0);
      return passed;
    }
    const format = (value: unknown) => {
      try {
        return JSON.stringify(value) ?? String(value);
      } catch {
        return String(value);
      }
    };
    const sandboxConsole = {
      log: (...values: unknown[]) =>
        logs.push(`[console.log] ${values.map(format).join(" ")}`),
      warn: (...values: unknown[]) =>
        logs.push(`[console.warn] ${values.map(format).join(" ")}`),
      error: (...values: unknown[]) =>
        logs.push(`[console.error] ${values.map(format).join(" ")}`),
    };
    let fn: (...args: unknown[]) => unknown;
    try {
      fn = new Function("console", `${code}; return solve;`)(
        sandboxConsole,
      ) as (
        ...args: unknown[]
      ) => unknown;
    } catch (error) {
      const message = error instanceof Error ? error.message : "Nieznany błąd";
      logs.push(`[BŁĄD KOMPILACJI] ${message}`);
      setConsoleLines(logs);
      setResults([{ ok: false, label: "Kod nie uruchomił się", time: 0 }]);
      return false;
    }
    let testsForThisRun = [...selected.test_cases]
      .sort(() => Math.random() - 0.5)
      .slice(0, Math.max(1, Math.min(selected.tests_per_run ?? 2, selected.test_cases.length)));
    if (selected.random_test_config) {
      try {
        const generator = new Function(`"use strict"; ${selected.random_test_config.generator}`) as () => unknown[];
        const oracle = new Function("args", `"use strict"; ${selected.random_test_config.oracle}`) as (args: unknown[]) => unknown;
        testsForThisRun = Array.from({ length: selected.random_test_config.cases_per_run }, () => {
          const args = generator();
          if (!Array.isArray(args)) throw new Error("Generator musi zwracać tablicę argumentów");
          return { input: JSON.stringify(args), expected: JSON.stringify(oracle(args)) };
        });
        logs.push(`Wygenerowano ${testsForThisRun.length} nowych zestawów danych.`);
      } catch (error) {
        const message = error instanceof Error ? error.message : "Błąd generatora";
        setConsoleLines([...logs, `[BŁĄD GENERATORA] ${message}`]);
        setResults([{ ok: false, label: "Generator testów jest niepoprawny", time: 0 }]);
        return false;
      }
    }
    const next = testsForThisRun.map((test, index) => {
      try {
        const args = JSON.parse(test.input) as unknown[];
        logs.push("", `--- TEST ${index + 1} ---`);
        const actual = fn(...args);
        logs.push(`Zwrócona wartość:     ${format(actual)}`);
        const ok = JSON.stringify(actual) === test.expected;
        logs.push(ok ? "Wynik: PASS ✓" : "Wynik: FAIL ✗");
        return {
          ok,
          label: ok
            ? `Test ${index + 1} passed`
            : `Test ${index + 1}: expected ${test.expected}, got ${JSON.stringify(actual)}`,
          time: Math.max(1, Math.round(performance.now() - started)),
        };
      } catch (error) {
        const message = error instanceof Error ? error.message : "Runtime error";
        logs.push(`[BŁĄD WYKONANIA] ${message}`);
        return {
          ok: false,
          label: message,
          time: 0,
        };
      }
    });
    setConsoleLines(logs);
    setResults(next);
    const passed = next.every((item) => item.ok);
    setCombo(passed ? combo + 1 : 0);
    return passed;
  }
  async function submit() {
    if (!session) return;
    const passed = runTests();
    setSubmitting(true);
    const { data: auth } = await getSupabaseBrowserClient().auth.getSession();
    const response = await fetch("/ranked-dev/api/submissions", {
      method: "POST",
      headers: {
        "content-type": "application/json",
        authorization: `Bearer ${auth.session?.access_token}`,
      },
      body: JSON.stringify({
        challenge_id: selected.id,
        code,
        public_tests_passed: passed,
      }),
    });
    setSubmitting(false);
    if (response.ok) {
      const saved = await response.json();
      setHistory((old) => [saved, ...old].slice(0, 5));
      await refreshProfile();
    }
  }
  const xpProgress = useMemo(() => ((profile?.xp ?? 0) % 500) / 5, [profile]);
  const completionCode = useMemo(() => {
    if (!selected.completion_config) return selected.initial_code;
    return selected.completion_config.blanks.reduce(
      (output, blank) => output.replaceAll(`{{${blank.slot}}}`, completionValues[blank.slot] || `___${blank.slot + 1}___`),
      selected.completion_config.template,
    );
  }, [selected, completionValues]);
  const availableLanguages = useMemo(() => Array.from(new Set(challenges.map((challenge) => getChallengeLanguage(challenge).label))).sort(), [challenges]);
  const visibleChallenges = useMemo(() => languageFilter === "all" ? challenges : challenges.filter((challenge) => getChallengeLanguage(challenge).label === languageFilter), [challenges, languageFilter]);
  const selectedLanguage = getChallengeLanguage(selected);
  return (
    <main className="min-h-screen bg-zinc-950">
      <header className="sticky top-0 z-30 border-b border-zinc-800 bg-zinc-950/95 backdrop-blur-xl">
        <div className="mx-auto flex h-16 max-w-[1500px] items-center justify-between px-4 lg:px-8">
          <div className="flex items-center gap-3">
            <motion.div
              whileHover={{ rotate: -8, scale: 1.08 }}
              whileTap={{ scale: 0.92 }}
              transition={{ type: "spring", stiffness: 450, damping: 18 }}
              className="grid size-10 place-items-center rounded-xl border border-emerald-400/40 bg-emerald-400 text-zinc-950"
            >
              <Code2 className="size-5" />
            </motion.div>
            <div>
              <div className="font-black tracking-tight">
                RANKED<span className="text-primary">.DEV</span>
              </div>
              <div className="text-[10px] font-bold tracking-[.22em] text-zinc-600">
                COMPETE • CODE • CLIMB
              </div>
            </div>
            <div className="ml-4 hidden items-center gap-2 rounded-full border border-emerald-500/20 px-3 py-1 text-[10px] font-bold tracking-wider text-emerald-400 md:flex">
              <span className="relative flex size-2">
                <span className="absolute inline-flex size-full animate-ping rounded-full bg-emerald-400 opacity-60" />
                <span className="relative inline-flex size-2 rounded-full bg-emerald-400" />
              </span>{" "}
              ARENA LIVE
            </div>
          </div>
          <nav className="flex items-center gap-2">
            {profile?.is_admin && (
              <Button asChild variant="ghost" size="sm">
                <Link href="/admin">Admin</Link>
              </Button>
            )}
            {session ? (
              <>
                <div className="hidden text-right sm:block">
                  <div className="text-sm font-semibold">
                    {profile?.username ?? "Contender"}
                  </div>
                  <div className="text-xs text-primary">
                    {profile?.rank ?? "Unranked"} • {profile?.rating ?? 0} RR
                  </div>
                </div>
                <Button
                  variant="ghost"
                  size="icon"
                  onClick={signOut}
                  aria-label="Sign out"
                >
                  <LogOut className="size-4" />
                </Button>
              </>
            ) : (
              !loading && (
                <Button asChild size="sm">
                  <Link href="/auth">Sign in</Link>
                </Button>
              )
            )}
          </nav>
        </div>
      </header>
      <div className="mx-auto grid max-w-[1500px] gap-5 p-4 lg:grid-cols-[280px_1fr_300px] lg:p-8">
        <motion.aside
          initial={{ opacity: 0, x: -18 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ duration: 0.35, ease: "easeOut" }}
          className="space-y-4"
        >
          <Card className="border-zinc-700 bg-card">
            <CardHeader>
              <div className="flex items-center justify-between">
                <Badge className="border-primary/30 bg-primary/10 text-primary">
                  <Shield className="mr-1 size-3" />
                  {profile?.rank ?? "UNRANKED"}
                </Badge>
                <span className="text-xs text-zinc-500">
                  LVL {Math.floor((profile?.xp ?? 0) / 500) + 1}
                </span>
              </div>
              <div className="my-5 flex items-center gap-4">
                <motion.div
                  whileHover={{ rotate: 8, scale: 1.08 }}
                  transition={{ type: "spring", stiffness: 350 }}
                  className="grid size-14 place-items-center rounded-2xl border border-emerald-400/40 bg-emerald-400 text-zinc-950"
                >
                  <Crown className="size-7" />
                </motion.div>
                <div>
                  <CardTitle className="text-3xl">
                    {profile?.rating ?? 0}
                  </CardTitle>
                  <span className="text-xs font-bold uppercase tracking-[.22em] text-emerald-400">
                    Rank rating
                  </span>
                </div>
              </div>
              <Progress value={xpProgress} />
              <p className="mt-2 text-xs text-zinc-500">
                {profile?.xp ?? 0} XP • {500 - ((profile?.xp ?? 0) % 500)} to
                next level
              </p>
            </CardHeader>
          </Card>
          <div>
            <p className="mb-2 flex items-center gap-2 px-1 text-xs font-bold uppercase tracking-[.18em] text-zinc-500">
              <Swords className="size-3" />
              Challenge queue
            </p>
            <select value={languageFilter} onChange={(event) => setLanguageFilter(event.target.value)} className="mb-3 h-9 w-full rounded-lg border border-zinc-800 bg-zinc-950 px-3 text-xs text-zinc-300 outline-none focus:border-emerald-500">
              <option value="all">All languages</option>
              {availableLanguages.map((language) => <option key={language} value={language}>{language}</option>)}
            </select>
            <div className="space-y-2">
              {visibleChallenges.map((item, index) => (
                <motion.button
                  layout
                  whileHover={{ x: 4 }}
                  whileTap={{ scale: 0.98 }}
                  key={item.id}
                  onClick={() => choose(item)}
                  className={`group relative w-full overflow-hidden rounded-xl border p-3 text-left transition-colors ${selected.id === item.id ? "border-primary/60 bg-zinc-800" : "bg-card hover:border-zinc-600 hover:bg-zinc-900"}`}
                >
                  {selected.id === item.id && (
                    <motion.span
                      layoutId="active-challenge"
                      className="absolute inset-y-0 left-0 w-0.5 bg-emerald-400"
                    />
                  )}
                  <div className="flex items-start justify-between gap-2">
                    <span className="text-sm font-semibold group-hover:text-white">
                      {item.title}
                    </span>
                    <span className="font-mono text-xs text-zinc-600">
                      0{index + 1}
                    </span>
                  </div>
                  <div className="mt-2 flex items-center justify-between">
                    <Badge className={difficulty[item.difficulty]}>
                      {item.difficulty}
                    </Badge>
                    <span className="font-mono text-[10px] text-zinc-500">{getChallengeLanguage(item).label}</span>
                    <ChevronRight className="size-4 text-zinc-600 transition-transform group-hover:translate-x-1 group-hover:text-emerald-400" />
                  </div>
                </motion.button>
              ))}
            </div>
          </div>
        </motion.aside>
        <motion.section
          initial={{ opacity: 0, y: 14 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.4, delay: 0.05 }}
          className="min-w-0 space-y-4"
        >
          <AnimatePresence mode="wait">
            <motion.div
              key={selected.id}
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -6 }}
              transition={{ duration: 0.18 }}
            >
              <Card className="border-zinc-700 bg-card">
                <CardHeader>
                  <div className="flex flex-wrap items-center justify-between gap-3">
                    <div>
                      <div className="flex items-center gap-2">
                        <Badge className={difficulty[selected.difficulty]}>
                          {selected.difficulty}
                        </Badge>
                        <Badge className={playMode === "ranked" ? "border-amber-500/30 bg-amber-500/10 text-amber-300" : playMode === "training" ? "border-emerald-500/30 bg-emerald-500/10 text-emerald-300" : "border-cyan-500/30 bg-cyan-500/10 text-cyan-300"}>
                          {playMode === "ranked" ? "Ranked" : playMode === "training" ? "Training" : playMode === "random" ? "Random" : "Arena"}
                        </Badge>
                        <span className="flex items-center gap-1 text-[10px] font-bold uppercase tracking-wider text-zinc-600">
                          <Gauge className="size-3" /> Ranked challenge
                        </span>
                      </div>
                      <CardTitle className="mt-3 text-2xl font-black sm:text-3xl">
                        {selected.title}
                      </CardTitle>
                    </div>
                    <AnimatePresence>
                      {combo > 1 && (
                        <motion.div
                          initial={{ scale: 0.5, opacity: 0, rotate: -8 }}
                          animate={{ scale: 1, opacity: 1, rotate: 0 }}
                          exit={{ scale: 0.7, opacity: 0 }}
                          transition={{
                            type: "spring",
                            stiffness: 420,
                            damping: 16,
                          }}
                          className="flex items-center gap-2 rounded-xl border border-amber-400/30 bg-amber-500/10 px-4 py-2 text-amber-300"
                        >
                          <motion.div
                            animate={{ scale: [1, 1.25, 1] }}
                            transition={{ repeat: Infinity, duration: 1.1 }}
                          >
                            <Flame className="size-5" />
                          </motion.div>
                          <strong>{combo}x COMBO</strong>
                        </motion.div>
                      )}
                    </AnimatePresence>
                  </div>
                  <ChallengeBrief challenge={selected} />
                  <div className="mt-4 flex flex-wrap gap-2">
                    <span className="rounded-md border bg-zinc-950 px-2 py-1 font-mono text-[10px] text-cyan-300">
                      function solve(...args)
                    </span>
                    <span className="rounded-md border bg-zinc-950 px-2 py-1 text-[10px] text-zinc-500">
                      2 PUBLIC TESTS
                    </span>
                    <span className="rounded-md border bg-zinc-950 px-2 py-1 text-[10px] text-zinc-500">
                      +50 XP
                    </span>
                  </div>
                </CardHeader>
              </Card>
            </motion.div>
          </AnimatePresence>
          <Card className="overflow-visible border-zinc-700 shadow-2xl shadow-black/50">
            <div className="flex items-center justify-between border-b bg-zinc-900 px-4 py-2.5">
              <div className="flex items-center gap-3">
                <div className="flex gap-1.5">
                  <span className="size-2.5 rounded-full bg-rose-500/80" />
                  <span className="size-2.5 rounded-full bg-amber-400/80" />
                  <span className="size-2.5 rounded-full bg-emerald-400/80" />
                </div>
                <div className="h-4 w-px bg-zinc-700" />
                <div className="flex items-center gap-2 rounded-md bg-zinc-800 px-3 py-1.5 font-mono text-[11px] text-zinc-300">
                  <TerminalSquare className="size-3 text-emerald-400" />{" "}
                  solution.{selectedLanguage.extension}{" "}
                  <motion.span
                    animate={{ opacity: [0.25, 1, 0.25] }}
                    transition={{ repeat: Infinity, duration: 1.8 }}
                    className="size-1.5 rounded-full bg-amber-300"
                  />
                </div>
              </div>
              <span className="hidden font-mono text-[10px] text-zinc-600 sm:block">
                RANKED.DEV IDE
              </span>
            </div>
            {selected.challenge_type === "completion" && selected.completion_config ? (
              <div className="grid gap-4 bg-zinc-950 p-4 lg:grid-cols-[280px_1fr]">
                <div className="space-y-3">
                  <p className="text-xs font-bold uppercase tracking-wider text-zinc-500">Uzupełnij luki</p>
                  {selected.completion_config.blanks.map((blank) => (
                    <label key={blank.slot} className="block space-y-1.5 text-xs text-zinc-400">
                      {blank.slot + 1}. {blank.label}
                      <input value={completionValues[blank.slot] ?? ""} onChange={(event) => setCompletionValues((current) => ({ ...current, [blank.slot]: event.target.value }))} placeholder={blank.placeholder ?? "Wpisz odpowiedź"} className="h-10 w-full rounded-lg border bg-zinc-900 px-3 font-mono text-sm text-zinc-100 outline-none focus:border-emerald-400" />
                    </label>
                  ))}
                </div>
                <pre className="min-h-64 overflow-auto rounded-lg border bg-[#09090b] p-4 font-mono text-sm leading-6 text-zinc-300">{completionCode}</pre>
              </div>
            ) : (
              <CodeEditor value={code} onChange={setCode} onRun={runTests} language={selectedLanguage.monaco} languageLabel={selectedLanguage.label} />
            )}
            <div className="border-t border-zinc-800 bg-zinc-950">
              <div className="flex items-center justify-between border-b border-zinc-800 px-4 py-2">
                <div className="flex items-center gap-2 font-mono text-[11px] font-bold uppercase tracking-wider text-zinc-400">
                  <TerminalSquare className="size-3.5 text-emerald-400" />
                  Console
                </div>
                <span className="hidden text-[10px] text-zinc-600 sm:inline">
                  Dane testowe i oczekiwane odpowiedzi są ukryte
                </span>
                <button
                  type="button"
                  onClick={() => setConsoleLines(["Konsola wyczyszczona."])}
                  className="flex items-center gap-1.5 rounded px-2 py-1 text-[10px] text-zinc-500 transition-colors hover:bg-zinc-800 hover:text-zinc-200"
                >
                  <Trash2 className="size-3" /> Wyczyść
                </button>
              </div>
              <pre
                aria-live="polite"
                className="max-h-64 min-h-28 overflow-auto whitespace-pre-wrap p-4 font-mono text-xs leading-6 text-zinc-400"
              >
                {consoleLines.map((line, index) => (
                  <span
                    key={`${line}-${index}`}
                    className={`block ${line.includes("PASS") ? "text-emerald-400" : line.includes("FAIL") || line.includes("BŁĄD") ? "text-rose-400" : line.startsWith("---") ? "text-cyan-300" : ""}`}
                  >
                    {line || " "}
                  </span>
                ))}
              </pre>
            </div>
            <div className="flex flex-wrap items-center justify-between gap-3 border-t bg-zinc-900 p-3">
              <div className="flex items-center gap-2 text-xs text-zinc-500">
                <span className="size-1.5 animate-pulse rounded-full bg-emerald-400" />
                Public tests run in your browser
              </div>
              <div className="flex gap-2">
                <motion.div whileTap={{ scale: 0.94 }}>
                  <Button variant="outline" onClick={runTests}>
                    <Play className="size-4" />
                    Run tests
                  </Button>
                </motion.div>
                <motion.div whileTap={{ scale: 0.94 }}>
                  <Button onClick={submit} disabled={!session || submitting}>
                    <Send className="size-4" />
                    {session ? "Submit solution" : "Sign in to submit"}
                  </Button>
                </motion.div>
              </div>
            </div>
          </Card>
          <AnimatePresence mode="popLayout">
            {results.map((result, index) => (
              <motion.div
                key={`${result.label}-${index}`}
                initial={{ opacity: 0, x: -14, scale: 0.98 }}
                animate={{ opacity: 1, x: 0, scale: 1 }}
                transition={{
                  type: "spring",
                  stiffness: 360,
                  damping: 24,
                  delay: index * 0.06,
                }}
                className={`flex items-center justify-between rounded-xl border p-3 text-sm ${result.ok ? "border-emerald-500/30 bg-emerald-500/10 text-emerald-300" : "border-rose-500/30 bg-rose-500/10 text-rose-300"}`}
              >
                <span className="flex items-center gap-2">
                  {result.ok ? (
                    <motion.span
                      initial={{ scale: 0 }}
                      animate={{ scale: 1 }}
                      transition={{
                        type: "spring",
                        delay: 0.12 + index * 0.06,
                      }}
                    >
                      <CheckCircle2 className="size-4" />
                    </motion.span>
                  ) : (
                    <XCircle className="size-4" />
                  )}
                  {result.label}
                </span>
                <span className="font-mono text-xs">{result.time}ms</span>
              </motion.div>
            ))}
          </AnimatePresence>
        </motion.section>
        <motion.aside
          initial={{ opacity: 0, x: 18 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ duration: 0.35, delay: 0.1, ease: "easeOut" }}
          className="space-y-4"
        >
          <Card className="overflow-hidden border-zinc-700 bg-card">
            <motion.div
              initial={{ scaleX: 0 }}
              animate={{ scaleX: 1 }}
              transition={{ duration: 0.5, delay: 0.25 }}
              className="h-0.5 origin-left bg-emerald-400"
            />
            <CardHeader>
              <CardTitle className="flex items-center justify-between text-sm">
                <span className="flex items-center gap-2">
                  <Zap className="size-4 text-amber-300" />
                  Performance core
                </span>
                <Badge className="border-zinc-700 text-zinc-300">LIVE</Badge>
              </CardTitle>
            </CardHeader>
            <CardContent className="grid grid-cols-2 gap-3">
              <Stat icon={<Trophy />} value="Top 18%" label="Global" />
              <Stat icon={<Flame />} value={`${combo}x`} label="Combo" />
              <Stat
                icon={<Activity />}
                value={`${history.length}`}
                label="Recent"
              />
              <Stat
                icon={<Sparkles />}
                value={`${profile?.xp ?? 0}`}
                label="Total XP"
              />
            </CardContent>
          </Card>
          <Card className="bg-card">
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-sm">
                <TerminalSquare className="size-4 text-emerald-400" />
                Recent runs
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              {history.length ? (
                history.map((item, index) => (
                  <motion.div
                    initial={{ opacity: 0, x: 8 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ delay: index * 0.05 }}
                    key={item.id}
                    className="group flex items-center justify-between gap-3 border-b pb-3 last:border-0 last:pb-0"
                  >
                    <div className="min-w-0">
                      <p className="truncate text-xs font-semibold group-hover:text-emerald-300">
                        {item.challenges?.title ?? "Challenge"}
                      </p>
                      <p className="mt-1 text-[10px] text-zinc-600">
                        {new Date(item.created_at).toLocaleDateString()}
                      </p>
                    </div>
                    <Badge
                      className={
                        item.status === "queued"
                          ? "border-amber-500/20 bg-amber-500/5 text-amber-300"
                          : "border-emerald-500/20 bg-emerald-500/5 text-emerald-300"
                      }
                    >
                      {item.status}
                    </Badge>
                  </motion.div>
                ))
              ) : (
                <motion.div
                  animate={{ y: [0, -3, 0] }}
                  transition={{
                    repeat: Infinity,
                    duration: 3,
                    ease: "easeInOut",
                  }}
                  className="rounded-lg border border-dashed bg-zinc-950 p-4 text-center"
                >
                  <Code2 className="mx-auto mb-2 size-5 text-zinc-700" />
                  <p className="text-xs leading-5 text-zinc-500">
                    Your submitted runs will appear here.
                  </p>
                </motion.div>
              )}
            </CardContent>
          </Card>
          <div className="rounded-xl border border-emerald-500/20 bg-card p-4 text-xs leading-5 text-zinc-500">
            <div className="mb-2 flex items-center gap-2 font-bold text-emerald-300">
              <motion.div
                animate={{ rotate: [0, -8, 8, 0] }}
                transition={{ repeat: Infinity, repeatDelay: 3, duration: 0.5 }}
              >
                <Shield className="size-4" />
              </motion.div>
              FAIR PLAY SHIELD
            </div>
            Public checks are instant. Ranked acceptance and XP are finalized
            only by the trusted judge.
          </div>
        </motion.aside>
      </div>
    </main>
  );
}

function ChallengeBrief({ challenge }: { challenge: Challenge }) {
  const briefing = challenge.briefing_config;
  const steps = briefing?.steps ?? [
    "Sprawdź, jakie argumenty otrzymuje funkcja w przykładach.",
    "Napisz logikę rozwiązującą zadanie.",
    "Zwróć odpowiedź słowem return. Sam console.log() nie zalicza zadania.",
    "Kliknij Run tests i porównaj wynik w konsoli.",
  ];
  const definitionOfDone = briefing?.definition_of_done ?? [
    "Funkcja ma właściwą nazwę i argumenty.",
    "Funkcja zwraca wynik w wymaganym typie.",
    "Kod nie zgłasza błędu podczas uruchomienia.",
    "Wszystkie pokazane testy mają status PASS.",
  ];
  return (
    <div className="mt-5 space-y-4 text-sm">
      <div className="rounded-lg border border-zinc-700 bg-zinc-950 p-4">
        <p className="mb-2 text-[10px] font-bold uppercase tracking-[.18em] text-emerald-400">
          Ticket / Co masz zrobić
        </p>
        <p className="whitespace-pre-line leading-6 text-zinc-300">{challenge.description}</p>
        <p className="mt-3 leading-6 text-zinc-500">
          {briefing?.instructions ?? "Twoim zadaniem jest uzupełnić funkcję solve(). Nie zmieniaj jej nazwy. Testy uruchomią tę funkcję automatycznie i przekażą jej dane wejściowe."}
        </p>
        {briefing?.hint && <p className="mt-3 rounded-md border border-amber-500/20 bg-amber-500/5 p-3 leading-6 text-amber-200"><strong>Wskazówka:</strong> {briefing.hint}</p>}
      </div>
      <div className="grid gap-3 md:grid-cols-2">
        <div className="rounded-lg border border-zinc-800 p-4">
          <p className="mb-3 text-[10px] font-bold uppercase tracking-[.18em] text-zinc-500">
            Krok po kroku
          </p>
          <ol className="space-y-2 text-xs leading-5 text-zinc-400">
            {steps.map((step, index) => <li key={`${step}-${index}`}><strong className="text-zinc-200">{index + 1}.</strong> {step}</li>)}
          </ol>
        </div>
        <div className="rounded-lg border border-zinc-800 p-4">
          <p className="mb-3 text-[10px] font-bold uppercase tracking-[.18em] text-zinc-500">
            Definition of Done
          </p>
          <ul className="space-y-2 text-xs leading-5 text-zinc-400">
            {definitionOfDone.map((rule, index) => <li key={`${rule}-${index}`}><span className="text-emerald-400">✓</span> {rule}</li>)}
          </ul>
        </div>
      </div>
      <div className="rounded-lg border border-zinc-800 p-4">
        <p className="mb-3 text-[10px] font-bold uppercase tracking-[.18em] text-zinc-500">
          Konkretne przykłady
        </p>
        <div className="space-y-2">
          {challenge.test_cases.map((test, index) => (
            <div key={`${test.input}-${index}`} className="grid gap-2 rounded-md bg-zinc-950 p-3 font-mono text-xs sm:grid-cols-[1fr_auto_1fr] sm:items-center">
              <span><span className="text-zinc-600">WEJŚCIE: </span><span className="text-cyan-300">{test.input}</span></span>
              <span className="hidden text-zinc-700 sm:inline">→</span>
              <span><span className="text-zinc-600">ZWROT: </span><span className="text-emerald-300">{test.expected}</span></span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

function Stat({
  icon,
  value,
  label,
}: {
  icon: React.ReactNode;
  value: string;
  label: string;
}) {
  return (
    <motion.div
      whileHover={{ y: -2 }}
      className="rounded-lg border border-white/5 bg-zinc-950/60 p-3 shadow-inner"
    >
      <div className="mb-2 size-4 text-primary">{icon}</div>
      <div className="text-sm font-bold">{value}</div>
      <div className="text-[10px] uppercase tracking-wider text-zinc-600">
        {label}
      </div>
    </motion.div>
  );
}
