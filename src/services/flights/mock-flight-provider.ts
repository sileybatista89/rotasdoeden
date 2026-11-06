import {
  FlightProviderNotFoundError,
  type DemoBookingResult,
  type DemoFareHold,
  type FlightOffer,
  type FlightProviderInterface,
  type FlightSearchRequest,
  type FlightSegment,
  validateFlightSearch,
} from "./flight-provider";

const DEMO_CARRIERS = [
  { code: "DEMO-A", name: "Companhia de demonstração A" },
  { code: "DEMO-B", name: "Companhia de demonstração B" },
  { code: "DEMO-C", name: "Companhia de demonstração C" },
] as const;

const OFFER_VARIANTS = [
  { stops: 0, durationMinutes: 480, startTime: "08:40", basePerPassenger: 390, taxPerPassenger: 142 },
  { stops: 1, durationMinutes: 625, startTime: "11:15", basePerPassenger: 330, taxPerPassenger: 128 },
  { stops: 2, durationMinutes: 770, startTime: "14:20", basePerPassenger: 270, taxPerPassenger: 116 },
] as const;

function formatTime(totalMinutes: number): string {
  const normalized = ((totalMinutes % (24 * 60)) + 24 * 60) % (24 * 60);
  const hours = Math.floor(normalized / 60).toString().padStart(2, "0");
  const minutes = (normalized % 60).toString().padStart(2, "0");
  return `${hours}:${minutes}`;
}

function makeSegment(leg: FlightSearchRequest["legs"][number], index: number, variantIndex: number): FlightSegment {
  const variant = OFFER_VARIANTS[variantIndex];
  const [startHour, startMinute] = variant.startTime.split(":").map(Number);
  const departureMinutes = startHour * 60 + startMinute + index * 75;
  const durationMinutes = variant.durationMinutes + index * 18;
  return {
    origin: leg.origin.toUpperCase(),
    destination: leg.destination.toUpperCase(),
    departureDate: leg.departureDate,
    departureTime: formatTime(departureMinutes),
    arrivalTime: formatTime(departureMinutes + durationMinutes),
    durationMinutes,
  };
}

function offerId(request: FlightSearchRequest, variantIndex: number): string {
  const route = request.legs.map((leg) => `${leg.origin}-${leg.destination}-${leg.departureDate}`).join("_");
  return `demo_${variantIndex}_${route}`.replace(/[^a-zA-Z0-9_-]/g, "").toUpperCase();
}

export class MockFlightProvider implements FlightProviderInterface {
  private offers = new Map<string, FlightOffer>();
  private holds = new Map<string, DemoFareHold>();
  private bookings = new Map<string, DemoBookingResult>();

  async searchFlights(request: FlightSearchRequest): Promise<FlightOffer[]> {
    validateFlightSearch(request);
    const passengerCount = request.adults + request.children + request.infants;
    const legCount = request.legs.length;
    const offers = OFFER_VARIANTS.map((variant, index): FlightOffer => {
      const baseAmount = (variant.basePerPassenger * passengerCount + 82 * (legCount - 1)) * (1 + index * 0.035);
      const taxAmount = (variant.taxPerPassenger * passengerCount + 28 * (legCount - 1)) * (1 + index * 0.025);
      const legs = request.legs.map((leg, legIndex) => [makeSegment(leg, legIndex, index)]);
      const totalAmount = Math.round((baseAmount + taxAmount) * 100) / 100;
      const firstSegment = legs[0][0];
      const lastSegment = legs[0][legs[0].length - 1];
      const offer: FlightOffer = {
        id: offerId(request, index),
        provider: "mock",
        providerOfferId: `mock_${offerId(request, index)}`,
        carrierCode: DEMO_CARRIERS[index].code,
        carrierName: DEMO_CARRIERS[index].name,
        legs,
        stops: variant.stops,
        departureTime: firstSegment.departureTime,
        arrivalTime: lastSegment.arrivalTime,
        durationMinutes: legs.reduce((sum, segments) => sum + segments.reduce((legTotal, segment) => legTotal + segment.durationMinutes, 0), 0),
        baggageSummary: "Bagagem incluída · exemplo de demonstração",
        baseAmount: Math.round(baseAmount * 100) / 100,
        taxAmount: Math.round(taxAmount * 100) / 100,
        totalAmount,
        currency: "EUR",
        isDemo: true,
      };
      this.offers.set(offer.id, offer);
      return offer;
    });
    return offers;
  }

  async getFlightDetails(offerId: string): Promise<FlightOffer> {
    const offer = this.offers.get(offerId);
    if (!offer) throw new FlightProviderNotFoundError("offer_not_found");
    return offer;
  }

  async holdFare(offerId: string): Promise<DemoFareHold> {
    await this.getFlightDetails(offerId);
    const hold: DemoFareHold = { id: `demo_hold_${offerId}`, offerId, isDemo: true };
    this.holds.set(hold.id, hold);
    return hold;
  }

  async createBooking(holdId: string): Promise<DemoBookingResult> {
    const existing = this.bookings.get(holdId);
    if (existing) return existing;
    if (!this.holds.has(holdId)) throw new FlightProviderNotFoundError("hold_not_found");
    const result: DemoBookingResult = {
      id: `demo_booking_${holdId}`,
      holdId,
      status: "demo_only",
      reservationCreated: false,
      isDemo: true,
    };
    this.bookings.set(holdId, result);
    return result;
  }
}
