import { useEffect, useMemo, useState, type FormEvent } from "react";
import { useSearchParams } from "react-router-dom";
import { ArrowRight, Plane, RotateCcw } from "lucide-react";
import { Navbar } from "@/components/layout/Navbar";
import { Footer } from "@/components/layout/Footer";
import { SEO } from "@/components/SEO";
import { Button } from "@/components/ui/button";
import { FlightProviderNotFoundError, FlightSearchValidationError, type FlightLegInput, type FlightOffer, type FlightSearchRequest } from "@/services/flights/flight-provider";
import { MockFlightProvider } from "@/services/flights/mock-flight-provider";
import { filterFlightOffers, initialMultiLegs, type FlightDepartureWindow } from "@/services/flights/flight-search-utils";

const provider = new MockFlightProvider();
const airports = ["LIS", "OPO", "TMS"];
const labels: Record<string, string> = { LIS: "Lisboa", OPO: "Porto", TMS: "São Tomé" };
const formatPrice = (amount: number) => new Intl.NumberFormat("pt-PT", { style: "currency", currency: "EUR" }).format(amount);

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return <label className="grid min-w-0 gap-1.5 text-xs font-medium text-foreground">{label}{children}</label>;
}

function Control({ className = "", ...props }: React.InputHTMLAttributes<HTMLInputElement>) {
  return <input {...props} className={`h-11 w-full min-w-0 rounded-sm border border-input bg-card px-3 text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring ${className}`} />;
}

