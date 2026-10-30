"use client";
import { createContext, useContext, useEffect, useState } from "react";
import type { Session } from "@supabase/supabase-js";
import { getSupabaseBrowserClient } from "@/lib/supabase/client";
import type { Profile } from "@/lib/types";
type AuthState = { session: Session | null; profile: Profile | null; loading: boolean; signOut: () => Promise<void>; refreshProfile: () => Promise<void> };
const Context = createContext<AuthState>({ session: null, profile: null, loading: true, signOut: async () => {}, refreshProfile: async () => {} });
export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [session, setSession] = useState<Session | null>(null); const [profile, setProfile] = useState<Profile | null>(null); const [loading, setLoading] = useState(true);
  async function loadProfile(userId?: string) { if (!userId) return setProfile(null); const { data } = await getSupabaseBrowserClient().from("profiles").select("*").eq("id", userId).single(); setProfile(data); }
  useEffect(() => { let mounted = true; const supabase = getSupabaseBrowserClient(); supabase.auth.getSession().then(({ data }) => { if (!mounted) return; setSession(data.session); return loadProfile(data.session?.user.id); }).finally(() => mounted && setLoading(false)); const { data } = supabase.auth.onAuthStateChange((_event, next) => { setSession(next); void loadProfile(next?.user.id); }); return () => { mounted = false; data.subscription.unsubscribe(); }; }, []);
  async function signOut() { await getSupabaseBrowserClient().auth.signOut(); setProfile(null); }
  return <Context.Provider value={{ session, profile, loading, signOut, refreshProfile: () => loadProfile(session?.user.id) }}>{children}</Context.Provider>;
}
export const useAuth = () => useContext(Context);
