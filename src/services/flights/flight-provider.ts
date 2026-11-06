export type FlightTripType = "one-way" | "round-trip" | "multi-city";
export type FlightCabin = "economy" | "premium_economy" | "business" | "first";

export interface FlightLegInput {
  origin: string;
  destination: string;
  departureDate: string;
}

export interface FlightSearchRequest {
  tripType: FlightTripType;
  legs: FlightLegInput[];
  adults: number;
  children: number;
  infants: number;
  cabin: FlightCabin;
}

export interface FlightSegment {
  origin: string;
  destination: string;
  departureDate: string;
  departureTime: string;
  arrivalTime: string;
  durationMinutes: number;
}

export interface FlightOffer {
  id: string;
  provider: "mock";
  providerOfferId: string;
  carrierCode: string;
  carrierName: string;
  legs: FlightSegment[][];
  stops: number;
  departureTime: string;
  arrivalTime: string;
  durationMinutes: number;
  baggageSummary: string;
  baseAmount: number;
  taxAmount: number;
  totalAmount: number;
  currency: "EUR";
  isDemo: true;
}

export interface DemoFareHold {
  id: string;
  offerId: string;
  isDemo: true;
}

export interface DemoBookingResult {
  id: string;
  holdId: string;
  status: "demo_only";
  reservationCreated: false;
  isDemo: true;
}

export interface FlightProviderInterface {
  searchFlights(request: FlightSearchRequest): Promise<FlightOffer[]>;
  getFlightDetails(offerId: string): Promise<FlightOffer>;
  holdFare(offerId: string): Promise<DemoFareHold>;
  createBooking(holdId: string): Promise<DemoBookingResult>;
}

export type FlightSearchValidationCode =
  | "invalid_airport"
  | "invalid_dates"
  | "invalid_itinerary"
  | "invalid_passengers"
  | "invalid_cabin";

export class FlightSearchValidationError extends Error {
  constructor(public readonly code: FlightSearchValidationCode) {
    super(FLIGHT_SEARCH_ERROR_MESSAGES[code]);
    this.name = "FlightSearchValidationError";
  }
}

export const FLIGHT_SEARCH_ERROR_MESSAGES: Record<FlightSearchValidationCode, string> = {
  invalid_airport: "Escolhe aeroportos diferentes com códigos válidos.",
  invalid_dates: "Confirma as datas e a ordem das etapas da viagem.",
  invalid_itinerary: "Confirma o tipo e o número de etapas da viagem.",
  invalid_passengers: "Confirma o número de passageiros: pelo menos um adulto e, no máximo, nove pessoas.",
  invalid_cabin: "Escolhe uma classe de cabine válida.",
};

export class FlightProviderNotFoundError extends Error {
  constructor(public readonly code: "offer_not_found" | "hold_not_found") {
    super(code === "offer_not_found" ? "Esta opção de demonstração já não existe." : "Esta simulação já não existe.");
    this.name = "FlightProviderNotFoundError";
  }
}

const CABIN_CLASSES: FlightCabin[] = ["economy", "premium_economy", "business", "first"];
const IATA_CODE = /^[A-Z]{3}$/;
const DATE_ONLY = /^\d{4}-\d{2}-\d{2}$/;

function isValidCalendarDate(value: string): boolean {
  if (!DATE_ONLY.test(value)) return false;
  const timestamp = Date.parse(`${value}T00:00:00Z`);
  if (Number.isNaN(timestamp)) return false;
  return new Date(timestamp).toISOString().slice(0, 10) === value;
}

export function validateFlightSearch(request: FlightSearchRequest): void {
  const { tripType, legs, adults, children, infants, cabin } = request;

  if (!Array.isArray(legs)) throw new FlightSearchValidationError("invalid_itinerary");
  if (
    (tripType === "one-way" && legs.length !== 1) ||
    (tripType === "round-trip" && legs.length !== 2) ||
    (tripType === "multi-city" && (legs.length < 2 || legs.length > 4))
  ) {
    throw new FlightSearchValidationError("invalid_itinerary");
  }

  for (const leg of legs) {
    const origin = String(leg.origin ?? "").trim().toUpperCase();
    const destination = String(leg.destination ?? "").trim().toUpperCase();
    if (!IATA_CODE.test(origin) || !IATA_CODE.test(destination) || origin === destination) {
      throw new FlightSearchValidationError("invalid_airport");
    }
    if (!isValidCalendarDate(leg.departureDate)) {
      throw new FlightSearchValidationError("invalid_dates");
    }
  }

  for (let index = 1; index < legs.length; index += 1) {
    if (legs[index].departureDate < legs[index - 1].departureDate) {
      throw new FlightSearchValidationError("invalid_dates");
    }
  }

  if (tripType === "round-trip") {
    const [outbound, inbound] = legs;
    if (
      outbound.origin.toUpperCase() !== inbound.destination.toUpperCase() ||
      outbound.destination.toUpperCase() !== inbound.origin.toUpperCase()
    ) {
      throw new FlightSearchValidationError("invalid_itinerary");
    }
  }

  const passengerCounts = [adults, children, infants];
  if (
    passengerCounts.some((count) => !Number.isInteger(count) || count < 0) ||
    adults < 1 || adults + children + infants > 9 || infants > adults
  ) {
    throw new FlightSearchValidationError("invalid_passengers");
  }
  if (!CABIN_CLASSES.includes(cabin)) throw new FlightSearchValidationError("invalid_cabin");
}