export default function FlightsPage() {
  const [params, setParams] = useSearchParams();
  const [tripType, setTripType] = useState<FlightSearchRequest["tripType"]>(
    params.get("tripType") === "multi-city" ? "multi-city" : params.get("return") ? "round-trip" : "one-way",
  );
  const [origin, setOrigin] = useState(params.get("origin") ?? "LIS");
  const [destination, setDestination] = useState(params.get("destination") ?? "TMS");
  const [departure, setDeparture] = useState(params.get("departure") ?? "");
  const [returnDate, setReturnDate] = useState(params.get("return") ?? "");
  const [adults, setAdults] = useState(Number(params.get("adults") ?? 1));
  const [children, setChildren] = useState(Number(params.get("children") ?? 0));
  const [infants, setInfants] = useState(Number(params.get("infants") ?? 0));
  const [multiLegs, setMultiLegs] = useState<FlightLegInput[]>(() => initialMultiLegs(params));
  const [offers, setOffers] = useState<FlightOffer[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [stopsFilter, setStopsFilter] = useState<number[]>([]);
  const [carriersFilter, setCarriersFilter] = useState<string[]>([]);
  const [departureWindow, setDepartureWindow] = useState<FlightDepartureWindow>("any");
  const [selectedOffer, setSelectedOffer] = useState<FlightOffer | null>(null);
  const [demoMessage, setDemoMessage] = useState("");

  const carriers = useMemo(() => [...new Set(offers.map((offer) => offer.carrierName))], [offers]);
  const visibleOffers = useMemo(
    () => filterFlightOffers(offers, stopsFilter, carriersFilter, departureWindow),
    [offers, stopsFilter, carriersFilter, departureWindow],
  );
  const readyToSearch = tripType === "multi-city"
    ? multiLegs.length >= 2 && multiLegs.every((leg) => leg.origin && leg.destination && leg.departureDate)
    : Boolean(origin && destination && departure && (tripType === "one-way" || returnDate));

  useEffect(() => {
    if (params.get("tripType") === "multi-city") {
      if (multiLegs.length >= 2 && multiLegs.every(leg => leg.origin && leg.destination && leg.departureDate)) void runSearch();
    } else if (params.get("origin") && params.get("destination") && params.get("departure")) void runSearch();
    // Initial quick-search parameters should trigger one search on arrival.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  async function runSearch(event?: FormEvent) {
    event?.preventDefault();
    setLoading(true);
    setError("");
    setSelectedOffer(null);
    setDemoMessage("");
    const legs: FlightSearchRequest["legs"] = tripType === "multi-city"
      ? multiLegs
      : [{ origin, destination, departureDate: departure }];
    if (tripType === "round-trip") legs.push({ origin: destination, destination: origin, departureDate: returnDate });
    const request: FlightSearchRequest = { tripType, legs, adults, children, infants, cabin: "economy" };
    try {
      const result = await provider.searchFlights(request);
      setOffers(result);
      setParams({
        ...(tripType === "multi-city"
          ? { tripType, legs: JSON.stringify(legs) }
          : { origin, destination, departure, ...(tripType === "round-trip" ? { return: returnDate } : {}) }),
        adults: String(adults), children: String(children), infants: String(infants),
      }, { replace: true });
    } catch (cause) {
      setOffers([]);
      setError(cause instanceof FlightSearchValidationError ? cause.message : "Não foi possível preparar esta demonstração. Revê os dados e tenta novamente.");
    } finally {
      setLoading(false);
    }
  }

  async function makeDemoBooking(offer: FlightOffer) {
    try {
      const details = await provider.getFlightDetails(offer.id);
      const hold = await provider.holdFare(details.id);
      const result = await provider.createBooking(hold.id);
      setDemoMessage(`Simulação concluída (${result.id}). Nenhum voo foi reservado e nenhum pagamento foi realizado.`);
    } catch (cause) {
      setError(cause instanceof FlightProviderNotFoundError ? cause.message : "Não foi possível concluir a simulação.");
    }
  }

  function swapAirports() { setOrigin(destination); setDestination(origin); }

  return <div className="flex min-h-screen flex-col">
    <SEO title="Pesquisar voos | Rotas do Éden" description="Pesquisa demonstrativa de voos para organizar uma viagem a São Tomé e Príncipe." path="/voos" />
    <Navbar />
    <main className="flex-1">
      <section className="border-b border-border bg-secondary/30">
        <div className="container py-10 md:py-14">
          <h1 className="display-lg">Pesquisar voos</h1>
          <p className="mt-3 max-w-2xl text-sm leading-6 text-muted-foreground">Esta página está em modo de demonstração. Horários, companhias, disponibilidade e preços são exemplos gerados localmente, sem ligação a fornecedores.</p>
          <form onSubmit={runSearch} className="mt-7 rounded-sm bg-card p-4 shadow-soft md:p-6">
            <div className="mb-5 flex flex-wrap gap-2" role="group" aria-label="Tipo de viagem">
              <Button type="button" variant={tripType === "round-trip" ? "default" : "outline"} className="min-h-11" aria-pressed={tripType === "round-trip"} onClick={() => setTripType("round-trip")}>Ida e volta</Button>
              <Button type="button" variant={tripType === "one-way" ? "default" : "outline"} className="min-h-11" aria-pressed={tripType === "one-way"} onClick={() => setTripType("one-way")}>Só ida</Button>
              <Button type="button" variant={tripType === "multi-city" ? "default" : "outline"} className="min-h-11" aria-pressed={tripType === "multi-city"} onClick={() => setTripType("multi-city")}>Várias cidades</Button>
            </div>
            {tripType === "multi-city" ? <div className="space-y-3">
              {multiLegs.map((leg, index) => <div key={index} className="grid gap-3 rounded-sm border border-border p-3 sm:grid-cols-3">
                <Field label={`Origem etapa ${index + 1}`}><select aria-label={`Origem etapa ${index + 1}`} value={leg.origin} onChange={event => setMultiLegs(items => items.map((item, current) => current === index ? { ...item, origin: event.target.value } : item))} className="h-11 rounded-sm border border-input bg-card px-3 text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring">{airports.map(code => <option key={code} value={code}>{labels[code]} ({code})</option>)}</select></Field>
                <Field label={`Destino etapa ${index + 1}`}><select aria-label={`Destino etapa ${index + 1}`} value={leg.destination} onChange={event => setMultiLegs(items => items.map((item, current) => current === index ? { ...item, destination: event.target.value } : item))} className="h-11 rounded-sm border border-input bg-card px-3 text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring">{airports.map(code => <option key={code} value={code}>{labels[code]} ({code})</option>)}</select></Field>
                <Field label={`Data etapa ${index + 1}`}><Control type="date" required value={leg.departureDate} onChange={event => setMultiLegs(items => items.map((item, current) => current === index ? { ...item, departureDate: event.target.value } : item))} /></Field>
              </div>)}
              {multiLegs.length < 4 && <Button type="button" variant="outline" className="min-h-11" onClick={() => setMultiLegs(items => [...items, { origin: items[items.length - 1].destination, destination: "TMS", departureDate: "" }])}>Adicionar etapa</Button>}
            </div> : <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-[1fr_auto_1fr_1fr_1fr] lg:items-end">
              <Field label="Origem"><select aria-label="Origem" value={origin} onChange={event => setOrigin(event.target.value)} className="h-11 min-w-0 rounded-sm border border-input bg-card px-3 text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring">{airports.map(code => <option key={code} value={code}>{labels[code]} ({code})</option>)}</select></Field>
              <Button type="button" variant="outline" size="icon" aria-label="Trocar origem e destino" onClick={swapAirports} className="min-h-11 min-w-11"><RotateCcw size={16} /></Button>
              <Field label="Destino"><select aria-label="Destino" value={destination} onChange={event => setDestination(event.target.value)} className="h-11 min-w-0 rounded-sm border border-input bg-card px-3 text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring">{airports.map(code => <option key={code} value={code}>{labels[code]} ({code})</option>)}</select></Field>
              <Field label="Ida"><Control type="date" required value={departure} onChange={event => setDeparture(event.target.value)} /></Field>
              {tripType === "round-trip" && <Field label="Regresso"><Control type="date" required min={departure || undefined} value={returnDate} onChange={event => setReturnDate(event.target.value)} /></Field>}
            </div>}
            <div className="mt-4 grid gap-3 sm:grid-cols-2 lg:grid-cols-[1fr_1fr_1fr_auto] lg:items-end">
              <Field label="Adultos"><Control type="number" min="1" max="9" value={adults} onChange={event => setAdults(Number(event.target.value))} /></Field>
              <Field label="Crianças"><Control type="number" min="0" max="8" value={children} onChange={event => setChildren(Number(event.target.value))} /></Field>
              <Field label="Bebés"><Control type="number" min="0" max="8" value={infants} onChange={event => setInfants(Number(event.target.value))} /></Field>
              <Button type="submit" variant="hero" disabled={!readyToSearch || loading} className="min-h-11 w-full sm:w-auto"><Plane size={16} />{loading ? "A preparar…" : "Pesquisar"}</Button>
            </div>
          </form>
        </div>
      </section>
      <section className="container py-8 md:py-12" aria-live="polite">
        {error && <p role="alert" className="mb-5 rounded-sm border border-destructive/30 bg-destructive/5 p-4 text-sm text-destructive">{error}</p>}
        {demoMessage && <p role="status" className="mb-5 rounded-sm border border-primary/30 bg-primary/5 p-4 text-sm">{demoMessage}</p>}
        {offers.length === 0 && !loading && !error && <div className="py-12 text-center"><Plane className="mx-auto mb-4 text-primary" aria-hidden="true" /><h2 className="display-md">A sua pesquisa começa aqui</h2><p className="mx-auto mt-3 max-w-xl text-sm text-muted-foreground">Escolha o percurso e as datas. A demonstração apresenta apenas dados sintéticos.</p></div>}
        {offers.length > 0 && <div className="grid gap-8 lg:grid-cols-[15rem_1fr]">
          <aside aria-label="Filtros" className="space-y-3">
            <h2 className="text-sm font-semibold">Escalas</h2>
            {[0, 1, 2].map(stops => <label key={stops} className="flex min-h-11 items-center gap-3 text-sm"><input type="checkbox" checked={stopsFilter.includes(stops)} onChange={event => setStopsFilter(current => event.target.checked ? [...current, stops] : current.filter(value => value !== stops))} className="h-4 w-4 accent-primary" />{stops === 0 ? "Direto (exemplo)" : `${stops} escala${stops > 1 ? "s" : ""} (exemplo)`}</label>)}
            <h3 className="pt-3 text-sm font-semibold">Companhias de demonstração</h3>
            {carriers.map(carrier => <label key={carrier} className="flex min-h-11 items-center gap-3 text-sm"><input type="checkbox" checked={carriersFilter.includes(carrier)} onChange={event => setCarriersFilter(current => event.target.checked ? [...current, carrier] : current.filter(value => value !== carrier))} className="h-4 w-4 accent-primary" />{carrier}</label>)}
            <Field label="Hora de partida"><select aria-label="Hora de partida" value={departureWindow} onChange={event => setDepartureWindow(event.target.value as FlightDepartureWindow)} className="h-11 w-full rounded-sm border border-input bg-card px-3 text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"><option value="any">Qualquer hora</option><option value="morning">Manhã · antes das 12h</option><option value="afternoon">Tarde · 12h a 18h</option><option value="evening">Noite · depois das 18h</option></select></Field>
          </aside>
          <div><h2 className="mb-4 text-sm font-semibold">{visibleOffers.length} opções de demonstração</h2>
            <ul className="space-y-3">{visibleOffers.map(offer => <li key={offer.id} className="rounded-sm border border-border bg-card p-4 md:p-5">
              <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
                <div className="min-w-0"><p className="font-medium">{offer.carrierName}</p><div className="mt-2 flex flex-wrap items-center gap-2 text-sm"><span>{offer.departureTime}</span><ArrowRight size={14} aria-hidden="true" /><span>{offer.arrivalTime}</span><span className="text-muted-foreground">· {offer.stops === 0 ? "direto" : `${offer.stops} ${offer.stops === 1 ? "escala" : "escalas"}`}</span></div><p className="mt-1 text-xs text-muted-foreground">{offer.legs.map(leg => `${leg[0].origin} → ${leg[leg.length - 1].destination}`).join(" · ")} · {offer.baggageSummary}</p></div>
                <div className="flex items-center justify-between gap-4 sm:flex-col sm:items-end"><span className="text-lg font-semibold tabular-nums">{formatPrice(offer.totalAmount)}</span><Button type="button" variant="outline" className="min-h-11" aria-label={`Ver opção de ${offer.carrierName}`} onClick={() => setSelectedOffer(offer)}>Ver exemplo</Button></div>
              </div>
            </li>)}</ul>
            {visibleOffers.length === 0 && <p className="py-6 text-sm text-muted-foreground">Nenhuma opção corresponde aos filtros selecionados.</p>}
          </div>
        </div>}
        {selectedOffer && <section className="mt-6 rounded-sm border border-border bg-card p-5" aria-labelledby="demo-details-heading">
          <h2 id="demo-details-heading" className="display-md">Detalhes do exemplo</h2><p className="mt-3 text-sm">{selectedOffer.carrierName}</p>
          <ul className="mt-3 space-y-2 text-sm">{selectedOffer.legs.map((leg, index) => <li key={index}>{leg[0].origin} → {leg[leg.length - 1].destination} · {leg[0].departureDate} · {leg[0].departureTime}–{leg[leg.length - 1].arrivalTime}</li>)}</ul>
          <dl className="mt-4 grid gap-2 text-sm sm:grid-cols-3"><div><dt className="text-muted-foreground">Tarifa base (exemplo)</dt><dd>{formatPrice(selectedOffer.baseAmount)}</dd></div><div><dt className="text-muted-foreground">Impostos (exemplo)</dt><dd>{formatPrice(selectedOffer.taxAmount)}</dd></div><div><dt className="text-muted-foreground">Total demonstrativo</dt><dd className="font-semibold">{formatPrice(selectedOffer.totalAmount)}</dd></div></dl>
          <p className="mt-4 text-xs leading-5 text-muted-foreground">Valores fictícios, sem validade comercial. Continuar cria apenas um registo temporário em memória nesta página.</p>
          <div className="mt-4 flex flex-col gap-3 sm:flex-row"><Button type="button" variant="hero" className="min-h-11" onClick={() => void makeDemoBooking(selectedOffer)}>Continuar demonstração</Button><Button type="button" variant="outline" className="min-h-11" onClick={() => setSelectedOffer(null)}>Fechar detalhes</Button></div>
        </section>}
      </section>
    </main>
    <Footer />
  </div>;
}
