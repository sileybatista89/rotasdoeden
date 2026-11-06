import type { FlightLegInput, FlightOffer } from "./flight-provider";

export type FlightDepartureWindow = "any" | "morning" | "afternoon" | "evening";

export function initialMultiLegs(params: URLSearchParams): FlightLegInput[] {
  try {
    const parsed: unknown = JSON.parse(params.get("legs") ?? "null");
    if (Array.isArray(parsed) && parsed.length >= 2 && parsed.length <= 4) {
      return parsed.map((leg) => ({
        origin: String(leg?.origin ?? ""),
        destination: String(leg?.destination ?? ""),
        departureDate: String(leg?.departureDate ?? ""),
      }));
    }
  } catch { /* Invalid URL data falls back to the default demo route. */ }
  return [
    { origin: params.get("origin") ?? "LIS", destination: params.get("destination") ?? "TMS", departureDate: params.get("departure") ?? "" },
    { origin: params.get("destination") ?? "TMS", destination: "OPO", departureDate: params.get("return") ?? "" },
  ];
}

export function filterFlightOffers(
  offers: FlightOffer[],
  stopsFilter: number[],
  carriersFilter: string[],
  departureWindow: FlightDepartureWindow,
): FlightOffer[] {
  return offers.filter((offer) => {
    const departureHour = Number(offer.departureTime.slice(0, 2));
    const matchesStops = !stopsFilter.length || stopsFilter.includes(offer.stops);
    const matchesCarrier = !carriersFilter.length || carriersFilter.includes(offer.carrierName);
    const matchesTime = departureWindow === "any" ||
      (departureWindow === "morning" && departureHour < 12) ||
      (departureWindow === "afternoon" && departureHour >= 12 && departureHour < 18) ||
      (departureWindow === "evening" && departureHour >= 18);
    return matchesStops && matchesCarrier && matchesTime;
  });
}
