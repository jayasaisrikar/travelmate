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
