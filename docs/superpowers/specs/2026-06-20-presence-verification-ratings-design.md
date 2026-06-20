# Slice 2 — Presence Verification + Post-Trip Ratings

**Date:** 2026-06-20
**Status:** Approved scope, pending spec review
**Branch:** feature/llm-response-improve
**Predecessor:** Slice 1 (social-public-trips-rbac-landing) — provides the Didit RBAC guard (`services/social-guard.ts`, `checkTrustedTraveler`) this slice reuses.

## Context

Wayflo lets users generate and save trip itineraries (`trips` table; `lib/supabase-trips.ts`). This slice adds the trust signal that powers later destination discovery (Slice 3): a 1–5 star rating (plus optional review) that a user can only leave for a trip they **actually took**, proven by a one-time geolocation check during the trip dates.

Two facts about the current code shape this design:
- `trips` stores `duration` (integer day count) and the full `itinerary` JSON, but **no calendar dates and no destination coordinates as columns**. Dates exist only inside the itinerary JSON (`arrivalDate`/`departureDate`, daily-plan `date`) and may be null.
- Geocoding already exists: `GET /api/places?address=<dest>` returns `{ lat, lon }`. Distance math already exists and is unit-tested: `haversineDistanceKm()` in `services/itinerary.ts:693`.

This is Slice 2 of 3. Slice 3 (published itineraries + destination browse with ratings) consumes the ratings produced here; **public surfacing of ratings is out of scope for this slice.**

## Goals

1. Add reliable per-trip date window + destination coordinates to `trips`.
2. Capture a one-time, consent-gated geolocation "presence" proof during the trip window.
3. Allow a 1–5 star rating (+ optional review) **only** when the rater is Didit-verified, was presence-verified for that trip, and the trip has ended.
4. Surface clear, explanatory UI states on the user's own trip page for every gate.

## Non-Goals

- Publishing itineraries publicly or browsing other users' rated trips (Slice 3).
- Continuous location tracking, geofencing, or more than one presence ping per trip.
- Rating Open Trips/rooms (rating attaches to the personal `trips` itinerary).
- Changing the Didit verification levels or the Slice 1 social gate surface.

## Decisions (from brainstorming)

- **Trip dates:** add explicit `trip_start_date` / `trip_end_date` columns; capture in onboarding going forward; best-effort backfill of existing trips from itinerary JSON. Trips that can't be backfilled show an **"Add your travel dates"** prompt so users can enable presence/rating themselves.
- **Geo anchor:** geocode the destination once (via `/api/places?address=`) and store `dest_lat`/`dest_lng` on the trip.
- **Presence trigger:** on app open (dashboard load), once per trip, if today ∈ [start,end], not already verified, and consent granted → single `getCurrentPosition`. ≤ 50km from destination ⇒ verified-present. Never present ⇒ trip stays unverified (cannot rate).
- **Rating window:** unlocks only when trip_end_date < today AND presence-verified AND Didit trusted+.
- **Rating gate:** requires **both** Didit trusted+ and presence.
- **Rating shape:** required 1–5 stars + optional review text; one per user per trip; editable.
- **Consent:** explicit, revocable opt-in prompt separate from cookie consent; browser permission denial handled silently (no nagging).

## Architecture

### Unit A — Trip dates & coordinates (schema + capture)

**Migration `..._add_trip_dates_and_coords.sql`:**
- `trips.trip_start_date date`, `trips.trip_end_date date` (both nullable).
- `trips.dest_lat double precision`, `trips.dest_lng double precision` (nullable).
- Backfill: for each existing trip, set dates from itinerary JSON arrival/departure where present; geocoding of destination for coords is done lazily at presence-check time rather than in the migration (avoids a migration that calls external APIs).

**Capture:**
- Onboarding/trip-create path (`app/api/trips/[id]` writer and the onboarding form) records `trip_start_date`/`trip_end_date`. Extend `Trip` interface (`lib/supabase-trips.ts`) with the four nullable fields.
- A trip page control lets a user set/edit travel dates when missing (`PATCH /api/trips/[id]` extended to accept dates). This is the "Add your travel dates" path for un-backfillable trips.

### Unit B — Presence verification

**Schema `trip_presence_checks`:** `id`, `trip_id` (fk trips), `user_id`, `verified_at timestamptz`, `lat`, `lng`, `distance_km`, unique (`trip_id`, `user_id`).

**Consent:** add `traveler_profiles.location_consent_at timestamptz null` and `location_consent_revoked_at timestamptz null`. Consent is active when `location_consent_at` is set and not superseded by a later revoke.

**Service `services/presence.ts`:**
- `PRESENCE_RADIUS_KM = 50`.
- `isWithinTripWindow(today, start, end): boolean`.
- `evaluatePresence({destLat, destLng, lat, lng}): { withinRadius: boolean; distanceKm: number }` using `haversineDistanceKm`.

**API `POST /api/trips/[id]/presence`:** authenticated; body `{ lat, lng }`. Loads the trip (must belong to the user), ensures `dest_lat/lng` (geocodes destination once and persists if missing), verifies today ∈ window, computes distance; if ≤ 50km upserts a `trip_presence_checks` row (idempotent). Returns `{ verified: boolean, distance_km }`. Out-of-window or >50km → `{ verified: false }` (no row).

