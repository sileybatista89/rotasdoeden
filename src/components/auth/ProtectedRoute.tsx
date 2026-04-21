import { ReactNode, useEffect, useState } from "react";
import { Navigate, useLocation } from "react-router-dom";
import { useAuth } from "@/hooks/useAuth";
import { supabase } from "@/integrations/supabase/client";
import { Loader2 } from "lucide-react";

type Role = "admin" | "guide" | "tourist";

export function ProtectedRoute({
  children,
  requireRole,
}: {
  children: ReactNode;
  requireRole?: Role;
}) {
  const { user, role, loading } = useAuth();
  const location = useLocation();
  const [banned, setBanned] = useState<boolean | null>(null);

  useEffect(() => {
    if (!user) {
      setBanned(null);
      return;
    }
    let cancelled = false;
    supabase
      .from("profiles")
      .select("banned")
      .eq("id", user.id)
      .maybeSingle()
      .then(({ data }) => {
        if (!cancelled) setBanned(data?.banned === true);
      });
    return () => {
      cancelled = true;
    };
  }, [user]);

  if (loading || (user && banned === null)) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Loader2 className="animate-spin text-muted-foreground" />
      </div>
    );
  }

  if (!user) {
    return <Navigate to="/auth" state={{ from: location.pathname }} replace />;
  }

  if (banned) {
    // Sign out a banned account and bounce to auth page
    supabase.auth.signOut();
    return <Navigate to="/auth" replace />;
  }

  if (requireRole && role !== requireRole && role !== "admin") {
    return <Navigate to="/" replace />;
  }

  return <>{children}</>;
}
