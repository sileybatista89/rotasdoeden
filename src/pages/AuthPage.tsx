import { useState, useEffect, useMemo } from "react";
import { Link, useLocation, useNavigate, useSearchParams } from "react-router-dom";
import { z } from "zod";
import { Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Logo } from "@/components/brand/Logo";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { supabase } from "@/integrations/supabase/client";

import { useAuth } from "@/hooks/useAuth";
import { toast } from "sonner";
import { SEO } from "@/components/SEO";

const emailSchema = z.string().trim().email("Email inválido").max(255);
const passwordSchema = z.string().min(8, "Mínimo 8 caracteres").max(72);
const nameSchema = z.string().trim().min(2, "Mínimo 2 caracteres").max(100);


export default function AuthPage() {
  const { user, loading } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const [params] = useSearchParams();

  const initialMode = params.get("mode") === "login" ? "login" : "register";
  const initialRole = params.get("role") === "guide" ? "guide" : "tourist";
  const next = useMemo(() => {
    const q = params.get("next");
    if (q && q.startsWith("/")) return q;
    return (location.state as { from?: string })?.from ?? "/";
  }, [params, location.state]);

  const [tab, setTab] = useState<"login" | "register">(initialMode);
  const [busy, setBusy] = useState(false);
  

  const [loginEmail, setLoginEmail] = useState("");
  const [loginPwd, setLoginPwd] = useState("");

  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [pwd, setPwd] = useState("");
  const [role, setRole] = useState<"tourist" | "guide">(initialRole);
  const [acceptedTerms, setAcceptedTerms] = useState(false);

  const [forgotOpen, setForgotOpen] = useState(false);
  const [forgotEmail, setForgotEmail] = useState("");
  const [forgotBusy, setForgotBusy] = useState(false);

  useEffect(() => {
    if (!loading && user) navigate(next, { replace: true });
  }, [user, loading, next, navigate]);


  async function handleLogin(e: React.FormEvent) {
    e.preventDefault();
    const parsed = emailSchema.safeParse(loginEmail);
    if (!parsed.success) return toast.error(parsed.error.issues[0].message);
    setBusy(true);
    const { error } = await supabase.auth.signInWithPassword({
      email: loginEmail,
      password: loginPwd,
    });
    setBusy(false);
    if (error) return toast.error(error.message);
    toast.success("Bem-vindo de volta!");
  }

  async function handleRegister(e: React.FormEvent) {
    e.preventDefault();
    const ne = nameSchema.safeParse(name);
    const ee = emailSchema.safeParse(email);
    const pe = passwordSchema.safeParse(pwd);
    if (!ne.success) return toast.error(ne.error.issues[0].message);
    if (!ee.success) return toast.error(ee.error.issues[0].message);
    if (!pe.success) return toast.error(pe.error.issues[0].message);
    if (!acceptedTerms) return toast.error("Tens de aceitar os Termos e a Política de Privacidade.");

    setBusy(true);
    const { error } = await supabase.auth.signUp({
      email,
      password: pwd,
      options: {
        emailRedirectTo: `${window.location.origin}${next}`,
        data: { full_name: name, role },
      },
    });
    setBusy(false);
    if (error) return toast.error(error.message);
    toast.success("Conta criada, verifica o teu email para confirmar.");
    setTab("login");
    setLoginEmail(email);
  }

  async function handleForgot(e: React.FormEvent) {
    e.preventDefault();
    const parsed = emailSchema.safeParse(forgotEmail);
    if (!parsed.success) return toast.error(parsed.error.issues[0].message);
    setForgotBusy(true);
    const { error } = await supabase.auth.resetPasswordForEmail(forgotEmail, {
      redirectTo: `${window.location.origin}/reset-password`,
    });
    setForgotBusy(false);
    if (error) return toast.error(error.message);
    toast.success("Verifica o teu email para repor a password.");
    setForgotOpen(false);
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-muted/40 via-background to-primary/5 flex items-center justify-center p-4">
      <SEO
        title="Entrar ou criar conta | Rotas do Éden"
        description="Acede à tua conta Rotas do Éden ou regista-te como turista ou guia parceiro em São Tomé e Príncipe."
        path="/auth"
      />
      <div className="w-full max-w-md">
        <div className="flex justify-center mb-8">
          <Logo size="lg" to="/" />
        </div>

        <div className="bg-card border border-border rounded-2xl p-6 shadow-sm">
          <Tabs value={tab} onValueChange={(v) => setTab(v as "login" | "register")}>
            <TabsList className="grid grid-cols-2 w-full mb-6">
              <TabsTrigger value="register">Criar conta</TabsTrigger>
              <TabsTrigger value="login">Entrar</TabsTrigger>
            </TabsList>


            <TabsContent value="register">
              {role === "guide" && (
                <div className="mb-5 rounded-xl border border-primary/20 bg-primary/5 p-4 text-sm">
                  <p className="font-display font-semibold mb-1">Candidatura a Guia Parceiro</p>
                  <p className="text-muted-foreground text-xs leading-relaxed">
                    Cria a tua conta. Depois submetes os documentos KYC e, após aprovação, podes publicar experiências.
                  </p>
                </div>
              )}
              <form onSubmit={handleRegister} className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="rn">Nome completo</Label>
                  <Input id="rn" required value={name} onChange={(e) => setName(e.target.value)} />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="re">Email</Label>
                  <Input id="re" type="email" autoComplete="email" required
                    value={email} onChange={(e) => setEmail(e.target.value)} />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="rp">Password (mín. 8)</Label>
                  <Input id="rp" type="password" autoComplete="new-password" required minLength={8}
                    value={pwd} onChange={(e) => setPwd(e.target.value)} />
                </div>
                <div className="space-y-2">
                  <Label>Tipo de conta</Label>
                  <RadioGroup value={role} onValueChange={(v) => setRole(v as "tourist" | "guide")}
                    className="grid grid-cols-2 gap-3">
                    <label className="flex items-center gap-2 border border-border rounded-lg p-3 cursor-pointer hover:bg-muted transition-colors">
                      <RadioGroupItem value="tourist" id="rt" />
                      <span className="text-sm">Turista</span>
                    </label>
                    <label className="flex items-center gap-2 border border-border rounded-lg p-3 cursor-pointer hover:bg-muted transition-colors">
                      <RadioGroupItem value="guide" id="rg" />
                      <span className="text-sm">Guia turístico</span>
                    </label>
                  </RadioGroup>
                </div>
                <div className="flex items-start gap-2 pt-1">
                  <Checkbox
                    id="terms"
                    checked={acceptedTerms}
                    onCheckedChange={(v) => setAcceptedTerms(v === true)}
                    className="mt-0.5"
                  />
                  <Label htmlFor="terms" className="text-xs leading-relaxed text-muted-foreground font-normal cursor-pointer">
                    Li e aceito os{" "}
                    <Link to="/legal/termos" target="_blank" className="text-primary font-medium hover:underline">
                      Termos
                    </Link>{" "}
                    e a{" "}
                    <Link to="/legal/privacidade" target="_blank" className="text-primary font-medium hover:underline">
                      Política de Privacidade
                    </Link>.
                  </Label>
                </div>
                <Button type="submit" variant="hero" className="w-full h-11" disabled={busy || !acceptedTerms}>
                  {busy && <Loader2 className="animate-spin mr-2" size={16} />}
                  Criar conta
                </Button>
              </form>
            </TabsContent>

            <TabsContent value="login">
              {!forgotOpen ? (
                <form onSubmit={handleLogin} className="space-y-4">
                  <div className="space-y-2">
                    <Label htmlFor="le">Email</Label>
                    <Input id="le" type="email" autoComplete="email" required
                      value={loginEmail} onChange={(e) => setLoginEmail(e.target.value)} />
                  </div>
                  <div className="space-y-2">
                    <div className="flex items-center justify-between">
                      <Label htmlFor="lp">Password</Label>
                      <button
                        type="button"
                        onClick={() => { setForgotEmail(loginEmail); setForgotOpen(true); }}
                        className="text-xs text-primary hover:underline"
                      >
                        Esqueci-me
                      </button>
                    </div>
                    <Input id="lp" type="password" autoComplete="current-password" required
                      value={loginPwd} onChange={(e) => setLoginPwd(e.target.value)} />
                  </div>
                  <Button type="submit" variant="hero" className="w-full h-11" disabled={busy}>
                    {busy && <Loader2 className="animate-spin mr-2" size={16} />}
                    Entrar
                  </Button>
                </form>
              ) : (
                <form onSubmit={handleForgot} className="space-y-4">
                  <div className="space-y-2">
                    <Label htmlFor="fe">Email da conta</Label>
                    <Input id="fe" type="email" required
                      value={forgotEmail} onChange={(e) => setForgotEmail(e.target.value)} />
                    <p className="text-xs text-muted-foreground">
                      Enviamos um link para repores a tua password.
                    </p>
                  </div>
                  <div className="flex gap-2">
                    <Button type="button" variant="outline" className="flex-1" onClick={() => setForgotOpen(false)}>
                      Cancelar
                    </Button>
                    <Button type="submit" variant="hero" className="flex-1" disabled={forgotBusy}>
                      {forgotBusy && <Loader2 className="animate-spin mr-2" size={16} />}
                      Enviar
                    </Button>
                  </div>
                </form>
              )}
            </TabsContent>
          </Tabs>
        </div>

        <p className="text-center text-xs text-muted-foreground mt-6">
          Ao continuar, concordas em proteger a tua conta e seguir os Termos de uso.
        </p>
      </div>
    </div>
  );
}
