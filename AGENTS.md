# Project rules

- Never add or display editorial, destination, package, accommodation, or service photography unless the project owner explicitly supplies and approves that exact file; this prevents unapproved or AI-generated imagery from returning.
- User-uploaded professional profile and service images may be shown only through the existing moderated marketplace flow; they are first-party submissions rather than editorial assets.
- `src/assets/real/` is the protected whitelist of owner-uploaded photos (matched to the owner's chat uploads by date); never delete, upscale, "enhance" or regenerate them — system-enhanced variants are what got flagged as AI.
- Post-trip emails are sent only by the admin-gated booking-complete function, logged once per booking in post_trip_emails (unique index); review-invite fields there are reserved for a future, officially supported Trustpilot method — never add ad-hoc BCC.
- Payment mode and sales activation come only from `public.commerce_settings` (defaults: test mode, sales off), resolved by `_shared/payment-gate.ts` in every checkout function; a live key existing must never select live mode, so real charges always need an explicit admin change.
- Stripe webhooks are recorded in `payment_events` keyed by (provider, event_id) with processing/processed/failed state; booking updates are conditional so retries never double-confirm.
