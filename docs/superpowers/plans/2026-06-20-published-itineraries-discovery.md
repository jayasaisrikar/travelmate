# Published Itineraries + Destination Discovery — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Let a verified user publish their itinerary publicly and let anyone browse a destination's published itineraries ranked by owner star-rating, with a destination average.

**Architecture:** A trip-level `is_published` flag (+ `published_at`, `destination_slug`) gated by the Slice 1 Didit guard; a pure `services/discovery.ts` ranks/aggregates; a public no-auth `GET /api/explore/[slug]/itineraries` feeds a new browse section on the existing destination page; a public `/itinerary/[id]` page reuses `PublicTripShare` in a `variant="public"` (suggestion/share UI hidden); a one-tap `PublishToggle` on the trip page.

**Tech Stack:** Next.js 15 App Router, React 19, TypeScript, Supabase JS, Playwright, Tailwind (Sunset/Adventure tokens).

## Global Constraints

- Reuse, don't reimplement: `checkTrustedTraveler(userId)` + `verificationRequiredResponse(level)` from `services/social-guard.ts`; `slugifyDestination(dest)` from `services/social.ts`; `getPublicProfile(userId): Promise<TravelerProfile|null>` from `services/social.ts`; `summarizeRatings` shape from `services/ratings.ts`; `getAuthenticatedUser`, `supabase`; `VerifyToUnlock` (Slice 1); `PublicTripShare` (`components/trip/PublicTripShare.tsx`).
- Publish gate = Didit trusted/high_trust via `checkTrustedTraveler`; publish is owner-only and allowed anytime; reversible.
- Browse sort: rated (stars != null) first by stars desc then `published_at` desc; unrated appended by `published_at` desc. Destination average = over RATED published trips only; empty → `{average:0, count:0}`; average rounded to 1 decimal.
- Public surfaces (`/itinerary/[id]`, `GET /api/explore/[slug]/itineraries`) require NO auth and must degrade gracefully (404 / empty) — never crash if the migration is unapplied.
- Exposure on publish = read-only itinerary + owner PUBLIC profile (name/avatar) + owner rating (stars/review). No new itinerary fields beyond what `PublicTripShare` already renders.
- **UX mandate (user directive):** every new/changed surface effortless + interactive (one-tap publish with optimistic state, interactive browse cards, friendly states, never raw errors). Run a ui-ux-pro-max pass on surfaces this slice creates/touches; replace AI-slop UI there. EXCEPTION: never restyle the landing page (`app/page.tsx`).
- Sunset/Adventure tokens only (no new hex). Migration files date-prefixed `YYYYMMDD_<name>.sql`. QA gates: typecheck, lint, test:unit, test:e2e, build.

---

### Task 1: Schema + Trip type + publish API

**Files:**
- Create: `supabase/migrations/20260620_publish_itineraries.sql`
- Modify: `lib/supabase-trips.ts` (`Trip` interface)
- Create: `app/api/trips/[id]/publish/route.ts`
- Test: `tests/unit/trip-publish-type.test.ts`

**Interfaces:**
- Produces: `Trip` gains `is_published?: boolean`, `published_at?: string | null`, `destination_slug?: string | null`.
- Produces: `POST /api/trips/[id]/publish` body `{ publish: boolean }` → `{ is_published: boolean }`; `403 { error:'verification_required', level }` if not trusted+; `404` if not owned.

- [ ] **Step 1: Write the migration**

```sql
-- supabase/migrations/20260620_publish_itineraries.sql
alter table public.trips add column if not exists is_published boolean not null default false;
alter table public.trips add column if not exists published_at timestamptz;
alter table public.trips add column if not exists destination_slug text;

create index if not exists trips_published_dest_idx
  on public.trips (destination_slug)
  where is_published;
```

- [ ] **Step 2: Write the failing type test**

```ts
// tests/unit/trip-publish-type.test.ts
import { test, expect } from '@playwright/test';
import type { Trip } from '../../lib/supabase-trips';

test('Trip type includes publish fields', () => {
  const t: Pick<Trip, 'is_published' | 'published_at' | 'destination_slug'> = {
    is_published: true,
    published_at: '2026-06-20T00:00:00Z',
    destination_slug: 'mumbai',
  };
  expect(t.is_published).toBe(true);
  expect(t.destination_slug).toBe('mumbai');
});
```

