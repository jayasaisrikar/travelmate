import { expect, test } from '@playwright/test';
import {
  scoreMatch,
  explainMatch,
  MIN_MATCH_THRESHOLD,
  type MatchInput,
} from '../../services/tripmate-matching';

const base: MatchInput = {
  destinationSlug: 'kyoto',
  travelMonth: 'October 2026',
  dateStart: '2026-10-12',
  dateEnd: '2026-10-16',
  interests: ['food', 'temples', 'photography'],
  budgetPreference: 'moderate',
  pacePreference: 'slow',
  languages: ['english'],
};

test('perfect overlap scores near the top and lists clear reasons', () => {
  const candidate: MatchInput = { ...base, verificationLevel: 'high_trust' };
  const result = scoreMatch(base, candidate);

  expect(result.breakdown.destination).toBe(25);
  expect(result.breakdown.dates).toBe(25);
  expect(result.breakdown.interests).toBe(15);
  expect(result.breakdown.budget).toBe(10);
  expect(result.breakdown.pace).toBe(10);
  expect(result.breakdown.verification).toBe(10);
  expect(result.breakdown.language).toBe(5);
  expect(result.score).toBe(100);
  expect(result.reasons[0]).toContain('Kyoto');
  expect(explainMatch(result)).toContain('100% match because');
});

test('different destination zeroes the destination component', () => {
  const candidate: MatchInput = { ...base, destinationSlug: 'lisbon' };
  const result = scoreMatch(base, candidate);
  expect(result.breakdown.destination).toBe(0);
});

test('no date overlap with same month falls back to medium-low score', () => {
  const viewer: MatchInput = { ...base, dateStart: '2026-10-01', dateEnd: '2026-10-05' };
  const candidate: MatchInput = { ...base, dateStart: '2026-10-20', dateEnd: '2026-10-25' };
  const result = scoreMatch(viewer, candidate);
  // Same "October 2026" travel month, but exact windows don't overlap.
  expect(result.breakdown.dates).toBe(13); // round(25 * 0.5)
});

test('partial date overlap is proportional', () => {
  const viewer: MatchInput = { ...base, dateStart: '2026-10-12', dateEnd: '2026-10-16' };
  const candidate: MatchInput = { ...base, dateStart: '2026-10-15', dateEnd: '2026-10-20' };
  const result = scoreMatch(viewer, candidate);
  // Overlap = Oct 15–16 = 2 days; shorter window = 5 days → round(25 * 2/5) = 10
  expect(result.breakdown.dates).toBe(10);
});

test('adjacent budget/pace tiers earn half credit', () => {
  const candidate: MatchInput = { ...base, budgetPreference: 'comfort', pacePreference: 'balanced' };
  const result = scoreMatch(base, candidate);
  expect(result.breakdown.budget).toBe(5);
  expect(result.breakdown.pace).toBe(5);
});

test('missing optional fields never throw and score low', () => {
  const viewer: MatchInput = { destinationSlug: 'bali' };
  const candidate: MatchInput = { destinationSlug: 'bali' };
  const result = scoreMatch(viewer, candidate);
  expect(result.score).toBe(25); // destination only
  expect(result.breakdown.dates).toBe(0);
  expect(Number.isFinite(result.score)).toBe(true);
});

test('interest overlap is proportional to the viewer interest set', () => {
  const viewer: MatchInput = { destinationSlug: 'bali', interests: ['food', 'temples', 'photography', 'nature'] };
  const candidate: MatchInput = { destinationSlug: 'bali', interests: ['food', 'temples'] };
  const result = scoreMatch(viewer, candidate);
  // 2 of 4 shared → round(15 * 0.5) = 8
  expect(result.breakdown.interests).toBe(8);
});

test('score is clamped to 0–100 and threshold constant is sane', () => {
  const result = scoreMatch(base, { ...base, verificationLevel: 'high_trust' });
  expect(result.score).toBeLessThanOrEqual(100);
  expect(result.score).toBeGreaterThanOrEqual(0);
  expect(MIN_MATCH_THRESHOLD).toBeGreaterThan(0);
  expect(MIN_MATCH_THRESHOLD).toBeLessThan(100);
});
