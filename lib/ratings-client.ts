import { getSupabaseBrowser } from '@/services/supabase-browser';

async function authed(path: string, init?: RequestInit) {
  const { data } = await getSupabaseBrowser().auth.getSession();
  const token = data.session?.access_token;
  const res = await fetch(path, {
    cache: 'no-store',
    ...init,
    headers: {
      'Content-Type': 'application/json',
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
      ...(init?.headers || {}),
    },
  });
  const body = await res.json().catch(() => null);
  if (!res.ok) {
    throw Object.assign(new Error((body?.error as string) ?? 'Rating error'), {
      code: body?.error,
      status: res.status,
    });
  }
  return body;
}

export type RatingEligibility = {
  ok: boolean;
  reason?: 'verification_required' | 'presence_required' | 'trip_not_ended';
};

export type RatingState = {
  mine: { stars: number; review: string | null } | null;
  aggregate: { average: number; count: number };
  eligibility: RatingEligibility;
};

export const getRating = (tripId: string): Promise<RatingState> => authed(`/api/trips/${tripId}/rating`);

export const submitRating = (tripId: string, stars: number, review?: string): Promise<{ stars: number; review: string | null }> =>
  authed(`/api/trips/${tripId}/rating`, {
    method: 'POST',
    body: JSON.stringify({ stars, review }),
  });
