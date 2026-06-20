# Presence Verification + Post-Trip Ratings — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Let a Didit-verified user who physically visited their destination during the trip window rate the itinerary 1–5 stars (+ optional review), with presence proven by a single consent-gated geolocation ping.

**Architecture:** Three units build in order — (A) add real trip dates + destination coords to `trips`; (B) a consent-gated, one-time geolocation presence check stored in `trip_presence_checks`; (C) a `canRateTrip` gate (Didit trusted+ ∧ presence ∧ trip ended) backing a `trip_ratings` table and an interactive `RatingCard`. Pure logic lives in small unit-tested services (`services/presence.ts`, `services/ratings.ts`); routes and UI are thin.

**Tech Stack:** Next.js 15 App Router, React 19, TypeScript, Supabase JS, Playwright (unit + e2e), Tailwind (Sunset/Adventure tokens), browser Geolocation API.

## Global Constraints

- Reuse existing infra, do NOT reimplement: `haversineDistanceKm(left, right)` from `services/itinerary.ts` (args are `{ latitude: number; longitude: number }`); destination geocoding via `GET /api/places?address=<dest>` → `{ lat, lon }`; the Didit gate `checkTrustedTraveler(userId)` and `verificationRequiredResponse` from `services/social-guard.ts` (Slice 1); `getAuthenticatedUser(request)` from `services/supabase-auth`; `supabase` from `services/supabase`.
- Presence radius is exactly `50` km (`PRESENCE_RADIUS_KM = 50`).
- Rating gate order is exactly: verification → presence → trip-ended. Failure reasons are the exact strings `'verification_required' | 'presence_required' | 'trip_not_ended'`.
- Rating: stars integer 1–5 (required), review text optional, one row per (`trip_id`,`user_id`), editable.
- Verification bar = Didit trusted/high_trust via `checkTrustedTraveler` (same as Slice 1).
- Geolocation: at most ONE `getCurrentPosition` per app-open; denial/timeout/unavailable are silent and non-blocking; never call geolocation without active location consent.
- **UX mandate (user directive):** every new/changed surface must be effortless and interactive — one-tap actions, inline-editable stars, optimistic feedback, friendly explanatory states (never raw errors). Run a ui-ux-pro-max pass on every component this slice creates or touches and replace any low-quality "AI slop" UI encountered on those surfaces. EXCEPTION: do NOT restyle the landing page (`app/page.tsx`).
- Migration file names are date-prefixed: `supabase/migrations/YYYYMMDD_<name>.sql`. Routes must degrade gracefully (return empty/503, not crash) if the migration is unapplied.
- Stay within Sunset/Adventure design tokens already used in sibling components; no new hardcoded hex.
- QA gates: `npm run typecheck`, `npm run lint`, `npm run test:unit`, `npm run test:e2e`, `npm run build`.

---

### Task 1: Schema migration + Trip type + date capture on create

**Files:**
- Create: `supabase/migrations/20260620_presence_ratings.sql`
- Modify: `lib/supabase-trips.ts` (the `Trip` interface, ~lines 15-26)
- Modify: `services/trip-writer.ts` (`createTripForUser` input + insert)
- Test: `tests/unit/trip-dates-type.test.ts`

**Interfaces:**
- Produces: `Trip` gains `trip_start_date: string | null`, `trip_end_date: string | null`, `dest_lat: number | null`, `dest_lng: number | null`. `createTripForUser` input gains optional `tripStartDate?: string | null`, `tripEndDate?: string | null`.
- Produces (DB): tables `trip_presence_checks`, `trip_ratings`; columns on `trips` (dates+coords) and `traveler_profiles` (`location_consent_at`, `location_consent_revoked_at`). Later tasks rely on these.

- [ ] **Step 1: Write the migration**

```sql
-- supabase/migrations/20260620_presence_ratings.sql
-- Trip dates + destination coordinates
alter table public.trips add column if not exists trip_start_date date;
alter table public.trips add column if not exists trip_end_date date;
alter table public.trips add column if not exists dest_lat double precision;
alter table public.trips add column if not exists dest_lng double precision;

-- Location consent on traveler profiles
alter table public.traveler_profiles add column if not exists location_consent_at timestamptz;
alter table public.traveler_profiles add column if not exists location_consent_revoked_at timestamptz;

-- Presence checks: one successful proof per (trip, user)
create table if not exists public.trip_presence_checks (
  id uuid primary key default gen_random_uuid(),
  trip_id text not null references public.trips(id) on delete cascade,
  user_id uuid not null,
  verified_at timestamptz not null default now(),
  lat double precision not null,
  lng double precision not null,
  distance_km double precision not null,
  unique (trip_id, user_id)
);
create index if not exists trip_presence_checks_user on public.trip_presence_checks(user_id);

-- Ratings: one per (trip, user), editable
create table if not exists public.trip_ratings (
  id uuid primary key default gen_random_uuid(),
  trip_id text not null references public.trips(id) on delete cascade,
  user_id uuid not null,
  stars int not null check (stars between 1 and 5),
  review text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (trip_id, user_id)
);
create index if not exists trip_ratings_trip on public.trip_ratings(trip_id);
```

- [ ] **Step 2: Write the failing test (Trip type carries the new fields)**

```ts
// tests/unit/trip-dates-type.test.ts
import { test, expect } from '@playwright/test';
import type { Trip } from '../../lib/supabase-trips';

test('Trip type includes date and coordinate fields', () => {
  const t: Pick<Trip, 'trip_start_date' | 'trip_end_date' | 'dest_lat' | 'dest_lng'> = {
    trip_start_date: '2026-06-21',
    trip_end_date: '2026-06-25',
    dest_lat: 19.07,
    dest_lng: 72.87,
  };
  expect(t.trip_start_date).toBe('2026-06-21');
  expect(t.dest_lat).toBeCloseTo(19.07);
});
```

- [ ] **Step 3: Run test to verify it fails**

