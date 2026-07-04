import { getSupabaseBrowser } from '@/services/supabase-browser';
import { SocialApiError } from '@/services/social';

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
  if (!res.ok) {
    const message = (body?.error as string) ?? 'Publish failed';
    throw new SocialApiError(message, res.status, body?.error, body?.level);
  }
  return body as { is_published: boolean };
}
