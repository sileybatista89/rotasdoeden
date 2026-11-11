# Product

<!-- impeccable:product-schema 1 -->

## Platform

web

## Users

Travellers planning tourism, trips, experiences and packages in São Tomé and Príncipe.

## Product Purpose

Rotas do Éden is a tourism platform focused initially on São Tomé and Príncipe. The current Sprint 1 goal is to make trip discovery more booking-first and to introduce a clearly labelled flight-search demonstration.

## Positioning

The confirmed focus is travel and tourism in São Tomé and Príncipe. A stronger differentiating claim is not recorded here.

## Operating Context

The product is an existing React, TypeScript and Vite single-page application. It already presents travel packages, experiences, destination information and guide-related flows. Flight research is being added as a user-facing demonstration while real supplier integration remains a separate future decision.

## Capabilities and Constraints

- Existing Supabase flight tables and a server-side Duffel test-mode integration are present in the repository.
- The public flight-search demonstration must not call the Duffel integration, write to Supabase, create real reservations, or initiate payments.
- The current `flight_searches`, `flight_offers` and `booking_flight` schema is to be preserved; Sprint 1 adds no database migration.
- Real suppliers, contracts, schedules, availability, prices, baggage rules and cancellation policies must not be inferred from synthetic data.
- Authentication, package booking, checkout, payment and other established routes must remain intact.

## Brand Commitments

The supplied brief calls for a premium, authentic tourism experience rooted in São Tomé and Príncipe. The existing code uses a forest-green, warm-sand and terracotta palette, Instrument Serif display typography and Work Sans body typography. Sprint 1 extends these existing tokens rather than replacing them.

## Evidence on Hand

- The repository contains owner-approved local destination imagery under `src/assets/real/`; this Sprint 1 may reuse those exact files where relevant.
- The repository contains existing Supabase flight tables, a Duffel test-mode edge function and an admin flight panel.
- No real public flight inventory, supplier contract, ticketing authorization or flight tariff was supplied for this Sprint 1.
- All mock flight itinerary, schedule and price values must be visibly identified as synthetic demonstration data.

## Product Principles

- Help travellers choose a next step without hiding the destination's real constraints.
- Show synthetic data as synthetic and keep it separate from real booking and payment flows.
- Preserve the existing identity and verified product behavior as the platform grows.
- Prefer clear, accessible travel information over unsupported claims.

## Accessibility & Inclusion

The supplied project brief requires responsive layouts, keyboard-visible focus, usable touch targets and reduced-motion support. Sprint 1 must preserve these constraints for the homepage search and the `/voos` route.
