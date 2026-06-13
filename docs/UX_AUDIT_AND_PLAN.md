# TravelMate (Wayflo) — UX Audit & Remediation Plan

**Application:** Wayflo (TravelMate) — Next.js 15 · React 19
**Audit date:** 12 June 2026
**Scope:** Landing, auth, onboarding, itinerary generation, trip view, dashboard, social/rooms, modals, and shared UI primitives
**Goal:** A prioritized, followable plan to take the UX from "rough" to polished and production-grade.

> **Implementation status (updated):** Phase 0 foundations (F1 toast, F2 Modal, F3 Button) are built and wired.
> Phase 1 high-priority items H-1…H-12 are resolved, plus Phase 2 items M-3, M-4, M-5, M-6, M-7, M-8, M-10, M-11, M-13, M-16
> and assorted Phase 3 polish (input focus rings, status icons, backdrop opacity, time estimate).
> Remaining open: M-1/M-2 inline onboarding field validation, M-9 suggestion-form reset, M-12/M-14/M-15 broader a11y
> standardization, and Phase 4 Playwright smoke tests.

---

## 1. Executive Summary

The app is feature-complete but the UX feels rough because of **a few systemic root causes**, not hundreds of unrelated bugs. Fix the roots and most of the symptoms disappear:

| # | Root cause | Symptom it creates everywhere |
| --- | --- | --- |
| R1 | **No toast / feedback system** | Actions (wave, message, share, save) succeed or fail silently or via full page reload. |
| R2 | **Shared `Button` primitive exists but is unused; `Modal` is an empty stub** | Every page hand-rolls button & modal styles → inconsistent look, no focus trap, no Escape-to-close. |
| R3 | **No route-level loading / error / empty states** | Slow LLM calls and failures show nothing helpful; users stare at frozen UI or hidden errors. |
| R4 | **Validation is on-submit only, with generic errors** | Users can't tell which field is wrong or why an action is blocked. |
| R5 | **Thin accessibility** | Missing focus rings, focus traps, aria labels, keyboard support; native `window.confirm`. |

**Recommended approach:** Build the 3 shared building blocks first (toast, real Modal, adopt Button), then sweep the flows. This converts ~40 scattered findings into ~5 reusable fixes plus mechanical adoption.

### Findings by severity
| Priority | Count | Theme |
| --- | --- | --- |
| 🔴 High | 12 | Hidden errors, silent action failures, broken modal a11y, no double-submit guard |
| 🟡 Medium | 16 | Inconsistent loading/empty states, weak validation feedback, no destructive-action confirms |
| 🟢 Low | 12 | Focus rings, contrast, microcopy, skeleton polish |

---

## 2. The 3 Foundations (build these first)

These are the highest-leverage changes. Do them before the per-flow sweep.

### F1 · Add a toast/notification system  *(fixes R1)*
- **Why:** Today, `WaveButton`, `MessageButton`, `CompanionStrip`, and others swallow errors silently or give no success confirmation.
- **Do:** Add a lightweight toast provider (e.g. `sonner`) in `app/providers.tsx`. Expose `toast.success()` / `toast.error()`.
- **Then:** Replace every silent `catch {}` and every "did it work?" moment with a toast.

### F2 · Make `Modal` a real primitive  *(fixes R2 + R5 for dialogs)*
- **Why:** `components/ui/modal.tsx` is currently an empty `<div>` pass-through. Every modal (`ShareModal`, the 3 trip-page modals, `CookieConsentModal`) reimplements backdrop/close logic inconsistently and **none trap focus or close on Escape**.
- **Do:** Build a proper `Modal` with: backdrop, click-outside-to-close, **Escape-to-close**, **focus trap**, focus-on-open, `role="dialog"` + `aria-modal="true"` + `aria-label`, and scroll lock.
- **Then:** Migrate all existing modals onto it. This single component resolves ~6 separate High/Medium a11y findings.

### F3 · Adopt the existing `Button` primitive  *(fixes R2)*
- **Why:** `components/ui/button.tsx` already has `variant` + `size` + focus ring + disabled styling — but pages hand-roll their own button classes, so styling drifts (auth uses `#3F3D56`, trip uses `#6C63FF`, social uses bordered pills) and disabled states look enabled.
- **Do:** Extend variants if needed (e.g. `destructive`), then replace ad-hoc `<button className="...">` across auth/trip/social/onboarding with `<Button variant=... size=...>`.
- **Then:** Disabled/loading states become consistent for free.

---

## 3. 🔴 High-Priority Findings

> Many of these are **resolved by the foundations above** — noted as *(F1/F2/F3)*.

