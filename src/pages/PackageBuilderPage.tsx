import { useEffect, useMemo, useState } from "react";
import { Navbar } from "@/components/layout/Navbar";
import { Footer } from "@/components/layout/Footer";
import { SEO } from "@/components/SEO";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Skeleton } from "@/components/ui/skeleton";
import { toast } from "@/hooks/use-toast";
import { DayConfigurator } from "@/components/packages/DayConfigurator";
import { TripSummary } from "@/components/packages/TripSummary";
import { useBuilderProduct, useBuilderSession, useCatalogItems, useProductBaseline } from "@/hooks/usePackageBuilder";
import {
  addSelection,
  buildDayPlan,
  durationOptions,
  removeSelectionAt,
  summarizeBuilder,
  type CatalogItem,
} from "@/lib/packageBuilder";
import { ArrowDown, CalendarDays, UsersRound } from "lucide-react";
import essencialImage from "@/assets/real/praia-sul-hd.jpg";
import explorarImage from "@/assets/real/pico-cao-grande-real.jpg";
import imersaoImage from "@/assets/real/roca-casa-grande.jpg";
import medidaImage from "@/assets/real/costa-floresta.jpg";

const packageImages: Record<string, string> = {
  "rotas-essencial": essencialImage,
  "rotas-explorar": explorarImage,
  "rotas-imersao": imersaoImage,
  "rotas-a-medida": medidaImage,
};

/**
 * Página única do configurador. Todo o comportamento (duração, limites, dias,
 * categorias) vem da configuração do produto no servidor, não de código por produto.
 */
