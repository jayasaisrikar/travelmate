# Social/Public Trips + RBAC + Landing Fix — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Make the Open Trip (TripRoom) create/join flow work end-to-end behind a Didit `trusted+` RBAC gate, with a non-dead-end "verify to unlock" upsell, and fix the landing "Plan with more flow" tagline visibility.

**Architecture:** A single server guard (`requireTrustedTraveler`) gates social *mutations* at the `trusted`/`high_trust` level; API denials return `403 { error: 'verification_required' }`. The client surfaces denials through a `useVerificationGate` hook + `VerifyToUnlock` component, deep-linking to the existing Didit session flow. Orphaned room services get real UI: a discovery/create section in the community page and a new `app/rooms/[id]` detail page. The landing word-reveal is repaired to settle at full opacity.

**Tech Stack:** Next.js 15 (App Router), React 19, TypeScript, Supabase JS, framer-motion, Playwright (unit + e2e), Tailwind (Sunset/Adventure tokens).

## Global Constraints

- Verification bar for social mutations: `trusted` or `high_trust` only — use `isTrustedVerificationLevel()` from `services/didit.ts`. Copy verbatim, do not reimplement.
- Verification level lives on `traveler_profiles.verification_level` (values: `unverified | basic | trusted | high_trust`).
- All API routes authenticate via `getAuthenticatedUser(request)` from `services/supabase-auth`.
- Denied-gate API response shape is exactly: `403 { error: 'verification_required', level: <currentLevel> }`.
- Reads stay ungated; only mutations are gated.
- Stay within the existing Sunset/Adventure design tokens; do not introduce new hardcoded hex beyond what the system already uses.
- QA gates (per Wayflo QA commands): `npm run typecheck`, `npm run lint`, `npm run test:unit`, `npm run test:e2e`, `npm run build`.

---

### Task 1: Server RBAC guard `requireTrustedTraveler`

**Files:**
- Create: `services/social-guard.ts`
- Test: `tests/unit/social-guard.test.ts`

**Interfaces:**
- Consumes: `isTrustedVerificationLevel` from `services/didit.ts`; `supabase` from `services/supabase`.
- Produces:
  - `type GuardResult = { ok: true; level: string } | { ok: false; level: string }`
  - `async function checkTrustedTraveler(userId: string): Promise<GuardResult>` — reads `traveler_profiles.verification_level` for `userId`; `ok` is true iff `isTrustedVerificationLevel(level)`. Missing profile → `{ ok: false, level: 'unverified' }`.
  - `function verificationRequiredResponse(level: string): NextResponse` — returns `NextResponse.json({ error: 'verification_required', level }, { status: 403 })`.

- [ ] **Step 1: Write the failing test**

```ts
// tests/unit/social-guard.test.ts
import { test, expect } from '@playwright/test';
import { isVerifiedLevel } from '../../services/social-guard';

test('trusted and high_trust are verified', () => {
  expect(isVerifiedLevel('trusted')).toBe(true);
  expect(isVerifiedLevel('high_trust')).toBe(true);
});

test('lower levels and unknowns are not verified', () => {
  expect(isVerifiedLevel('unverified')).toBe(false);
  expect(isVerifiedLevel('basic')).toBe(false);
  expect(isVerifiedLevel(null)).toBe(false);
  expect(isVerifiedLevel(undefined)).toBe(false);
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npm run test:unit -- tests/unit/social-guard.test.ts`
Expected: FAIL — cannot find module `../../services/social-guard`.

- [ ] **Step 3: Write minimal implementation**

