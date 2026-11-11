import { ReactNode, useEffect, useState } from "react";
import { Navigate, useLocation } from "react-router-dom";
import { useAuth } from "@/hooks/useAuth";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Loader2 } from "lucide-react";

type Role = "admin" | "guide" | "tourist";

/**
 * Estado da verificação da conta.
 *
 * `unavailable` existe porque uma falha ao consultar o perfil **não** é prova de que a conta está
 * autorizada. Tratar o erro como "não banido" mostrava conteúdo protegido a quem não se conseguiu
 * verificar. Aqui a falha falha fechada: mostra-se um ecrã de verificação indisponível.
 *
 * Isto é defesa em profundidade de interface. A autorização real é do backend (RLS e funções com
 * verificação de admin); esconder ou bloquear uma rota no cliente nunca substitui isso.
 */
type AccountState = "checking" | "allowed" | "banned" | "unavailable";

export function ProtectedRoute({
  children,
  requireRole,
}: {
  children: ReactNode;
  requireRole?: Role;
}) {
  const { user, role, loading } = useAuth();
  const location = useLocation();
  const [accountState, setAccountState] = useState<AccountState>("checking");
  const [attempt, setAttempt] = useState(0);

  useEffect(() => {
    if (!user) {
      setAccountState("checking");
      return;
    }

    let cancelled = false;
    setAccountState("checking");

    const validateAccount = async () => {
      try {
        const { data, error } = await supabase
          .from("profiles")
          .select("banned")
          .eq("id", user.id)
          .maybeSingle();
        if (error) throw error;
        if (cancelled) return;
        setAccountState(data?.banned === true ? "banned" : "allowed");
      } catch {
        if (!cancelled) setAccountState("unavailable");
      }
    };

    void validateAccount();
    return () => {
      cancelled = true;
    };
  }, [user, attempt]);

  // Efeito (não render) para não repetir o signOut a cada renderização.
  useEffect(() => {
    if (accountState === "banned") void supabase.auth.signOut();
  }, [accountState]);

  const busy = loading || (user && accountState === "checking");

  if (busy) {
    return (
      <div className="min-h-screen flex items-center justify-center" role="status" aria-live="polite">
        <Loader2 className="animate-spin text-muted-foreground" aria-hidden="true" />
        <span className="sr-only">A verificar a sua conta</span>
      </div>
    );
  }

  if (!user) {
    return <Navigate to="/auth" state={{ from: location.pathname }} replace />;
  }

  if (accountState === "banned") {
    return <Navigate to="/auth" replace />;
  }

  if (accountState === "unavailable") {
    return (
      <div className="min-h-screen flex items-center justify-center px-6 py-16">
        <div className="w-full max-w-md" role="alert" aria-labelledby="account-check-title">
          <h1 id="account-check-title" className="display-md mb-3">
            Não conseguimos confirmar o estado da conta
          </h1>
          <p className="mb-2 text-sm leading-6 text-muted-foreground">
            Esta área está bloqueada até a verificação ser possível. Não é uma confirmação de que a
            sua conta está autorizada, nem de que está suspensa.
          </p>
          <p className="mb-6 text-xs leading-5 text-muted-foreground">
            Verifique a ligação e tente novamente. Se persistir, termine sessão e volte a entrar.
          </p>
          <div className="flex flex-col gap-3 sm:flex-row">
            <Button variant="hero" className="min-h-11" onClick={() => setAttempt((value) => value + 1)}>
              Tentar novamente
            </Button>
            <Button
              variant="outline"
              className="min-h-11"
              onClick={() => {
                void supabase.auth.signOut();
              }}
            >
              Terminar sessão
            </Button>
          </div>
        </div>
      </div>
    );
  }

  if (requireRole && role !== requireRole && role !== "admin") {
    return <Navigate to="/" replace />;
  }

  return <>{children}</>;
}
