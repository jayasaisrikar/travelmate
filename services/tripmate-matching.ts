/**
 * services/tripmate-matching.ts
 *
 * Matching Algorithm v1 (PRD §10.6) — a deterministic, side-effect-free
 * scoring system used to rank compatible travellers ("Tripmates") against
 * the viewer's own trip context.
 *
 * Total score = 100, split across seven weighted components:
 *   - Destination match  25
 *   - Date overlap       25
 *   - Interest overlap   15
 *   - Budget match       10
 *   - Pace match         10
 *   - Verification level 10
 *   - Language overlap    5
 *
 * Everything here is pure so it can be unit-tested without a database
 * (see tests/e2e/tripmate-matching.spec.ts).
 */

import type { SocialVerificationLevel } from '@/services/social-verification';

// ─── Canonical preference vocabularies ──────────────────────────────────────
// Ordered low → high so we can score "adjacent tier" compatibility.

export const BUDGET_TIERS = ['budget', 'moderate', 'comfort', 'luxury'] as const;
export type BudgetTier = (typeof BUDGET_TIERS)[number];

export const PACE_TIERS = ['slow', 'balanced', 'fast'] as const;
export type PaceTier = (typeof PACE_TIERS)[number];

export const MATCH_WEIGHTS = {
  destination: 25,
  dates: 25,
  interests: 15,
  budget: 10,
  pace: 10,
  verification: 10,
  language: 5,
} as const;

/** Minimum score (out of 100) for a traveller to surface by default. */
export const MIN_MATCH_THRESHOLD = 35;

export interface MatchInput {
  destinationSlug: string;
  travelMonth?: string | null;
  /** ISO date (YYYY-MM-DD) — optional approximate window for finer overlap. */
  dateStart?: string | null;
  dateEnd?: string | null;
  interests?: string[] | null;
  budgetPreference?: string | null;
  pacePreference?: string | null;
  languages?: string[] | null;
  /** Only meaningful for the candidate side. */
  verificationLevel?: SocialVerificationLevel | null;
}

export interface MatchBreakdown {
  destination: number;
  dates: number;
  interests: number;
  budget: number;
  pace: number;
  verification: number;
  language: number;
}

export interface MatchResult {
  /** Rounded 0–100 score. */
  score: number;
  breakdown: MatchBreakdown;
  /** Short, human-readable reasons for the strongest components. */
  reasons: string[];
}

// ─── Helpers ─────────────────────────────────────────────────────────────────

function norm(values?: string[] | null): string[] {
  return (values ?? [])
    .map(v => v?.trim().toLowerCase())
    .filter((v): v is string => Boolean(v));
}

function sharedItems(a: string[], b: string[]): string[] {
  const setB = new Set(b);
  return [...new Set(a)].filter(item => setB.has(item));
}

function parseDate(value?: string | null): Date | null {
  if (!value) return null;
  const d = new Date(value);
  return Number.isNaN(d.getTime()) ? null : d;
}

const DAY_MS = 24 * 60 * 60 * 1000;

/** Inclusive day count between two ISO dates (>= 1 for a valid range). */
function rangeDays(start: Date, end: Date): number {
  return Math.max(1, Math.round((end.getTime() - start.getTime()) / DAY_MS) + 1);
}

function tierIndex<T extends readonly string[]>(tiers: T, value?: string | null): number {
  if (!value) return -1;
  return tiers.indexOf(value.trim().toLowerCase() as T[number]);
}

// ─── Component scorers ───────────────────────────────────────────────────────

function scoreDestination(viewer: MatchInput, candidate: MatchInput): number {
  if (!viewer.destinationSlug || !candidate.destinationSlug) return 0;
  return viewer.destinationSlug === candidate.destinationSlug ? MATCH_WEIGHTS.destination : 0;
}

/**
 * Date overlap (PRD §10.6):
 *   exact same dates → full · partial overlap → proportional ·
 *   same month → low · no overlap → 0.
 * Falls back to the "Month YYYY" travel_month string when exact dates
 * are not shared (privacy-first signals often omit exact dates).
 */
function scoreDates(viewer: MatchInput, candidate: MatchInput): number {
  const vStart = parseDate(viewer.dateStart);
  const vEnd = parseDate(viewer.dateEnd) ?? vStart;
  const cStart = parseDate(candidate.dateStart);
  const cEnd = parseDate(candidate.dateEnd) ?? cStart;

  if (vStart && vEnd && cStart && cEnd) {
    const overlapStart = Math.max(vStart.getTime(), cStart.getTime());
    const overlapEnd = Math.min(vEnd.getTime(), cEnd.getTime());

    if (overlapEnd < overlapStart) {
      // No exact-date overlap — fall through to month comparison below.
    } else {
      const overlapDays = Math.round((overlapEnd - overlapStart) / DAY_MS) + 1;
      const shorter = Math.min(rangeDays(vStart, vEnd), rangeDays(cStart, cEnd));
      const ratio = Math.min(1, overlapDays / shorter);
      return Math.round(MATCH_WEIGHTS.dates * ratio);
    }
  }

  // Month-level fallback.
  const vMonth = viewer.travelMonth?.trim().toLowerCase();
  const cMonth = candidate.travelMonth?.trim().toLowerCase();
  if (vMonth && cMonth && vMonth === cMonth) {
    return Math.round(MATCH_WEIGHTS.dates * 0.5); // same month → medium-low
  }

  return 0;
}

