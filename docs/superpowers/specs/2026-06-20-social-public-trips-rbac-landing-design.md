# Slice 1 — Social/Public Trips Flow + Landing Fix + Verified-Only RBAC

**Date:** 2026-06-20
**Status:** Approved scope, pending spec review
**Branch:** feature/llm-response-improve

## Context

Wayflo has a social collaboration subsystem ("Tripmates / Open Trips") whose
backend is largely built but whose user-facing flow is broken or orphaned.
Concretely:

- **Open Trips (TripRooms):** full service layer (`createTripRoom`,
  `joinTripRoom`, `leaveTripRoom`, `getTripRoom`, `listTripRooms`,
  `listMyTripRooms`) and API routes (`app/api/social/rooms/*`) exist, but there
  is **no UI** to discover, create, open, or join a room. The community page
  (`app/dashboard/community/page.tsx`) has zero room references, and
  `app/rooms/[id]` does not exist even though routes reference rooms.
- **RBAC:** Didit identity verification plumbing exists
  (`services/didit.ts`, `services/social-verification.ts`, webhook +
  session/callback routes, 4 levels: `unverified | basic | trusted |
  high_trust`). But social mutations are not consistently gated behind
  verification, and there is no user-facing "verify to unlock" upsell.
- **Landing:** `app/page.tsx` is the live landing page (inline parallax hero
  with a word-reveal animation). The tagline **"Plan with more flow"** is not
  reliably visible — suspected stuck-at-opacity-0 / clipped word-reveal.
  `components/home/Hero.tsx` is dead/unused code.

This is the first of three slices. Slices 2 (presence verification + ratings)
and 3 (published itineraries + destination discovery) are out of scope here.

## Goals

1. A **trusted+** (Didit-verified) user can create an Open Trip and others can
   request/join it through a coherent, tested end-to-end flow.
2. **Unverified** users can browse social surfaces but hit a clear, non-dead-end
   "verify to unlock" upsell when attempting any gated action.
3. The landing tagline "Plan with more flow" renders reliably (incl.
   `prefers-reduced-motion`).
4. Social/community UI meets the existing Sunset/Adventure design system bar.

## Non-Goals

- Ratings, presence/geo verification, published itineraries, destination
  browse (later slices).
- Rewriting the room data model or the Didit integration.
- Changing the verification levels themselves.

## Decisions (from brainstorming)

- **RBAC scope:** Only *social mutations* are gated. Private trip planning stays
  open to everyone. Reads/browse of social surfaces stay open.
- **Verification bar:** `trusted` or `high_trust` (actual Didit identity
  confirmation) unlocks social actions. Reuse
  `isTrustedSocialVerificationLevel()`.
- **"Public" vocabulary:** Open Trip = a joinable `TripRoom` (this slice).
  Published Itinerary (read-only, browsable/ratable) is a *separate, later*
  concept.

## Architecture

### 1. RBAC gate (the spine)

**Server.** A single helper, `requireTrustedTraveler(userId)`, in a server-only
module (e.g. `services/social-verification.ts` or a new
`lib/social-guard.ts`). It loads the caller's verification level and returns the
profile when `trusted`/`high_trust`, otherwise signals denial. API routes
translate denial into `403 { error: 'verification_required', level: <current> }`.

Apply the gate to all social **mutations**:
- `POST app/api/social/rooms` (create)
- `POST app/api/social/rooms/[id]/join`, `.../leave`
- `app/api/social/requests` (send), `app/api/social/requests/[id]` (accept/decline)
- `app/api/social/messages` (already partially gated; align with the helper)
- wave routes (legacy; gate or leave to existing behavior — gate for consistency)

Leave **reads** ungated: `GET rooms`, `rooms/mine`, `listTravelers`,
`destinations`, profile reads.

**Client.** A `useVerificationGate()` hook exposing
`{ level, isVerified, requireVerified(action) }`, and a `<VerifyToUnlock>`
component (modal or inline banner) that explains the requirement and deep-links
to `startDiditVerification(returnTo)`. Any gated control either (a) is disabled
with the upsell on click, or (b) routes through `requireVerified`. A `403
verification_required` from the API also surfaces the upsell (defense in depth).

### 2. Open Trip create/join flow

New/changed UI, all wired to the existing service functions:

- **Discovery surface:** a list of Open Trips (`listTripRooms`,
  optionally filtered by destination) and "My Open Trips"
  (`listMyTripRooms`). Lives in the community area (new section or tab on
  `app/dashboard/community`), with loading / empty / error states.
- **Create Open Trip:** an entry point + form (destination required; title and
  travel month optional) calling `createTripRoom`. Gated by RBAC.
- **Open Trip detail page:** new route `app/rooms/[id]/page.tsx` rendering
  `getTripRoom` (title, destination, member list) with **Join** /
  **Leave** actions (`joinTripRoom`/`leaveTripRoom`) reflecting membership
  state. Handles already-joined, owner, not-found, and gated states.

State transitions to make correct and visible:
`browse → (verified) create | request/join → joined (leave available)`, with
idempotent join (`already_joined`) handled gracefully.

### 3. Landing fix

- Diagnose the word-reveal in `app/page.tsx`; ensure the final animation state
  is `opacity: 1` and the tagline is not clipped. Respect
  `prefers-reduced-motion` (render fully visible, no animation).
- Remove dead `components/home/Hero.tsx` (per the "no duplicate components"
  rule) after confirming it is unreferenced.

### 4. UI/UX pass

Apply the ui-ux-pro-max skill to the new/changed social surfaces and the create
flow, staying within the Sunset/Adventure tokens and `.bg-sunset` utilities (no
new hardcoded hex beyond what the system already uses). A "redesign" here means
real structure/interaction quality, not a recolor.

## Data Flow

```
Browse Open Trips (GET, ungated)
  → user clicks Create / Join
    → client useVerificationGate.requireVerified()
        ├─ not trusted+ → <VerifyToUnlock> → startDiditVerification()
        └─ trusted+ → POST rooms | POST rooms/[id]/join (server re-checks)
            → server requireTrustedTraveler()
                ├─ deny → 403 verification_required → client upsell
                └─ allow → mutate → updated room/membership → UI reflects state
```

## Error Handling

- API: `401` unauthenticated, `403 verification_required` ungated→gated,
  `404` room not found, `409`/idempotent for already-joined, `503` graceful
  degrade if a migration is unapplied (existing pattern).
- Client: every async surface has loading/empty/error states; the upsell is the
  designated terminal state for gated denials (never a dead end).

## Testing

- **Unit** (`playwright.unit.config.ts`):
  - `requireTrustedTraveler` / gate logic: trusted+ passes, others denied.
  - Room state helper: join idempotency, membership reflection, owner vs member.
- **E2E** (`playwright.config.ts`):
  - Verified user: create Open Trip → appears in list → open detail → another
    verified user joins → membership reflected → leave.
  - Unverified user: browse works; create/join triggers `<VerifyToUnlock>` and
    deep-links to Didit (no dead end).
  - Landing: "Plan with more flow" is visible (and visible under reduced
    motion).
- **Gates:** `npm run typecheck`, `npm run lint`, `npm run test:unit`,
  `npm run test:e2e`, `npm run build` all green (per Wayflo QA commands).

## Risks / Open Items

- Some room/social tables may depend on an unapplied Supabase migration; routes
  must degrade gracefully (503/empty) rather than crash, matching existing
  behavior. Flag to user if a migration must be applied to exercise e2e.
- Legacy "wave" routes overlap with "requests"; this slice gates them for
  consistency but does not remove them (future cleanup).
```
