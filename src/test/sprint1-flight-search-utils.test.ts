import { describe, expect, it } from "vitest";
import { filterFlightOffers, initialMultiLegs } from "@/services/flights/flight-search-utils";
import { MockFlightProvider } from "@/services/flights/mock-flight-provider";

describe("flight search page helpers", () => {
  it("restores all multi-city legs from a saved URL", () => {
    const params = new URLSearchParams({
      tripType: "multi-city",
      legs: JSON.stringify([
        { origin: "LIS", destination: "TMS", departureDate: "2026-11-08" },
        { origin: "TMS", destination: "OPO", departureDate: "2026-11-18" },
      ]),
    });

    expect(initialMultiLegs(params)).toEqual([
      { origin: "LIS", destination: "TMS", departureDate: "2026-11-08" },
      { origin: "TMS", destination: "OPO", departureDate: "2026-11-18" },
    ]);
  });

  it("filters synthetic offers by stops, carrier and departure time", async () => {
    const offers = await new MockFlightProvider().searchFlights({
      tripType: "one-way",
      legs: [{ origin: "LIS", destination: "TMS", departureDate: "2026-11-08" }],
      adults: 1,
      children: 0,
      infants: 0,
      cabin: "economy",
    });

    expect(filterFlightOffers(offers, [0], [], "any")).toHaveLength(1);
    expect(filterFlightOffers(offers, [], ["Companhia de demonstração B"], "any")).toHaveLength(1);
    expect(filterFlightOffers(offers, [], [], "afternoon").map(offer => offer.departureTime)).toEqual(["14:20"]);
  });
});