```ts
// services/social-guard.ts
import { NextResponse } from 'next/server';
import { supabase } from '@/services/supabase';
import { isTrustedVerificationLevel } from '@/services/didit';

export type GuardResult = { ok: true; level: string } | { ok: false; level: string };

/** Pure predicate: does this verification level unlock social mutations? */
export function isVerifiedLevel(level: string | null | undefined): boolean {
  return isTrustedVerificationLevel(level);
}

/** Read the traveler's verification level and decide if social mutations are allowed. */
export async function checkTrustedTraveler(userId: string): Promise<GuardResult> {
  const { data } = await supabase
    .from('traveler_profiles')
    .select('verification_level')
    .eq('id', userId)
    .maybeSingle();

  const level = (data?.verification_level as string | undefined) ?? 'unverified';
  return isVerifiedLevel(level) ? { ok: true, level } : { ok: false, level };
}

/** Standard 403 body for a gated social mutation. */
export function verificationRequiredResponse(level: string): NextResponse {
  return NextResponse.json({ error: 'verification_required', level }, { status: 403 });
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `npm run test:unit -- tests/unit/social-guard.test.ts`
Expected: PASS (2 tests).

- [ ] **Step 5: Commit**

```bash
git add services/social-guard.ts tests/unit/social-guard.test.ts
git commit -m "feat(social): add trusted-traveler RBAC guard"
```

---

### Task 2: Gate room create + join + leave routes

**Files:**
- Modify: `app/api/social/rooms/route.ts` (POST, after auth at line ~80-84)
- Modify: `app/api/social/rooms/[id]/join/route.ts` (POST, after auth at line ~11-14)
- Modify: `app/api/social/rooms/[id]/leave/route.ts` (POST, after auth)
- Modify: `app/api/social/messages/route.ts` (POST, after auth at line ~59-61)
- Modify: `app/api/social/requests/[id]/route.ts` (POST/accept handler, after auth at line ~13-15)
- Test: `tests/e2e/social-rbac.spec.ts` (added/extended in Task 8)

**Interfaces:**
- Consumes: `checkTrustedTraveler`, `verificationRequiredResponse` from `services/social-guard` (Task 1).
- Produces: gated mutation routes returning `403 verification_required` for non-trusted callers.

- [ ] **Step 1: Add the guard import and check to `rooms/route.ts` POST**

In `app/api/social/rooms/route.ts`, add the import at the top:

```ts
import { checkTrustedTraveler, verificationRequiredResponse } from '@/services/social-guard';
```

Then in `POST`, immediately after the existing auth block (`if (error || !user) { ... 401 }`), insert:

```ts
  const guard = await checkTrustedTraveler(user.id);
  if (!guard.ok) {
    return verificationRequiredResponse(guard.level);
  }
```

- [ ] **Step 2: Add the same guard to `rooms/[id]/join/route.ts` POST**

Add the import, then immediately after the `if (error || !user)` 401 block (line ~14), insert the identical 3-line guard check.

- [ ] **Step 3: Add the same guard to `rooms/[id]/leave/route.ts` POST**

Add the import, then immediately after the auth 401 block, insert the identical 3-line guard check.

- [ ] **Step 3b: Gate `messages/route.ts` POST and `requests/[id]/route.ts` POST**

In each file add the `import { checkTrustedTraveler, verificationRequiredResponse } from '@/services/social-guard';` line, then immediately after that handler's existing `if (error || !user)` 401 block insert the identical 3-line guard check. (`messages/route.ts` GET stays ungated — read.)

- [ ] **Step 4: Typecheck**

Run: `npm run typecheck`
Expected: PASS (no errors).

- [ ] **Step 5: Commit**

```bash
git add app/api/social/rooms app/api/social/messages/route.ts app/api/social/requests/[id]/route.ts
git commit -m "feat(social): gate room create/join/leave + messages + request-accept behind trusted verification"
```

---

### Task 3: Surface `verification_required` to the client via a typed error

**Files:**
- Modify: `services/social.ts` (`apiFetch`, lines ~112-135)
- Test: `tests/unit/social-fetch-error.test.ts`

**Interfaces:**
- Produces:
  - `class SocialApiError extends Error { status: number; code?: string; level?: string }`
  - `apiFetch` throws `SocialApiError` carrying `code` (= response body `error`) and `level` when present.

- [ ] **Step 1: Write the failing test**

```ts
// tests/unit/social-fetch-error.test.ts
import { test, expect } from '@playwright/test';
import { SocialApiError } from '../../services/social';