function scoreInterests(viewer: MatchInput, candidate: MatchInput): { score: number; shared: string[] } {
  const v = norm(viewer.interests);
  const c = norm(candidate.interests);
  if (v.length === 0 || c.length === 0) return { score: 0, shared: [] };

  const shared = sharedItems(v, c);
  const ratio = shared.length / v.length;
  return { score: Math.round(MATCH_WEIGHTS.interests * Math.min(1, ratio)), shared };
}

function scoreBudget(viewer: MatchInput, candidate: MatchInput): number {
  const a = tierIndex(BUDGET_TIERS, viewer.budgetPreference);
  const b = tierIndex(BUDGET_TIERS, candidate.budgetPreference);
  if (a < 0 || b < 0) return 0;
  const distance = Math.abs(a - b);
  if (distance === 0) return MATCH_WEIGHTS.budget;
  if (distance === 1) return Math.round(MATCH_WEIGHTS.budget / 2);
  return 0;
}

function scorePace(viewer: MatchInput, candidate: MatchInput): number {
  const a = tierIndex(PACE_TIERS, viewer.pacePreference);
  const b = tierIndex(PACE_TIERS, candidate.pacePreference);
  if (a < 0 || b < 0) return 0;
  const distance = Math.abs(a - b);
  if (distance === 0) return MATCH_WEIGHTS.pace;
  if (distance === 1) return Math.round(MATCH_WEIGHTS.pace / 2);
  return 0;
}

function scoreVerification(candidate: MatchInput): number {
  switch (candidate.verificationLevel) {
    case 'high_trust':
      return MATCH_WEIGHTS.verification;
    case 'trusted':
      return Math.round(MATCH_WEIGHTS.verification * 0.8);
    case 'basic':
      return Math.round(MATCH_WEIGHTS.verification * 0.4);
    default:
      return 0;
  }
}

function scoreLanguage(viewer: MatchInput, candidate: MatchInput): { score: number; shared: string[] } {
  const v = norm(viewer.languages);
  const c = norm(candidate.languages);
  if (v.length === 0 || c.length === 0) return { score: 0, shared: [] };
  const shared = sharedItems(v, c);
  return { score: shared.length > 0 ? MATCH_WEIGHTS.language : 0, shared };
}

// ─── Public API ──────────────────────────────────────────────────────────────

/**
 * Score how compatible `candidate` is for `viewer`. Deterministic and pure.
 */
export function scoreMatch(viewer: MatchInput, candidate: MatchInput): MatchResult {
  const interests = scoreInterests(viewer, candidate);
  const language = scoreLanguage(viewer, candidate);

  const breakdown: MatchBreakdown = {
    destination: scoreDestination(viewer, candidate),
    dates: scoreDates(viewer, candidate),
    interests: interests.score,
    budget: scoreBudget(viewer, candidate),
    pace: scorePace(viewer, candidate),
    verification: scoreVerification(candidate),
    language: language.score,
  };

  const total =
    breakdown.destination +
    breakdown.dates +
    breakdown.interests +
    breakdown.budget +
    breakdown.pace +
    breakdown.verification +
    breakdown.language;

  const score = Math.max(0, Math.min(100, Math.round(total)));

  // ── Build human-readable reasons, strongest signal first ──
  const reasons: string[] = [];
  if (breakdown.destination > 0) {
    reasons.push(`You're both heading to ${formatDestination(candidate.destinationSlug)}`);
  }
  if (breakdown.dates >= MATCH_WEIGHTS.dates) {
    reasons.push('Your travel dates line up');
  } else if (breakdown.dates > 0) {
    reasons.push('Your trips overlap in time');
  }
  if (interests.shared.length > 0) {
    reasons.push(`Shared interests: ${interests.shared.slice(0, 3).join(', ')}`);
  }
  if (breakdown.budget >= MATCH_WEIGHTS.budget) {
    reasons.push('Similar budget style');
  }
  if (breakdown.pace >= MATCH_WEIGHTS.pace) {
    reasons.push('Similar travel pace');
  }
  if (language.shared.length > 0) {
    reasons.push(`Common language: ${language.shared.slice(0, 2).join(', ')}`);
  }
  if (breakdown.verification >= MATCH_WEIGHTS.verification * 0.8) {
    reasons.push('Identity-verified traveller');
  }

  return { score, breakdown, reasons };
}

/** Turn a slug like "kuala-lumpur" into a display label "Kuala Lumpur". */
function formatDestination(slug: string): string {
  return slug
    .split('-')
    .filter(Boolean)
    .map(part => part.charAt(0).toUpperCase() + part.slice(1))
    .join(' ');
}

/**
 * One-line "84% match because…" explanation (PRD §10.6 Match Explanation).
 */
export function explainMatch(result: MatchResult): string {
  if (result.reasons.length === 0) {
    return `${result.score}% match`;
  }
  const head = result.reasons.slice(0, 3).join(', ').toLowerCase();
  return `${result.score}% match because ${head}.`;
}
