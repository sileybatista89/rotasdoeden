import { useState, type FormEvent } from "react";
import { Link, useNavigate } from "react-router-dom";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Button } from "@/components/ui/button";

const airportOptions = ["Lisboa (LIS)", "Porto (OPO)", "São Tomé (TMS)"];
const airportCode = (value: string) => value.match(/\(([A-Z]{3})\)$/)?.[1] ?? "";

export function TravelSearchTabs({ defaultValue = "pacotes" }: { defaultValue?: string }) {
  const navigate = useNavigate();
  const [origin, setOrigin] = useState(airportOptions[0]);
  const [destination, setDestination] = useState(airportOptions[2]);
  const [departure, setDeparture] = useState("");
  const [returnDate, setReturnDate] = useState("");
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
      adults: "1",
      children: "0",
      infants: "0",
    });
    navigate(`/voos?${params.toString()}`);
  }

  return (
    <Tabs defaultValue={defaultValue} className="w-full" aria-label="Pesquisar uma viagem">
      <TabsList aria-label="Pesquisar uma viagem" className="grid h-auto w-full grid-cols-2 gap-1 rounded-sm bg-muted p-1 sm:grid-cols-4">
        <TabsTrigger value="pacotes" className="min-h-11 rounded-sm px-2">Pacotes</TabsTrigger>
        <TabsTrigger value="voos" className="min-h-11 rounded-sm px-2">Voos</TabsTrigger>
        <TabsTrigger value="estadias" className="min-h-11 rounded-sm px-2">Estadias</TabsTrigger>
        <TabsTrigger value="experiencias" className="min-h-11 rounded-sm px-2">Experiências</TabsTrigger>
      </TabsList>
      <TabsContent value="pacotes" className="mt-4 flex flex-col items-start gap-3 sm:flex-row sm:items-center sm:justify-between">
        <p className="text-sm text-muted-foreground">Viagens organizadas para descobrir as ilhas ao seu ritmo.</p>
        <Button asChild variant="hero" className="min-h-11 w-full sm:w-auto">
          <Link to="/pacotes/rotas-essencial" aria-label="Ver pacote Rotas Essencial">Ver Rotas Essencial</Link>
        </Button>
      </TabsContent>
      <TabsContent value="voos" className="mt-4">
        <form onSubmit={searchFlights} className="grid grid-cols-1 gap-3 sm:grid-cols-2">
          <label className="grid gap-1 text-xs font-medium text-foreground">Origem
            <input list="flight-airports" value={origin} onChange={(event) => setOrigin(event.target.value)} required className="h-11 min-w-0 rounded-sm border border-input bg-card px-3 text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring" />
          </label>
          <label className="grid gap-1 text-xs font-medium text-foreground">Destino
            <input list="flight-airports" value={destination} onChange={(event) => setDestination(event.target.value)} required className="h-11 min-w-0 rounded-sm border border-input bg-card px-3 text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring" />
          </label>
          <datalist id="flight-airports">{airportOptions.map((airport) => <option key={airport} value={airport} />)}</datalist>
          <label className="grid gap-1 text-xs font-medium text-foreground">Ida
            <input type="date" value={departure} onChange={(event) => setDeparture(event.target.value)} required className="h-11 min-w-0 rounded-sm border border-input bg-card px-3 text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring" />
          </label>
          <label className="grid gap-1 text-xs font-medium text-foreground">Regresso
            <input type="date" value={returnDate} onChange={(event) => setReturnDate(event.target.value)} required min={departure || undefined} className="h-11 min-w-0 rounded-sm border border-input bg-card px-3 text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring" />
          </label>
          <Button type="submit" variant="hero" className="min-h-11 w-full self-end sm:col-span-2">Pesquisar voos</Button>
        </form>
        {searchError && <p role="alert" className="mt-3 text-sm text-destructive">{searchError}</p>}
        <p className="mt-3 text-xs leading-5 text-muted-foreground">Pesquisa demonstrativa. Os resultados apresentados não representam horários, preços ou lugares disponíveis.</p>
      </TabsContent>
      <TabsContent value="estadias" className="mt-4 flex flex-col items-start gap-3 sm:flex-row sm:items-center sm:justify-between">
        <p className="text-sm text-muted-foreground">A pesquisa de estadias está em preparação.</p>
        <Link to="/experiences" className="link-underline min-h-11 py-2 text-sm">Explorar experiências disponíveis</Link>
      </TabsContent>
      <TabsContent value="experiencias" className="mt-4 flex flex-col items-start gap-3 sm:flex-row sm:items-center sm:justify-between">
        <p className="text-sm text-muted-foreground">Descubra experiências publicadas na plataforma.</p>
        <Button asChild variant="hero" className="min-h-11 w-full sm:w-auto"><Link to="/experiences">Explorar experiências</Link></Button>
      </TabsContent>
    </Tabs>
  );
}