test('SocialApiError carries status and code', () => {
  const err = new SocialApiError('verification_required', 403, 'verification_required', 'unverified');
  expect(err.status).toBe(403);
  expect(err.code).toBe('verification_required');
  expect(err.level).toBe('unverified');
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npm run test:unit -- tests/unit/social-fetch-error.test.ts`
Expected: FAIL — `SocialApiError` is not exported.

- [ ] **Step 3: Implement the typed error and use it in `apiFetch`**

In `services/social.ts`, add near the top (after imports):

```ts
export class SocialApiError extends Error {
  status: number;
  code?: string;
  level?: string;
  constructor(message: string, status: number, code?: string, level?: string) {
    super(message);
    this.name = 'SocialApiError';
    this.status = status;
    this.code = code;
    this.level = level;
  }
}
```

Then replace the `if (!res.ok)` block inside `apiFetch` with:

```ts
  if (!res.ok) {
    const b = body as { error?: string; level?: string } | null;
    throw new SocialApiError(
      b?.error ?? `Social API error ${res.status}`,
      res.status,
      b?.error,
      b?.level
    );
  }
```

- [ ] **Step 4: Run test to verify it passes**

Run: `npm run test:unit -- tests/unit/social-fetch-error.test.ts`
Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add services/social.ts tests/unit/social-fetch-error.test.ts
git commit -m "feat(social): throw typed SocialApiError so client can detect verification_required"
```

---

### Task 4: Client gate hook + `VerifyToUnlock` upsell component

**Files:**
- Create: `hooks/useVerificationGate.ts`
- Create: `components/social/VerifyToUnlock.tsx`
- Test: `tests/unit/verification-gate.test.ts`

**Interfaces:**
- Consumes: `getMyProfile` and `startDiditVerification` from `services/social`; `isTrustedVerificationLevel` from `services/didit`; `SocialApiError` (Task 3).
- Produces:
  - `useVerificationGate(): { level: string; isVerified: boolean; loading: boolean; refresh: () => void }`
  - `isVerificationRequiredError(e: unknown): boolean` (exported from `hooks/useVerificationGate.ts`)
  - `<VerifyToUnlock open={boolean} onClose={() => void} returnTo?={string} />` — explains the requirement and triggers `startDiditVerification(returnTo)`.

- [ ] **Step 1: Write the failing test**

```ts
// tests/unit/verification-gate.test.ts
import { test, expect } from '@playwright/test';
import { isVerificationRequiredError } from '../../hooks/useVerificationGate';
import { SocialApiError } from '../../services/social';

test('detects a verification_required SocialApiError', () => {
  expect(isVerificationRequiredError(new SocialApiError('x', 403, 'verification_required'))).toBe(true);
});

test('ignores other errors', () => {
  expect(isVerificationRequiredError(new SocialApiError('x', 500, 'boom'))).toBe(false);
  expect(isVerificationRequiredError(new Error('plain'))).toBe(false);
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npm run test:unit -- tests/unit/verification-gate.test.ts`
Expected: FAIL — module not found.

- [ ] **Step 3: Implement the hook**

```ts
// hooks/useVerificationGate.ts
'use client';

import { useCallback, useEffect, useState } from 'react';
import { getMyProfile } from '@/services/social';
import { SocialApiError } from '@/services/social';
import { isTrustedVerificationLevel } from '@/services/didit';

export function isVerificationRequiredError(e: unknown): boolean {
  return e instanceof SocialApiError && e.code === 'verification_required';
}

export function useVerificationGate() {
  const [level, setLevel] = useState<string>('unverified');
  const [loading, setLoading] = useState(true);

  const refresh = useCallback(() => {
    setLoading(true);
    getMyProfile()
      .then(p => setLevel((p?.verification_level as string | undefined) ?? 'unverified'))
      .catch(() => setLevel('unverified'))
      .finally(() => setLoading(false));
  }, []);

  useEffect(() => { refresh(); }, [refresh]);

  return { level, isVerified: isTrustedVerificationLevel(level), loading, refresh };
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `npm run test:unit -- tests/unit/verification-gate.test.ts`
Expected: PASS.

- [ ] **Step 5: Implement `VerifyToUnlock` component**

```tsx
// components/social/VerifyToUnlock.tsx
'use client';

import { ShieldCheck, X } from 'lucide-react';
import { startDiditVerification } from '@/services/social';

interface VerifyToUnlockProps {
  open: boolean;
  onClose: () => void;
  returnTo?: string;
}

export function VerifyToUnlock({ open, onClose, returnTo }: VerifyToUnlockProps) {
  if (!open) return null;

  async function handleVerify() {
    const { url } = await startDiditVerification(returnTo);
    if (url) window.location.href = url;
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4" role="dialog" aria-modal="true">
      <div className="w-full max-w-md rounded-3xl bg-white p-6 shadow-2xl">
        <div className="flex items-start justify-between">
          <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-[#EEEDFE] text-[#6C63FF]">
            <ShieldCheck className="h-5 w-5" />
          </div>
          <button onClick={onClose} aria-label="Close" className="rounded-lg p-1 text-slate-400 hover:bg-slate-100">
            <X className="h-5 w-5" />
          </button>
        </div>
        <h2 className="mt-4 text-lg font-semibold text-[#3F3D56]">Verify to unlock Open Trips</h2>
        <p className="mt-2 text-sm leading-6 text-[#6F6C82]">
          To create or join public trips and keep the community safe, confirm your identity with Didit. It takes a couple of minutes.
        </p>
        <div className="mt-6 flex gap-3">
          <button onClick={onClose} className="flex-1 rounded-xl border border-slate-200 px-4 py-2.5 text-sm font-semibold text-[#6F6C82]">
            Not now
          </button>
          <button onClick={handleVerify} className="flex-1 rounded-xl bg-[#6C63FF] px-4 py-2.5 text-sm font-semibold text-white">
            Verify with Didit
          </button>
        </div>
      </div>
    </div>
  );
}
```

> Note: confirm `startDiditVerification` returns `{ url }` (see `services/social.ts:174`). If the property differs, use the actual returned field name.

- [ ] **Step 6: Typecheck + commit**

Run: `npm run typecheck`
Expected: PASS.

```bash
git add hooks/useVerificationGate.ts components/social/VerifyToUnlock.tsx tests/unit/verification-gate.test.ts
git commit -m "feat(social): add useVerificationGate hook and VerifyToUnlock upsell"
```

---

### Task 5: Open Trips discovery + create UI

**Files:**
- Create: `components/social/OpenTripsPanel.tsx`
- Create: `components/social/CreateOpenTripModal.tsx`
- Modify: `app/dashboard/community/page.tsx` (mount the panel)
- Test: covered by e2e in Task 8.

**Interfaces:**
- Consumes: `listTripRooms`, `listMyTripRooms`, `createTripRoom`, `type TripRoom` from `services/social`; `useVerificationGate`, `isVerificationRequiredError` (Task 4); `VerifyToUnlock` (Task 4).
- Produces: `<OpenTripsPanel />` (default export not required; named export `OpenTripsPanel`).

- [ ] **Step 1: Implement `CreateOpenTripModal`**

```tsx
// components/social/CreateOpenTripModal.tsx
'use client';

import { useState } from 'react';
import { X } from 'lucide-react';
import { createTripRoom, type TripRoom } from '@/services/social';

interface Props {
  open: boolean;
  onClose: () => void;
  onCreated: (room: TripRoom) => void;
  onNeedsVerification: () => void;
}

export function CreateOpenTripModal({ open, onClose, onCreated, onNeedsVerification }: Props) {
  const [destination, setDestination] = useState('');
  const [title, setTitle] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');

  if (!open) return null;

  async function handleSubmit() {
    if (!destination.trim()) { setError('Destination is required'); return; }
    setSubmitting(true);
    setError('');
    try {
      const room = await createTripRoom({ destination: destination.trim(), title: title.trim() || undefined });
      onCreated(room);
      onClose();
    } catch (e) {
      const { isVerificationRequiredError } = await import('@/hooks/useVerificationGate');
      if (isVerificationRequiredError(e)) { onNeedsVerification(); onClose(); return; }
      setError(e instanceof Error ? e.message : 'Could not create trip');
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4" role="dialog" aria-modal="true">
      <div className="w-full max-w-md rounded-3xl bg-white p-6 shadow-2xl">
        <div className="flex items-center justify-between">
          <h2 className="text-lg font-semibold text-[#3F3D56]">Create an Open Trip</h2>
          <button onClick={onClose} aria-label="Close" className="rounded-lg p-1 text-slate-400 hover:bg-slate-100"><X className="h-5 w-5" /></button>
        </div>
        <label className="mt-4 block text-sm font-medium text-[#53506A]">Destination</label>
        <input value={destination} onChange={e => setDestination(e.target.value)} placeholder="e.g. Mumbai"
          className="mt-1 w-full rounded-xl border border-slate-200 px-3 py-2.5 text-sm" />
        <label className="mt-4 block text-sm font-medium text-[#53506A]">Title (optional)</label>
        <input value={title} onChange={e => setTitle(e.target.value)} placeholder="Weekend in Mumbai"
          className="mt-1 w-full rounded-xl border border-slate-200 px-3 py-2.5 text-sm" />
        {error && <p className="mt-3 text-sm text-[#C14D72]">{error}</p>}
        <button onClick={handleSubmit} disabled={submitting}
          className="mt-6 w-full rounded-xl bg-[#6C63FF] px-4 py-2.5 text-sm font-semibold text-white disabled:opacity-60">
          {submitting ? 'Creating…' : 'Create Open Trip'}
        </button>
      </div>
    </div>
  );
}
```

- [ ] **Step 2: Implement `OpenTripsPanel`**

```tsx
// components/social/OpenTripsPanel.tsx
'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { Plus, Users } from 'lucide-react';
import { listTripRooms, listMyTripRooms, type TripRoom } from '@/services/social';
import { useVerificationGate } from '@/hooks/useVerificationGate';
import { VerifyToUnlock } from '@/components/social/VerifyToUnlock';
import { CreateOpenTripModal } from '@/components/social/CreateOpenTripModal';

export function OpenTripsPanel() {
  const { isVerified } = useVerificationGate();
  const [rooms, setRooms] = useState<TripRoom[]>([]);
  const [mine, setMine] = useState<TripRoom[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [showCreate, setShowCreate] = useState(false);
  const [showVerify, setShowVerify] = useState(false);

  function load() {
    setLoading(true);
    Promise.all([listTripRooms(), listMyTripRooms()])
      .then(([all, m]) => { setRooms(all); setMine(m); })
      .catch(e => setError(e instanceof Error ? e.message : 'Failed to load Open Trips'))
      .finally(() => setLoading(false));
  }

  useEffect(load, []);

  function handleCreateClick() {
    if (!isVerified) { setShowVerify(true); return; }
    setShowCreate(true);
  }

  return (
    <section className="space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-lg font-semibold text-[#3F3D56]">Open Trips</h2>
          <p className="text-sm text-[#6F6C82]">Public trips you can join, or start your own.</p>
        </div>
        <button onClick={handleCreateClick} className="inline-flex items-center gap-2 rounded-xl bg-[#6C63FF] px-4 py-2.5 text-sm font-semibold text-white">
          <Plus className="h-4 w-4" /> Create
        </button>
      </div>

      {loading && <p className="text-sm text-[#6F6C82]">Loading Open Trips…</p>}
      {error && <p className="text-sm text-[#C14D72]">{error}</p>}
      {!loading && !error && rooms.length === 0 && (
        <div className="rounded-2xl border border-dashed border-slate-200 p-8 text-center text-sm text-[#6F6C82]">
          No Open Trips yet. Be the first to start one.
        </div>
      )}

      <div className="grid gap-3 sm:grid-cols-2">
        {rooms.map(room => (
          <Link key={room.id} href={`/rooms/${room.id}`}
            className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm transition hover:border-[#6C63FF]/40">
            <div className="text-sm font-semibold text-[#3F3D56]">{room.title}</div>
            <div className="mt-1 text-xs text-[#6F6C82]">{room.destination}</div>
            <div className="mt-3 inline-flex items-center gap-1.5 text-xs text-[#6F6C82]">
              <Users className="h-3.5 w-3.5" /> {room.member_count} traveler{room.member_count === 1 ? '' : 's'}
            </div>
          </Link>
        ))}
      </div>

      <CreateOpenTripModal open={showCreate} onClose={() => setShowCreate(false)}
        onCreated={() => load()} onNeedsVerification={() => setShowVerify(true)} />
      <VerifyToUnlock open={showVerify} onClose={() => setShowVerify(false)} returnTo="/dashboard/community" />
    </section>
  );
}
```

- [ ] **Step 3: Mount the panel in the community page**

In `app/dashboard/community/page.tsx`, add the import:

```tsx
import { OpenTripsPanel } from '@/components/social/OpenTripsPanel';
```

Render `<OpenTripsPanel />` inside the main content area (above or below the existing settings sections — place it as the first content block under the header).

- [ ] **Step 4: Typecheck + lint**

Run: `npm run typecheck && npm run lint`
Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add components/social/OpenTripsPanel.tsx components/social/CreateOpenTripModal.tsx app/dashboard/community/page.tsx
git commit -m "feat(social): Open Trips discovery + create UI in community page"
```

---

### Task 6: Open Trip detail page `app/rooms/[id]`

**Files:**
- Create: `app/rooms/[id]/page.tsx`
- Create: `components/social/OpenTripDetail.tsx`
- Test: covered by e2e in Task 8.

**Interfaces:**
- Consumes: `getTripRoom`, `joinTripRoom`, `leaveTripRoom`, `type TripRoom`, `type TripRoomMember` from `services/social`; `useVerificationGate`, `isVerificationRequiredError`, `VerifyToUnlock` (Task 4).
- Produces: a route rendering room title/destination/members with Join/Leave.

- [ ] **Step 1: Implement the client detail component**

```tsx
// components/social/OpenTripDetail.tsx
'use client';

import { useEffect, useState } from 'react';
import { useParams } from 'next/navigation';
import Link from 'next/link';
import { ArrowLeft, Users } from 'lucide-react';
import { getTripRoom, joinTripRoom, leaveTripRoom, type TripRoom, type TripRoomMember } from '@/services/social';
import { useVerificationGate, isVerificationRequiredError } from '@/hooks/useVerificationGate';
import { VerifyToUnlock } from '@/components/social/VerifyToUnlock';

type RoomDetail = TripRoom & { members: TripRoomMember[] };

export function OpenTripDetail() {
  const params = useParams<{ id: string }>();
  const roomId = params.id;
  const { isVerified } = useVerificationGate();
  const [room, setRoom] = useState<RoomDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);
  const [showVerify, setShowVerify] = useState(false);

  function load() {
    setLoading(true);
    getTripRoom(roomId)
      .then(setRoom)
      .catch(e => setError(e instanceof Error ? e.message : 'Could not load this trip'))
      .finally(() => setLoading(false));
  }

  useEffect(() => { if (roomId) load(); }, [roomId]);

  async function handleJoin() {
    if (!isVerified) { setShowVerify(true); return; }
    setBusy(true);
    try { await joinTripRoom(roomId); load(); }
    catch (e) { if (isVerificationRequiredError(e)) setShowVerify(true); else setError(e instanceof Error ? e.message : 'Could not join'); }
    finally { setBusy(false); }
  }

  async function handleLeave() {
    setBusy(true);
    try { await leaveTripRoom(roomId); load(); }
    catch (e) { setError(e instanceof Error ? e.message : 'Could not leave'); }
    finally { setBusy(false); }
  }

  if (loading) return <p className="p-8 text-sm text-[#6F6C82]">Loading…</p>;
  if (error) return <p className="p-8 text-sm text-[#C14D72]">{error}</p>;
  if (!room) return <p className="p-8 text-sm text-[#6F6C82]">Trip not found.</p>;

  return (
    <div className="mx-auto max-w-2xl px-4 py-8 sm:px-6">
      <Link href="/dashboard/community" className="inline-flex items-center gap-1.5 text-sm text-[#6F6C82]">
        <ArrowLeft className="h-4 w-4" /> Back
      </Link>
      <h1 className="mt-4 text-2xl font-semibold text-[#3F3D56]">{room.title}</h1>
      <p className="mt-1 text-sm text-[#6F6C82]">{room.destination}</p>
      <div className="mt-3 inline-flex items-center gap-1.5 text-sm text-[#6F6C82]">
        <Users className="h-4 w-4" /> {room.members.length} traveler{room.members.length === 1 ? '' : 's'}
      </div>

      <div className="mt-6">
        {room.is_member ? (
          <button onClick={handleLeave} disabled={busy || room.current_user_role === 'host'}
            className="rounded-xl border border-slate-200 px-5 py-2.5 text-sm font-semibold text-[#6F6C82] disabled:opacity-60">
            {room.current_user_role === 'host' ? 'You host this trip' : busy ? 'Leaving…' : 'Leave trip'}
          </button>
        ) : (
          <button onClick={handleJoin} disabled={busy}
            className="rounded-xl bg-[#6C63FF] px-5 py-2.5 text-sm font-semibold text-white disabled:opacity-60">
            {busy ? 'Joining…' : 'Join this trip'}
          </button>
        )}
      </div>

      <VerifyToUnlock open={showVerify} onClose={() => setShowVerify(false)} returnTo={`/rooms/${roomId}`} />
    </div>
  );
}
```

> Note: confirm `TripRoom` exposes `is_member` and `current_user_role` (the rooms API returns them, see `app/api/social/rooms/route.ts:65-70`). If the `TripRoom` type omits them, add them to the interface in `services/social.ts`.

- [ ] **Step 2: Implement the route**

```tsx
// app/rooms/[id]/page.tsx
import { OpenTripDetail } from '@/components/social/OpenTripDetail';

export default function OpenTripPage() {
  return (
    <main className="min-h-screen bg-[#F8FAFC] text-[#3F3D56]">
      <OpenTripDetail />
    </main>
  );
}
```

- [ ] **Step 3: Typecheck**

Run: `npm run typecheck`
Expected: PASS. (If `is_member`/`current_user_role` are missing from `TripRoom`, add them as `is_member?: boolean; current_user_role?: string | null;` to the interface in `services/social.ts`, then re-run.)

- [ ] **Step 4: Commit**

```bash
git add app/rooms/[id]/page.tsx components/social/OpenTripDetail.tsx services/social.ts
git commit -m "feat(social): Open Trip detail page with join/leave"
```

---

### Task 7: Fix landing "Plan with more flow" visibility + remove dead Hero

**Files:**
- Modify: `app/page.tsx` (hero word-reveal block, around lines 152+)
- Delete: `components/home/Hero.tsx` (after confirming unreferenced)

- [ ] **Step 1: Confirm `Hero.tsx` is unreferenced**

Run: `grep -rn "components/home/Hero\|from '@/components/home/Hero'\|home/Hero" app components --include="*.tsx"`
Expected: no matches outside `components/home/Hero.tsx` itself. If matches exist, do NOT delete; only fix `app/page.tsx`.

- [ ] **Step 2: Inspect the word-reveal in `app/page.tsx`**

Run: `grep -n "Plan with\|opacity\|whileInView\|word\|reveal\|animate" app/page.tsx | head -40`
Identify the element wrapping "Plan with more flow" and its framer-motion `initial`/`animate`/`whileInView` props.

- [ ] **Step 3: Make the final state fully visible + honor reduced motion**

Ensure the tagline's motion settles at `opacity: 1` and is not gated on an in-view trigger that may never fire. Pattern to apply (adapt to the actual element found in Step 2):

```tsx
// Where the tagline animates in, ensure a guaranteed-visible end state:
<motion.span
  initial={shouldReduceMotion ? false : { opacity: 0, y: 12 }}
  animate={{ opacity: 1, y: 0 }}      // animate (not whileInView) so it always resolves
  transition={{ duration: 0.5, delay: 0.1 }}
  className="block text-[#6C63FF]"
>
  Plan with more flow.
</motion.span>
```

`shouldReduceMotion` comes from the existing `useReducedMotion()` already imported in `app/page.tsx` (line 5). When reduced motion is on, `initial={false}` renders the final (visible) state immediately.

- [ ] **Step 4: Verify in the running app**

Run: `npm run dev` (background), open `http://localhost:3000/`, confirm "Plan with more flow." is visible on load and after reload; toggle OS reduced-motion and confirm it is still visible. Stop dev server.

- [ ] **Step 5: Delete dead Hero (only if Step 1 confirmed unreferenced)**

```bash
git rm components/home/Hero.tsx
```

- [ ] **Step 6: Typecheck + commit**

Run: `npm run typecheck`
Expected: PASS.

```bash
git add app/page.tsx
git commit -m "fix(landing): ensure 'Plan with more flow' tagline is visible; remove dead Hero"
```

---

### Task 8: E2E coverage + UI/UX pass + full QA gate

**Files:**
- Create: `tests/e2e/social-open-trips.spec.ts`
- Create: `tests/e2e/social-rbac.spec.ts`
- Create: `tests/e2e/landing-tagline.spec.ts`
- Modify: social components for UI/UX polish (within Sunset tokens)

**Interfaces:**
- Consumes: existing e2e auth/login helpers in `tests/e2e/` (follow the patterns in the existing auth e2e test referenced by commit `73a72ba`).

- [ ] **Step 1: Landing tagline e2e**

```ts
// tests/e2e/landing-tagline.spec.ts
import { test, expect } from '@playwright/test';

test('landing shows "Plan with more flow"', async ({ page }) => {
  await page.goto('/');
  await expect(page.getByText('Plan with more flow.')).toBeVisible();
});
```

- [ ] **Step 2: Run it**

Run: `npm run test:e2e -- tests/e2e/landing-tagline.spec.ts`
Expected: PASS.

- [ ] **Step 3: RBAC divergence e2e**

Write `tests/e2e/social-rbac.spec.ts` using the existing login helper to sign in as an UNVERIFIED user, navigate to `/dashboard/community`, click **Create**, and assert the `VerifyToUnlock` dialog appears (`getByRole('dialog')` containing "Verify to unlock Open Trips"). Follow the auth setup pattern from the existing auth e2e test (cookie consent init per commit `73a72ba`).

- [ ] **Step 4: Open Trip happy-path e2e**

Write `tests/e2e/social-open-trips.spec.ts`: as a verified user (use a seeded trusted account or stub the profile fetch per existing e2e conventions), create an Open Trip, assert it appears in the list, open its detail page, and assert Join/Leave control renders. If the test environment lacks a trusted seed user, document the required seed in the test file header and skip with `test.fixme` rather than leaving a false pass.

- [ ] **Step 5: UI/UX polish pass**

Invoke the ui-ux-pro-max skill to review `OpenTripsPanel`, `CreateOpenTripModal`, `OpenTripDetail`, and `VerifyToUnlock` for spacing, hierarchy, interaction states, and accessibility within the Sunset/Adventure system. Apply its concrete recommendations (focus states, disabled states, empty/loading polish). Do not recolor outside the token set.

- [ ] **Step 6: Full QA gate**

Run: `npm run typecheck && npm run lint && npm run test:unit && npm run test:e2e && npm run build`
Expected: all PASS. Fix any failures before committing.

- [ ] **Step 7: Commit**

```bash
git add tests/e2e/social-open-trips.spec.ts tests/e2e/social-rbac.spec.ts tests/e2e/landing-tagline.spec.ts components/social
git commit -m "test(social): e2e for Open Trips, RBAC gate, landing tagline; UI/UX polish"
```

---

## Self-Review

**Spec coverage:**
- RBAC server gate → Tasks 1, 2. Client upsell → Tasks 3, 4. Open Trip create/join/detail → Tasks 5, 6. Landing fix + dead Hero removal → Task 7. UI/UX pass + tests → Task 8. ✓ All spec sections mapped.
- Graceful degradation / migration risk: routes already follow the existing pattern; Task 8 Step 4 explicitly handles missing trusted-seed by `test.fixme` rather than false pass. ✓

**Placeholder scan:** No TBD/TODO. All code steps include real code. Two explicit "confirm X" notes (startDiditVerification return shape, TripRoom member fields) are verification steps with a concrete fallback action, not placeholders. ✓

**Type consistency:** `SocialApiError` (Task 3) used in Tasks 4–6. `isVerificationRequiredError`/`useVerificationGate` (Task 4) consumed in Tasks 5–6. `checkTrustedTraveler`/`verificationRequiredResponse` (Task 1) consumed in Task 2. `RoomDetail = TripRoom & { members }` matches `getTripRoom` return. ✓

**Note for executor:** All social mutations named in the spec are gated in Task 2 (rooms create/join/leave, messages POST, request-accept). Legacy `waves` routes overlap with `requests` and are intentionally left as-is for a future cleanup slice, per the spec's Risks/Open Items.
