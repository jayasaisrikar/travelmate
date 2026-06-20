'use client';

import { useCallback, useEffect, useState } from 'react';
import { getSupabaseBrowser } from '@/services/supabase-browser';

interface PresenceTrip {
  id: string;
  trip_start_date: string | null;
  trip_end_date: string | null;
  verified: boolean;
}

interface PresenceStatusResponse {
  trips: PresenceTrip[];
  consent: boolean;
}

async function authedFetch(path: string, init?: RequestInit) {
  const { data } = await getSupabaseBrowser().auth.getSession();
  const token = data.session?.access_token;
  return fetch(path, {
    cache: 'no-store',
    ...init,
    headers: {
      'Content-Type': 'application/json',
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
      ...(init?.headers || {}),
    },
  });
}

function findInWindowUnverifiedTrip(trips: PresenceTrip[]): PresenceTrip | undefined {
  const today = new Date().toISOString().slice(0, 10);
  return trips.find(
    t => !t.verified && t.trip_start_date && t.trip_end_date && t.trip_start_date <= today && today <= t.trip_end_date
  );
}

/**
 * Runs at most one geolocation check per app-open, only after consent is confirmed.
 * Surfaces `needsConsent` so the caller can show a prompt; `grantConsent` records
 * consent and then runs the check.
 */
export function usePresenceCheck() {
  const [needsConsent, setNeedsConsent] = useState(false);

  const runForTrip = useCallback((tripId: string) => {
    if (!('geolocation' in navigator)) return;
    navigator.geolocation.getCurrentPosition(
      pos => {
        void authedFetch(`/api/trips/${tripId}/presence`, {
          method: 'POST',
          body: JSON.stringify({ lat: pos.coords.latitude, lng: pos.coords.longitude }),
        });
      },
      () => { /* denied/unavailable/timeout — silent, no retries */ },
      { timeout: 10000, maximumAge: 60000 }
    );
  }, []);

  useEffect(() => {
    let cancelled = false;
    authedFetch('/api/trips/presence-status')
      .then(r => (r.ok ? r.json() : null))
      .then((data: PresenceStatusResponse | null) => {
        if (cancelled || !data) return;
        const target = findInWindowUnverifiedTrip(data.trips);
        if (!target) return;
        if (!data.consent) {
          setNeedsConsent(true);
          return;
        }
        runForTrip(target.id);
      })
      .catch(() => {});
    return () => {
      cancelled = true;
    };
  }, [runForTrip]);

  const grantConsent = useCallback(async () => {
    await authedFetch('/api/profile/location-consent', { method: 'POST', body: JSON.stringify({ grant: true }) });
    setNeedsConsent(false);
    const r = await authedFetch('/api/trips/presence-status');
    const data: PresenceStatusResponse | null = r.ok ? await r.json() : null;
    if (!data) return;
    const target = findInWindowUnverifiedTrip(data.trips);
    if (target) runForTrip(target.id);
  }, [runForTrip]);

  return { needsConsent, grantConsent };
}
