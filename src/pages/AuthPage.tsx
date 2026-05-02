import { useState, useEffect, useMemo } from "react";
import { Link, useLocation, useNavigate, useSearchParams } from "react-router-dom";
import { z } from "zod";
import { Leaf, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { toast } from "sonner";

const emailSchema = z.string().trim().email("Email inválido").max(255);
const passwordSchema = z.string().min(8, "Mínimo 8 caracteres").max(72);
const nameSchema = z.string().trim().min(2, "Mínimo 2 caracteres").max(100);

export default function AuthPage() {
  const { user, loading } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const [params] = useSearchParams();

  const initialMode = params.get("mode") === "register" ? "register" : "login";
  const initialRole = params.get("role") === "guide" ? "guide" : "tourist";
  const next = useMemo(() => {
    const q = params.get("next");
    if (q && q.startsWith("/")) return q;
    return (location.state as { from?: string })?.from ?? "/";
  }, [params, location.state]);

  const [tab, setTab] = useState<"login" | "register">(initialMode);
  const [busy, setBusy] = useState(false);

  // login
  const [loginEmail, setLoginEmail] = useState("");
  const [loginPwd, setLoginPwd] = useState("");

  // register
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [pwd, setPwd] = useState("");
  const [role, setRole] = useState<"tourist" | "guide">(initialRole);
  const [acceptedTerms, setAcceptedTerms] = useState(false);

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
        emailRedirectTo: `${window.location.origin}/`,
        data: { full_name: name, role },
      },
    });
    setBusy(false);
    if (error) return toast.error(error.message);
    toast.success("Conta criada — pode iniciar sessão.", {
      description: "O primeiro utilizador da plataforma fica como administrador.",
    });
    setTab("login");
    setLoginEmail(email);
  }

  return (
    <div className="min-h-screen bg-muted/30 flex items-center justify-center p-4">
      <div className="w-full max-w-md">
        <Link to="/" className="flex items-center gap-2 justify-center mb-8">
          <div className="w-10 h-10 rounded-full bg-primary flex items-center justify-center">
            <Leaf size={22} className="text-primary-foreground" />
          </div>
          <span className="font-display font-bold text-xl text-foreground">Rotas do Éden</span>
        </Link>

        <div className="bg-card border border-border rounded-2xl p-6 shadow-sm">
          {tab === "register" && role === "guide" && (
            <div className="mb-5 rounded-xl border border-primary/20 bg-primary/5 p-4 text-sm text-foreground">
              <p className="font-display font-semibold mb-1">Candidatura a Guia Parceiro</p>
              <p className="text-muted-foreground text-xs leading-relaxed">
                Cria a tua conta de guia. Depois vais submeter os documentos KYC (BI/passaporte,
                licença e selfie) e, após aprovação pela equipa, podes publicar as tuas experiências.
              </p>
            </div>
          )}
          <Tabs value={tab} onValueChange={(v) => setTab(v as "login" | "register")}>
            <TabsList className="grid grid-cols-2 w-full mb-6">
              <TabsTrigger value="login">Entrar</TabsTrigger>
              <TabsTrigger value="register">Registar</TabsTrigger>
            </TabsList>

            <TabsContent value="login">
              <form onSubmit={handleLogin} className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="le">Email</Label>
                  <Input id="le" type="email" autoComplete="email" required
                    value={loginEmail} onChange={(e) => setLoginEmail(e.target.value)} />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="lp">Password</Label>
                  <Input id="lp" type="password" autoComplete="current-password" required
                    value={loginPwd} onChange={(e) => setLoginPwd(e.target.value)} />
                </div>
                <Button type="submit" variant="hero" className="w-full" disabled={busy}>
                  {busy && <Loader2 className="animate-spin mr-2" size={16} />}
                  Entrar
                </Button>
              </form>
            </TabsContent>

            <TabsContent value="register">
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
                    <label className="flex items-center gap-2 border border-border rounded-lg p-3 cursor-pointer hover:bg-muted">
                      <RadioGroupItem value="tourist" id="rt" />
                      <span className="text-sm">Turista</span>
                    </label>
                    <label className="flex items-center gap-2 border border-border rounded-lg p-3 cursor-pointer hover:bg-muted">
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
                      Termos de Serviço
                    </Link>{" "}
                    e a{" "}
                    <Link to="/legal/privacidade" target="_blank" className="text-primary font-medium hover:underline">
                      Política de Privacidade
                    </Link>
                    .
                  </Label>
                </div>
                <Button type="submit" variant="hero" className="w-full" disabled={busy || !acceptedTerms}>
                  {busy && <Loader2 className="animate-spin mr-2" size={16} />}
                  Criar conta
                </Button>
                <p className="text-xs text-muted-foreground text-center">
                  O primeiro utilizador registado torna-se administrador da plataforma.
                </p>
              </form>
            </TabsContent>
          </Tabs>
        </div>
      </div>
    </div>
  );
}
