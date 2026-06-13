# TravelMate (Wayflo) — Production Readiness Audit

**Application:** Wayflo (TravelMate) — Next.js 15 · React 19 · Supabase
**Audit date:** 12 June 2026
**Scope:** 52 API routes · ~35 services · auth, social, trips, admin, and external-integration layers
**Status:** Structurally sound and builds clean. Ships to production **after** the Critical items below are resolved.

---

## 1. Executive Summary

The application is well-architected, type-safe, and compiles cleanly. It is **not yet production-ready** — but the gaps are in **authorization and abuse-prevention**, not in architecture. None of the blockers are large changes; most are a missing auth guard or a single incorrect lookup.

| Priority | Count | Theme |
| --- | --- | --- |
| 🔴 Critical | 4 | Unauthenticated paid endpoints, forgeable verification, missing RLS policy, weak admin auth |
| 🟠 High | 4 | IDOR, unvalidated input merge, silent key fallback |
| 🟡 Medium | 5 | No rate limiting, cost amplification, enumeration |
| 🟢 Low | 4 | Lint, dead code, image optimization, input validation polish |

---

## 2. Baseline Health

| Check | Result |
| --- | --- |
| `tsc --noEmit` | ✅ **Passes** — no type errors |
| `next build` | ✅ **Passes** — all 52 routes compile |
| `eslint` | ⚠️ 5 errors, 30 warnings — all trivial (unused vars, `any`, `<img>`) |
| RLS coverage | ⚠️ 10 of 11 tables protected |
| Rate limiting | ❌ **None anywhere** |
| E2E tests | ⚠️ Playwright configured; coverage is thin |

---

## 3. 🔴 Critical — Fix Before Any Production Traffic

### C-1 · Paid LLM endpoints have no authentication → unbounded cost
**Files:** `app/api/generate-itinerary/route.ts:5` (confirmed), plus `generate-itinerary-real`, `generate-itinerary-agentic`, `generate-itinerary-gemini`, and `app/api/chat-agent/route.ts`

Anyone with the URL can POST in a loop and run up the Gemini / NVIDIA bill. The endpoints accept arbitrary bodies with no caller identity.

**Fix:** Add `getAuthenticatedUser(request)` → return 401 at the top of each route, and rate-limit per user.

---

### C-2 · Identity verification can be forged
**File:** `app/api/social/verification/didit/callback/route.ts:20-30`

The callback marks the profile named by `decision.vendor_data` as verified. `vendor_data` is attacker-influenceable, so anyone can get **any** profile marked "verified / trusted."

**Fix:** Never trust `vendor_data`. Look up the profile **only** by the stored `verification_session_id`, and rely on the signed webhook (`app/api/webhooks/didit/route.ts` — whose signature check is correctly constant-time) as the source of truth.

---

### C-3 · `signup_verification_tokens` has RLS enabled but zero policies
**File:** `supabase/migrations/20260415_add_signup_verification_tokens.sql`

RLS is enabled but no policies are defined. If the anon key ever touches this table, token hashes leak → account takeover.

**Fix:** Add `user_id`-scoped `select` / `update` policies, **or** confirm the table is only ever reached via the service-role client and document that explicitly.

---

### C-4 · Admin password compared non-constant-time + bootstrap unthrottled
**Files:** `services/admin-access.ts:26` · `app/api/auth/admin/bootstrap/route.ts`

`password !== getAdminPassword()` is timing-vulnerable, and the bootstrap path has no rate limit. A single shared admin password is brute-forceable.

**Fix:**
- Use `crypto.timingSafeEqual` for the comparison.
- Rate-limit / lock the bootstrap path.
- Move admin authorization to a Supabase `app_metadata.role` flag (bootstrap already sets one) instead of email-string matching.

---

## 4. 🟠 High

| ID | Issue | Location | Fix |
| --- | --- | --- | --- |
| H-1 | **IDOR on wave-accept** — accepting a connection doesn't verify a wave actually exists from that user; lets you force connections without consent. | `app/api/social/waves/[userId]` | Verify `status='wave'` exists from that user first. |
| H-2 | **`profile/preferences` merges the whole body** — falls back to `body` if no `preferences` key; no allowlist. | `app/api/profile/preferences/route.ts` | Add a strict key allowlist (e.g. Zod schema). |
| H-3 | **Service-role client silently falls back to anon key** — degrades security with no signal. | `services/supabase-admin.ts:6` | Throw if `SUPABASE_SERVICE_ROLE_KEY` is missing. |
| H-4 | **App-layer ownership is the only guard on some trip routes** — acceptable only while `trips` RLS (`auth.uid() = user_id`) stays enabled. | trip routes | Keep `trips` RLS enabled; never remove it. |

---

## 5. 🟡 Medium

| ID | Issue | Location | Fix |
| --- | --- | --- | --- |
| M-1 | **No rate limiting** across the entire API surface (auth, LLM, email-sending share routes). | API-wide | Add Upstash / `@vercel/ratelimit` on auth + LLM + email endpoints at minimum. |
| M-2 | **`chat-agent` accepts unbounded `conversationHistory`** → token-cost amplification. | `app/api/chat-agent/route.ts` | Cap to ~20 messages. |
| M-3 | **`places` / `pois` don't clamp `radius`** → upstream Overpass DoS. | `app/api/places`, `app/api/pois` | `Math.min(radius, 50000)`. |
| M-4 | **Room member list may return profiles without requiring membership** → traveler enumeration. | `app/api/social/rooms/[id]` | Gate response on membership. |
| M-5 | **Invalid JSON silently treated as empty** in preferences route. | `app/api/profile/preferences/route.ts` | Return HTTP 400 on parse failure. |

---

## 6. 🟢 Low / Cleanup

- **Lint:** 5 errors + 30 warnings (unused imports; `any` in `hooks/useApi.ts` and `types/gifenc.d.ts`). Run `eslint --fix`, then clear the remainder.
- **Image optimization:** `<img>` instead of `next/image` in `components/common/DestinationPhotoCover.tsx:111`.
- **Dead code:** `coordinatesMatch`, `getDisplayFrom`, and several unused vars flagged by lint.
- **Input validation polish:** Validate UUID params before DB lookups; add max-length on `guestName` / `bio` before email/render.

---

## 7. What's Already Done Well ✅

- Webhook signature verification **is** constant-time (`services/didit.ts`).
- `image-proxy` has a strict host allowlist + `https`-only — **no SSRF**.
- Server-only secrets (`GEMINI`, `NVIDIA`, `DIDIT`) are not `NEXT_PUBLIC` and aren't logged.
- External fetches use `AbortController` timeouts.
- `.env` is gitignored and untracked.
- 10 of 11 tables have RLS with real policies.

---

## 8. Recommended Path to Production

1. **This week (blockers):** the 4 Critical items + add a rate-limiter. None are large changes — mostly an auth guard and the Didit lookup fix.
2. **Before launch:** the High items (IDOR, preferences allowlist, service-role throw).
3. **Polish:** Medium / Low items, lint cleanup, and expanded Playwright tests around auth and trip ownership.

---

## Appendix · Severity Definitions

| Severity | Meaning |
| --- | --- |
| 🔴 **Critical** | Exploitable for account takeover, financial abuse, or data breach. Block production. |
| 🟠 **High** | Real authorization/data-integrity gap; fix before launch. |
| 🟡 **Medium** | Abuse or enumeration risk; fix shortly after launch. |
| 🟢 **Low** | Hygiene, performance, and maintainability. |

*Generated as part of a structured production-readiness review. File references use `path:line` from the repository root.*