- [ ] **Step 3: Run test to verify it fails**

Run: `npm run test:unit -- tests/unit/trip-publish-type.test.ts`
Expected: FAIL (properties don't exist on `Trip`).

- [ ] **Step 4: Extend the `Trip` interface**

In `lib/supabase-trips.ts`, add to the `Trip` interface:

```ts
  is_published?: boolean
  published_at?: string | null
  destination_slug?: string | null
```

- [ ] **Step 5: Implement the publish route**

```ts
// app/api/trips/[id]/publish/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { supabase } from '@/services/supabase';
import { getAuthenticatedUser } from '@/services/supabase-auth';
import { checkTrustedTraveler, verificationRequiredResponse } from '@/services/social-guard';
import { slugifyDestination } from '@/services/social';

export async function POST(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { user, error } = await getAuthenticatedUser(request);
  if (error || !user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const { id } = await params;
  const body = (await request.json().catch(() => ({}))) as { publish?: boolean };
  const publish = body.publish === true;

  const { data: trip } = await supabase
    .from('trips').select('id, destination').eq('id', id).eq('user_id', user.id).maybeSingle();
  if (!trip) return NextResponse.json({ error: 'Trip not found' }, { status: 404 });

  const guard = await checkTrustedTraveler(user.id);
  if (!guard.ok) return verificationRequiredResponse(guard.level);

  const patch = publish
    ? { is_published: true, published_at: new Date().toISOString(), destination_slug: slugifyDestination(trip.destination) }
    : { is_published: false, published_at: null };

  const { error: upErr } = await supabase.from('trips').update(patch).eq('id', id).eq('user_id', user.id);
  if (upErr) return NextResponse.json({ error: upErr.message }, { status: 500 });
  return NextResponse.json({ is_published: publish });
}
```

- [ ] **Step 6: Run test + typecheck**

Run: `npm run test:unit -- tests/unit/trip-publish-type.test.ts && npm run typecheck`
Expected: PASS, zero typecheck errors.

- [ ] **Step 7: Commit**

```bash
git add supabase/migrations/20260620_publish_itineraries.sql lib/supabase-trips.ts "app/api/trips/[id]/publish/route.ts" tests/unit/trip-publish-type.test.ts
git commit -m "feat(publish): add is_published schema + owner-gated publish API"
```

---

### Task 2: `services/discovery.ts` ranking + aggregate (TDD)

**Files:**
- Create: `services/discovery.ts`
- Test: `tests/unit/discovery.test.ts`

**Interfaces:**
- Produces:
  - `type PublishedItinerary = { tripId: string; destination: string; ownerName: string | null; ownerAvatar: string | null; stars: number | null; review: string | null; publishedAt: string }`
  - `function rankPublishedItineraries(items: PublishedItinerary[]): PublishedItinerary[]` — rated first (stars != null) by stars desc then publishedAt desc; unrated appended by publishedAt desc.
  - `function destinationRatingSummary(items: PublishedItinerary[]): { average: number; count: number }` — over rated only; average 1 decimal; empty → `{0,0}`.

- [ ] **Step 1: Write the failing test**

```ts
// tests/unit/discovery.test.ts
import { test, expect } from '@playwright/test';
import { rankPublishedItineraries, destinationRatingSummary, type PublishedItinerary } from '../../services/discovery';

const mk = (o: Partial<PublishedItinerary> & { tripId: string }): PublishedItinerary => ({
  destination: 'Mumbai', ownerName: null, ownerAvatar: null, stars: null, review: null, publishedAt: '2026-06-01T00:00:00Z', ...o,
});

test('rated come before unrated, sorted by stars desc then recency', () => {
  const items = [
    mk({ tripId: 'a', stars: 3, publishedAt: '2026-06-02T00:00:00Z' }),
    mk({ tripId: 'b', stars: null, publishedAt: '2026-06-05T00:00:00Z' }),
    mk({ tripId: 'c', stars: 5, publishedAt: '2026-06-01T00:00:00Z' }),
    mk({ tripId: 'd', stars: 5, publishedAt: '2026-06-03T00:00:00Z' }),
    mk({ tripId: 'e', stars: null, publishedAt: '2026-06-04T00:00:00Z' }),
  ];
  expect(rankPublishedItineraries(items).map(i => i.tripId)).toEqual(['d', 'c', 'a', 'b', 'e']);
});

test('summary averages rated only', () => {
  const items = [mk({ tripId: 'a', stars: 5 }), mk({ tripId: 'b', stars: 4 }), mk({ tripId: 'c', stars: null })];
  expect(destinationRatingSummary(items)).toEqual({ average: 4.5, count: 2 });
  expect(destinationRatingSummary([])).toEqual({ average: 0, count: 0 });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npm run test:unit -- tests/unit/discovery.test.ts`
Expected: FAIL — module not found.

- [ ] **Step 3: Implement**

```ts
// services/discovery.ts
export type PublishedItinerary = {
  tripId: string;
  destination: string;
  ownerName: string | null;
  ownerAvatar: string | null;
  stars: number | null;
  review: string | null;
  publishedAt: string;
};

export function rankPublishedItineraries(items: PublishedItinerary[]): PublishedItinerary[] {
  const byRecency = (a: PublishedItinerary, b: PublishedItinerary) => (a.publishedAt < b.publishedAt ? 1 : a.publishedAt > b.publishedAt ? -1 : 0);
  const rated = items.filter(i => i.stars != null).sort((a, b) => (b.stars! - a.stars!) || byRecency(a, b));
  const unrated = items.filter(i => i.stars == null).sort(byRecency);
  return [...rated, ...unrated];
}

export function destinationRatingSummary(items: PublishedItinerary[]): { average: number; count: number } {
  const rated = items.filter(i => i.stars != null);
  if (rated.length === 0) return { average: 0, count: 0 };
  const sum = rated.reduce((acc, i) => acc + (i.stars as number), 0);
  return { average: Math.round((sum / rated.length) * 10) / 10, count: rated.length };
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `npm run test:unit -- tests/unit/discovery.test.ts`
Expected: PASS (2 tests).

- [ ] **Step 5: Commit**

```bash
git add services/discovery.ts tests/unit/discovery.test.ts
git commit -m "feat(discovery): rank + summarize published itineraries (pure)"
```

---

### Task 3: Destination itineraries API

**Files:**
- Create: `app/api/explore/[slug]/itineraries/route.ts`
- Test: covered by e2e in Task 7; gate is typecheck + lint.

**Interfaces:**
- Consumes: `supabase`, `getPublicProfile`, `rankPublishedItineraries`, `destinationRatingSummary`, `PublishedItinerary` (Task 2).
- Produces: `GET /api/explore/[slug]/itineraries` → `{ items: PublishedItinerary[], summary: { average, count } }` (public, no auth).

- [ ] **Step 1: Implement the route**

```ts
// app/api/explore/[slug]/itineraries/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { supabase } from '@/services/supabase';
import { rankPublishedItineraries, destinationRatingSummary, type PublishedItinerary } from '@/services/discovery';

export async function GET(_request: NextRequest, { params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;

  const { data: trips, error } = await supabase
    .from('trips')
    .select('id, destination, user_id, published_at')
    .eq('destination_slug', slug)
    .eq('is_published', true)
    .limit(50);
  if (error) return NextResponse.json({ items: [], summary: { average: 0, count: 0 } });

  const tripRows = trips ?? [];
  const tripIds = tripRows.map(t => t.id);
  const ownerIds = [...new Set(tripRows.map(t => t.user_id))];

  const [{ data: ratings }, { data: profiles }] = await Promise.all([
    tripIds.length ? supabase.from('trip_ratings').select('trip_id, stars, review').in('trip_id', tripIds) : Promise.resolve({ data: [] }),
    ownerIds.length ? supabase.from('traveler_profiles').select('id, display_name, avatar_url, is_public').in('id', ownerIds) : Promise.resolve({ data: [] }),
  ]);

  const ratingByTrip = new Map((ratings ?? []).map(r => [r.trip_id, r]));
  const profileById = new Map((profiles ?? []).map(p => [p.id, p]));

  const items: PublishedItinerary[] = tripRows.map(t => {
    const r = ratingByTrip.get(t.id);
    const p = profileById.get(t.user_id);
    const isPublic = p?.is_public ?? false;
    return {
      tripId: t.id,
      destination: t.destination,
      ownerName: isPublic ? (p?.display_name ?? null) : null,
      ownerAvatar: isPublic ? (p?.avatar_url ?? null) : null,
      stars: r?.stars ?? null,
      review: r?.review ?? null,
      publishedAt: t.published_at ?? '',
    };
  });

  return NextResponse.json({ items: rankPublishedItineraries(items), summary: destinationRatingSummary(items) });
}
```

- [ ] **Step 2: Typecheck + lint**

Run: `npm run typecheck && npx eslint "app/api/explore/[slug]/itineraries/route.ts"`
Expected: zero errors.

- [ ] **Step 3: Commit**

```bash
git add "app/api/explore/[slug]/itineraries/route.ts"
git commit -m "feat(discovery): public destination itineraries endpoint (rated-first)"
```

---

### Task 4: `PublicTripShare` public variant + public itinerary page

**Files:**
- Modify: `components/trip/PublicTripShare.tsx` (add optional `variant` prop)
- Create: `app/itinerary/[id]/page.tsx`
- Test: covered by e2e in Task 7; gate is typecheck + lint + build.

**Interfaces:**
- Consumes: `PublicTripShare`, `getPublicProfile`, `supabase`.
- Produces: `PublicTripShare` accepts optional `variant?: 'share' | 'public'` (default `'share'`); when `'public'`, the suggestion form + share-link controls are hidden, and `shareToken`/`shareUrl` may be empty strings.

- [ ] **Step 1: Add the `variant` prop to PublicTripShare**

In `components/trip/PublicTripShare.tsx`, add `variant?: 'share' | 'public'` to the props type and destructure it with a default: `variant = 'share'`. Wrap the suggestion-form section AND the share-link/copy controls in `{variant === 'share' && ( ... )}`. Do not otherwise change the itinerary rendering. (Read the component to locate the suggestion `<form>` and the copy/share block; gate exactly those.)

- [ ] **Step 2: Build the public itinerary page (server component)**

```tsx
// app/itinerary/[id]/page.tsx
import type { Metadata } from 'next';
import { notFound } from 'next/navigation';
import { Star } from 'lucide-react';
import { PublicTripShare } from '@/components/trip/PublicTripShare';
import { supabase } from '@/services/supabase';
import type { TripRow } from '@/services/trip-sharing';

async function loadPublished(id: string) {
  const { data: trip } = await supabase
    .from('trips').select('*').eq('id', id).eq('is_published', true).maybeSingle();
  if (!trip) return null;
  const [{ data: profile }, { data: rating }] = await Promise.all([
    supabase.from('traveler_profiles').select('display_name, avatar_url, is_public').eq('id', trip.user_id).maybeSingle(),
    supabase.from('trip_ratings').select('stars, review').eq('trip_id', id).eq('user_id', trip.user_id).maybeSingle(),
  ]);
  return { trip: trip as TripRow, profile, rating };
}

export async function generateMetadata({ params }: { params: Promise<{ id: string }> }): Promise<Metadata> {
  const { id } = await params;
  const data = await loadPublished(id);
  if (!data) return { title: 'Itinerary not found | wayflo' };
  return {
    title: `${data.trip.destination} itinerary | wayflo`,
    description: `A published ${data.trip.duration}-day ${data.trip.destination} itinerary on Wayflo.`,
  };
}

export default async function PublicItineraryPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const data = await loadPublished(id);
  if (!data) notFound();

  const isPublic = data.profile?.is_public ?? false;
  const ownerName = isPublic ? (data.profile?.display_name ?? null) : null;
  const stars = data.rating?.stars ?? null;

  return (
    <main className="min-h-screen bg-[#F8FAFC] text-[#3F3D56]">
      <div className="mx-auto max-w-3xl px-4 py-6 sm:px-6">
        {(ownerName || stars != null) && (
          <div className="mb-4 flex items-center justify-between rounded-2xl border border-[#E4E2F0] bg-white p-4">
            <div className="text-sm text-[#6F6C82]">{ownerName ? `Planned by ${ownerName}` : 'A Wayflo traveler'}</div>
            {stars != null && (
              <div className="flex items-center gap-1 text-sm font-semibold text-[#3F3D56]" aria-label={`${stars} out of 5 stars`}>
                <Star className="h-4 w-4 fill-[#FFB020] text-[#FFB020]" /> {stars.toFixed(1)}
              </div>
            )}
          </div>
        )}
        {stars != null && data.rating?.review && (
          <blockquote className="mb-4 rounded-2xl border border-[#E4E2F0] bg-white p-4 text-sm italic text-[#53506A]">“{data.rating.review}”</blockquote>
        )}
      </div>
      <PublicTripShare
        variant="public"
        shareToken=""
        shareUrl=""
        shareBadge="A published itinerary on wayflo"
        shareTitle={`${data.trip.destination} itinerary`}
        shareDescription={`A ${data.trip.duration}-day plan for ${data.trip.destination}.`}
        suggestionsCount={0}
        trip={data.trip}
      />
    </main>
  );
}
```

> Confirm `TripRow` is exported from `services/trip-sharing` (the share page imports it) and that `PublicTripShare`'s `trip` prop accepts it — the share page passes `data.trip as TripRow`. Match that exactly.

- [ ] **Step 3: Typecheck + lint + build**

Run: `npm run typecheck && npx eslint components/trip/PublicTripShare.tsx "app/itinerary/[id]/page.tsx" && npm run build`
Expected: zero errors; build succeeds (`rm -rf .next` first if a stale-cache MODULE_NOT_FOUND appears).

- [ ] **Step 4: Commit**

```bash
git add components/trip/PublicTripShare.tsx "app/itinerary/[id]/page.tsx"
git commit -m "feat(publish): public /itinerary/[id] page reusing PublicTripShare (public variant)"
```

---

### Task 5: Destination browse section

**Files:**
- Create: `components/explore/PublishedItinerariesSection.tsx`
- Create: `lib/discovery-client.ts`
- Modify: `app/explore/[destination]/page.tsx` (mount the section)
- Test: covered by e2e in Task 7.

**Interfaces:**
- Consumes: the itineraries endpoint (Task 3); `PublishedItinerary` type (re-declared client-side or imported from `services/discovery`).
- Produces: `<PublishedItinerariesSection slug={string} />`.

- [ ] **Step 1: Client fetcher**

```ts
// lib/discovery-client.ts
import type { PublishedItinerary } from '@/services/discovery';

export type DestinationItineraries = { items: PublishedItinerary[]; summary: { average: number; count: number } };

export async function getDestinationItineraries(slug: string): Promise<DestinationItineraries> {
  const res = await fetch(`/api/explore/${encodeURIComponent(slug)}/itineraries`, { cache: 'no-store' });
  if (!res.ok) throw new Error('Failed to load itineraries');
  return res.json();
}
```

- [ ] **Step 2: Build the section**

```tsx
// components/explore/PublishedItinerariesSection.tsx
'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { Star } from 'lucide-react';
import { getDestinationItineraries, type DestinationItineraries } from '@/lib/discovery-client';

export function PublishedItinerariesSection({ slug }: { slug: string }) {
  const [data, setData] = useState<DestinationItineraries | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    setLoading(true);
    getDestinationItineraries(slug)
      .then(setData)
      .catch(e => setError(e instanceof Error ? e.message : 'Failed to load'))
      .finally(() => setLoading(false));
  }, [slug]);

  return (
    <section className="space-y-4">
      <div className="flex items-center justify-between">
        <h2 className="text-lg font-semibold text-[#3F3D56]">Published itineraries</h2>
        {data && data.summary.count > 0 && (
          <div className="flex items-center gap-1.5 text-sm font-semibold text-[#3F3D56]">
            <Star className="h-4 w-4 fill-[#FFB020] text-[#FFB020]" /> {data.summary.average.toFixed(1)}
            <span className="font-normal text-[#6F6C82]">({data.summary.count})</span>
          </div>
        )}
      </div>

      {loading && <p className="text-sm text-[#6F6C82]">Loading itineraries…</p>}
      {error && <p className="text-sm text-[#C14D72]">{error}</p>}
      {!loading && !error && (!data || data.items.length === 0) && (
        <div className="rounded-2xl border border-dashed border-slate-200 p-8 text-center text-sm text-[#6F6C82]">
          No published itineraries here yet.
        </div>
      )}

      <div className="grid gap-3 sm:grid-cols-2">
        {data?.items.map(it => (
          <Link key={it.tripId} href={`/itinerary/${it.tripId}`}
            className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm transition hover:border-[#6C63FF]/40">
            <div className="flex items-center justify-between">
              <div className="text-sm font-semibold text-[#3F3D56]">{it.ownerName ?? 'A Wayflo traveler'}</div>
              {it.stars != null ? (
                <span className="flex items-center gap-1 text-xs font-semibold text-[#3F3D56]">
                  <Star className="h-3.5 w-3.5 fill-[#FFB020] text-[#FFB020]" /> {it.stars.toFixed(1)}
                </span>
              ) : (
                <span className="text-xs text-[#8A869C]">Not rated yet</span>
              )}
            </div>
            {it.review && <p className="mt-2 line-clamp-2 text-xs text-[#6F6C82]">“{it.review}”</p>}
          </Link>
        ))}
      </div>
    </section>
  );
}
```

- [ ] **Step 3: Mount on the destination page**

In `app/explore/[destination]/page.tsx`, import `PublishedItinerariesSection` and render `<PublishedItinerariesSection slug={slug} />` within the page's main content (below the travelers/rooms area). The page already computes `slug`.

- [ ] **Step 4: Typecheck + lint + build**

Run: `npm run typecheck && npx eslint components/explore/PublishedItinerariesSection.tsx lib/discovery-client.ts "app/explore/[destination]/page.tsx" && npm run build`
Expected: zero errors; build succeeds.

- [ ] **Step 5: Commit**

```bash
git add components/explore/PublishedItinerariesSection.tsx lib/discovery-client.ts "app/explore/[destination]/page.tsx"
git commit -m "feat(discovery): published itineraries browse section on destination page"
```

---

### Task 6: PublishToggle on the trip page

**Files:**
- Create: `components/trip/PublishToggle.tsx`
- Create: `lib/publish-client.ts`
- Modify: `app/trip/[id]/page.tsx` (mount near the RatingCard)
- Test: covered by e2e in Task 7.

**Interfaces:**
- Consumes: publish API (Task 1); `VerifyToUnlock` (Slice 1); `isVerificationRequiredError` from `hooks/useVerificationGate` (Slice 1).
- Produces: `<PublishToggle trip onChange />`.

- [ ] **Step 1: Client fetcher**

```ts
// lib/publish-client.ts
import { getSupabaseBrowser } from '@/services/supabase-browser';

