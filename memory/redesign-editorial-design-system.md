---
name: redesign-editorial-design-system
description: Wayflo app-wide redesign direction, tokens, and component conventions (bold/editorial, shadcn/ui)
metadata:
  type: project
---

User requested a full app redesign (started 2026-06-13). Decisions:

- **Visual direction:** Bold / editorial — high-contrast, big type, strong color blocks, neo-brutalist sharp borders + offset shadows.
- **Rollout:** Page-by-page in this order — landing → auth → onboarding → trip → dashboard → social.
- **Tooling:** shadcn/ui + Radix (CVA-based components). `components.json` present; Tailwind **v3** (kept `postcss.config.js`, deleted the conflicting v4 `postcss.config.mjs`).

Design tokens live in `app/globals.css` (HSL CSS vars) + `tailwind.config.ts`:
- Colors: `background` (warm paper), `ink` (near-black borders), `primary` (indigo 244 100% 69%), `accent` (coral 345 100% 70%), `secondary` (dark ink). Use semantic tokens, NOT hardcoded hex, in redesigned pages.
- Type scale utilities: `text-display`, `text-headline`, `text-title`; `.eyebrow` label class; `.surface-brutal` (border-2 border-ink + shadow-brutal).
- Shadows: `shadow-brutal`, `shadow-brutal-lg`, `shadow-brutal-primary`.
- Font: Plus Jakarta Sans via `--font-sans` (max weight 800).
- `Button` (`components/ui/button.tsx`) is CVA-based with variants: default, brutal, accent, secondary, outline, ghost, destructive, link; sizes default/sm/lg/icon; supports `asChild`.

Progress: foundation + landing page done and building green. Auth/onboarding/trip/dashboard/social still use old hardcoded hex styles until redesigned.

Earlier same session: implemented the UX audit ([[../docs/UX_AUDIT_AND_PLAN.md]]) — toast system (`components/ui/toast.tsx`), real Modal (`components/ui/modal.tsx` w/ focus trap + ConfirmDialog).
