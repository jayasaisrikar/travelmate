# Slice 3 — Published Itineraries + Destination Discovery

**Date:** 2026-06-20
**Status:** Approved scope, pending spec review
**Branch:** feature/llm-response-improve
**Predecessors:** Slice 1 (RBAC guard `services/social-guard.ts` / `checkTrustedTraveler`, `VerifyToUnlock`); Slice 2 (`trip_ratings`, `summarizeRatings`, owner self-rating per trip).

## Context

This final slice closes the loop: a traveler who planned (and ideally rated) a trip can publish that itinerary publicly, and anyone exploring a destination sees those published itineraries ranked by their owners' post-trip star ratings, with a destination-level average. This is the consumer of the rating signal produced in Slice 2.

Existing surfaces this builds on:
- `app/explore/[destination]/page.tsx` — already lists travelers + open rooms for a destination slug. The browse section is added here.
- `components/trip/PublicTripShare.tsx` — the existing read-only itinerary renderer (used by `app/share/[token]/page.tsx`). Reused for the new public itinerary route.
- Private token sharing (`/share/[token]`, revocable, one per trip) is a SEPARATE concept and is left unchanged.
- `trips` stores `destination` (free text), `itinerary` JSON; Slice 2 added dates + dest coords. Ratings are owner-self-ratings keyed (`trip_id`,`user_id`).

## Goals

1. A Didit trusted+ user can publish/unpublish their own itinerary to public discovery.
2. A canonical public, no-auth read-only itinerary page at `/itinerary/[id]`.
3. Destination browse lists published itineraries ranked by owner rating, with a destination average.
4. All new/changed surfaces meet the effortless-UX bar (one-tap publish, interactive cards), no AI slop; landing untouched.

## Non-Goals

- Cross-user reviews (Slice 2 ratings are owner-self-ratings; this slice surfaces them, it does not add reviewer-of-others).
- Editing/curation/moderation of published itineraries beyond publish/unpublish.
- Changing private token sharing.
- Search/filter beyond destination + the default rating-first sort (recency is the tiebreak only).

## Decisions (from brainstorming)

- **Publish gate:** Didit trusted+; publishing allowed anytime (rating appears once the owner has rated). Owner-only.
- **Exposure:** read-only itinerary + owner's PUBLIC traveler profile (name/avatar) + their star rating & review. Explicit opt-in, reversible.
- **Public view:** dedicated `/itinerary/[id]` route (reuses `PublicTripShare`); no token.
- **Browse:** sorted by stars desc, then `published_at` desc; destination-level aggregate `{average, count}` over RATED published trips.
- **Unrated published trips:** still shown, ranked below all rated ones, and excluded from the destination average.

## Architecture

### Unit A — Schema + publish API

**Migration `..._publish_itineraries.sql`:**
- `trips.is_published boolean not null default false`
- `trips.published_at timestamptz`
- `trips.destination_slug text`
- index `trips_published_dest_idx on trips(destination_slug) where is_published`.

**`POST /api/trips/[id]/publish`** body `{ publish: boolean }`:
- Authenticated; trip must be owned by caller (`.eq('user_id', user.id)`), else 404.
- Gated by `checkTrustedTraveler(user.id)` → `403 { error: 'verification_required', level }` if not trusted+.
- On `publish:true` set `is_published=true`, `published_at=now()`, `destination_slug=slugifyDestination(trip.destination)`. On `publish:false` set `is_published=false` (retain `published_at` history is unnecessary; clear it). Returns `{ is_published }`.
- Extend `Trip` type (`lib/supabase-trips.ts`) with `is_published?`, `published_at?`, `destination_slug?`.

### Unit B — Public itinerary route

**`app/itinerary/[id]/page.tsx`** (server component, no auth):
- Loads the trip by id WHERE `is_published = true`. If absent → `notFound()` (friendly 404).
- Renders `<PublicTripShare trip={...} />` plus an owner block (public traveler profile via the existing public-profile read) and the owner's rating (stars + review) from `trip_ratings`.
- Sets basic OpenGraph metadata (destination + rating) mirroring the share page's metadata approach.

