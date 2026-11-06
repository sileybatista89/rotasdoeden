# Sprint 1 Travel Search Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add booking-first homepage search tabs and a fully labelled, synthetic `/voos` search demo.

**Architecture:** Extend the current React SPA and visual tokens. A client-side `FlightProviderInterface` with an in-memory `MockFlightProvider` powers the public demo; existing Supabase/Duffel/admin and payment flows remain untouched.

**Tech Stack:** React 18, TypeScript, Vite 6, React Router 6, Tailwind CSS, Radix UI, Vitest and Testing Library.

**Spec:** `docs/superpowers/specs/2026-11-06-sprint1-travel-search-design.md`

## Global Constraints

- Preserve the existing brand palette, typography, approved images and established routes.
- Use the supplied São Tomé and Príncipe destination focus without fabricating real supplier inventory, schedules, fares or policies.
- Make mock results visibly synthetic; create no real hold, booking, database write, provider call or payment.
- Preserve the existing flight schema, RLS, Supabase Edge Functions, Stripe behavior, authentication and package checkout.
- Keep 375–430px mobile layouts usable, avoid horizontal overflow, expose labels and keyboard focus, and honor reduced motion.
- Run the existing full test suite (433 tests before additions) and build before commit.

## Review Focus

1. Invalid or identical airport codes are rejected in the mock adapter rather than returning misleading results.
2. Round-trip dates cannot precede departure, and multi-city legs require valid airport codes and ordered dates.
3. Passenger constraints require at least one adult, cap the group at nine, and prevent more infants than adults.
4. Empty results and provider failures render recoverable states without exposing a real booking CTA.
5. The stays tab must not imply that a public stay inventory or reservation flow already exists.

---

### Task 1: Homepage search tabs and flight navigation

**Files:**
- Create: `src/components/search/TravelSearchTabs.tsx`
- Modify: `src/components/home/HeroSection.tsx`
- Modify: `src/components/layout/Navbar.tsx`
- Test: `src/test/sprint1-travel-search.test.tsx`

**Interfaces:**
- Produces four accessible search tabs: packages, flights, stays and experiences.
- Flight quick-search navigates to `/voos` with airport, date and passenger values in query parameters.
- Stays communicates its not-yet-available state and offers a working existing route.

- [ ] Write tests for all four tabs, flight query navigation and the stays empty state.
- [ ] Run the focused test and confirm expected failures before implementing.
- [ ] Implement the tab panel using the existing tokens and controls; keep the existing journey dialog and package routes available.
- [ ] Run the focused test and verify the behaviors pass.

### Task 2: Flight provider contract and deterministic mock

**Files:**
- Create: `src/services/flights/flight-provider.ts`
- Create: `src/services/flights/mock-flight-provider.ts`
- Test: `src/test/sprint1-flight-provider.test.ts`

**Interfaces:**
- `FlightProviderInterface.searchFlights(query)` returns labelled synthetic offers.
- `getFlightDetails(offerId)` returns one known offer or a typed not-found error.
- `holdFare(offerId)` returns a mock hold marker only.
- `createBooking(holdId)` returns a demo result that explicitly states no reservation was created.

- [ ] Write tests for normalizing airport codes, trip/date/pax validation, offer synthesis, unknown offers and mock-only hold/booking behavior.
- [ ] Run the focused test and confirm expected failures.
- [ ] Implement deterministic in-memory mock behavior without fetch, Supabase, Duffel or Stripe imports.
- [ ] Run the focused test and verify the behaviors pass.

### Task 3: `/voos` search, filters and synthetic booking demo

**Files:**
- Create: `src/pages/FlightsPage.tsx`
- Create: `src/components/flights/FlightSearchForm.tsx`
- Create: `src/components/flights/FlightResults.tsx`
- Create: `src/components/flights/FlightOfferDialog.tsx`
- Modify: `src/App.tsx`
- Modify: `src/components/layout/Footer.tsx`
- Test: `src/test/sprint1-flight-search.test.tsx`

**Interfaces:**
- The form supports one-way, return and multi-city routes, airport suggestions, date and passenger controls.
- Result filters cover stops, carrier labels and departure time; every result remains marked as synthetic.
- Offer details can run mock hold and mock booking actions; neither creates a real reservation or checkout.

- [ ] Write tests for submit/validation, route type changes, result filters, empty/error states, details and demo booking notice.
- [ ] Run the focused test and confirm expected failures.
- [ ] Implement the `/voos` route and UI using existing components; set no real provider, DB or payment effects.
- [ ] Run the focused test and verify the behaviors pass.

### Task 4: Full verification and delivery

**Files:**
- Verify all Sprint 1 source, tests and docs.

- [ ] Run `npm test -- --reporter=dot`; expected: all original 433 tests plus new tests pass.
- [ ] Run `npm run build`; expected: Vite build succeeds.
- [ ] Inspect homepage and `/voos` in a browser at 375, 390, 768, 1024 and 1440px where available; check direct-route access, keyboard focus, mobile tabs/forms/results, reduced motion and horizontal overflow.
- [ ] Run Impeccable's detector on changed UI targets and resolve mechanical failures.
- [ ] Review the final diff for unintended changes to Supabase, authentication, reservations or payments.
- [ ] Create a focused commit on `feature/sprint1-tourism-flights`; do not deploy or merge to `main`.
