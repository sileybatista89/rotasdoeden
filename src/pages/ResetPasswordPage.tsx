import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { z } from "zod";
import { Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Logo } from "@/components/brand/Logo";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { SEO } from "@/components/SEO";

const pwdSchema = z.string().min(8, "Mínimo 8 caracteres").max(72);

export default function ResetPasswordPage() {
  const navigate = useNavigate();
  const [ready, setReady] = useState(false);
  const [pwd, setPwd] = useState("");
  const [pwd2, setPwd2] = useState("");
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    // Supabase auto-processa o hash de recuperação e cria sessão temporária
    const { data: sub } = supabase.auth.onAuthStateChange((event) => {
      if (event === "PASSWORD_RECOVERY" || event === "SIGNED_IN") setReady(true);
    });
    supabase.auth.getSession().then(({ data }) => {
      if (data.session) setReady(true);
    });
    return () => sub.subscription.unsubscribe();
  }, []);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    const p = pwdSchema.safeParse(pwd);
    if (!p.success) return toast.error(p.error.issues[0].message);
    if (pwd !== pwd2) return toast.error("As passwords não coincidem.");
    setBusy(true);
    const { error } = await supabase.auth.updateUser({ password: pwd });
    setBusy(false);
    if (error) return toast.error(error.message);
    toast.success("Password actualizada.");
    navigate("/", { replace: true });
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-muted/40 via-background to-primary/5 flex items-center justify-center p-4">
      <SEO title="Repor password | Rotas do Éden" description="Define uma nova password para a tua conta." path="/reset-password" />
      <div className="w-full max-w-md">
        <div className="flex justify-center mb-8"><Logo size="lg" /></div>
        <div className="bg-card border border-border rounded-2xl p-6 shadow-sm">
          <h1 className="font-display text-2xl font-bold mb-1">Nova password</h1>
          <p className="text-sm text-muted-foreground mb-6">Escolhe uma password forte com no mínimo 8 caracteres.</p>
          {!ready ? (
            <div className="flex items-center justify-center py-8 text-muted-foreground">
              <Loader2 className="animate-spin mr-2" size={16} /> A validar link…
            </div>
          ) : (
            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="np">Nova password</Label>
                <Input id="np" type="password" autoComplete="new-password" required minLength={8}
                  value={pwd} onChange={(e) => setPwd(e.target.value)} />
              </div>
              <div className="space-y-2">
                <Label htmlFor="np2">Confirmar password</Label>
                <Input id="np2" type="password" autoComplete="new-password" required minLength={8}
                  value={pwd2} onChange={(e) => setPwd2(e.target.value)} />
              </div>
              <Button type="submit" variant="hero" className="w-full h-11" disabled={busy}>
                {busy && <Loader2 className="animate-spin mr-2" size={16} />}
                Actualizar password
              </Button>
            </form>
          )}
        </div>
      </div>
    </div>
  );
}
