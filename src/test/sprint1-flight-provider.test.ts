import { describe, expect, it } from "vitest";
import { MockFlightProvider } from "@/services/flights/mock-flight-provider";
import { FlightSearchValidationError } from "@/services/flights/flight-provider";

const request = {
  tripType: "one-way" as const,
  legs: [{ origin: "LIS", destination: "TMS", departureDate: "2026-11-08" }],
  adults: 1,
  children: 0,
  infants: 0,
  cabin: "economy" as const,
};

describe("MockFlightProvider", () => {
  it("returns labelled synthetic offers for a valid search", async () => {
    const provider = new MockFlightProvider();
    const offers = await provider.searchFlights(request);

    expect(offers.length).toBeGreaterThan(0);
    expect(offers.every((offer) => offer.isDemo)).toBe(true);
    expect(offers.every((offer) => offer.provider === "mock")).toBe(true);
    expect(offers.every((offer) => offer.totalAmount > offer.taxAmount)).toBe(true);
    expect(offers.every((offer) => offer.legs[0][0].origin === "LIS")).toBe(true);
  });

  it("keeps outbound times and stop counts for a round trip", async () => {
    const provider = new MockFlightProvider();
    const [offer] = await provider.searchFlights({
      ...request,
      tripType: "round-trip",
      legs: [
        { origin: "LIS", destination: "TMS", departureDate: "2026-11-08" },
        { origin: "TMS", destination: "LIS", departureDate: "2026-11-18" },
      ],
    });

    expect(offer.stops).toBe(0);
    expect(offer.departureTime).toBe(offer.legs[0][0].departureTime);
    expect(offer.arrivalTime).toBe(offer.legs[0][0].arrivalTime);
  });

  it("rejects identical airports and invalid IATA codes", async () => {
    const provider = new MockFlightProvider();

    await expect(provider.searchFlights({
      ...request,
      legs: [{ ...request.legs[0], destination: "LIS" }],
    })).rejects.toBeInstanceOf(FlightSearchValidationError);
    await expect(provider.searchFlights({
      ...request,
      legs: [{ ...request.legs[0], origin: "Lisboa" }],
    })).rejects.toMatchObject({ code: "invalid_airport" });
  });

  it("rejects calendar dates that match the format but do not exist", async () => {
    const provider = new MockFlightProvider();

    await expect(provider.searchFlights({
      ...request,
      legs: [{ ...request.legs[0], departureDate: "2026-02-31" }],
    })).rejects.toMatchObject({ code: "invalid_dates" });
  });

  it("rejects invalid return dates and out-of-order multi-city legs", async () => {
    const provider = new MockFlightProvider();

    await expect(provider.searchFlights({
      tripType: "round-trip",
      legs: [
        { origin: "LIS", destination: "TMS", departureDate: "2026-11-08" },
        { origin: "TMS", destination: "LIS", departureDate: "2026-11-07" },
      ],
      adults: 1,
      children: 0,
      infants: 0,
      cabin: "economy",
    })).rejects.toMatchObject({ code: "invalid_dates" });

    await expect(provider.searchFlights({
      tripType: "multi-city",
      legs: [
        { origin: "LIS", destination: "TMS", departureDate: "2026-11-10" },
        { origin: "TMS", destination: "OPO", departureDate: "2026-11-09" },
      ],
      adults: 1,
      children: 0,
      infants: 0,
      cabin: "economy",
    })).rejects.toMatchObject({ code: "invalid_dates" });
  });

  it("enforces passenger limits and infant-to-adult ratio", async () => {
    const provider = new MockFlightProvider();

    await expect(provider.searchFlights({ ...request, adults: 0 })).rejects.toMatchObject({ code: "invalid_passengers" });
    await expect(provider.searchFlights({ ...request, adults: 1, infants: 2 })).rejects.toMatchObject({ code: "invalid_passengers" });
    await expect(provider.searchFlights({ ...request, adults: 8, children: 2 })).rejects.toMatchObject({ code: "invalid_passengers" });
  });

  it("supports details, fare hold and booking only as an explicit demo", async () => {
    const provider = new MockFlightProvider();
    const [offer] = await provider.searchFlights(request);

    await expect(provider.getFlightDetails(offer.id)).resolves.toEqual(offer);
    const hold = await provider.holdFare(offer.id);
    expect(hold.isDemo).toBe(true);

    const booking = await provider.createBooking(hold.id);
    expect(booking.isDemo).toBe(true);
    expect(booking.status).toBe("demo_only");
    expect(booking.reservationCreated).toBe(false);
  });

  it("returns a recoverable not-found error for unknown offers and holds", async () => {
    const provider = new MockFlightProvider();

    await expect(provider.getFlightDetails("unknown"))
      .rejects.toMatchObject({ code: "offer_not_found" });
    await expect(provider.createBooking("unknown"))
      .rejects.toMatchObject({ code: "hold_not_found" });
  });
});
