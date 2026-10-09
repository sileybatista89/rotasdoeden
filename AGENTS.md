# Project rules

- Never add or display editorial, destination, package, accommodation, or service photography unless the project owner explicitly supplies and approves that exact file; this prevents unapproved or AI-generated imagery from returning.
- User-uploaded professional profile and service images may be shown only through the existing moderated marketplace flow; they are first-party submissions rather than editorial assets.
- `src/assets/real/` is the protected whitelist of owner-uploaded photos (matched to the owner's chat uploads by date); never delete, upscale, "enhance" or regenerate them — system-enhanced variants are what got flagged as AI.
- Post-trip emails are sent only by the admin-gated booking-complete function, logged once per booking in post_trip_emails (unique index); review-invite fields there are reserved for a future, officially supported Trustpilot method — never add ad-hoc BCC.