**Client `hooks/usePresenceCheck.ts`:** on dashboard mount, fetch the user's trips + presence/consent state via a lightweight `GET /api/trips/presence-status`; for the first trip in-window, not-yet-verified, with active consent, call `navigator.geolocation.getCurrentPosition` ONCE and POST the result. Geolocation errors (denied/unavailable/timeout) are swallowed silently. At most one geolocation prompt per app-open.

**Consent UI `components/trip/LocationConsentPrompt.tsx`:** shown before the first geolocation call if consent not yet granted; explains why (verify presence to rate) and what is stored (one location read during trip dates: coords + distance). Writes consent via `POST /api/profile/location-consent`; revocable from social/profile settings.

### Unit C — Ratings

**Schema `trip_ratings`:** `id`, `trip_id` (fk trips), `user_id`, `stars int check 1..5`, `review text null`, `created_at`, `updated_at`, unique (`trip_id`, `user_id`).

**Service `services/ratings.ts`:**
- `canRateTrip({ verificationLevel, hasPresence, tripEndDate, today }): { ok: true } | { ok: false; reason: 'verification_required' | 'presence_required' | 'trip_not_ended' }` — pure, unit-tested. Order of checks: verification → presence → ended.
- aggregate helper `summarizeRatings(rows): { average: number; count: number }`.

**API `POST|PATCH /api/trips/[id]/rating`:** authenticated; reuses `checkTrustedTraveler` (Slice 1) for the verification leg, looks up the presence row and `trip_end_date`, runs `canRateTrip`. On failure returns `403 { error: <reason> }`. On success upserts the rating (one per user/trip; PATCH edits). `GET /api/trips/[id]/rating` returns the caller's rating + the aggregate (aggregate is computed but only consumed privately this slice).

**UI `components/trip/RatingCard.tsx`** on `app/trip/[id]`: renders the correct state from the gate reason —
- not trusted+ → "Verify your identity to rate" (links to Didit, reuse `VerifyToUnlock` from Slice 1).
- no presence → "We couldn't confirm you visited <destination>" (+ explanation).
- trip not ended → "You can rate after your trip ends (<trip_end_date>)".
- eligible → star selector (1–5, required) + optional review textarea + submit/edit.

## Data Flow

```
Dashboard load
  → usePresenceCheck: GET /api/trips/presence-status
      → for first in-window unverified trip with consent:
          navigator.geolocation.getCurrentPosition (once)
            → POST /api/trips/[id]/presence {lat,lng}
                → server: ensure dest coords, in-window?, distance ≤ 50km?
                    → yes: upsert trip_presence_checks
Trip page (after trip ends)
  → GET /api/trips/[id]/rating → caller rating + gate eligibility
  → RatingCard shows form iff canRateTrip ok
      → POST/PATCH /api/trips/[id]/rating
          → server canRateTrip(trusted+ ∧ presence ∧ ended) → upsert or 403{reason}
```

## Error Handling

- Geolocation: denied/unavailable/timeout → silent, non-blocking, trip stays unverified; no retry storm (one attempt per app-open).
- Rating API: `401` unauth, `403 { error: 'verification_required' | 'presence_required' | 'trip_not_ended' }`, `404` trip not owned/found, `400` invalid stars. Each reason maps to a specific RatingCard state, never a raw error.
- Geocoding failure when ensuring `dest_lat/lng`: presence check returns `{ verified: false, reason: 'no_destination_coords' }`; UI may prompt to confirm destination but does not crash.
- Migration degradation: routes degrade gracefully (503/empty) if the migration is unapplied, matching existing patterns.

## Testing

- **Unit** (`playwright.unit.config.ts`):
  - `evaluatePresence` / `isWithinTripWindow`: radius boundary (≤50 vs >50), in/out of window.
  - `canRateTrip`: full matrix — each failing condition returns its specific reason; all-pass returns ok; check order (verification before presence before ended).
  - `summarizeRatings`: average/count, empty set.
- **E2E** (`playwright.config.ts`, mock API per the Slice 1 `installSupabaseMock`/`page.route` pattern):
  - RatingCard locked states: mock verification_level/presence/end-date combinations → assert the correct explanatory copy and that the form is hidden.
  - RatingCard unlocked: trusted + presence + ended → star form visible; submit posts and reflects.
  - Consent prompt: no consent → geolocation is NOT called; after consent → presence POST fires (mock geolocation).
- **Gates:** `npm run typecheck`, `npm run lint`, `npm run test:unit`, `npm run test:e2e`, `npm run build` green.

## Risks / Open Items

- Geolocation accuracy/spoofing: a 50km radius is generous; this is a trust signal, not anti-fraud. Acceptable for MVP; note for future hardening.
- Backfill is best-effort; un-backfillable trips rely on the user-set-dates path. Acceptable per decision.
- New migration must be applied to Supabase before presence/rating routes function; until then they degrade gracefully.
- Aggregate rating fields are produced but not surfaced publicly until Slice 3.
