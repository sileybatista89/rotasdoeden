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
        title={`${rules?.name ?? "Pacote"} — monte a sua viagem em São Tomé e Príncipe`}
        description={
          rules?.description ??
          "Monte a sua viagem dia a dia em São Tomé e Príncipe e receba uma proposta personalizada, sem reservar nem pagar."
        }
        path={`/pacotes/${slug}`}
      />
      <Navbar />

      <main className="container py-10 md:py-14 space-y-10">
        <header className="max-w-2xl space-y-3">
          <span className="eyebrow">
            {rules?.product_type === "custom_package" ? "Viagem à medida" : "Pacote"}
          </span>
          <h1 className="font-display text-3xl md:text-4xl font-medium text-foreground">
            {rules?.name ?? <Skeleton className="h-9 w-64" />}
          </h1>
          <p className="text-muted-foreground leading-relaxed">
            {rules?.description}{" "}
            {rules && (
              <>
                Uma viagem {durationLabel}, sem itinerário rígido: a chegada e o regresso ficam tratados e os dias no
                meio são seus para montar. Pode repetir o mesmo tipo de programa em dias diferentes.
              </>
            )}
          </p>
        </header>

        {product.error && (
          <Card className="p-5 space-y-3">
            <p className="text-sm text-muted-foreground">Não foi possível carregar este pacote.</p>
            <Button size="sm" variant="outline" onClick={() => product.refetch()}>Tentar de novo</Button>
          </Card>
        )}

        <section aria-labelledby="duracao-title" className="space-y-3">
          <h2 id="duracao-title" className="font-display text-2xl font-medium text-foreground">1. Duração e viajantes</h2>
          <div className="flex flex-wrap gap-2">
            {durations.map((d) => (
              <Button key={d} variant={config.durationDays === d ? "default" : "outline"} onClick={() => setDuration(d)}>
                {d} dias
              </Button>
            ))}
          </div>
          <div className="grid gap-3 sm:grid-cols-4 max-w-2xl">
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
        </section>

        <section aria-labelledby="dias-title" className="space-y-3">
          <h2 id="dias-title" className="font-display text-2xl font-medium text-foreground">2. Os seus dias</h2>
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
        </section>

        <section aria-labelledby="resumo-title" className="grid gap-6 lg:grid-cols-2">
          <div className="space-y-3">
            <h2 id="resumo-title" className="font-display text-2xl font-medium text-foreground">3. Resumo</h2>
            <TripSummary summary={summary} />
          </div>

          <div className="space-y-3">
            <h2 className="font-display text-2xl font-medium text-foreground">4. Pedir proposta</h2>
            <Card className="p-5 space-y-3">
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
                  <Button onClick={send} disabled={sending}>Enviar pedido de proposta</Button>
                  <p className="text-xs text-muted-foreground">
                    Enviar o pedido não reserva nem cobra nada. Recebe uma proposta com preços confirmados antes de
                    decidir.
                  </p>
                </>
              )}
            </Card>
          </div>
        </section>
      </main>

      <Footer />
    </div>
  );
}
