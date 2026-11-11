import { useState, type FormEvent } from "react";
import { Link, useNavigate } from "react-router-dom";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Button } from "@/components/ui/button";

const airportOptions = ["Lisboa (LIS)", "Porto (OPO)", "São Tomé (TMS)"];
const airportCode = (value: string) => value.match(/\(([A-Z]{3})\)$/)?.[1] ?? "";

const controlClass =
  "h-11 min-w-0 rounded-sm border border-input bg-card px-3 text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring";

const packages = [
  { slug: "rotas-essencial", name: "Rotas Essencial", detail: "5 a 7 dias", label: "Ver pacote Rotas Essencial" },
  { slug: "rotas-explorar", name: "Rotas Explorar", detail: "8 a 10 dias", label: "Ver pacote Rotas Explorar" },
  { slug: "rotas-imersao", name: "Rotas Imersão", detail: "12 ou mais dias", label: "Ver pacote Rotas Imersão" },
];

export function TravelSearchTabs({ defaultValue = "pacotes" }: { defaultValue?: string }) {
  const navigate = useNavigate();
  const [origin, setOrigin] = useState(airportOptions[0]);
  const [destination, setDestination] = useState(airportOptions[2]);
  const [departure, setDeparture] = useState("");
  const [returnDate, setReturnDate] = useState("");
  const [passengers, setPassengers] = useState("1");
  const [searchError, setSearchError] = useState("");

  function searchFlights(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!airportOptions.includes(origin) || !airportOptions.includes(destination) || !airportCode(origin) || !airportCode(destination)) {
      setSearchError("Escolhe um aeroporto da lista para continuar.");
      return;
    }
    setSearchError("");
    const params = new URLSearchParams({
      origin: airportCode(origin),
      destination: airportCode(destination),
      departure,
      return: returnDate,
      adults: passengers,
      children: "0",
      infants: "0",
    });
    navigate(`/voos?${params.toString()}`);
  }

  function swapAirports() {
    setOrigin(destination);
    setDestination(origin);
  }

  return (
    <Tabs defaultValue={defaultValue} className="w-full" aria-label="Pesquisar uma viagem">
      <TabsList
        aria-label="Pesquisar uma viagem"
        className="grid h-auto w-full grid-cols-2 gap-1 rounded-sm bg-muted p-1 sm:grid-cols-4"
      >
        <TabsTrigger value="pacotes" className="min-h-11 rounded-sm px-2">Pacotes</TabsTrigger>
        <TabsTrigger value="voos" className="min-h-11 rounded-sm px-2">Voos</TabsTrigger>
        <TabsTrigger value="estadias" className="min-h-11 rounded-sm px-2">Estadias</TabsTrigger>
        <TabsTrigger value="experiencias" className="min-h-11 rounded-sm px-2">Experiências</TabsTrigger>
      </TabsList>

      <TabsContent value="pacotes" className="mt-4">
        <p className="text-sm text-muted-foreground">Viagens organizadas para descobrir as ilhas ao seu ritmo.</p>
        <ul className="mt-3 grid gap-2 sm:grid-cols-3">
          {packages.map((item) => (
            <li key={item.slug}>
              <Link
                to={`/pacotes/${item.slug}`}
                aria-label={item.label}
                className="flex min-h-16 flex-col justify-center gap-1 rounded-sm border border-border bg-card px-4 py-3 transition-colors hover:border-primary/40 hover:bg-secondary/40 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
              >
                <span className="text-sm font-medium text-foreground">{item.name}</span>
                <span className="text-xs text-muted-foreground">{item.detail}</span>
              </Link>
            </li>
          ))}
        </ul>
      </TabsContent>

      <TabsContent value="voos" className="mt-4">
        <form onSubmit={searchFlights} className="grid grid-cols-1 gap-3 sm:grid-cols-2">
          <label className="grid gap-1 text-xs font-medium text-foreground">Origem
            <input list="flight-airports" value={origin} onChange={(event) => setOrigin(event.target.value)} required className={controlClass} />
          </label>
          <label className="grid gap-1 text-xs font-medium text-foreground">Destino
            <input list="flight-airports" value={destination} onChange={(event) => setDestination(event.target.value)} required className={controlClass} />
          </label>
          <datalist id="flight-airports">{airportOptions.map((airport) => <option key={airport} value={airport} />)}</datalist>
          <div className="sm:col-span-2">
            <Button type="button" variant="link" onClick={swapAirports} className="h-auto min-h-9 px-0 text-xs">
              Trocar origem e destino
            </Button>
          </div>
          <label className="grid gap-1 text-xs font-medium text-foreground">Ida
            <input type="date" value={departure} onChange={(event) => setDeparture(event.target.value)} required className={controlClass} />
          </label>
          <label className="grid gap-1 text-xs font-medium text-foreground">Regresso
            <input type="date" value={returnDate} onChange={(event) => setReturnDate(event.target.value)} required min={departure || undefined} className={controlClass} />
          </label>
          <label className="grid gap-1 text-xs font-medium text-foreground sm:col-span-2">Passageiros
            <select value={passengers} onChange={(event) => setPassengers(event.target.value)} className={controlClass}>
              {[1, 2, 3, 4, 5, 6].map((count) => (
                <option key={count} value={String(count)}>{count} {count === 1 ? "adulto" : "adultos"}</option>
              ))}
            </select>
          </label>
          <Button type="submit" variant="hero" className="min-h-11 w-full self-end sm:col-span-2">Pesquisar voos</Button>
        </form>
        {searchError && <p role="alert" className="mt-3 text-sm text-destructive">{searchError}</p>}
        <p className="mt-3 text-xs leading-5 text-muted-foreground">Pesquisa demonstrativa. Os resultados apresentados não representam horários, preços ou lugares disponíveis.</p>
      </TabsContent>

      <TabsContent value="estadias" className="mt-4">
        <div className="rounded-sm border border-dashed border-border bg-card p-4">
          <p className="text-sm font-medium text-foreground">A pesquisa de estadias está em preparação.</p>
          <p className="mt-2 text-sm leading-6 text-muted-foreground">
            Ainda não há alojamento próprio disponível para reserva direta nesta plataforma. Quando existir, vai poder
            comparar casas, quartos e hotéis por datas, ocupação e condições de cancelamento.
          </p>
          <ul className="mt-3 space-y-1 text-xs leading-5 text-muted-foreground">
            <li>· Datas e número de hóspedes definem a disponibilidade.</li>
            <li>· Preço e condições vêm do alojamento, não de uma estimativa nossa.</li>
            <li>· Nenhuma reserva é criada enquanto a oferta não estiver confirmada por quem aloja.</li>
          </ul>
          <div className="mt-4 flex flex-col gap-2 sm:flex-row sm:items-center">
            <Button asChild variant="outline" className="min-h-11 w-full sm:w-auto">
              <Link to="/pacotes/rotas-imersao" aria-label="Ver pacotes com estadia incluída">Ver pacotes com estadia</Link>
            </Button>
            <Link to="/experiences" className="link-underline min-h-11 py-2 text-sm">Explorar experiências disponíveis</Link>
          </div>
        </div>
      </TabsContent>

      <TabsContent value="experiencias" className="mt-4 flex flex-col items-start gap-3 sm:flex-row sm:items-center sm:justify-between">
        <p className="text-sm text-muted-foreground">Descubra experiências publicadas na plataforma.</p>
        <Button asChild variant="hero" className="min-h-11 w-full sm:w-auto"><Link to="/experiences">Explorar experiências</Link></Button>
      </TabsContent>
    </Tabs>
  );
}
