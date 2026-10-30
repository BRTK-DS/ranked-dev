"use client";
import { FormEvent, useState } from "react";
import { useRouter } from "next/navigation";
import { Code2, Loader2 } from "lucide-react";
import { getSupabaseBrowserClient } from "@/lib/supabase/client";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
export default function AuthPage() {
  const [mode, setMode] = useState<"signin" | "signup">("signin"); const [email, setEmail] = useState(""); const [password, setPassword] = useState(""); const [message, setMessage] = useState(""); const [busy, setBusy] = useState(false); const router = useRouter();
  async function submit(event: FormEvent) { event.preventDefault(); setBusy(true); setMessage(""); const supabase = getSupabaseBrowserClient(); const result = mode === "signin" ? await supabase.auth.signInWithPassword({ email, password }) : await supabase.auth.signUp({ email, password, options: { data: { username: email.split("@")[0] } } }); setBusy(false); if (result.error) return setMessage(result.error.message); if (mode === "signup" && !result.data.session) return setMessage("Check your inbox to confirm your account."); router.push("/"); }
  return <main className="grid min-h-screen place-items-center px-4"><Card className="w-full max-w-md"><CardHeader className="text-center"><div className="mx-auto mb-3 grid size-11 place-items-center rounded-xl bg-primary text-zinc-950"><Code2 /></div><CardTitle className="text-2xl">Enter the arena</CardTitle><p className="text-sm text-muted-foreground">Every run, rank and rival—saved.</p></CardHeader><CardContent><form className="space-y-4" onSubmit={submit}><Input type="email" placeholder="you@example.com" value={email} onChange={(e) => setEmail(e.target.value)} required /><Input type="password" placeholder="Password (8+ characters)" minLength={8} value={password} onChange={(e) => setPassword(e.target.value)} required />{message && <p className="text-sm text-rose-400" role="alert">{message}</p>}<Button className="w-full" disabled={busy}>{busy && <Loader2 className="size-4 animate-spin" />}{mode === "signin" ? "Sign in" : "Create account"}</Button></form><button className="mt-5 w-full text-sm text-muted-foreground hover:text-white" onClick={() => setMode(mode === "signin" ? "signup" : "signin")}>{mode === "signin" ? "New contender? Create an account" : "Already ranked? Sign in"}</button></CardContent></Card></main>;
}
