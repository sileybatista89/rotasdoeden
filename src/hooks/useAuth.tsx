import { createContext, useContext, useEffect, useState, ReactNode } from "react";
import type { Session, User } from "@supabase/supabase-js";
import { supabase } from "@/integrations/supabase/client";

type AppRole = "admin" | "guide" | "tourist";

interface AuthCtx {
  session: Session | null;
  user: User | null;
  role: AppRole | null;
  loading: boolean;
  signOut: () => Promise<void>;
}

const Ctx = createContext<AuthCtx>({
  session: null,
  user: null,
  role: null,
  loading: true,
  signOut: async () => {},
});

export function AuthProvider({ children }: { children: ReactNode }) {
  const [session, setSession] = useState<Session | null>(null);
  const [user, setUser] = useState<User | null>(null);
  const [role, setRole] = useState<AppRole | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let active = true;
    // Listener FIRST
    const { data: sub } = supabase.auth.onAuthStateChange((_event, s) => {
      if (!active) return;
      setSession(s);
      setUser(s?.user ?? null);
      if (s?.user) {
        // defer role fetch
        setTimeout(() => { fetchRole(s.user.id).catch(() => setRole("tourist")); }, 0);
      } else {
        setRole(null);
        setLoading(false);
      }
    });

    supabase.auth.getSession().then(({ data: { session: s }, error }) => {
      if (error) throw error;
      if (!active) return;
      setSession(s);
      setUser(s?.user ?? null);
      if (s?.user) fetchRole(s.user.id).finally(() => setLoading(false));
      else setLoading(false);
    }).catch((error) => {
      console.error("Não foi possível restaurar a sessão", error);
      if (active) { setSession(null); setUser(null); setRole(null); setLoading(false); }
    });

    return () => { active = false; sub.subscription.unsubscribe(); };
  }, []);

  async function fetchRole(uid: string) {
    const { data, error } = await supabase
      .from("user_roles")
      .select("role")
      .eq("user_id", uid)
      .order("role", { ascending: true })
      .limit(1)
      .maybeSingle();
    if (error) throw error;
    setRole((data?.role as AppRole) ?? "tourist");
  }

  async function signOut() {
    await supabase.auth.signOut();
    setRole(null);
  }

  return (
    <Ctx.Provider value={{ session, user, role, loading, signOut }}>{children}</Ctx.Provider>
  );
}

export const useAuth = () => useContext(Ctx);
