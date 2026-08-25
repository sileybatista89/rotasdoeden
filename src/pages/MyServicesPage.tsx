import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { Plus, Pencil, Trash2, Eye, EyeOff, Loader2, AlertCircle } from "lucide-react";
import { Navbar } from "@/components/layout/Navbar";
import { Footer } from "@/components/layout/Footer";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { useAuth } from "@/hooks/useAuth";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import type { Database } from "@/integrations/supabase/types";
import { moderationClass, moderationLabel } from "@/lib/guideStatus";

type ServiceRow = Database["public"]["Tables"]["services"]["Row"];

const categoryLabels: Record<string, string> = {
  tour: "Tour",
  experience: "Experiência",
  transfer: "Transfer",
  diving: "Mergulho",
  hiking: "Trilho",
  fishing: "Pesca",
  kayak: "Kayak",
  surfing: "Surf",
  birdwatching: "Birdwatching",
  photography: "Fotografia",
  gastronomy: "Gastronomia",
  culture: "Cultura",
  nightlife: "Vida Noturna",
};

export default function MyServicesPage() {
  const { user } = useAuth();
  const { toast } = useToast();
  const [services, setServices] = useState<ServiceRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [kycVerified, setKycVerified] = useState<boolean | null>(null);

  useEffect(() => {
    if (!user) return;
    void loadData();
  }, [user]);

  async function loadData() {
    if (!user) return;
    setLoading(true);
    const [{ data: profile }, { data: svc, error }] = await Promise.all([
      supabase.from("profiles").select("kyc_status").eq("id", user.id).maybeSingle(),
      supabase.from("services").select("*").eq("guide_id", user.id).order("created_at", { ascending: false }),
    ]);
    setKycVerified(profile?.kyc_status === "verified");
    if (error) {
      toast({ title: "Erro a carregar serviços", description: error.message, variant: "destructive" });
    } else {
      setServices(svc ?? []);
    }
    setLoading(false);
  }

  async function toggleActive(svc: ServiceRow) {
    const { error } = await supabase
      .from("services")
      .update({ is_active: !svc.is_active })
      .eq("id", svc.id);
    if (error) {
      toast({ title: "Erro", description: error.message, variant: "destructive" });
      return;
    }
    setServices((prev) => prev.map((s) => (s.id === svc.id ? { ...s, is_active: !s.is_active } : s)));
    toast({ title: svc.is_active ? "Serviço desativado" : "Serviço ativado" });
  }

  async function deleteService(svc: ServiceRow) {
    if (!confirm(`Tem a certeza que quer eliminar "${svc.title}"? Esta ação é irreversível.`)) return;
    const { error } = await supabase.from("services").delete().eq("id", svc.id);
    if (error) {
      toast({ title: "Erro", description: error.message, variant: "destructive" });
      return;
    }
    setServices((prev) => prev.filter((s) => s.id !== svc.id));
    toast({ title: "Serviço eliminado" });
  }

  return (
    <div className="min-h-screen flex flex-col">
      <Navbar />
      <main className="flex-1 container py-8">
        <div className="flex items-start justify-between gap-4 mb-6 flex-wrap">
          <div>
            <h1 className="font-display text-3xl font-bold text-foreground">Os Meus Serviços</h1>
            <p className="text-muted-foreground mt-1">Gere as experiências que oferece aos turistas.</p>
          </div>
          {kycVerified && (
            <Button asChild variant="hero">
              <Link to="/my-services/new"><Plus size={16} /> Novo Serviço</Link>
            </Button>
          )}
        </div>

        {kycVerified === false && (
          <Alert className="mb-6">
            <AlertCircle className="h-4 w-4" />
            <AlertDescription>
              Precisa de completar a verificação KYC antes de criar serviços.{" "}
              <Link to="/kyc" className="underline font-medium">Submeter documentos</Link>
            </AlertDescription>
          </Alert>
        )}

        {loading ? (
          <div className="flex justify-center py-12"><Loader2 className="animate-spin text-muted-foreground" /></div>
        ) : services.length === 0 ? (
          <Card className="p-12 text-center">
            <p className="text-muted-foreground mb-4">Ainda não criou nenhum serviço.</p>
            {kycVerified && (
              <Button asChild variant="hero">
                <Link to="/my-services/new"><Plus size={16} /> Criar Primeiro Serviço</Link>
              </Button>
            )}
          </Card>
        ) : (
          <div className="grid gap-4">
            {services.map((svc) => (
              <Card key={svc.id} className="p-4 flex gap-4 items-center flex-wrap sm:flex-nowrap">
                <div className="w-20 h-20 rounded-lg bg-muted overflow-hidden shrink-0">
                  {svc.images?.[0] ? (
                    <img src={svc.images[0]} alt={svc.title} className="w-full h-full object-cover" />
                  ) : (
                    <div className="w-full h-full flex items-center justify-center text-muted-foreground text-xs">Sem imagem</div>
                  )}
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 flex-wrap">
                    <h3 className="font-semibold text-foreground truncate">{svc.title}</h3>
                    <Badge variant={svc.is_active ? "default" : "secondary"}>
                      {svc.is_active ? "Ativo" : "Inativo"}
                    </Badge>
                    <Badge variant="outline" className={moderationClass(svc.moderation_status)}>
                      {moderationLabel(svc.moderation_status)}
                    </Badge>
                    <Badge variant="outline">{categoryLabels[svc.category] ?? svc.category}</Badge>
                  </div>
                  {svc.moderation_status === "rejected" && svc.moderation_notes && (
                    <p className="text-xs text-destructive mt-1">Alterações pedidas: {svc.moderation_notes}</p>
                  )}
                  {svc.moderation_status === "pending" && (
                    <p className="text-xs text-muted-foreground mt-1">Em revisão pela equipa — fica público após aprovação.</p>
                  )}

                  <p className="text-sm text-muted-foreground mt-1">
                    {svc.price_per_person.toFixed(2)} {svc.currency} / pessoa · {svc.duration_hours}h · {svc.min_people}-{svc.max_people} pessoas
                  </p>
                </div>
                <div className="flex gap-2 ml-auto">
                  <Button size="sm" variant="ghost" onClick={() => toggleActive(svc)} title={svc.is_active ? "Desativar" : "Ativar"}>
                    {svc.is_active ? <EyeOff size={16} /> : <Eye size={16} />}
                  </Button>
                  <Button size="sm" variant="ghost" asChild>
                    <Link to={`/my-services/${svc.id}/edit`} title="Editar"><Pencil size={16} /></Link>
                  </Button>
                  <Button size="sm" variant="ghost" onClick={() => deleteService(svc)} title="Eliminar">
                    <Trash2 size={16} className="text-destructive" />
                  </Button>
                </div>
              </Card>
            ))}
          </div>
        )}
      </main>
      <Footer />
    </div>
  );
}
