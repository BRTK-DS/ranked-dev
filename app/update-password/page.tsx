"use client";

import { FormEvent, useEffect, useState } from "react";
import Link from "next/link";
import { CheckCircle2, KeyRound, Loader2 } from "lucide-react";
import { getSupabaseBrowserClient } from "@/lib/supabase/client";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";

export default function UpdatePasswordPage() {
  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [message, setMessage] = useState("Validating recovery link...");
  const [ready, setReady] = useState(false);
  const [done, setDone] = useState(false);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    const supabase = getSupabaseBrowserClient();
    void supabase.auth.getSession().then(({ data }) => { setReady(Boolean(data.session)); setMessage(data.session ? "Choose a new password." : "This recovery link is invalid or has expired."); });
    const { data } = supabase.auth.onAuthStateChange((event, session) => { if (event === "PASSWORD_RECOVERY" || session) { setReady(true); setMessage("Choose a new password."); } });
    return () => data.subscription.unsubscribe();
  }, []);

  async function submit(event: FormEvent) {
    event.preventDefault();
    if (password !== confirm) return setMessage("Passwords do not match.");
    setBusy(true);
    const { error } = await getSupabaseBrowserClient().auth.updateUser({ password });
    setBusy(false);
    if (error) return setMessage(error.message);
    setDone(true);
    setMessage("Password updated successfully.");
  }

  return <main className="grid min-h-screen place-items-center px-4"><Card className="w-full max-w-md"><CardHeader className="text-center">{done ? <CheckCircle2 className="mx-auto mb-3 size-11 text-emerald-400" /> : <div className="mx-auto mb-3 grid size-11 place-items-center rounded-xl bg-primary text-zinc-950"><KeyRound /></div>}<CardTitle className="text-2xl">{done ? "Password changed" : "Set new password"}</CardTitle><p className={`mt-2 text-sm ${message.includes("invalid") || message.includes("match") ? "text-rose-400" : "text-muted-foreground"}`}>{message}</p></CardHeader><CardContent>{done ? <Button asChild className="w-full"><Link href="/auth">Continue to sign in</Link></Button> : <form className="space-y-4" onSubmit={submit}><Input type="password" placeholder="New password (8+ characters)" minLength={8} value={password} onChange={(e) => setPassword(e.target.value)} disabled={!ready} required /><Input type="password" placeholder="Repeat new password" minLength={8} value={confirm} onChange={(e) => setConfirm(e.target.value)} disabled={!ready} required /><Button className="w-full" disabled={!ready || busy}>{busy && <Loader2 className="size-4 animate-spin" />}Update password</Button></form>}</CardContent></Card></main>;
}