export default function PackageBuilderPage({ slug }: { slug: string }) {
  const product = useBuilderProduct(slug);
  const catalog = useCatalogItems();
  const baseline = useProductBaseline(slug);
  const minimumDays = product.data?.minimum_days ?? 5;
  const { config, update, submit, status, restored } = useBuilderSession(slug, minimumDays);
  const [contact, setContact] = useState({ name: "", email: "", phone: "", notes: "" });
  const [sending, setSending] = useState(false);
  const [sent, setSent] = useState(false);

  const items = catalog.data ?? [];
  const rules = product.data;
  const maxPerDay = rules?.max_selections_per_day ?? 4;
  const durations = useMemo(() => (rules ? durationOptions(rules) : []), [rules]);

  // Quando o produto carrega, a duração guardada tem de caber nas regras dele.
  useEffect(() => {
    if (!rules || !restored) return;
    const max = rules.maximum_days ?? rules.duration_cap_days;
    if (config.durationDays < rules.minimum_days || config.durationDays > max) {
      const days = Math.min(Math.max(config.durationDays, rules.minimum_days), max);
      update((prev) => ({
        ...prev,
        durationDays: days,
        selections: prev.selections.filter((s) => s.day > 1 && s.day < days),
      }));
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [rules, restored]);

  const plan = useMemo(() => buildDayPlan(config.durationDays), [config.durationDays]);
  const summary = useMemo(
    () => summarizeBuilder(config.selections, items, config.durationDays),
    [config.selections, items, config.durationDays],
  );

  const add = (day: number, item: CatalogItem) =>
    update((prev) => ({
      ...prev,
      selections: addSelection(
        prev.selections,
        { day, item_id: item.id, item_slug: item.slug },
        prev.durationDays,
        maxPerDay,
      ),
    }));

  const removeAt = (day: number, index: number) =>
    update((prev) => ({ ...prev, selections: removeSelectionAt(prev.selections, day, index) }));

  const setDuration = (days: number) =>
    update((prev) => ({
      ...prev,
      durationDays: days,
      // Escolhas em dias que deixam de existir são descartadas.
      selections: prev.selections.filter((s) => s.day > 1 && s.day < days),
    }));

  const send = async () => {
    setSending(true);
    try {
      await submit({
        name: contact.name.trim(),
        email: contact.email.trim(),
        phone: contact.phone.trim(),
        notes: contact.notes.trim(),
      });
      setSent(true);
      toast({ title: "Pedido enviado", description: "A equipa prepara a proposta com preços confirmados." });
    } catch (e) {
      toast({ title: "Não foi possível enviar", description: (e as Error).message, variant: "destructive" });
    } finally {
      setSending(false);
    }
  };

  const durationLabel = rules
    ? rules.maximum_days === null
      ? `a partir de ${rules.minimum_days} dias`
      : `de ${rules.minimum_days} a ${rules.maximum_days} dias`
    : "";

  return (
    <div className="min-h-screen bg-background">
      <SEO
        title={`${rules?.name ?? "Pacote"}, monte a sua viagem em São Tomé e Príncipe`}
        description={
          rules?.description ??
          "Monte a sua viagem dia a dia em São Tomé e Príncipe e receba uma proposta personalizada, sem reservar nem pagar."
        }
        path={`/pacotes/${slug}`}
      />
      <Navbar />

      <main>
        <header className="border-b border-border bg-card">
          <div className="container grid gap-10 py-10 md:grid-cols-12 md:items-center md:py-16">
            <div className="md:col-span-7 lg:col-span-6">
              <span className="eyebrow">
                {rules?.product_type === "custom_package" ? "Viagem à medida" : "Viagens Rotas do Éden"}
              </span>
              <h1 className="mt-6 font-display text-5xl font-normal leading-none text-foreground md:text-7xl">
                {rules?.name ?? <Skeleton className="h-16 w-64" />}
              </h1>
              <p className="mt-6 max-w-xl text-base font-light leading-8 text-muted-foreground">
                {rules?.description}{" "}
                {rules && <>Uma viagem {durationLabel}, construída dia a dia à volta do seu ritmo.</>}
              </p>
              <div className="mt-8 flex flex-wrap gap-8 border-t border-border pt-6 text-sm">
                <span className="inline-flex items-center gap-2"><CalendarDays size={16} className="text-primary" /> {durationLabel}</span>
                <span className="inline-flex items-center gap-2"><UsersRound size={16} className="text-primary" /> Ajustável aos viajantes</span>
              </div>
              {baseline.data && (
                <div className="mt-8 border-l-2 border-secondary pl-5">
                  <p className="font-display text-3xl font-normal text-foreground md:text-4xl">
                Desde {new Intl.NumberFormat("pt-PT", {
                  style: "currency",
                  currency: baseline.data.currency ?? "EUR",
                  maximumFractionDigits: 0,
                }).format(baseline.data.price_per_person)}{" "}
                    <span className="text-base text-muted-foreground"> / pessoa</span>
                  </p>
                  <p className="mt-2 max-w-lg text-sm leading-6 text-muted-foreground">
                    {durationLabel} · personalizável. O valor final é confirmado antes da reserva.
                    {!baseline.data.includes_flight && " Base terrestre, voo não incluído."}
                  </p>
                </div>
              )}
              <a href="#planear" className="mt-8 inline-flex items-center gap-2 text-xs uppercase text-primary">Planear esta rota <ArrowDown size={14} /></a>
            </div>
            <div className="md:col-span-5 lg:col-span-5 lg:col-start-8">
              <div className="aspect-[4/5] overflow-hidden bg-muted">
                {packageImages[slug] && <img src={packageImages[slug]} alt={rules?.name ?? "Viagem Rotas do Éden"} className="h-full w-full object-cover" />}
              </div>
            </div>
          </div>
        </header>

        <div id="planear" className="container space-y-14 py-14 md:py-20">

        {product.error && (
          <Card className="p-5 space-y-3">
            <p className="text-sm text-muted-foreground">Não foi possível carregar este pacote.</p>
            <Button size="sm" variant="outline" onClick={() => product.refetch()}>Tentar de novo</Button>
          </Card>
        )}

        <nav aria-label="Etapas para preparar a viagem" className="grid grid-cols-2 gap-px bg-border sm:grid-cols-4">
          {[
            ["01", "Viajantes", "#viajantes"],
            ["02", "Dias", "#dias"],
            ["03", "Resumo", "#resumo"],
            ["04", "Proposta", "#proposta"],
          ].map(([number, label, href]) => (
            <a key={number} href={href} className="bg-background px-4 py-4 text-sm text-foreground hover:bg-accent/35">
              <span className="mr-2 text-xs text-secondary">{number}</span>{label}
            </a>
          ))}
        </nav>

        <section id="viajantes" aria-labelledby="duracao-title" className="scroll-mt-28 grid gap-8 border-t border-border pt-8 lg:grid-cols-12">
          <div className="lg:col-span-3">
            <p className="text-xs text-secondary">01</p>
            <h2 id="duracao-title" className="mt-2 font-display text-3xl font-normal text-foreground">Duração e viajantes</h2>
          </div>
          <div className="space-y-6 lg:col-span-8 lg:col-start-5">
          <div className="flex flex-wrap gap-2">
            {durations.map((d) => (
              <Button key={d} variant={config.durationDays === d ? "default" : "outline"} onClick={() => setDuration(d)}>
                {d} dias
              </Button>
            ))}
          </div>
          <div className="grid max-w-3xl gap-4 sm:grid-cols-2 lg:grid-cols-4">
            <div>
              <Label htmlFor="adultos">Adultos</Label>
              <Input id="adultos" inputMode="numeric" value={config.adults}
                onChange={(e) => update((p) => ({ ...p, adults: Math.max(Number(e.target.value) || 0, 0) }))} />
            </div>
            <div>
              <Label htmlFor="criancas">Crianças</Label>
              <Input id="criancas" inputMode="numeric" value={config.children}
                onChange={(e) => update((p) => ({ ...p, children: Math.max(Number(e.target.value) || 0, 0) }))} />
            </div>
            <div>
              <Label htmlFor="quartos">Quartos</Label>
              <Input id="quartos" inputMode="numeric" value={config.rooms}
                onChange={(e) => update((p) => ({ ...p, rooms: Math.max(Number(e.target.value) || 0, 0) }))} />
            </div>
            <div>
              <Label htmlFor="inicio">Início (opcional)</Label>
              <Input id="inicio" type="date" value={config.startDate ?? ""}
                onChange={(e) => update((p) => ({ ...p, startDate: e.target.value || null }))} />
            </div>
          </div>
           <Button asChild variant="outline" className="w-full sm:w-auto">
             <a href="#dias">Continuar para os dias <ArrowDown size={14} /></a>
           </Button>
          </div>
        </section>

        <section id="dias" aria-labelledby="dias-title" className="scroll-mt-28 grid gap-8 border-t border-border pt-8 lg:grid-cols-12">
          <div className="lg:col-span-3">
            <p className="text-xs text-secondary">02</p>
            <h2 id="dias-title" className="mt-2 font-display text-3xl font-normal text-foreground">Os seus dias</h2>
            <p className="mt-3 text-sm leading-6 text-muted-foreground">Escolha o que quer viver. Pode repetir programas em dias diferentes.</p>
          </div>
          <div className="space-y-3 lg:col-span-8 lg:col-start-5">
          {(catalog.isLoading || product.isLoading || !restored) && (
            <div className="space-y-3">{[0, 1, 2].map((i) => <Skeleton key={i} className="h-28 w-full" />)}</div>
          )}
          {catalog.error && (
            <Card className="p-5 space-y-3">
              <p className="text-sm text-muted-foreground">Não foi possível carregar os locais.</p>
              <Button size="sm" variant="outline" onClick={() => catalog.refetch()}>Tentar de novo</Button>
            </Card>
          )}
          {!catalog.isLoading && !catalog.error && (
            <div className="space-y-3">
              {plan.map((slot) => (
                <DayConfigurator
                  key={slot.day}
                  slot={slot}
                  items={items}
                  selections={config.selections}
                  maxPerDay={maxPerDay}
                  categories={rules?.categories}
                  warnings={summary.warnings.filter((w) => w.day === slot.day).map((w) => w.message)}
                  onAdd={(item) => add(slot.day, item)}
                  onRemoveAt={(index) => removeAt(slot.day, index)}
                />
              ))}
            </div>
          )}
          <p className="text-xs text-muted-foreground">
            {status === "saving" ? "A guardar…" : status === "saved" ? "Escolhas guardadas neste dispositivo." : ""}
          </p>
          <Button asChild className="mt-4 w-full sm:w-auto">
            <a href="#resumo">Ver o resumo da viagem <ArrowDown size={14} /></a>
          </Button>
          </div>
        </section>

        <section aria-label="Resumo e pedido de proposta" className="grid gap-8 border-t border-border pt-8 lg:grid-cols-2">
          <div id="resumo" className="scroll-mt-28 space-y-3">
            <p className="text-xs text-secondary">03</p>
            <h2 id="resumo-title" className="font-display text-3xl font-normal text-foreground">A sua viagem</h2>
            <TripSummary summary={summary} />
          </div>

          <div id="proposta" className="scroll-mt-28 space-y-3">
            <p className="text-xs text-secondary">04</p>
            <h2 className="font-display text-3xl font-normal text-foreground">Receber uma proposta</h2>
            <Card className="space-y-4 rounded-sm p-6 shadow-none">
              {sent ? (
                <p className="text-sm text-muted-foreground">
                  Pedido registado. A equipa confirma disponibilidade e preços e envia a proposta por email.
                </p>
              ) : (
                <>
                  <div>
                    <Label htmlFor="nome">Nome</Label>
                    <Input id="nome" value={contact.name} onChange={(e) => setContact({ ...contact, name: e.target.value })} />
                  </div>
                  <div>
                    <Label htmlFor="email">Email</Label>
                    <Input id="email" type="email" value={contact.email} onChange={(e) => setContact({ ...contact, email: e.target.value })} />
                  </div>
                  <div>
                    <Label htmlFor="telefone">Telefone (opcional)</Label>
                    <Input id="telefone" value={contact.phone} onChange={(e) => setContact({ ...contact, phone: e.target.value })} />
                  </div>
                  <div>
                    <Label htmlFor="notas">Notas (opcional)</Label>
                    <Textarea id="notas" rows={3} value={contact.notes} onChange={(e) => setContact({ ...contact, notes: e.target.value })} />
                  </div>
                  <Button className="w-full sm:w-auto" onClick={send} disabled={sending}>Enviar pedido de proposta</Button>
                  <p className="text-xs text-muted-foreground">
                    Enviar o pedido não reserva nem cobra nada. Recebe uma proposta com preços confirmados antes de
                    decidir.
                  </p>
                </>
              )}
            </Card>
          </div>
        </section>
        </div>
      </main>

      <Footer />
    </div>
  );
}