| ID | Area | Problem | Location | Fix |
| --- | --- | --- | --- | --- |
| H-1 | Onboarding | On generation failure, the loading modal stays up and the error is hidden behind it — user sees an infinite spinner. | `app/dashboard/onboarding/page.tsx:465-505` | Close loader on error; show an error state with **Retry** / **Go back**. |
| H-2 | Onboarding | No guard against double-submit on Generate; two LLM calls can fire. | `app/dashboard/onboarding/page.tsx:1008-1035` | Set a `generatingRef` flag at the start of the handler; ignore re-entry. |
| H-3 | Onboarding | Back button is `disabled` during loading but has no disabled styling — looks clickable. | `app/dashboard/onboarding/page.tsx:1001-1010` | Apply disabled styling (via `Button`, **F3**). |
| H-4 | Social | Wave send/retract failures are silently swallowed; button stuck in loading. | `WaveButton.tsx:26-46` | Surface error toast **(F1)**; reset loading state. |
| H-5 | Social | Send-message button shows only "Sending…" text, no spinner; loading set after async starts (race). | `MessageButton.tsx:119-127, 28-45` | Add spinner icon; set `setSending(true)` **before** the await. |
| H-6 | Trip | Share modal doesn't move focus into the dialog on open. | `app/trip/[id]/page.tsx:380-387` | Focus-on-open **(F2)**. |
| H-7 | Trip | Modals can't be closed with Escape. | `ShareModal.tsx:154-297` + trip modals | Escape handler **(F2)**. |
| H-8 | Trip | Three trip-page modals lack focus traps — Tab escapes to the page behind. | `app/trip/[id]/page.tsx:687-939` | Focus trap **(F2)**. |
| H-9 | Auth | Error and success messages share the same accent color, so users can't tell failure from success. | `AuthForm.tsx:227-237` | Distinct error color; show only one of error/message at a time. |
| H-10 | Auth | No success confirmation after signup — page silently redirects. | `AuthForm.tsx:188-246` | Show "Check your email to confirm" before redirect (or toast, **F1**). |
| H-11 | A11y | Share links rendered as `<button>` calling `window.open()` — announced as "button" but navigate. | `ShareModal.tsx` share actions | Use `<a target="_blank" rel="noopener noreferrer">`. |
| H-12 | Rooms | "Leave room" leaves instantly with no confirmation; uses no/native dialog elsewhere. | `app/rooms/[id]/page.tsx:109-127` | In-app confirmation dialog **(F2)**. |

---

## 4. 🟡 Medium-Priority Findings

| ID | Area | Problem | Location | Fix |
| --- | --- | --- | --- | --- |
| M-1 | Onboarding | Validation blocks the Next/Generate button but never says *which* field is invalid. | `onboarding/page.tsx:187-217` | Inline per-field messages ("Budget must be greater than $0", "Pick a destination from search"). |
| M-2 | Onboarding | Destination search dropdown shows static "Searching…" with no spinner. | `onboarding/page.tsx:670-691` | Add inline spinner/pulse. |
| M-3 | Dashboard | Empty state copy is jargon ("feed the AI generator"). | `app/dashboard/page.tsx:779-793` | "Create your first itinerary — start with a destination." |
| M-4 | Landing | Empty destination list shows fake placeholder cards, masking load failure. | `app/page.tsx:195-201` | Show real empty/failure message instead of fake copy. |
| M-5 | Auth | Forgot-password success gives no next-step guidance. | `ForgotPasswordForm.tsx:33-34` | "Check your email (may take a minute)" + "Back to login". |
| M-6 | Auth | Password-mismatch error doesn't indicate which field. | `ResetPasswordForm.tsx:46-76` | Field-level error styling on both inputs. |
| M-7 | Trip | Share modal action buttons stay enabled while link is generating. | `ShareModal.tsx:226-244` | Disable actions during loading. |
| M-8 | Trip | "Retry stay" modal has both "Close" and "Cancel" — unclear difference. | `app/trip/[id]/page.tsx:686-758` | Single exit affordance, consistent label. |
| M-9 | Trip | Suggestion form doesn't reset/confirm clearly after submit. | `PublicTripShare.tsx:56-87` | Show success state, then reset form. |
| M-10 | Social | Message length validated only on send, not as you type. | `MessageButton.tsx:28-45, 113` | Warn at 400+ chars with color change. |
| M-11 | Social | `CompanionStrip` silently disappears on load error. | `CompanionStrip.tsx:24-93` | Empty/error card instead of rendering nothing. |
| M-12 | Social | Loading/error/empty states styled inconsistently across inbox/strip/rooms. | `TravelerMessageInbox.tsx`, `CompanionStrip.tsx`, `app/rooms/page.tsx` | Standardize on `StatusCard`. |
| M-13 | Social | Wave button disabled (connected/blocked) still uses the active color — looks clickable. | `WaveButton.tsx:22-89` | Muted disabled color **(F3)**. |
| M-14 | A11y | No `aria-live` region announces async status changes (wave sent, etc.). | social components | Wrap status text in `role="status" aria-live="polite"`. |
| M-15 | A11y | Cookie consent toggles lack a focus ring. | `CookieConsentModal.tsx:209-220` | `focus-visible:ring-2`. |
| M-16 | Responsive | Share modal labels truncate on ~375px screens. | `ShareModal.tsx` | `text-xs` / stack below 400px. |