export async function setTripPublished(tripId: string, publish: boolean): Promise<{ is_published: boolean }> {
  const { data } = await getSupabaseBrowser().auth.getSession();
  const token = data.session?.access_token;
  const res = await fetch(`/api/trips/${tripId}/publish`, {
    method: 'POST',
    cache: 'no-store',
    headers: { 'Content-Type': 'application/json', ...(token ? { Authorization: `Bearer ${token}` } : {}) },
    body: JSON.stringify({ publish }),
  });
  const body = await res.json().catch(() => null);
  if (!res.ok) throw Object.assign(new Error((body?.error as string) ?? 'Publish failed'), { code: body?.error, status: res.status });
  return body;
}
```

- [ ] **Step 2: Build the toggle (optimistic, with verify upsell)**

```tsx
// components/trip/PublishToggle.tsx
'use client';

import { useState } from 'react';
import { Globe2, Check, Copy } from 'lucide-react';
import { setTripPublished } from '@/lib/publish-client';
import { isVerificationRequiredError } from '@/hooks/useVerificationGate';
import { VerifyToUnlock } from '@/components/social/VerifyToUnlock';
import type { Trip } from '@/lib/supabase-trips';

export function PublishToggle({ trip }: { trip: Trip }) {
  const [published, setPublished] = useState(!!trip.is_published);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const [copied, setCopied] = useState(false);
  const [showVerify, setShowVerify] = useState(false);

  async function toggle() {
    const next = !published;
    setBusy(true); setError(''); setPublished(next); // optimistic
    try {
      const r = await setTripPublished(trip.id, next);
      setPublished(r.is_published);
    } catch (e) {
      setPublished(!next); // rollback
      if (isVerificationRequiredError(e)) setShowVerify(true);
      else setError("We couldn't update publishing — please try again.");
    } finally {
      setBusy(false);
    }
  }

  const url = typeof window !== 'undefined' ? `${window.location.origin}/itinerary/${trip.id}` : `/itinerary/${trip.id}`;

  return (
    <div className="rounded-2xl border border-[#E4E2F0] bg-white p-5">
      <div className="flex items-center justify-between gap-3">
        <div className="flex items-center gap-2">
          <Globe2 className="h-4 w-4 text-[#6C63FF]" />
          <div>
            <div className="text-sm font-semibold text-[#3F3D56]">{published ? 'Published' : 'Make this trip public'}</div>
            <div className="text-xs text-[#6F6C82]">{published ? 'Anyone with the link can view this itinerary.' : 'Share your plan on its destination page.'}</div>
          </div>
        </div>
        <button onClick={toggle} disabled={busy} role="switch" aria-checked={published}
          className={`relative h-6 w-11 rounded-full transition ${published ? 'bg-[#6C63FF]' : 'bg-[#DDDCE8]'} disabled:opacity-60`}>
          <span className={`absolute top-0.5 h-5 w-5 rounded-full bg-white transition-all ${published ? 'left-[22px]' : 'left-0.5'}`} />
        </button>
      </div>
      {published && (
        <button onClick={() => { navigator.clipboard?.writeText(url); setCopied(true); setTimeout(() => setCopied(false), 1500); }}
          className="mt-3 inline-flex items-center gap-1.5 rounded-xl border border-slate-200 px-3 py-1.5 text-xs font-medium text-[#6F6C82]">
          {copied ? <Check className="h-3.5 w-3.5 text-[#1B7A5A]" /> : <Copy className="h-3.5 w-3.5" />} {copied ? 'Copied' : 'Copy public link'}
        </button>
      )}
      {error && <p className="mt-2 text-xs text-[#C14D72]">{error}</p>}
      <VerifyToUnlock open={showVerify} onClose={() => setShowVerify(false)} returnTo={`/trip/${trip.id}`} />
    </div>
  );
}
```

- [ ] **Step 3: Mount on the trip page**

In `app/trip/[id]/page.tsx`, import `PublishToggle` and render `<PublishToggle trip={trip} />` near the `RatingCard` (the page holds the trip in `useState<Trip|null>`). Place it adjacent so publishing + rating sit together.

- [ ] **Step 4: Typecheck + lint + build**

Run: `npm run typecheck && npx eslint components/trip/PublishToggle.tsx lib/publish-client.ts "app/trip/[id]/page.tsx" && npm run build`
Expected: zero errors; build succeeds.

- [ ] **Step 5: Commit**

```bash
git add components/trip/PublishToggle.tsx lib/publish-client.ts "app/trip/[id]/page.tsx"
git commit -m "feat(publish): one-tap PublishToggle with verify upsell on trip page"
```

---

### Task 7: E2E + ui-ux-pro-max polish + full QA

**Files:**
- Create: `tests/e2e/publish-itinerary.spec.ts`
- Create: `tests/e2e/destination-discovery.spec.ts`
- Modify: components from Tasks 4,5,6 for polish.

**Interfaces:**
- Consumes: existing `installSupabaseMock`/`page.route` pattern from `tests/e2e/social.spec.ts`.

- [ ] **Step 1: Publish + public-route e2e**

Write `tests/e2e/publish-itinerary.spec.ts` mirroring `tests/e2e/social.spec.ts` conventions:
- Trip page with a mocked unverified profile: clicking the PublishToggle → mock `POST /api/trips/:id/publish` returning `403 {error:'verification_required'}` → assert `VerifyToUnlock` ("Verify to unlock") dialog appears and the toggle rolls back to off.
- Trip page with mocked trusted profile: toggle → mock POST returns `{is_published:true}` → assert the "Published" state + "Copy public link" control appears.
- Public route: load `/itinerary/<id>` with a mocked published trip (mock the data the server page needs is not possible via page.route for a server component, so instead assert against a seeded/mocked API where feasible; if the server-component data fetch cannot be intercepted in the test environment, document this and cover the public-route render via the components it composes, or skip with `test.fixme` and a clear header note — do NOT fake a pass).

- [ ] **Step 2: Destination discovery e2e**

Write `tests/e2e/destination-discovery.spec.ts`: on `/explore/<slug>`, mock `GET /api/explore/<slug>/itineraries` to return a mix of rated + unrated items plus a summary; assert the rated cards render above the unrated ones (DOM order), that "Not rated yet" shows on unrated cards, and that the destination average + count render in the header. Mock the other endpoints the page calls (listTravelers/listTripRooms) minimally so the page renders.

- [ ] **Step 3: Run the new e2e**

Run: `npm run test:e2e -- tests/e2e/publish-itinerary.spec.ts tests/e2e/destination-discovery.spec.ts`
Expected: PASS. (Kill stray `next-server` and `rm -rf .next` first if a stale build interferes.)

- [ ] **Step 4: ui-ux-pro-max polish pass**

Invoke the `ui-ux-pro-max` skill (Skill tool) to review and improve `PublishToggle`, `PublishedItinerariesSection`, the public itinerary page owner/rating header, and the new browse cards for: effortless interaction (switch affordance, hover/active/focus-visible, optimistic copied state), clarity, spacing/hierarchy, accessibility (role=switch aria-checked, labelled stars, link semantics). Replace any low-quality "AI slop" styling on THESE surfaces with polished on-brand Sunset/Adventure UI. Do NOT touch the landing page. Apply concrete recommendations; keep logic intact; no new color hex.

- [ ] **Step 5: Full QA gate**

Run: `npm run typecheck && npm run lint && npm run test:unit && npm run test:e2e && npm run build`
Expected: typecheck/unit/build green; new e2e green. For lint and any pre-existing failing e2e, confirm via `git stash` whether they fail identically on the pre-task tree and report which are pre-existing vs introduced — do not claim a green you did not observe.

- [ ] **Step 6: Commit**

```bash
git add tests/e2e/publish-itinerary.spec.ts tests/e2e/destination-discovery.spec.ts components/trip components/explore "app/itinerary/[id]/page.tsx"
git commit -m "test(publish): e2e for publish gate + destination discovery; ui-ux polish pass"
```

---

## Self-Review

**Spec coverage:**
- Unit A (schema, Trip type, publish API) → Task 1. Unit C pure helper → Task 2; discovery endpoint → Task 3; browse UI → Task 5. Unit B (public variant + /itinerary/[id]) → Task 4. Unit D (PublishToggle) → Task 6. Testing + UX mandate → Task 7 (+ per-task lint/build). ✓
- Rated-first sort + average over rated only + unrated shown-but-lower → Task 2 helper, exercised in Task 3/5/7. ✓
- Owner profile exposure honors `is_public` (browse endpoint + public page both gate name/avatar on `is_public`). ✓
- Reversible unpublish + slug re-derived on each publish → Task 1 route. ✓
- Graceful degradation (404/empty) on public surfaces → Task 3 (empty on error), Task 4 (`notFound()`). ✓

**Placeholder scan:** No TBD/TODO; code in every code step. The "confirm TripRow export/prop" note (Task 4) and the server-component-interception caveat (Task 7) are concrete verification actions with defined fallbacks, not placeholders. ✓

**Type consistency:** `PublishedItinerary` identical across Task 2 (def), Task 3 (use), Task 5 (client import). `rankPublishedItineraries`/`destinationRatingSummary` signatures match Task 2↔3. `Trip` publish fields match Task 1↔4↔6. Publish API response `{ is_published }` consistent across Task 1↔6. `checkTrustedTraveler`/`verificationRequiredResponse`/`slugifyDestination`/`getPublicProfile`/`isVerificationRequiredError`/`VerifyToUnlock` are all Slice 1/2 exports (verified to exist before this slice). ✓

**Note for executor:** Task 4 reuses `PublicTripShare`; confirm the suggestion `<form>` and share/copy controls are the only things gated behind `variant === 'share'` — do not hide the itinerary body. The `trip` prop type is `PublicTripSharePayload['trip']`; the share page passes `trip as TripRow`, so passing the loaded trip the same way is correct.