### Unit C — Destination discovery

**Pure `services/discovery.ts`:**
- `type PublishedItinerary = { tripId: string; destination: string; ownerName: string | null; ownerAvatar: string | null; stars: number | null; review: string | null; publishedAt: string }`.
- `rankPublishedItineraries(items): PublishedItinerary[]` — rated (stars != null) first, sorted by stars desc then publishedAt desc; unrated appended, sorted by publishedAt desc.
- `destinationRatingSummary(items): { average: number; count: number }` — over items with stars != null; reuse Slice 2's `summarizeRatings` shape (average 1 decimal, `{0,0}` empty).

**`GET /api/explore/[slug]/itineraries`** (public, no auth):
- Reads published trips for `destination_slug = slug`, joins each owner's public profile and their `trip_ratings` row, maps to `PublishedItinerary`, applies `rankPublishedItineraries`, and returns `{ items, summary }` (summary via `destinationRatingSummary`). Degrades to empty if migration unapplied.

**`app/explore/[destination]/page.tsx`** — add a "Published itineraries" section that fetches the endpoint and renders cards: owner avatar/name, star rating (or "Not rated yet"), short review snippet, link to `/itinerary/[tripId]`. Shows the destination average + count as a header. Loading/empty/error states.

### Unit D — Publish control on the trip page

On `app/trip/[id]/page.tsx`, near the RatingCard: a `components/trip/PublishToggle.tsx` — one-tap toggle reflecting `trip.is_published`, optimistic update, calling the publish API. If the API returns `verification_required`, open `VerifyToUnlock` instead of a raw error. Friendly "Published — anyone with the link can view" affordance with the `/itinerary/[id]` link to copy.

## Data Flow

```
Trip page (owner) → PublishToggle → POST /api/trips/[id]/publish {publish:true}
   → server: owner check + checkTrustedTraveler → set is_published/published_at/destination_slug
Explore /explore/[slug] → GET /api/explore/[slug]/itineraries
   → published trips + owner profile + rating → rankPublishedItineraries + destinationRatingSummary
   → cards (rated-first) + destination average → link → /itinerary/[id]
Public /itinerary/[id] (no auth) → trip WHERE is_published → PublicTripShare + owner + rating
```

## Error Handling

- Publish API: `401` unauth, `403 verification_required`, `404` not owned/found. Toggle maps 403 → upsell, never a raw error; optimistic state rolls back on failure with a friendly message.
- Public route: unpublished/missing → `notFound()` friendly page (not a crash).
- Browse endpoint: empty arrays / graceful 503 if migration unapplied.
- Discovery helpers are pure and total (handle empty input).

## Testing

- **Unit** (`playwright.unit.config.ts`):
  - `rankPublishedItineraries`: rated-before-unrated; stars desc; publishedAt tiebreak; unrated ordered by publishedAt; empty input.
  - `destinationRatingSummary`: average over rated only, excludes unrated, empty → `{0,0}`.
- **E2E** (mock API per the `installSupabaseMock`/`page.route` pattern):
  - Publish toggle: unverified → `VerifyToUnlock` on toggle; verified → optimistic "Published" + visible `/itinerary/[id]` link.
  - Public route: `is_published` trip renders itinerary + owner + rating; unpublished → 404.
  - Destination browse: given mixed rated/unrated published itineraries, assert rated cards appear above unrated and the destination average/count render.
- **Gates:** `npm run typecheck`, `npm run lint`, `npm run test:unit`, `npm run test:e2e`, `npm run build`.

## Risks / Open Items

- Publishing exposes the owner's public profile + itinerary; mitigated by explicit opt-in + reversible unpublish. The itinerary JSON may contain personal notes — publishing surfaces exactly what the read-only `PublicTripShare` already renders for token shares (no new fields exposed).
- `destination_slug` is set at publish time; if a trip's destination is edited after publishing, the slug could go stale — re-derive slug on every publish toggle to keep it current.
- Migration must be applied to Supabase before publish/browse function; routes degrade gracefully until then.
- New-table follow-ups from Slice 2 (user_id FKs) are unrelated and out of scope here.