Run: `npm run test:unit -- tests/unit/trip-dates-type.test.ts`
Expected: FAIL (typecheck error — properties don't exist on `Trip`).

- [ ] **Step 4: Extend the `Trip` interface**

In `lib/supabase-trips.ts`, add to the `Trip` interface (after `updated_at: string`):

```ts
  trip_start_date?: string | null
  trip_end_date?: string | null
  dest_lat?: number | null
  dest_lng?: number | null
```

- [ ] **Step 5: Thread dates through `createTripForUser`**

In `services/trip-writer.ts`, add to the input object type: `tripStartDate?: string | null; tripEndDate?: string | null;` and add to the `.insert({ ... })` object:

```ts
      trip_start_date: input.tripStartDate ?? null,
      trip_end_date: input.tripEndDate ?? null,
```

- [ ] **Step 6: Run test + typecheck**

Run: `npm run test:unit -- tests/unit/trip-dates-type.test.ts && npm run typecheck`
Expected: PASS, zero typecheck errors.

- [ ] **Step 7: Commit**

```bash
git add supabase/migrations/20260620_presence_ratings.sql lib/supabase-trips.ts services/trip-writer.ts tests/unit/trip-dates-type.test.ts
git commit -m "feat(trips): add trip dates + dest coords schema and type; capture dates on create"
```

---

### Task 2: Edit/add trip travel dates (API + client + trip-page entry)

**Files:**
- Modify: `app/api/trips/[id]/route.ts` (PATCH handler, ~line 114-175 — extend allowed `updates`)
- Modify: `lib/supabase-trips.ts` (add an `updateTripDates` client helper)
- Modify: `app/trip/[id]/page.tsx` (render an "Add your travel dates" prompt when dates are missing)
- Create: `components/trip/TripDatesEditor.tsx`
- Test: covered by e2e in Task 9; this task's gate is typecheck + lint + build.

**Interfaces:**
- Consumes: `Trip` (Task 1).
- Produces: `updateTripDates(tripId, { trip_start_date, trip_end_date }): Promise<Trip>` in `lib/supabase-trips.ts`; `<TripDatesEditor trip onSaved />`.

- [ ] **Step 1: Allow date fields in the trips PATCH**

In `app/api/trips/[id]/route.ts`, find where the PATCH builds its `updates` object from the request body. Add `trip_start_date` and `trip_end_date` to the permitted fields (mirroring how existing fields like `destination`/`itinerary` are whitelisted). Validate that if both are present, `trip_end_date >= trip_start_date`; otherwise return `400 { error: 'end date must be on or after start date' }`. Do not widen to arbitrary columns.

- [ ] **Step 2: Add the client helper**

In `lib/supabase-trips.ts`, add:

```ts
export async function updateTripDates(
  tripId: string,
  dates: { trip_start_date: string; trip_end_date: string }
): Promise<Trip> {
  const res = await fetchTripApi<{ trip: Trip }>(`/api/trips/${tripId}`, {
    method: 'PATCH',
    body: JSON.stringify(dates),
  })
  return res.trip
}
```

> Confirm the PATCH response shape (`{ trip }` vs the raw trip) by reading the existing PATCH return in `app/api/trips/[id]/route.ts`; adapt the unwrap to match.

- [ ] **Step 3: Build `TripDatesEditor`**

```tsx
// components/trip/TripDatesEditor.tsx
'use client';

import { useState } from 'react';
import { CalendarDays } from 'lucide-react';
import { updateTripDates, type Trip } from '@/lib/supabase-trips';

export function TripDatesEditor({ trip, onSaved }: { trip: Trip; onSaved: (t: Trip) => void }) {
  const [start, setStart] = useState(trip.trip_start_date ?? '');
  const [end, setEnd] = useState(trip.trip_end_date ?? '');
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  async function save() {
    if (!start || !end) { setError('Pick both dates'); return; }
    if (end < start) { setError('End date must be after start'); return; }
    setSaving(true); setError('');
    try {
      const updated = await updateTripDates(trip.id, { trip_start_date: start, trip_end_date: end });
      onSaved(updated);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Could not save dates');
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="rounded-2xl border border-[#E4E2F0] bg-white p-4">
      <div className="flex items-center gap-2 text-sm font-semibold text-[#3F3D56]">
        <CalendarDays className="h-4 w-4 text-[#6C63FF]" /> Add your travel dates
      </div>
      <p className="mt-1 text-xs text-[#6F6C82]">We use these to confirm you visited, so you can rate the trip afterward.</p>
      <div className="mt-3 flex flex-wrap items-end gap-3">
        <label className="text-xs font-medium text-[#53506A]">Start
          <input type="date" value={start} onChange={e => setStart(e.target.value)}
            className="mt-1 block rounded-xl border border-slate-200 px-3 py-2 text-sm" />
        </label>
        <label className="text-xs font-medium text-[#53506A]">End
          <input type="date" value={end} onChange={e => setEnd(e.target.value)}
            className="mt-1 block rounded-xl border border-slate-200 px-3 py-2 text-sm" />
        </label>
        <button onClick={save} disabled={saving}
          className="rounded-xl bg-[#6C63FF] px-4 py-2 text-sm font-semibold text-white disabled:opacity-60">
          {saving ? 'Saving…' : 'Save dates'}
        </button>
      </div>
      {error && <p className="mt-2 text-sm text-[#C14D72]">{error}</p>}
    </div>
  );
}
```

- [ ] **Step 4: Mount it on the trip page when dates are missing**

In `app/trip/[id]/page.tsx`, where the trip is rendered, conditionally show `<TripDatesEditor trip={trip} onSaved={setTrip} />` when `!trip.trip_start_date || !trip.trip_end_date` (use the page's existing trip state setter; if the page stores trip in state, update it on save). Place it near the trip header.

- [ ] **Step 5: Typecheck + lint + build**

Run: `npm run typecheck && npx eslint app/api/trips/[id]/route.ts lib/supabase-trips.ts components/trip/TripDatesEditor.tsx app/trip/[id]/page.tsx && npm run build`
Expected: zero errors; build succeeds (`rm -rf .next` first if a stale-cache MODULE_NOT_FOUND appears).

- [ ] **Step 6: Commit**

```bash
git add app/api/trips/[id]/route.ts lib/supabase-trips.ts components/trip/TripDatesEditor.tsx app/trip/[id]/page.tsx
git commit -m "feat(trips): let users add/edit travel dates to enable presence + rating"
```

---

### Task 3: `services/presence.ts` pure helpers (TDD)

**Files:**
- Create: `services/presence.ts`
- Test: `tests/unit/presence.test.ts`

**Interfaces:**
- Consumes: `haversineDistanceKm` from `services/itinerary.ts`.
- Produces:
  - `const PRESENCE_RADIUS_KM = 50`
  - `function isWithinTripWindow(today: string, start: string | null, end: string | null): boolean` — true iff start & end set and `start <= today <= end` (ISO `YYYY-MM-DD` lexical compare).
  - `function evaluatePresence(input: { destLat: number; destLng: number; lat: number; lng: number }): { withinRadius: boolean; distanceKm: number }`.

- [ ] **Step 1: Write the failing test**

```ts
// tests/unit/presence.test.ts
import { test, expect } from '@playwright/test';
import { isWithinTripWindow, evaluatePresence, PRESENCE_RADIUS_KM } from '../../services/presence';

test('radius constant is 50', () => {
  expect(PRESENCE_RADIUS_KM).toBe(50);
});

test('within trip window inclusive', () => {
  expect(isWithinTripWindow('2026-06-22', '2026-06-21', '2026-06-25')).toBe(true);
  expect(isWithinTripWindow('2026-06-21', '2026-06-21', '2026-06-25')).toBe(true);
  expect(isWithinTripWindow('2026-06-26', '2026-06-21', '2026-06-25')).toBe(false);
  expect(isWithinTripWindow('2026-06-22', null, '2026-06-25')).toBe(false);
});

test('evaluatePresence flags within/outside 50km', () => {
  // same point → 0 km
  const here = evaluatePresence({ destLat: 19.07, destLng: 72.87, lat: 19.07, lng: 72.87 });
  expect(here.withinRadius).toBe(true);
  expect(here.distanceKm).toBeLessThan(1);
  // ~ Delhi vs Mumbai → ~1150 km → outside
  const far = evaluatePresence({ destLat: 19.07, destLng: 72.87, lat: 28.61, lng: 77.21 });
  expect(far.withinRadius).toBe(false);
  expect(far.distanceKm).toBeGreaterThan(PRESENCE_RADIUS_KM);
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npm run test:unit -- tests/unit/presence.test.ts`
Expected: FAIL — module not found.

- [ ] **Step 3: Implement**

```ts
// services/presence.ts
import { haversineDistanceKm } from '@/services/itinerary';

export const PRESENCE_RADIUS_KM = 50;

/** ISO YYYY-MM-DD lexical compare; both bounds required. */
export function isWithinTripWindow(today: string, start: string | null, end: string | null): boolean {
  if (!start || !end) return false;
  return start <= today && today <= end;
}

export function evaluatePresence(input: {
  destLat: number;
  destLng: number;
  lat: number;
  lng: number;
}): { withinRadius: boolean; distanceKm: number } {
  const distanceKm = haversineDistanceKm(
    { latitude: input.destLat, longitude: input.destLng },
    { latitude: input.lat, longitude: input.lng }
  );
  return { withinRadius: distanceKm <= PRESENCE_RADIUS_KM, distanceKm };
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `npm run test:unit -- tests/unit/presence.test.ts`
Expected: PASS (3 tests).

- [ ] **Step 5: Commit**

```bash
git add services/presence.ts tests/unit/presence.test.ts
git commit -m "feat(presence): pure trip-window + distance helpers"
```

---

### Task 4: Presence API — record presence + status

**Files:**
- Create: `app/api/trips/[id]/presence/route.ts`
- Create: `app/api/trips/presence-status/route.ts`
- Test: covered by e2e in Task 9; gate is typecheck + lint.

**Interfaces:**
- Consumes: `getAuthenticatedUser`, `supabase`, `evaluatePresence`, `isWithinTripWindow`, `PRESENCE_RADIUS_KM` (Task 3).
- Produces:
  - `POST /api/trips/[id]/presence` body `{ lat:number, lng:number }` → `{ verified: boolean, distance_km?: number, reason?: 'out_of_window'|'too_far'|'no_destination_coords' }`.
  - `GET /api/trips/presence-status` → `{ trips: Array<{ id, trip_start_date, trip_end_date, verified: boolean }>, consent: boolean }`.

- [ ] **Step 1: Implement the presence POST**

```ts
// app/api/trips/[id]/presence/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { supabase } from '@/services/supabase';
import { getAuthenticatedUser } from '@/services/supabase-auth';
import { evaluatePresence, isWithinTripWindow } from '@/services/presence';

export async function POST(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { user, error } = await getAuthenticatedUser(request);
  if (error || !user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const { id } = await params;
  const body = (await request.json().catch(() => ({}))) as { lat?: number; lng?: number };
  if (typeof body.lat !== 'number' || typeof body.lng !== 'number') {
    return NextResponse.json({ error: 'lat and lng required' }, { status: 400 });
  }

  const { data: trip } = await supabase
    .from('trips')
    .select('id, destination, dest_lat, dest_lng, trip_start_date, trip_end_date')
    .eq('id', id).eq('user_id', user.id).maybeSingle();
  if (!trip) return NextResponse.json({ error: 'Trip not found' }, { status: 404 });

  const today = new Date().toISOString().slice(0, 10);
  if (!isWithinTripWindow(today, trip.trip_start_date, trip.trip_end_date)) {
    return NextResponse.json({ verified: false, reason: 'out_of_window' });
  }

  // Ensure destination coords (geocode once + persist).
  let destLat = trip.dest_lat as number | null;
  let destLng = trip.dest_lng as number | null;
  if (destLat == null || destLng == null) {
    try {
      const base = process.env.NEXT_PUBLIC_APP_URL || 'http://127.0.0.1:3000';
      const geo = await fetch(`${base}/api/places?address=${encodeURIComponent(trip.destination)}`, { cache: 'no-store' });
      const g = (await geo.json().catch(() => null)) as { lat?: number; lon?: number } | null;
      if (g && typeof g.lat === 'number' && typeof g.lon === 'number') {
        destLat = g.lat; destLng = g.lon;
        await supabase.from('trips').update({ dest_lat: destLat, dest_lng: destLng }).eq('id', id);
      }
    } catch { /* fall through to no-coords */ }
  }
  if (destLat == null || destLng == null) {
    return NextResponse.json({ verified: false, reason: 'no_destination_coords' });
  }

  const { withinRadius, distanceKm } = evaluatePresence({ destLat, destLng, lat: body.lat, lng: body.lng });
  if (!withinRadius) return NextResponse.json({ verified: false, distance_km: distanceKm, reason: 'too_far' });

  await supabase.from('trip_presence_checks').upsert(
    { trip_id: id, user_id: user.id, lat: body.lat, lng: body.lng, distance_km: distanceKm, verified_at: new Date().toISOString() },
    { onConflict: 'trip_id,user_id' }
  );
  return NextResponse.json({ verified: true, distance_km: distanceKm });
}
```

- [ ] **Step 2: Implement the presence-status GET**

```ts
// app/api/trips/presence-status/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { supabase } from '@/services/supabase';
import { getAuthenticatedUser } from '@/services/supabase-auth';

export async function GET(request: NextRequest) {
  const { user, error } = await getAuthenticatedUser(request);
  if (error || !user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const { data: trips } = await supabase
    .from('trips')
    .select('id, trip_start_date, trip_end_date')
    .eq('user_id', user.id);

  const tripRows = trips ?? [];
  const ids = tripRows.map(t => t.id);
  const { data: checks } = ids.length
    ? await supabase.from('trip_presence_checks').select('trip_id').eq('user_id', user.id).in('trip_id', ids)
    : { data: [] };
  const verified = new Set((checks ?? []).map(c => c.trip_id));

  const { data: profile } = await supabase
    .from('traveler_profiles')
    .select('location_consent_at, location_consent_revoked_at')
    .eq('id', user.id).maybeSingle();
  const consent = !!profile?.location_consent_at &&
    (!profile.location_consent_revoked_at || profile.location_consent_revoked_at < profile.location_consent_at);

  return NextResponse.json({
    trips: tripRows.map(t => ({ ...t, verified: verified.has(t.id) })),
    consent,
  });
}
```

- [ ] **Step 3: Typecheck + lint**

Run: `npm run typecheck && npx eslint "app/api/trips/[id]/presence/route.ts" "app/api/trips/presence-status/route.ts"`
Expected: zero errors.

- [ ] **Step 4: Commit**

```bash
git add "app/api/trips/[id]/presence/route.ts" "app/api/trips/presence-status/route.ts"
git commit -m "feat(presence): record presence check + presence-status endpoints"
```

---

### Task 5: Consent + client presence wiring

**Files:**
- Create: `app/api/profile/location-consent/route.ts`
- Create: `components/trip/LocationConsentPrompt.tsx`
- Create: `hooks/usePresenceCheck.ts`
- Modify: `app/dashboard/page.tsx` (mount the presence runner)
- Modify: `components/social/SocialProfileSettings.tsx` (add a revoke toggle)
- Test: covered by e2e in Task 9.

**Interfaces:**
- Consumes: presence-status + presence POST (Task 4).
- Produces:
  - `POST /api/profile/location-consent` body `{ grant: boolean }` → sets `location_consent_at` (grant) or `location_consent_revoked_at` (revoke) on `traveler_profiles`; returns `{ consent: boolean }`.
  - `usePresenceCheck()` — runs the one-shot geolocation flow on mount; exposes `{ needsConsent: boolean, grantConsent: () => Promise<void> }`.
  - `<LocationConsentPrompt open onGrant onDismiss />`.

- [ ] **Step 1: Implement the consent route**

```ts
// app/api/profile/location-consent/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { supabase } from '@/services/supabase';
import { getAuthenticatedUser } from '@/services/supabase-auth';

export async function POST(request: NextRequest) {
  const { user, error } = await getAuthenticatedUser(request);
  if (error || !user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  const { grant } = (await request.json().catch(() => ({}))) as { grant?: boolean };
  const now = new Date().toISOString();
  const patch = grant ? { location_consent_at: now, location_consent_revoked_at: null } : { location_consent_revoked_at: now };
  const { error: upErr } = await supabase.from('traveler_profiles').update(patch).eq('id', user.id);
  if (upErr) return NextResponse.json({ error: upErr.message }, { status: 500 });
  return NextResponse.json({ consent: !!grant });
}
```

- [ ] **Step 2: Implement the hook**

```ts
// hooks/usePresenceCheck.ts
'use client';

import { useCallback, useEffect, useState } from 'react';
import { getSupabaseBrowser } from '@/services/supabase-browser';

async function authedFetch(path: string, init?: RequestInit) {
  const { data } = await getSupabaseBrowser().auth.getSession();
  const token = data.session?.access_token;
  return fetch(path, {
    cache: 'no-store',
    ...init,
    headers: { 'Content-Type': 'application/json', ...(token ? { Authorization: `Bearer ${token}` } : {}), ...(init?.headers || {}) },
  });
}

export function usePresenceCheck() {
  const [needsConsent, setNeedsConsent] = useState(false);

  const runForTrip = useCallback((tripId: string) => {
    if (!('geolocation' in navigator)) return;
    navigator.geolocation.getCurrentPosition(
      pos => {
        void authedFetch(`/api/trips/${tripId}/presence`, {
          method: 'POST',
          body: JSON.stringify({ lat: pos.coords.latitude, lng: pos.coords.longitude }),
        });
      },
      () => { /* denied/unavailable/timeout — silent */ },
      { timeout: 10000, maximumAge: 60000 }
    );
  }, []);

  useEffect(() => {
    let cancelled = false;
    authedFetch('/api/trips/presence-status')
      .then(r => r.ok ? r.json() : null)
      .then((data: { trips: Array<{ id: string; trip_start_date: string | null; trip_end_date: string | null; verified: boolean }>; consent: boolean } | null) => {
        if (cancelled || !data) return;
        const today = new Date().toISOString().slice(0, 10);
        const target = data.trips.find(t => !t.verified && t.trip_start_date && t.trip_end_date && t.trip_start_date <= today && today <= t.trip_end_date);
        if (!target) return;
        if (!data.consent) { setNeedsConsent(true); return; }
        runForTrip(target.id);
      })
      .catch(() => {});
    return () => { cancelled = true; };
  }, [runForTrip]);

  const grantConsent = useCallback(async () => {
    await authedFetch('/api/profile/location-consent', { method: 'POST', body: JSON.stringify({ grant: true }) });
    setNeedsConsent(false);
    // re-run after consent
    const r = await authedFetch('/api/trips/presence-status');
    const data = r.ok ? await r.json() : null;
    if (!data) return;
    const today = new Date().toISOString().slice(0, 10);
    const target = data.trips.find((t: { id: string; trip_start_date: string | null; trip_end_date: string | null; verified: boolean }) =>
      !t.verified && t.trip_start_date && t.trip_end_date && t.trip_start_date <= today && today <= t.trip_end_date);
    if (target) runForTrip(target.id);
  }, [runForTrip]);

  return { needsConsent, grantConsent };
}
```

- [ ] **Step 3: Implement the consent prompt**

```tsx
// components/trip/LocationConsentPrompt.tsx
'use client';

import { MapPin, X } from 'lucide-react';

export function LocationConsentPrompt({ open, onGrant, onDismiss }: { open: boolean; onGrant: () => void; onDismiss: () => void }) {
  if (!open) return null;
  return (
    <div className="fixed inset-x-4 bottom-4 z-50 mx-auto max-w-md rounded-3xl border border-[#E4E2F0] bg-white p-5 shadow-2xl sm:inset-x-auto sm:right-6">
      <div className="flex items-start justify-between">
        <div className="flex h-10 w-10 items-center justify-center rounded-2xl bg-[#EEEDFE] text-[#6C63FF]"><MapPin className="h-5 w-5" /></div>
        <button onClick={onDismiss} aria-label="Dismiss" className="rounded-lg p-1 text-slate-400 hover:bg-slate-100"><X className="h-4 w-4" /></button>
      </div>
      <h3 className="mt-3 text-sm font-semibold text-[#3F3D56]">Confirm you're on your trip?</h3>
      <p className="mt-1 text-xs leading-5 text-[#6F6C82]">We check your location just once during your trip dates so you can rate it afterward. We store only the coordinates and distance — nothing else.</p>
      <div className="mt-4 flex gap-2">
        <button onClick={onDismiss} className="flex-1 rounded-xl border border-slate-200 px-3 py-2 text-xs font-semibold text-[#6F6C82]">Not now</button>
        <button onClick={onGrant} className="flex-1 rounded-xl bg-[#6C63FF] px-3 py-2 text-xs font-semibold text-white">Allow location</button>
      </div>
    </div>
  );
}
```

- [ ] **Step 4: Wire into the dashboard**

In `app/dashboard/page.tsx`, call the hook and render the prompt:

```tsx
// inside the dashboard client component body:
const { needsConsent, grantConsent } = usePresenceCheck();
// ...in JSX:
<LocationConsentPrompt open={needsConsent} onGrant={grantConsent} onDismiss={() => { /* hide for this session */ }} />
```
(Import `usePresenceCheck` and `LocationConsentPrompt`. If `app/dashboard/page.tsx` is a server component, mount the hook+prompt inside an existing client child instead; check the file's `'use client'` directive first and place it in a client boundary.)

- [ ] **Step 5: Add a revoke toggle in profile settings**

In `components/social/SocialProfileSettings.tsx`, add a small "Location check" row with a toggle that POSTs `/api/profile/location-consent` with `{ grant: false }` to revoke (and `{ grant: true }` to re-enable). Reflect current state from the profile. Keep it consistent with the file's existing setting-row styling.

- [ ] **Step 6: Typecheck + lint + build**

Run: `npm run typecheck && npx eslint app/api/profile/location-consent/route.ts components/trip/LocationConsentPrompt.tsx hooks/usePresenceCheck.ts app/dashboard/page.tsx components/social/SocialProfileSettings.tsx && npm run build`
Expected: zero errors; build succeeds.

- [ ] **Step 7: Commit**

```bash
git add app/api/profile/location-consent/route.ts components/trip/LocationConsentPrompt.tsx hooks/usePresenceCheck.ts app/dashboard/page.tsx components/social/SocialProfileSettings.tsx
git commit -m "feat(presence): consent prompt + one-shot geolocation runner on dashboard"
```

---

### Task 6: `services/ratings.ts` gate + aggregate (TDD)

**Files:**
- Create: `services/ratings.ts`
- Test: `tests/unit/ratings.test.ts`

**Interfaces:**
- Produces:
  - `type RatingDenyReason = 'verification_required' | 'presence_required' | 'trip_not_ended'`
  - `function canRateTrip(input: { isVerified: boolean; hasPresence: boolean; tripEndDate: string | null; today: string }): { ok: true } | { ok: false; reason: RatingDenyReason }` — order: verification → presence → ended (`tripEndDate` must be set and `< today`).
  - `function summarizeRatings(rows: Array<{ stars: number }>): { average: number; count: number }` — average rounded to 1 decimal; `{average:0,count:0}` for empty.

- [ ] **Step 1: Write the failing test**

```ts
// tests/unit/ratings.test.ts
import { test, expect } from '@playwright/test';
import { canRateTrip, summarizeRatings } from '../../services/ratings';

const ended = { tripEndDate: '2026-06-19', today: '2026-06-20' };

test('verification checked first', () => {
  expect(canRateTrip({ isVerified: false, hasPresence: false, ...ended })).toEqual({ ok: false, reason: 'verification_required' });
});
test('then presence', () => {
  expect(canRateTrip({ isVerified: true, hasPresence: false, ...ended })).toEqual({ ok: false, reason: 'presence_required' });
});
test('then trip must have ended', () => {
  expect(canRateTrip({ isVerified: true, hasPresence: true, tripEndDate: '2026-06-25', today: '2026-06-20' })).toEqual({ ok: false, reason: 'trip_not_ended' });
  expect(canRateTrip({ isVerified: true, hasPresence: true, tripEndDate: null, today: '2026-06-20' })).toEqual({ ok: false, reason: 'trip_not_ended' });
});
test('all conditions pass', () => {
  expect(canRateTrip({ isVerified: true, hasPresence: true, ...ended })).toEqual({ ok: true });
});
test('summarize', () => {
  expect(summarizeRatings([{ stars: 5 }, { stars: 4 }, { stars: 4 }])).toEqual({ average: 4.3, count: 3 });
  expect(summarizeRatings([])).toEqual({ average: 0, count: 0 });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npm run test:unit -- tests/unit/ratings.test.ts`
Expected: FAIL — module not found.

- [ ] **Step 3: Implement**

```ts
// services/ratings.ts
export type RatingDenyReason = 'verification_required' | 'presence_required' | 'trip_not_ended';

export function canRateTrip(input: {
  isVerified: boolean;
  hasPresence: boolean;
  tripEndDate: string | null;
  today: string;
}): { ok: true } | { ok: false; reason: RatingDenyReason } {
  if (!input.isVerified) return { ok: false, reason: 'verification_required' };
  if (!input.hasPresence) return { ok: false, reason: 'presence_required' };
  if (!input.tripEndDate || !(input.tripEndDate < input.today)) return { ok: false, reason: 'trip_not_ended' };
  return { ok: true };
}

export function summarizeRatings(rows: Array<{ stars: number }>): { average: number; count: number } {
  if (rows.length === 0) return { average: 0, count: 0 };
  const sum = rows.reduce((acc, r) => acc + r.stars, 0);
  return { average: Math.round((sum / rows.length) * 10) / 10, count: rows.length };
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `npm run test:unit -- tests/unit/ratings.test.ts`
Expected: PASS (5 tests).

- [ ] **Step 5: Commit**

```bash
git add services/ratings.ts tests/unit/ratings.test.ts
git commit -m "feat(ratings): canRateTrip gate + summarizeRatings (pure)"
```

---

### Task 7: Rating API

**Files:**
- Create: `app/api/trips/[id]/rating/route.ts`
- Test: covered by e2e in Task 9; gate is typecheck + lint.

**Interfaces:**
- Consumes: `getAuthenticatedUser`, `supabase`, `checkTrustedTraveler` (Slice 1), `canRateTrip`, `summarizeRatings` (Task 6).
- Produces:
  - `GET /api/trips/[id]/rating` → `{ mine: { stars, review } | null, aggregate: { average, count }, eligibility: { ok: boolean, reason?: RatingDenyReason } }`.
  - `POST/PATCH /api/trips/[id]/rating` body `{ stars:number, review?:string }` → on success the saved rating; on gate failure `403 { error: <reason> }`; invalid stars `400`.

- [ ] **Step 1: Implement the route**

```ts
// app/api/trips/[id]/rating/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { supabase } from '@/services/supabase';
import { getAuthenticatedUser } from '@/services/supabase-auth';
import { checkTrustedTraveler } from '@/services/social-guard';
import { canRateTrip, summarizeRatings } from '@/services/ratings';

async function eligibility(userId: string, tripId: string) {
  const today = new Date().toISOString().slice(0, 10);
  const [{ data: trip }, guard, { data: presence }] = await Promise.all([
    supabase.from('trips').select('trip_end_date').eq('id', tripId).eq('user_id', userId).maybeSingle(),
    checkTrustedTraveler(userId),
    supabase.from('trip_presence_checks').select('id').eq('trip_id', tripId).eq('user_id', userId).maybeSingle(),
  ]);
  if (!trip) return { trip: null as null, result: { ok: false as const, reason: 'trip_not_ended' as const } };
  return {
    trip,
    result: canRateTrip({ isVerified: guard.ok, hasPresence: !!presence, tripEndDate: trip.trip_end_date, today }),
  };
}

export async function GET(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { user, error } = await getAuthenticatedUser(request);
  if (error || !user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  const { id } = await params;
  const [{ data: mine }, { data: all }, elig] = await Promise.all([
    supabase.from('trip_ratings').select('stars, review').eq('trip_id', id).eq('user_id', user.id).maybeSingle(),
    supabase.from('trip_ratings').select('stars').eq('trip_id', id),
    eligibility(user.id, id),
  ]);
  return NextResponse.json({
    mine: mine ?? null,
    aggregate: summarizeRatings(all ?? []),
    eligibility: elig.result,
  });
}

async function upsertRating(request: NextRequest, id: string) {
  const { user, error } = await getAuthenticatedUser(request);
  if (error || !user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  const body = (await request.json().catch(() => ({}))) as { stars?: number; review?: string };
  if (typeof body.stars !== 'number' || body.stars < 1 || body.stars > 5 || !Number.isInteger(body.stars)) {
    return NextResponse.json({ error: 'stars must be an integer 1–5' }, { status: 400 });
  }
  const elig = await eligibility(user.id, id);
  if (!elig.result.ok) return NextResponse.json({ error: elig.result.reason }, { status: 403 });
  const now = new Date().toISOString();
  const { data, error: upErr } = await supabase.from('trip_ratings').upsert(
    { trip_id: id, user_id: user.id, stars: body.stars, review: body.review ?? null, updated_at: now },
    { onConflict: 'trip_id,user_id' }
  ).select('stars, review').single();
  if (upErr) return NextResponse.json({ error: upErr.message }, { status: 500 });
  return NextResponse.json(data);
}

export async function POST(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  return upsertRating(request, id);
}
export async function PATCH(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  return upsertRating(request, id);
}
```

- [ ] **Step 2: Typecheck + lint**

Run: `npm run typecheck && npx eslint "app/api/trips/[id]/rating/route.ts"`
Expected: zero errors.

- [ ] **Step 3: Commit**

```bash
git add "app/api/trips/[id]/rating/route.ts"
git commit -m "feat(ratings): rating GET + POST/PATCH with verification∧presence∧ended gate"
```

---

### Task 8: `RatingCard` UI + trip page integration

**Files:**
- Create: `components/trip/RatingCard.tsx`
- Create: `lib/ratings-client.ts` (thin client fetchers)
- Modify: `app/trip/[id]/page.tsx` (render `<RatingCard tripId destination />`)
- Test: covered by e2e in Task 9.

**Interfaces:**
- Consumes: rating API (Task 7); `VerifyToUnlock` from Slice 1.
- Produces: `<RatingCard tripId={string} destination={string} />`.

- [ ] **Step 1: Client fetchers**

```ts
// lib/ratings-client.ts
import { getSupabaseBrowser } from '@/services/supabase-browser';

async function authed(path: string, init?: RequestInit) {
  const { data } = await getSupabaseBrowser().auth.getSession();
  const token = data.session?.access_token;
  const res = await fetch(path, {
    cache: 'no-store', ...init,
    headers: { 'Content-Type': 'application/json', ...(token ? { Authorization: `Bearer ${token}` } : {}), ...(init?.headers || {}) },
  });
  const body = await res.json().catch(() => null);
  if (!res.ok) throw Object.assign(new Error((body?.error as string) ?? 'Rating error'), { code: body?.error, status: res.status });
  return body;
}

export type RatingEligibility = { ok: boolean; reason?: 'verification_required' | 'presence_required' | 'trip_not_ended' };
export type RatingState = { mine: { stars: number; review: string | null } | null; aggregate: { average: number; count: number }; eligibility: RatingEligibility };

export const getRating = (tripId: string): Promise<RatingState> => authed(`/api/trips/${tripId}/rating`);
export const submitRating = (tripId: string, stars: number, review?: string) =>
  authed(`/api/trips/${tripId}/rating`, { method: 'POST', body: JSON.stringify({ stars, review }) });
```

- [ ] **Step 2: Build `RatingCard` (interactive, state-aware)**

```tsx
// components/trip/RatingCard.tsx
'use client';

import { useEffect, useState } from 'react';
import { Star } from 'lucide-react';
import { getRating, submitRating, type RatingState } from '@/lib/ratings-client';
import { VerifyToUnlock } from '@/components/social/VerifyToUnlock';

export function RatingCard({ tripId, destination }: { tripId: string; destination: string }) {
  const [state, setState] = useState<RatingState | null>(null);
  const [stars, setStars] = useState(0);
  const [hover, setHover] = useState(0);
  const [review, setReview] = useState('');
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [showVerify, setShowVerify] = useState(false);

  useEffect(() => {
    getRating(tripId).then(s => { setState(s); if (s.mine) { setStars(s.mine.stars); setReview(s.mine.review ?? ''); } }).catch(() => {});
  }, [tripId]);

  if (!state) return null;

  if (!state.eligibility.ok) {
    const reason = state.eligibility.reason;
    const copy = reason === 'verification_required'
      ? { title: 'Verify your identity to rate', body: 'Only verified travelers can rate trips.', cta: true }
      : reason === 'presence_required'
      ? { title: `We couldn't confirm you visited ${destination}`, body: 'Ratings unlock after we verify your presence during the trip.', cta: false }
      : { title: 'Rate after your trip ends', body: 'Come back once your trip wraps up to share how it went.', cta: false };
    return (
      <div className="rounded-2xl border border-[#E4E2F0] bg-white p-5">
        <h3 className="text-sm font-semibold text-[#3F3D56]">{copy.title}</h3>
        <p className="mt-1 text-xs text-[#6F6C82]">{copy.body}</p>
        {copy.cta && (
          <button onClick={() => setShowVerify(true)} className="mt-3 rounded-xl bg-[#6C63FF] px-4 py-2 text-xs font-semibold text-white">Verify with Didit</button>
        )}
        <VerifyToUnlock open={showVerify} onClose={() => setShowVerify(false)} returnTo={`/trip/${tripId}`} />
      </div>
    );
  }

  async function save() {
    if (stars < 1) return;
    setSaving(true); setSaved(false);
    try { await submitRating(tripId, stars, review.trim() || undefined); setSaved(true); }
    finally { setSaving(false); }
  }

  return (
    <div className="rounded-2xl border border-[#E4E2F0] bg-white p-5">
      <h3 className="text-sm font-semibold text-[#3F3D56]">{state.mine ? 'Your rating' : `How was ${destination}?`}</h3>
      <div className="mt-3 flex gap-1" role="radiogroup" aria-label="Star rating">
        {[1, 2, 3, 4, 5].map(n => (
          <button key={n} role="radio" aria-checked={stars === n} aria-label={`${n} star${n > 1 ? 's' : ''}`}
            onMouseEnter={() => setHover(n)} onMouseLeave={() => setHover(0)} onClick={() => setStars(n)}
            className="p-0.5">
            <Star className={`h-7 w-7 transition ${(hover || stars) >= n ? 'fill-[#FFB020] text-[#FFB020]' : 'text-[#DDDCE8]'}`} />
          </button>
        ))}
      </div>
      <textarea value={review} onChange={e => setReview(e.target.value)} placeholder="Add a short review (optional)"
        className="mt-3 w-full rounded-xl border border-slate-200 px-3 py-2 text-sm" rows={3} />
      <div className="mt-3 flex items-center gap-3">
        <button onClick={save} disabled={saving || stars < 1}
          className="rounded-xl bg-[#6C63FF] px-4 py-2 text-sm font-semibold text-white disabled:opacity-60">
          {saving ? 'Saving…' : state.mine ? 'Update rating' : 'Submit rating'}
        </button>
        {saved && <span className="text-xs font-medium text-[#1B7A5A]">Saved ✓</span>}
      </div>
    </div>
  );
}
```

- [ ] **Step 3: Mount on the trip page**

In `app/trip/[id]/page.tsx`, render `<RatingCard tripId={trip.id} destination={trip.destination} />` in the trip detail layout (e.g. near the itinerary footer). Import it. It self-hides until eligibility loads.

- [ ] **Step 4: Typecheck + lint + build**

Run: `npm run typecheck && npx eslint components/trip/RatingCard.tsx lib/ratings-client.ts app/trip/[id]/page.tsx && npm run build`
Expected: zero errors; build succeeds.

- [ ] **Step 5: Commit**

```bash
git add components/trip/RatingCard.tsx lib/ratings-client.ts app/trip/[id]/page.tsx
git commit -m "feat(ratings): interactive RatingCard with state-aware gating on trip page"
```

---

### Task 9: E2E + ui-ux-pro-max polish pass + full QA

**Files:**
- Create: `tests/e2e/trip-rating.spec.ts`
- Create: `tests/e2e/presence-consent.spec.ts`
- Modify: the components created in Tasks 2,5,8 for UX polish.

**Interfaces:**
- Consumes: existing `installSupabaseMock`/`page.route` pattern from `tests/e2e/social.spec.ts`.

- [ ] **Step 1: Rating gate e2e (locked + unlocked)**

Write `tests/e2e/trip-rating.spec.ts` mirroring `tests/e2e/social.spec.ts` conventions. Mock `GET /api/trips/:id/rating` to return each eligibility state and assert RatingCard copy:
- `{ eligibility: { ok:false, reason:'verification_required' } }` → "Verify your identity to rate" + a Verify button; star form hidden.
- `{ ok:false, reason:'presence_required' }` → "We couldn't confirm you visited" copy.
- `{ ok:false, reason:'trip_not_ended' }` → "Rate after your trip ends".
- `{ ok:true, mine:null, aggregate:{average:0,count:0} }` → star radiogroup visible; clicking the 5th star then "Submit rating" issues a POST (assert via a routed POST mock returning `{stars:5,review:null}` and a "Saved ✓").

- [ ] **Step 2: Presence consent e2e**

Write `tests/e2e/presence-consent.spec.ts`: mock `GET /api/trips/presence-status` to return a trip in-window+unverified with `consent:false`; load `/dashboard`; assert the `LocationConsentPrompt` ("Confirm you're on your trip?") appears and that NO geolocation/presence POST fires before consent. Use Playwright's `context.grantPermissions`/`setGeolocation` only AFTER clicking "Allow location", then assert a POST to `/api/trips/:id/presence` fires. If geolocation mocking is environment-limited, assert at minimum that the prompt shows on `consent:false` and is absent on `consent:true`, and document the limitation in the test header.

- [ ] **Step 3: Run the new e2e**

Run: `npm run test:e2e -- tests/e2e/trip-rating.spec.ts tests/e2e/presence-consent.spec.ts`
Expected: PASS. (If a stale `next-server`/`.next` interferes, kill stray servers and `rm -rf .next` first.)

- [ ] **Step 4: ui-ux-pro-max polish pass**

Invoke the `ui-ux-pro-max` skill (Skill tool) to review and improve `RatingCard`, `TripDatesEditor`, `LocationConsentPrompt`, and the profile consent toggle for: effortless interaction (hover/active/focus-visible on stars and buttons, optimistic "Saved ✓", disabled affordances), clarity of the explanatory states, spacing/hierarchy, and accessibility (radiogroup semantics, labels). On these specific surfaces, replace any low-quality "AI slop" styling with polished, on-brand Sunset/Adventure UI. Do NOT touch the landing page. Apply concrete recommendations; keep logic intact.

- [ ] **Step 5: Full QA gate**

Run: `npm run typecheck && npm run lint && npm run test:unit && npm run test:e2e && npm run build`
Expected: typecheck/unit/build green; new e2e green. For lint and any pre-existing failing e2e, confirm via `git stash` whether they fail identically on the pre-task tree and report which are pre-existing vs introduced — do not claim a green you did not observe.

- [ ] **Step 6: Commit**

```bash
git add tests/e2e/trip-rating.spec.ts tests/e2e/presence-consent.spec.ts components/trip
git commit -m "test(ratings): e2e for rating gate + presence consent; ui-ux polish pass"
```

---

## Self-Review

**Spec coverage:**
- Unit A (dates+coords schema, capture, user-set dates) → Tasks 1, 2. Unit B (presence service, API, consent, client wiring) → Tasks 3, 4, 5. Unit C (ratings gate, API, UI) → Tasks 6, 7, 8. Testing + UX mandate → Task 9 (and per-task lint/build). ✓
- Consent revoke surfaced (spec §B) → Task 5 Step 5. ✓
- Aggregate computed but not surfaced publicly → produced in Task 7 GET, consumed privately in RatingCard; no public route. ✓
- Graceful migration degradation → routes use `maybeSingle`/empty arrays; note in Global Constraints. ✓

**Placeholder scan:** No TBD/TODO. Code present in every code step. The two "confirm X" notes (PATCH response shape in Task 2; dashboard client boundary in Task 5) are concrete verification actions with a defined fallback, not placeholders. ✓

**Type consistency:** `RatingDenyReason` reasons identical across Tasks 6/7/8 and spec. `canRateTrip`/`summarizeRatings` signatures match between Task 6 (def) and Task 7 (use). `evaluatePresence`/`isWithinTripWindow`/`PRESENCE_RADIUS_KM` match between Task 3 (def) and Task 4 (use). `Trip` date/coord fields match between Task 1 (def) and Tasks 2/4/8 (use). `haversineDistanceKm` arg shape (`{latitude,longitude}`) honored in Task 3. ✓

**Note for executor:** `checkTrustedTraveler` returns `{ ok, level }`; Task 7 reads `guard.ok` for `isVerified`. Confirm against `services/social-guard.ts` (Slice 1) before relying on it — it is the same helper reviewed and merged in Slice 1.
