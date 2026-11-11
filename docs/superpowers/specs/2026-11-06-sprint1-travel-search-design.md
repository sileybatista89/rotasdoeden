# Sprint 1: Travel Search and Flight Demonstration

## Intent

Make the existing Rotas do Éden homepage easier to act on and add a public `/voos` search experience for travellers planning travel to São Tomé and Príncipe.

## Goals

- Refine the homepage hero and navigation using the existing forest, sand and terracotta tokens and existing typography.
- Add a reusable booking-first search panel with tabs for packages, flights, stays and experiences.
- Add a flight-search page with one-way, return and multi-city search, airport suggestions, passenger counts, results and practical filters.
- Define a client-side provider contract with `searchFlights`, `getFlightDetails`, `holdFare` and `createBooking`, implemented by `MockFlightProvider` for demonstration only.
- Keep the new demo separate from Supabase, Duffel, Stripe and actual reservation flows.

## Non-goals

- No full redesign of the platform.
- No real airline connection, supplier contract, reservation, ticketing, fare hold, payment, database write or migration.
- No public accommodation marketplace implementation; the home tab must explain its current state and lead to an existing useful route.
- No unverified airline availability, schedules, prices, baggage guarantees or cancellation terms.

## Approaches

1. **Extend the current SPA and visual system with an isolated in-memory flight adapter — chosen.** This reuses the existing React Router, tokens, Radix controls, test runner and approved imagery while avoiding new infrastructure and external effects.
2. **Connect the public form directly to the existing Duffel Edge Function and flight tables.** Not chosen because that server path is admin-gated, provider inventory and credentials are not confirmed for public search, and it would turn a demonstration into a real supplier operation.
3. **Build a separate frontend or introduce another booking service.** Not chosen because the current SPA already hosts the relevant product flows and no concrete need justifies a second application or service.

## Decisions

- Keep `src/integrations/supabase/types.ts`, SQL migrations, payment flows and the existing server-side flight provider unchanged.
- Put the new client contract and mock provider under `src/services/flights/`.
- Mark synthetic flight results and all synthetic prices and schedules visibly as demonstration data. Do not present the mock booking response as a reservation confirmation.
- Preserve current package, authentication, checkout and account routes.
- Stays remain a transparent “in preparation” state until a public inventory and booking flow exist.
- Reuse only existing approved local images and design tokens; do not add an imagery or animation library.

## Open for later

- Which contracted flight supplier, if any, will serve public search and booking.
- Confirmed routes, schedules, fares, baggage rules, supplier fees, hold behavior, cancellation policies, passenger-data requirements and public booking permissions.
- Whether the accommodation tab should route to a future public inventory page.
