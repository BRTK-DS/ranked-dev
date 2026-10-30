"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useMemo, useState } from "react";
import { motion } from "framer-motion";
import { ArrowRight, Braces, CheckCircle2, Code2, Dices, Dumbbell, Languages, Layers3, Play, Shield, Sparkles, Swords, TerminalSquare, Trophy, Zap } from "lucide-react";
import { useAuth } from "./auth-provider";
import { Badge } from "./ui/badge";
import { Button } from "./ui/button";
import { getSupabaseBrowserClient } from "@/lib/supabase/client";
import { demoChallenges } from "@/lib/demo";
import type { Challenge } from "@/lib/types";

type Language = "pl" | "en";
type Filter = "all" | "code" | "completion";

const copy = {
  pl: {
    navChallenges: "Zadania", navHow: "Jak to działa", arena: "Przejdź do areny", eyebrow: "NAUKA PRZEZ PRAKTYKĘ",
    titleA: "Koduj. Testuj.", titleB: "Wchodź wyżej.",
    intro: "RANKED.DEV to interaktywna arena programistyczna. Wybierasz zadanie, piszesz lub uzupełniasz kod i od razu sprawdzasz wynik na testach.",
    start: "Wybierz pierwsze zadanie", explore: "Zobacz zadania", available: "Dostępne zadania", choose: "Wybierz format i poziom, a potem rozpocznij zadanie bez zbędnej konfiguracji.",
    all: "Wszystkie", code: "Pisanie kodu", completion: "Uzupełnianie luk", easy: "Łatwe", medium: "Średnie", hard: "Trudne",
    open: "Rozpocznij", empty: "Brak zadań dla wybranych filtrów.", howTitle: "Od zadania do rozwiązania", howIntro: "Krótka pętla informacji zwrotnej pomaga skupić się na praktyce.",
    steps: [["01", "Wybierz wyzwanie", "Filtruj zadania według formatu i poziomu trudności."], ["02", "Napisz rozwiązanie", "Pracuj w edytorze albo uzupełnij wskazane luki."], ["03", "Uruchom testy", "Zobacz wynik, popraw kod i buduj serię zaliczonych zadań."]],
    footer: "Gotowy na następne zadanie?", footerText: "Wejdź do areny i sprawdź się na działającym kodzie.", signIn: "Zaloguj się", admin: "Panel admina", tasks: "zadań",
    modeEyebrow: "WYBIERZ TRYB", modeTitle: "Jak chcesz dziś kodować?", modeIntro: "Każdy tryb prowadzi do prawdziwego zadania, ale daje inny poziom presji i kontroli.",
    randomTitle: "Losowe zadanie", randomText: "Zdaj się na los i od razu przejdź do jednego z dostępnych wyzwań.", randomCta: "Wylosuj teraz",
    rankedTitle: "Rozgrywka rankingowa", rankedText: "Zmierz się z wymagającym zadaniem i walcz o serię, XP oraz pozycję.", rankedCta: "Graj rankingowo",
    trainingTitle: "Trening", trainingText: "Ćwicz we własnym tempie. Zacznij od łatwego zadania i testuj bez presji.", trainingCta: "Rozpocznij trening",
  },
  en: {
    navChallenges: "Challenges", navHow: "How it works", arena: "Enter the arena", eyebrow: "LEARN BY BUILDING",
    titleA: "Code. Test.", titleB: "Climb higher.",
    intro: "RANKED.DEV is an interactive coding arena. Pick a challenge, write or complete the code, and get immediate feedback from tests.",
    start: "Pick your first challenge", explore: "Explore challenges", available: "Available challenges", choose: "Choose a format and difficulty, then start without unnecessary setup.",
    all: "All", code: "Write code", completion: "Fill the gaps", easy: "Easy", medium: "Medium", hard: "Hard",
    open: "Start", empty: "No challenges match these filters.", howTitle: "From prompt to solution", howIntro: "A short feedback loop keeps the focus on hands-on practice.",
    steps: [["01", "Choose a challenge", "Filter tasks by format and difficulty."], ["02", "Build a solution", "Work in the editor or complete the highlighted gaps."], ["03", "Run the tests", "Review feedback, improve your code, and build a streak."]],
    footer: "Ready for the next challenge?", footerText: "Enter the arena and put your code to the test.", signIn: "Sign in", admin: "Admin panel", tasks: "challenges",
    modeEyebrow: "CHOOSE YOUR MODE", modeTitle: "How do you want to code today?", modeIntro: "Every mode opens a real challenge, with a different balance of pressure and control.",
    randomTitle: "Random challenge", randomText: "Leave the choice to chance and jump straight into an available challenge.", randomCta: "Roll a challenge",
    rankedTitle: "Ranked match", rankedText: "Take on a tougher task and compete for streaks, XP, and position.", rankedCta: "Play ranked",
    trainingTitle: "Training", trainingText: "Practice at your own pace. Start easy and test solutions without pressure.", trainingCta: "Start training",
  },
} as const;