---

## 5. 🟢 Low-Priority / Polish

| Area | Problem | Location | Fix |
| --- | --- | --- | --- |
| A11y | Text inputs change background on focus but have no focus ring (low visibility, color-blind users). | auth forms + inputs | Add `focus:ring-2 focus:ring-[#6C63FF]/30` (centralize in `ui/input.tsx`). |
| A11y | Status messages rely on color alone (no icon/prefix). | status boxes | Add ✓ / ✕ icon or text prefix. |
| Contrast | Community error text rose-600 on rose-50 (~3.2:1, fails AA). | `app/dashboard/community/page.tsx:72-76` | rose-700 or darker background. |
| Consistency | Card padding varies (`p-4` vs `p-5 sm:p-6`). | card components | Standardize on `p-4 sm:p-6`. |
| Onboarding | Progress modal gives no time estimate. | `onboarding/page.tsx:1095` | Add "(usually 20–60s)". |
| Onboarding | Unused `components/onboarding/Step*.tsx` shells (logic lives inline in the page). | `components/onboarding/` | Remove or integrate to avoid confusion. |
| Onboarding | Step indicator bars can overflow on <360px screens. | `onboarding/page.tsx:579` | `overflow-x` / smaller min-width. |
| Dashboard | Trip card images have no skeleton; layout shifts on load. | `app/dashboard/page.tsx:706-719` | `animate-pulse` skeleton / blur-up. |
| Microcopy | "Transfer notes… can be rough" is vague. | `onboarding/page.tsx:736-752` | "Optional — rough context like 'airport' is fine." |
| Forms | Guest name/email optional but not labeled as such. | `PublicTripShare.tsx:188-226` | Add "(optional)" to labels. |
| Modals | Backdrop opacity (`/55`) is weak on OLED. | `ShareModal.tsx` | `bg-black/70`. |
| Nav | No current-page indicator. | `Navbar` | Active-route highlight. |

---

## 6. What's Already Good ✅

- A capable `Button` primitive already exists (`components/ui/button.tsx`) with variants, sizes, focus ring, and disabled styles — it just needs adoption.
- `StatusCard` and `LoadingSpinner` components exist for consistent states — extend their usage.
- `CookieConsentModal` is thorough on content.
- Onboarding has a real multi-step structure with per-step validation logic (just needs better surfacing).

---

## 7. Recommended Execution Plan

A followable order. Each phase is independently shippable.

### Phase 0 — Foundations (highest leverage)
1. **F1** Add toast provider (`sonner`) in `app/providers.tsx`.
2. **F2** Build a real `Modal` (backdrop, Escape, focus trap, focus-on-open, aria).
3. **F3** Extend `Button` variants (add `destructive`), then start adopting it.

### Phase 1 — Critical flow fixes (High)
4. Onboarding generation: error recovery UI + double-submit guard (H-1, H-2, H-3).
5. Migrate all modals onto the new `Modal` (resolves H-6, H-7, H-8, H-12).
6. Social actions: toasts + spinners + loading-before-await (H-4, H-5, M-13).
7. Auth: distinguish error vs success, add signup confirmation (H-9, H-10).
8. Share links → real `<a>` tags (H-11).

### Phase 2 — Feedback & validation (Medium)
9. Inline field validation across onboarding & auth (M-1, M-5, M-6, M-10).
10. Standardize loading/empty/error states on `StatusCard` (M-11, M-12).
11. Fix empty-state copy & fake placeholders (M-3, M-4).

### Phase 3 — Polish & accessibility (Low)
12. Centralize input focus rings in `ui/input.tsx`.
13. Contrast fixes, icons on status messages, skeletons, microcopy, responsive truncation.
14. Remove dead onboarding shell components.

### Phase 4 — Validate
15. Add Playwright UX smoke tests: complete onboarding → generate → view trip; send a wave; open/close a modal with keyboard; submit invalid auth and assert inline error.

---

## Appendix · Severity Definitions

| Severity | Meaning |
| --- | --- |
| 🔴 **High** | Blocks or confuses a core task, or fails accessibility in a way that breaks usage. |
| 🟡 **Medium** | Noticeable friction or inconsistency; degrades trust and polish. |
| 🟢 **Low** | Refinement, polish, and edge-case accessibility. |

*All references use `path:line` from the repository root.*