const difficultyStyle = { Easy: "border-emerald-500/30 text-emerald-300", Medium: "border-amber-500/30 text-amber-300", Hard: "border-rose-500/30 text-rose-300" };

export function LandingPage() {
  const router = useRouter();
  const { session, profile } = useAuth();
  const [language, setLanguage] = useState<Language>("pl");
  const [challenges, setChallenges] = useState<Challenge[]>(demoChallenges);
  const [format, setFormat] = useState<Filter>("all");
  const [level, setLevel] = useState<"all" | Challenge["difficulty"]>("all");
  const t = copy[language];

  useEffect(() => { const saved = window.localStorage.getItem("ranked-language"); if (saved === "pl" || saved === "en") setLanguage(saved); }, []);
  useEffect(() => { void getSupabaseBrowserClient().from("challenges").select("*").order("created_at").then(({ data }) => { if (data?.length) setChallenges(data as Challenge[]); }); }, []);
  const filtered = useMemo(() => challenges.filter((challenge) => (format === "all" || (challenge.challenge_type ?? "code") === format) && (level === "all" || challenge.difficulty === level)), [challenges, format, level]);
  function switchLanguage() { const next = language === "pl" ? "en" : "pl"; setLanguage(next); window.localStorage.setItem("ranked-language", next); }
  function openRandom(mode: "random" | "ranked" | "training") {
    const pool = mode === "training" ? challenges.filter((item) => item.difficulty === "Easy") : mode === "ranked" ? challenges.filter((item) => item.difficulty !== "Easy") : challenges;
    const challenge = pool[Math.floor(Math.random() * pool.length)] ?? challenges[0];
    if (mode === "ranked" && !session) { window.sessionStorage.setItem("ranked-return", challenge ? `/arena?challenge=${challenge.id}&mode=ranked` : "/arena?mode=ranked"); router.push("/auth"); return; }
    router.push(challenge ? `/arena?challenge=${encodeURIComponent(challenge.id)}&mode=${mode}` : `/arena?mode=${mode}`);
  }

  return <main className="min-h-screen overflow-hidden bg-[#080a0d] text-zinc-100">
    <div className="pointer-events-none fixed inset-0 bg-[radial-gradient(circle_at_18%_5%,rgba(52,211,153,.10),transparent_28%),radial-gradient(circle_at_85%_30%,rgba(34,211,238,.07),transparent_24%)]" />
    <header className="relative z-20 border-b border-white/5 bg-[#080a0d]/80 backdrop-blur-xl"><div className="mx-auto flex h-16 max-w-7xl items-center justify-between px-5 lg:px-8">
      <Link href="/" className="flex items-center gap-3"><span className="grid size-9 place-items-center rounded-lg bg-emerald-400 text-zinc-950"><Code2 className="size-5" /></span><span className="font-black tracking-tight">RANKED<span className="text-emerald-400">.DEV</span></span></Link>
      <nav className="hidden items-center gap-7 text-sm text-zinc-400 md:flex"><a href="#challenges" className="hover:text-white">{t.navChallenges}</a><a href="#how" className="hover:text-white">{t.navHow}</a>{profile?.is_admin && <Link href="/admin" className="hover:text-white">{t.admin}</Link>}</nav>
      <div className="flex items-center gap-2"><Button variant="ghost" size="sm" onClick={switchLanguage} aria-label="Switch language"><Languages className="size-4" />{language.toUpperCase()}</Button><Button asChild size="sm"><Link href={session ? "/arena" : "/auth"}>{session ? t.arena : t.signIn}<ArrowRight className="size-4" /></Link></Button></div>
    </div></header>

    <section className="relative mx-auto min-h-[650px] max-w-7xl px-5 pb-20 pt-24 text-center lg:px-8 lg:pt-32">
      <motion.div initial={{ opacity: 0, y: 18 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: .5 }} className="mx-auto max-w-4xl">
        <div className="mb-6 inline-flex items-center gap-2 rounded-full border border-emerald-500/20 bg-emerald-500/5 px-3 py-1.5 text-[11px] font-bold tracking-[.18em] text-emerald-300"><Sparkles className="size-3.5" />{t.eyebrow}</div>
        <h1 className="text-5xl font-black leading-[.95] tracking-[-.055em] sm:text-7xl lg:text-8xl"><span>{t.titleA} </span><span className="bg-gradient-to-r from-emerald-300 via-cyan-300 to-emerald-300 bg-clip-text text-transparent">{t.titleB}</span></h1>
        <p className="mx-auto mt-7 max-w-2xl text-base leading-7 text-zinc-400 sm:text-lg">{t.intro}</p>
        <div className="mt-9 flex flex-wrap justify-center gap-3"><Button className="h-12 px-6" onClick={() => openRandom("random")}><Dices className="size-4" />{t.randomCta}</Button><Button asChild className="h-12 px-6" variant="outline"><a href="#modes">{t.modeEyebrow}<ArrowRight className="size-4" /></a></Button></div>
      </motion.div>
      <div className="mx-auto mt-16 grid max-w-3xl grid-cols-3 divide-x divide-white/10 rounded-2xl border border-white/8 bg-white/[.025] py-5 text-sm text-zinc-500 backdrop-blur"><span><strong className="block text-2xl text-zinc-100">{challenges.length}</strong>{t.tasks}</span><span><strong className="block text-2xl text-zinc-100">2</strong>{language === "pl" ? "formaty" : "formats"}</span><span><strong className="block text-2xl text-zinc-100">3</strong>{language === "pl" ? "poziomy" : "levels"}</span></div>
    </section>

    <section id="modes" className="relative mx-auto max-w-7xl px-5 pb-24 lg:px-8"><div className="mb-9 text-center"><p className="text-xs font-bold uppercase tracking-[.2em] text-emerald-400">{t.modeEyebrow}</p><h2 className="mt-3 text-3xl font-black sm:text-4xl">{t.modeTitle}</h2><p className="mx-auto mt-3 max-w-2xl text-zinc-400">{t.modeIntro}</p></div>
      <div className="grid gap-4 lg:grid-cols-3">
        <button onClick={() => openRandom("random")} className="group relative overflow-hidden rounded-2xl border border-cyan-500/20 bg-gradient-to-br from-cyan-500/10 to-[#0d1014] p-6 text-left transition hover:-translate-y-1 hover:border-cyan-400/50"><div className="flex items-start justify-between"><span className="grid size-12 place-items-center rounded-xl bg-cyan-400 text-zinc-950"><Dices className="size-6"/></span><Zap className="size-5 text-cyan-300"/></div><h3 className="mt-10 text-xl font-black">{t.randomTitle}</h3><p className="mt-3 min-h-12 text-sm leading-6 text-zinc-400">{t.randomText}</p><span className="mt-7 flex items-center gap-2 text-sm font-bold text-cyan-300">{t.randomCta}<ArrowRight className="size-4 transition group-hover:translate-x-1"/></span></button>
        <button onClick={() => openRandom("ranked")} className="group relative overflow-hidden rounded-2xl border border-amber-500/20 bg-gradient-to-br from-amber-500/10 to-[#0d1014] p-6 text-left transition hover:-translate-y-1 hover:border-amber-400/50"><div className="flex items-start justify-between"><span className="grid size-12 place-items-center rounded-xl bg-amber-300 text-zinc-950"><Swords className="size-6"/></span><Shield className="size-5 text-amber-300"/></div><h3 className="mt-10 text-xl font-black">{t.rankedTitle}</h3><p className="mt-3 min-h-12 text-sm leading-6 text-zinc-400">{t.rankedText}</p><span className="mt-7 flex items-center gap-2 text-sm font-bold text-amber-300">{t.rankedCta}<ArrowRight className="size-4 transition group-hover:translate-x-1"/></span></button>
        <button onClick={() => openRandom("training")} className="group relative overflow-hidden rounded-2xl border border-emerald-500/20 bg-gradient-to-br from-emerald-500/10 to-[#0d1014] p-6 text-left transition hover:-translate-y-1 hover:border-emerald-400/50"><div className="flex items-start justify-between"><span className="grid size-12 place-items-center rounded-xl bg-emerald-400 text-zinc-950"><Dumbbell className="size-6"/></span><Play className="size-5 text-emerald-300"/></div><h3 className="mt-10 text-xl font-black">{t.trainingTitle}</h3><p className="mt-3 min-h-12 text-sm leading-6 text-zinc-400">{t.trainingText}</p><span className="mt-7 flex items-center gap-2 text-sm font-bold text-emerald-300">{t.trainingCta}<ArrowRight className="size-4 transition group-hover:translate-x-1"/></span></button>
      </div>
    </section>

    <section id="challenges" className="relative border-y border-white/5 bg-white/[.015] py-24"><div className="mx-auto max-w-7xl px-5 lg:px-8">
      <div className="flex flex-col justify-between gap-6 md:flex-row md:items-end"><div><p className="text-xs font-bold uppercase tracking-[.2em] text-emerald-400">{t.explore}</p><h2 className="mt-3 text-3xl font-black tracking-tight sm:text-4xl">{t.available}</h2><p className="mt-3 max-w-xl text-zinc-400">{t.choose}</p></div><div className="flex flex-wrap gap-2">{(["all", "code", "completion"] as Filter[]).map(value => <Button key={value} variant={format === value ? "default" : "outline"} size="sm" onClick={() => setFormat(value)}>{value === "all" ? t.all : value === "code" ? t.code : t.completion}</Button>)}</div></div>
      <div className="mt-6 flex flex-wrap gap-2">{(["all", "Easy", "Medium", "Hard"] as const).map(value => <button key={value} onClick={() => setLevel(value)} className={`rounded-full border px-3 py-1.5 text-xs transition ${level === value ? "border-zinc-500 bg-zinc-800 text-white" : "border-zinc-800 text-zinc-500 hover:text-zinc-200"}`}>{value === "all" ? t.all : value === "Easy" ? t.easy : value === "Medium" ? t.medium : t.hard}</button>)}</div>
      <div className="mt-8 grid gap-4 md:grid-cols-2 lg:grid-cols-3">{filtered.map((challenge, index) => <motion.article layout initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: Math.min(index * .04, .2) }} key={challenge.id} className="group flex min-h-64 flex-col rounded-xl border border-white/8 bg-[#0d1014] p-5 transition hover:-translate-y-1 hover:border-emerald-500/30">
        <div className="flex items-center justify-between"><span className="grid size-9 place-items-center rounded-lg border border-white/5 bg-black/30 text-emerald-300">{challenge.challenge_type === "completion" ? <Braces className="size-4"/> : <TerminalSquare className="size-4"/>}</span><Badge className={difficultyStyle[challenge.difficulty]}>{challenge.difficulty}</Badge></div>
        <h3 className="mt-5 text-lg font-bold leading-6 group-hover:text-emerald-300">{challenge.title}</h3><p className="mt-3 line-clamp-3 text-sm leading-6 text-zinc-500">{challenge.description}</p>
        <div className="mt-auto flex items-center justify-between pt-6"><span className="text-[10px] font-bold uppercase tracking-wider text-zinc-600">{challenge.challenge_type === "completion" ? t.completion : t.code}</span><Link href={`/arena?challenge=${encodeURIComponent(challenge.id)}`} className="flex items-center gap-1 text-sm font-semibold text-emerald-300">{t.open}<ArrowRight className="size-4 transition group-hover:translate-x-1"/></Link></div>
      </motion.article>)}</div>{!filtered.length && <div className="mt-8 rounded-xl border border-dashed border-zinc-800 p-12 text-center text-zinc-500">{t.empty}</div>}
    </div></section>

    <section id="how" className="relative mx-auto max-w-7xl px-5 py-24 lg:px-8"><div className="max-w-2xl"><p className="text-xs font-bold uppercase tracking-[.2em] text-cyan-300">RANKED FLOW</p><h2 className="mt-3 text-3xl font-black sm:text-4xl">{t.howTitle}</h2><p className="mt-3 text-zinc-400">{t.howIntro}</p></div><div className="mt-10 grid gap-4 md:grid-cols-3">{t.steps.map(([number, title, text], index) => <div key={number} className="relative rounded-xl border border-white/8 bg-[#0d1014] p-6"><span className="font-mono text-xs text-emerald-400">{number}</span><div className="mt-8">{index === 0 ? <Layers3 className="size-6 text-zinc-300"/> : index === 1 ? <Code2 className="size-6 text-zinc-300"/> : <CheckCircle2 className="size-6 text-zinc-300"/>}</div><h3 className="mt-4 font-bold">{title}</h3><p className="mt-2 text-sm leading-6 text-zinc-500">{text}</p></div>)}</div></section>

    <section className="relative mx-auto max-w-7xl px-5 pb-24 lg:px-8"><div className="flex flex-col items-start justify-between gap-6 overflow-hidden rounded-2xl border border-emerald-500/20 bg-gradient-to-r from-emerald-500/10 to-cyan-500/5 p-8 md:flex-row md:items-center md:p-10"><div><Trophy className="mb-4 size-7 text-amber-300"/><h2 className="text-2xl font-black">{t.footer}</h2><p className="mt-2 text-zinc-400">{t.footerText}</p></div><Button asChild className="h-12 px-6"><Link href="/arena">{t.arena}<ArrowRight className="size-4"/></Link></Button></div></section>
  </main>;
}
