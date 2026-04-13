'use client';

import { useEffect, useMemo, useRef, useState } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import { useRouter, useSearchParams } from 'next/navigation';
import { loadTrip, regenerateFullTrip, saveTrip } from '@/lib/supabase-trips';
import { Brand } from '@/components/common/Brand';
import { getSupabaseBrowser } from '@/services/supabase-browser';
import type { TravelerPreferences } from '@/lib/travel-types';

const STEPS = ['Destination', 'Trip window', 'Preferences', 'Review'];
const ARRIVAL_METHODS = ['flight', 'train', 'drive'] as const;
const ACTIVITY_LEVELS = ['Relaxed', 'Balanced', 'Packed'] as const;
const GENERATION_PHASES = [
  'Resolving your destination',
  'Fetching live places and weather',
  'Building a concise day plan',
  'Saving your itinerary',
];

interface SearchResult {
  name: string;
  latitude: number;
  longitude: number;
  address: string;
}

interface TripFormState {
  destination: string;
  latitude: number | null;
  longitude: number | null;
  arrivalDate: string;
  departureDate: string;
  arrivalTime: string;
  departureTime: string;
  arrivalTransferContext: string;
  departureTransferContext: string;
  arrivalMethod: (typeof ARRIVAL_METHODS)[number] | null;
  activityIntensity: (typeof ACTIVITY_LEVELS)[number] | null;
  budget: string;
  interests: string[];
  interestsText: string;
}

const INITIAL_FORM: TripFormState = {
  destination: '',
  latitude: null,
  longitude: null,
  arrivalDate: '',
  departureDate: '',
  arrivalTime: '',
  departureTime: '',
  arrivalTransferContext: '',
  departureTransferContext: '',
  arrivalMethod: null,
  activityIntensity: null,
  budget: '',
  interests: [],
  interestsText: '',
};

function preferencesToForm(preferences: TravelerPreferences | null | undefined): Partial<TripFormState> {
  if (!preferences) {
    return {};
  }

  return {
    arrivalMethod: preferences.arrivalMethod ?? null,
    activityIntensity: preferences.activityIntensity ?? null,
    budget: preferences.budget ?? '',
    interestsText: Array.isArray(preferences.interests) ? preferences.interests.join(', ') : '',
    arrivalTransferContext: preferences.arrivalTransferContext ?? '',
    departureTransferContext: preferences.departureTransferContext ?? '',
  };
}

function tripToForm(trip: Awaited<ReturnType<typeof loadTrip>>['trip'], preferences: TravelerPreferences | null | undefined): Partial<TripFormState> {
  if (!trip) {
    return {};
  }

  const itinerary = trip.itinerary ?? {};
  const destinationSource = itinerary?.sourceData?.destination;
  const confirmation = itinerary?.sourceData?.confirmation;
  const arrivalTransfer = Array.isArray(itinerary?.transfers)
    ? itinerary.transfers.find((transfer: { kind?: string; from?: string | null }) => transfer.kind === 'arrival')
    : null;
  const departureTransfer = Array.isArray(itinerary?.transfers)
    ? itinerary.transfers.find((transfer: { kind?: string; to?: string | null }) => transfer.kind === 'departure')
    : null;
  const arrivalMethod =
    preferences?.arrivalMethod === 'flight' ||
    preferences?.arrivalMethod === 'train' ||
    preferences?.arrivalMethod === 'drive'
      ? preferences.arrivalMethod
      : confirmation?.arrivalMethod === 'flight' ||
          confirmation?.arrivalMethod === 'train' ||
          confirmation?.arrivalMethod === 'drive'
        ? confirmation.arrivalMethod
        : null;
  const activityIntensity =
    preferences?.activityIntensity === 'Relaxed' ||
    preferences?.activityIntensity === 'Balanced' ||
    preferences?.activityIntensity === 'Packed'
      ? preferences.activityIntensity
      : itinerary?.dailyPlans?.[0]?.intensity === 'Relaxed' ||
          itinerary?.dailyPlans?.[0]?.intensity === 'Balanced' ||
          itinerary?.dailyPlans?.[0]?.intensity === 'Packed'
        ? (itinerary?.dailyPlans?.[0]?.intensity as (typeof ACTIVITY_LEVELS)[number])
        : null;

  return {
    destination: trip.destination || destinationSource?.name || '',
    latitude: typeof destinationSource?.latitude === 'number' ? destinationSource.latitude : null,
    longitude: typeof destinationSource?.longitude === 'number' ? destinationSource.longitude : null,
    arrivalDate:
      itinerary?.stay?.checkInDate ||
      confirmation?.tripWindow?.arrivalDate ||
      '',
    departureDate:
      itinerary?.stay?.checkOutDate ||
      confirmation?.tripWindow?.departureDate ||
      '',
    arrivalTime:
      itinerary?.stay?.checkInTime ||
      confirmation?.tripWindow?.arrivalTime ||
      '',
    departureTime:
      itinerary?.stay?.checkOutTime ||
      confirmation?.tripWindow?.departureTime ||
      '',
    arrivalTransferContext:
      arrivalTransfer?.from ||
      preferences?.arrivalTransferContext ||
      '',
    departureTransferContext:
      departureTransfer?.to ||
      preferences?.departureTransferContext ||
      '',
    arrivalMethod,
    activityIntensity,
    budget: trip.budget || preferences?.budget || '',
    interestsText: Array.isArray(trip.interests) && trip.interests.length > 0
      ? trip.interests.join(', ')
      : preferences?.interests?.join(', ') ?? '',
  };
}

export default function OnboardingPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const editTripId = searchParams.get('tripId')?.trim() || '';
  const isEditMode = Boolean(editTripId);
  const [step, setStep] = useState(0);
  const [loading, setLoading] = useState(false);
  const [loadingPhase, setLoadingPhase] = useState(0);
  const [error, setError] = useState('');
  const [searching, setSearching] = useState(false);
  const [hasSearched, setHasSearched] = useState(false);
  const [results, setResults] = useState<SearchResult[]>([]);
  const [form, setForm] = useState<TripFormState>(INITIAL_FORM);
  const [preferencesLoaded, setPreferencesLoaded] = useState(false);
  const [prefillLoading, setPrefillLoading] = useState(isEditMode);
  const searchAbortRef = useRef<AbortController | null>(null);

  const parsedBudget = useMemo(() => {
    const value = Number.parseInt(form.budget, 10);
    return Number.isFinite(value) ? value : 0;
  }, [form.budget]);

  const timeToMinutes = (value: string) => {
    const [hours, minutes] = value.split(':').map(part => Number.parseInt(part, 10));
    if (!Number.isFinite(hours) || !Number.isFinite(minutes)) {
      return Number.NaN;
    }

    return hours * 60 + minutes;
  };

  const isValid = () => {
    if (step === 0) {
      return Boolean(
        form.destination.trim() &&
          typeof form.latitude === 'number' &&
          typeof form.longitude === 'number'
      );
    }

    if (step === 1) {
      const arrivalMinutes = timeToMinutes(form.arrivalTime);
      const departureMinutes = timeToMinutes(form.departureTime);
      const sameDayTrip = form.arrivalDate === form.departureDate;

      return Boolean(
        form.arrivalDate &&
          form.departureDate &&
          form.arrivalTime &&
          form.departureTime &&
          form.arrivalTransferContext.trim() &&
          form.departureTransferContext.trim() &&
          form.departureDate >= form.arrivalDate &&
          form.arrivalMethod &&
          (!sameDayTrip || departureMinutes > arrivalMinutes)
      );
    }

    if (step === 2) {
      return Boolean(form.interestsText.trim() && parsedBudget > 0 && form.activityIntensity);
    }

    return true;
  };

  const handleDestinationChange = (value: string) => {
    setError('');
    setForm(previous => ({
      ...previous,
      destination: value,
      latitude: null,
      longitude: null,
    }));
    setResults([]);
    setHasSearched(false);
  };

  const handleSelectDestination = (result: SearchResult) => {
    setForm(previous => ({
      ...previous,
      destination: result.name,
      latitude: result.latitude,
      longitude: result.longitude,
    }));
    setResults([]);
    setHasSearched(true);
    setError('');
  };

  const parsedInterests = useMemo(() => {
    return form.interestsText
      .split(',')
      .map(interest => interest.trim())
      .filter(Boolean);
  }, [form.interestsText]);

  useEffect(() => {
    let mounted = true;

    const loadInitialData = async () => {
      try {
        const { data: sessionData } = await getSupabaseBrowser().auth.getSession();
        const accessToken = sessionData.session?.access_token;
        let loadedPreferences: TravelerPreferences | null = null;

        if (accessToken) {
          const response = await fetch('/api/profile/preferences', {
            headers: {
              ...(accessToken ? { Authorization: `Bearer ${accessToken}` } : {}),
            },
          });
          const data = await response.json().catch(() => null);

          if (response.ok && data?.preferences) {
            loadedPreferences = data.preferences as TravelerPreferences;
          }
        }

        if (editTripId) {
          const tripData = await loadTrip(editTripId);

          if (!mounted) {
            return;
          }

          if (tripData.trip) {
            setForm(previous => ({
              ...previous,
              ...tripToForm(tripData.trip, loadedPreferences),
            }));
          } else {
            setError('Trip not found for editing.');
          }
        } else if (loadedPreferences) {
          setForm(previous => {
            const isFreshForm =
              !previous.destination &&
              !previous.latitude &&
              !previous.longitude &&
              !previous.arrivalDate &&
              !previous.departureDate &&
              !previous.arrivalTime &&
              !previous.departureTime &&
              !previous.arrivalTransferContext &&
              !previous.departureTransferContext &&
              !previous.arrivalMethod &&
              !previous.activityIntensity &&
              !previous.budget &&
              !previous.interestsText;

            if (!isFreshForm) {
              return previous;
            }

            return {
              ...previous,
              ...preferencesToForm(loadedPreferences),
            };
          });
        }
      } catch (err) {
        console.warn('Failed to load initial trip data', err);
        if (editTripId) {
          setError(err instanceof Error ? err.message : 'Failed to load trip for editing');
        }
      } finally {
        if (mounted) {
          setPreferencesLoaded(true);
          setPrefillLoading(false);
        }
      }
    };

    loadInitialData();

    return () => {
      mounted = false;
    };
  }, [editTripId]);

  const searchDestinations = async (query: string) => {
    const trimmedQuery = query.trim();

    if (trimmedQuery.length < 2) {
      setResults([]);
      setHasSearched(false);
      setError('Please enter at least 2 characters to search.');
      return;
    }

    searchAbortRef.current?.abort();

    const controller = new AbortController();
    searchAbortRef.current = controller;

    setSearching(true);
    setHasSearched(true);
    setError('');

    try {
      const response = await fetch(`/api/destinations-search?query=${encodeURIComponent(trimmedQuery)}`, {
        signal: controller.signal,
      });
      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Destination search temporarily unavailable');
      }

      setResults(Array.isArray(data.results) ? data.results : []);
    } catch (err: unknown) {
      if (err instanceof DOMException && err.name === 'AbortError') {
        return;
      }

      setResults([]);
      setError(err instanceof Error ? err.message : 'Destination search temporarily unavailable');
    } finally {
      if (searchAbortRef.current === controller) {
        searchAbortRef.current = null;
        setSearching(false);
      }
    }
  };

  useEffect(() => {
    if (!loading) {
      setLoadingPhase(0);
      return;
    }

    const interval = window.setInterval(() => {
      setLoadingPhase(current => (current + 1) % GENERATION_PHASES.length);
    }, 1400);

    return () => window.clearInterval(interval);
  }, [loading]);

  const handleNext = async () => {
    if (step < STEPS.length - 1) {
      setStep(currentStep => currentStep + 1);
      return;
    }

    if (!form.activityIntensity || !form.arrivalMethod) {
      setError('Complete every required field before generating your itinerary.');
      return;
    }

    setLoading(true);
    setError('');

    try {
      const duration = Math.max(
        1,
        Math.floor(
          (new Date(form.departureDate).getTime() - new Date(form.arrivalDate).getTime()) / 86400000
        ) + 1
      );

      if (isEditMode) {
        const updatedTrip = await regenerateFullTrip(editTripId, {
          destination: form.destination,
          latitude: form.latitude,
          longitude: form.longitude,
          duration,
          arrivalDate: form.arrivalDate,
          departureDate: form.departureDate,
          arrivalTime: form.arrivalTime,
          departureTime: form.departureTime,
          arrivalMethod: form.arrivalMethod,
          activityIntensity: form.activityIntensity,
          arrivalTransferContext: form.arrivalTransferContext.trim(),
          departureTransferContext: form.departureTransferContext.trim(),
          budget: form.budget,
          interests: parsedInterests,
          preferences: {
            arrivalMethod: form.arrivalMethod,
            activityIntensity: form.activityIntensity,
            budget: form.budget,
            interests: parsedInterests,
            arrivalTransferContext: form.arrivalTransferContext.trim(),
            departureTransferContext: form.departureTransferContext.trim(),
          },
        });

        router.replace(`/trip/${updatedTrip.trip.id}`);
        return;
      }

      const response = await fetch('/api/generate-itinerary-gemini', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          ...form,
          budget: parsedBudget,
          interests: parsedInterests,
          duration,
          arrivalTransferContext: form.arrivalTransferContext.trim(),
          departureTransferContext: form.departureTransferContext.trim(),
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Generation failed');
      }

      const savedTrip = await saveTrip({
        destination: form.destination,
        duration,
        budget: form.budget,
        interests: parsedInterests,
        itinerary: data.itinerary,
        preferences: {
          arrivalMethod: form.arrivalMethod,
          activityIntensity: form.activityIntensity,
          budget: form.budget,
          interests: parsedInterests,
          arrivalTransferContext: form.arrivalTransferContext.trim(),
          departureTransferContext: form.departureTransferContext.trim(),
        },
      });

      router.push(`/trip/${savedTrip.id}`);
    } catch (err: unknown) {
      console.error(isEditMode ? 'Trip update error:' : 'Trip creation error:', err);
      setError(err instanceof Error ? err.message : 'Something went wrong. Try again.');
      setLoading(false);
    }
  };

  if (prefillLoading) {
    return (
      <div
        style={{
          minHeight: '100vh',
          background: '#fbfaf7',
          color: '#2e2833',
          fontFamily: 'system-ui, sans-serif',
          display: 'grid',
          placeItems: 'center',
          padding: 24,
        }}
      >
        <div style={{ border: '1px solid #2e2833', background: '#ffffff', padding: '18px 20px', fontWeight: 700 }}>
          Loading trip details...
        </div>
      </div>
    );
  }

  return (
    <div
      style={{
        minHeight: '100vh',
        background: '#fbfaf7',
        color: '#2e2833',
        fontFamily: 'system-ui, sans-serif',
      }}
    >
      <div
        style={{
          position: 'sticky',
          top: 0,
          zIndex: 20,
          borderBottom: '1px solid #eadde5',
          padding: '14px 16px',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          gap: 12,
          background: '#fffdf9',
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
          <Brand href="/" compact />
        </div>
      </div>

      <div style={{ maxWidth: 680, margin: '0 auto', padding: '24px 16px 104px' }}>
        <div style={{ display: 'flex', gap: 8, marginBottom: 28, flexWrap: 'wrap' }}>
          {STEPS.map((label, index) => (
            <div key={label} style={{ flex: '1 1 140px', minWidth: 120 }}>
              <div
                style={{
                  height: 5,
                  borderRadius: 999,
                  background: index <= step ? '#5aa7e8' : '#eadde5',
                  transition: 'background .3s',
                }}
              />
              <div style={{ marginTop: 8, fontSize: 11, color: index === step ? '#2e2833' : '#a79aaa', fontWeight: 800, textTransform: 'uppercase', letterSpacing: 1.2 }}>
                {label}
              </div>
            </div>
          ))}
        </div>

        <h1 style={{ fontSize: 'clamp(2rem, 5vw, 3.4rem)', fontWeight: 900, marginBottom: 10, letterSpacing: -1.5, lineHeight: 1 }}>
          {(
            isEditMode
              ? ['Edit your destination', 'Edit your trip window', 'Update your preferences', 'Review before saving']
              : ['Search for your destination', 'Choose your trip window', 'Set your preferences', 'Review before generating']
          )[step]}
        </h1>
        <p style={{ color: '#756978', marginBottom: 28, fontSize: 'clamp(0.98rem, 2.5vw, 1.05rem)', lineHeight: 1.65, maxWidth: 640 }}>
          {(
            isEditMode
              ? [
                  'Update the destination from live search results so we can regenerate the trip with verified place data.',
                  'Update when you arrive, where the first ride should drop you, and where the last ride should take you.',
                  'Change your interests, budget, and pace. Anything you edit here will be used for the regenerated trip.',
                  'Confirm the updated trip details before we call the regeneration API.',
                ]
              : [
                  'Select a real destination from live search results so we can generate your trip with verified place data.',
                  'Tell us when you arrive, where the first ride should drop you, and where the last ride should take you.',
                  'Choose your interests, budget, and pace with no preset selections.',
                  'Confirm the trip details pulled from your choices before we call the itinerary API.',
                ]
          )[step]}
        </p>

        {preferencesLoaded && form.budget && step <= 2 && (
          <div style={{ marginBottom: 24, padding: '12px 14px', borderRadius: 18, border: '1px solid #eadde5', background: '#fffdf9', color: '#756978', fontSize: 14 }}>
            Saved preferences loaded where available. We will reuse your budget and pacing defaults unless you change them.
          </div>
        )}

        {error && (
          <div style={{ marginBottom: 24, padding: '14px 16px', background: '#fff3f7', border: '1px solid #f0d7de', borderRadius: 18, color: '#a65372', fontSize: 14, boxShadow: '0 10px 30px rgba(165,58,83,0.08)' }}>
            {error}
          </div>
        )}

        {step === 0 && (
          <div>
            <div style={{ display: 'flex', gap: 12, alignItems: 'stretch', flexWrap: 'wrap' }}>
              <input
                autoFocus
                type="text"
                placeholder="Search for a city, region, or landmark"
                value={form.destination}
                onChange={event => handleDestinationChange(event.target.value)}
                onKeyDown={event => {
                  if (event.key === 'Enter') {
                    event.preventDefault();
                    void searchDestinations(form.destination);
                  }
                }}
                style={{ flex: '1 1 280px', minWidth: 0, padding: '16px 20px', fontSize: 18, background: '#ffffff', border: '1px solid #eadde5', borderRadius: 18, color: '#2e2833', outline: 'none', boxSizing: 'border-box', boxShadow: '0 14px 36px rgba(67,32,79,0.06)' }}
              />
              <button
                type="button"
                onClick={() => void searchDestinations(form.destination)}
                disabled={searching || form.destination.trim().length < 2}
                style={{
                  flex: '0 0 auto',
                  padding: '16px 22px',
                  minWidth: 124,
                  borderRadius: 18,
                  border: 'none',
                  background: searching || form.destination.trim().length < 2 ? '#eadde5' : '#2e2833',
                  color: searching || form.destination.trim().length < 2 ? '#a79aaa' : '#ffffff',
                  fontWeight: 800,
                  fontSize: 15,
                  cursor: searching || form.destination.trim().length < 2 ? 'not-allowed' : 'pointer',
                  boxShadow: searching || form.destination.trim().length < 2 ? 'none' : '0 14px 34px rgba(84,166,232,0.18)',
                }}
              >
                {searching ? 'Searching...' : 'Search'}
              </button>
            </div>

            {(searching || results.length > 0) && (
              <div style={{ marginTop: 10, background: '#ffffff', border: '1px solid #eadde5', borderRadius: 18, overflow: 'hidden', zIndex: 50, boxShadow: '0 16px 42px rgba(46,40,51,0.12)', maxHeight: 320, overflowY: 'auto' }}>
                  {searching ? (
                    <div style={{ padding: '14px 20px', color: '#756978', fontSize: 14 }}>
                      Searching destinations...
                    </div>
                  ) : (
                    results.map(result => (
                      <button
                        key={`${result.name}-${result.latitude}-${result.longitude}`}
                        onClick={() => handleSelectDestination(result)}
                        style={{ width: '100%', padding: '14px 20px', textAlign: 'left', background: 'none', border: 'none', borderBottom: '1px solid #f4e5ee', cursor: 'pointer', color: '#2e2833' }}
                        onMouseEnter={event => (event.currentTarget.style.background = '#fffdf9')}
                        onMouseLeave={event => (event.currentTarget.style.background = 'none')}
                      >
                        <div style={{ fontWeight: 600 }}>{result.name}</div>
                        <div style={{ fontSize: 13, color: '#a79aaa', marginTop: 2 }}>{result.address}</div>
                      </button>
                    ))
                  )}
                </div>
              )}

            <div style={{ marginTop: 16, padding: '14px 16px', borderRadius: 18, border: '1px solid #eadde5', background: '#ffffff', boxShadow: '0 10px 28px rgba(67,32,79,0.06)' }}>
              {typeof form.latitude === 'number' && typeof form.longitude === 'number' ? (
                <p style={{ margin: 0, color: '#4ea0e8', fontSize: 14, fontWeight: 600 }}>
                  Destination selected from live results. Coordinates saved for itinerary generation.
                </p>
              ) : hasSearched && !searching && results.length === 0 ? (
                <p style={{ margin: 0, color: '#a65372', fontSize: 14, fontWeight: 600 }}>
                  No matching destination found. Refine your search to continue.
                </p>
              ) : (
                <p style={{ margin: 0, color: '#756978', fontSize: 14 }}>
                  Search and then pick one of the live results. We do not prefill destinations anymore.
                </p>
              )}
            </div>
          </div>
        )}

        {step === 1 && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(160px, 1fr))', gap: 14 }}>
              {[
                { label: 'Arrival Date', key: 'arrivalDate' as const, type: 'date' as const },
                { label: 'Departure Date', key: 'departureDate' as const, type: 'date' as const },
                { label: 'Arrival Time', key: 'arrivalTime' as const, type: 'time' as const },
                { label: 'Departure Time', key: 'departureTime' as const, type: 'time' as const },
              ].map(({ label, key, type }) => (
                <div key={key}>
                  <label style={{ display: 'block', marginBottom: 8, fontSize: 13, fontWeight: 700, color: '#756978', textTransform: 'uppercase', letterSpacing: 1.1 }}>
                    {label}
                  </label>
                  <input
                    type={type}
                    value={form[key]}
                    onChange={event => setForm(previous => ({ ...previous, [key]: event.target.value }))}
                    style={{ width: '100%', padding: '14px 16px', background: '#ffffff', border: '1px solid #eadde5', borderRadius: 16, color: '#2e2833', colorScheme: 'light', fontSize: 16, boxSizing: 'border-box', boxShadow: '0 10px 28px rgba(67,32,79,0.06)' }}
                  />
                </div>
              ))}
            </div>

            <div style={{ padding: '14px 16px', border: '1px solid #eadde5', background: '#fffdf9' }}>
              <p style={{ margin: 0, color: '#756978', fontSize: 14, lineHeight: 1.6 }}>
                We use your arrival and departure times as hard boundaries. The planner should not assume the day starts at 9:00.
              </p>
            </div>

            <div style={{ border: '1px solid #eadde5', background: '#ffffff', padding: 18 }}>
              <div style={{ display: 'flex', gap: 12, alignItems: 'flex-start' }}>
                <div style={{ width: 34, height: 34, borderRadius: 12, background: '#5aa7e8', flexShrink: 0 }} />
                <div style={{ flex: 1 }}>
                  <div style={{ fontSize: 12, fontWeight: 800, letterSpacing: 1, textTransform: 'uppercase', color: '#a79aaa' }}>
                    Trip Assistant
                  </div>
                  <p style={{ margin: '6px 0 0', color: '#2e2833', fontSize: 15, lineHeight: 1.6 }}>
                    Where should the first ride drop you off after you arrive, and where should the last ride take you when you leave?
                  </p>
                  <p style={{ margin: '10px 0 0', color: '#756978', fontSize: 13, lineHeight: 1.6 }}>
                    Your stay is chosen automatically from live lodging options. These fields are only for the transfer legs.
                  </p>
                </div>
              </div>

              <div style={{ display: 'grid', gap: 14, marginTop: 16 }}>
                <div>
                  <label style={{ display: 'block', marginBottom: 8, fontSize: 13, fontWeight: 700, color: '#756978', textTransform: 'uppercase', letterSpacing: 1.1 }}>
                    Arrival drop-off
                  </label>
                  <textarea
                    value={form.arrivalTransferContext}
                    onChange={event =>
                    setForm(previous => ({ ...previous, arrivalTransferContext: event.target.value }))
                  }
                    placeholder="Example: a station, airport, ferry terminal, or neighborhood"
                    rows={2}
                    style={{ width: '100%', resize: 'vertical', minHeight: 72, padding: '14px 16px', background: '#fffdf9', border: '1px solid #eadde5', color: '#2e2833', fontSize: 16, boxSizing: 'border-box' }}
                  />
                </div>

                <div>
                  <label style={{ display: 'block', marginBottom: 8, fontSize: 13, fontWeight: 700, color: '#756978', textTransform: 'uppercase', letterSpacing: 1.1 }}>
                    Departure pick-up
                  </label>
                  <textarea
                    value={form.departureTransferContext}
                    onChange={event =>
                      setForm(previous => ({ ...previous, departureTransferContext: event.target.value }))
                    }
                    placeholder="Example: train station, railway station, airport, or ferry terminal"
                    rows={2}
                    style={{ width: '100%', resize: 'vertical', minHeight: 72, padding: '14px 16px', background: '#fffdf9', border: '1px solid #eadde5', color: '#2e2833', fontSize: 16, boxSizing: 'border-box' }}
                  />
                </div>
              </div>
            </div>

            <div>
              <label style={{ display: 'block', marginBottom: 12, fontSize: 13, fontWeight: 700, color: '#756978', textTransform: 'uppercase', letterSpacing: 1.1 }}>
                Arriving by
              </label>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(120px, 1fr))', gap: 12 }}>
                {ARRIVAL_METHODS.map(method => (
                  <button
                    key={method}
                    onClick={() => setForm(previous => ({ ...previous, arrivalMethod: method }))}
                    style={{ padding: '16px 12px', borderRadius: 16, border: `2px solid ${form.arrivalMethod === method ? '#5aa7e8' : '#eadde5'}`, background: form.arrivalMethod === method ? '#5aa7e8' : '#ffffff', color: form.arrivalMethod === method ? '#ffffff' : '#756978', cursor: 'pointer', fontWeight: 800, textTransform: 'capitalize', fontSize: 14, boxShadow: '0 10px 26px rgba(67,32,79,0.06)' }}
                  >
                    {method}
                  </button>
                ))}
              </div>
            </div>
          </div>
        )}

        {step === 2 && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 32 }}>
            <div>
              <label style={{ display: 'block', marginBottom: 16, fontSize: 13, fontWeight: 700, color: '#756978', textTransform: 'uppercase', letterSpacing: 1.1 }}>
                Interests
              </label>
              <input
                type="text"
                value={form.interestsText}
                onChange={event => setForm(previous => ({ ...previous, interestsText: event.target.value }))}
                placeholder="Enter interests separated by commas"
                style={{ width: '100%', padding: '14px 16px', background: '#ffffff', border: '1px solid #eadde5', borderRadius: 16, color: '#2e2833', fontSize: 16, boxSizing: 'border-box', boxShadow: '0 10px 28px rgba(67,32,79,0.06)' }}
              />
              <p style={{ marginTop: 8, fontSize: 13, color: '#a79aaa' }}>
                Example format: food, museums, beaches, hiking
              </p>
            </div>

              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: 16 }}>
              <div>
                <label style={{ display: 'block', marginBottom: 8, fontSize: 13, fontWeight: 700, color: '#756978', textTransform: 'uppercase', letterSpacing: 1.1 }}>
                  Budget
                </label>
                <input
                  type="number"
                  min={1}
                  value={form.budget}
                  onChange={event => setForm(previous => ({ ...previous, budget: event.target.value }))}
                  placeholder="Enter your total trip budget"
                  style={{ width: '100%', padding: '14px 16px', background: '#ffffff', border: '1px solid #eadde5', borderRadius: 16, color: '#2e2833', fontSize: 16, boxSizing: 'border-box', boxShadow: '0 10px 28px rgba(67,32,79,0.06)' }}
                />
              </div>

              <div>
                <label style={{ display: 'block', marginBottom: 8, fontSize: 13, fontWeight: 700, color: '#756978', textTransform: 'uppercase', letterSpacing: 1.1 }}>
                  Intensity
                </label>
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(110px, 1fr))', gap: 8 }}>
                  {ACTIVITY_LEVELS.map(level => (
                    <button
                      key={level}
                      onClick={() => setForm(previous => ({ ...previous, activityIntensity: level }))}
                      style={{ padding: '12px 4px', borderRadius: 14, border: `2px solid ${form.activityIntensity === level ? '#ff9a45' : '#eadde5'}`, background: form.activityIntensity === level ? '#ff9a45' : '#ffffff', color: form.activityIntensity === level ? '#fff' : '#756978', cursor: 'pointer', fontWeight: 800, fontSize: 12, boxShadow: '0 10px 26px rgba(67,32,79,0.06)' }}
                    >
                      {level}
                    </button>
                  ))}
                </div>
              </div>
            </div>
          </div>
        )}

        {step === 3 && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
            {[
              { label: 'Destination', value: form.destination },
              { label: 'Dates', value: `${form.arrivalDate} → ${form.departureDate}` },
              { label: 'Times', value: `${form.arrivalTime || 'Not set'} → ${form.departureTime || 'Not set'}` },
              { label: 'Arrival drop-off', value: form.arrivalTransferContext },
              { label: 'Departure pick-up', value: form.departureTransferContext },
              { label: 'Arriving by', value: form.arrivalMethod || '' },
              { label: 'Intensity', value: form.activityIntensity || '' },
              { label: 'Budget', value: form.budget ? `$${form.budget}` : '' },
              { label: 'Interests', value: parsedInterests.join(', ') },
            ].map(({ label, value }) => (
              <div key={label} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 16, padding: '16px 18px', background: '#ffffff', border: '1px solid #eadde5', borderRadius: 18, boxShadow: '0 10px 28px rgba(67,32,79,0.06)', flexWrap: 'wrap' }}>
                <span style={{ color: '#a79aaa', fontWeight: 700, fontSize: 14, textTransform: 'uppercase', letterSpacing: 0.8 }}>{label}</span>
                <span style={{ color: '#2e2833', fontWeight: 700, fontSize: 14, textAlign: 'right', maxWidth: '100%' }}>{value || 'Not set'}</span>
              </div>
            ))}
          </div>
        )}

        <div style={{ display: 'flex', gap: 12, marginTop: 32, flexWrap: 'wrap' }}>
          {step > 0 && (
            <button
              onClick={() => setStep(currentStep => currentStep - 1)}
              disabled={loading}
              style={{ padding: '16px 28px', borderRadius: 16, border: '1px solid #eadde5', background: '#ffffff', color: '#2e2833', cursor: 'pointer', fontWeight: 800, fontSize: 16, flex: '1 1 160px', boxShadow: '0 10px 28px rgba(67,32,79,0.06)' }}
            >
              Back
            </button>
          )}
          <button
            onClick={handleNext}
            disabled={!isValid() || loading}
            style={{
              flex: '1 1 220px',
              padding: '16px 28px',
              borderRadius: 16,
              border: 'none',
              cursor: isValid() && !loading ? 'pointer' : 'not-allowed',
              background: isValid() && !loading ? '#2e2833' : '#eadde5',
              color: isValid() && !loading ? '#fff' : '#a79aaa',
              fontWeight: 800,
              fontSize: 16,
              opacity: loading ? 0.85 : 1,
              transition: 'transform .2s, background .2s',
              boxShadow: isValid() && !loading ? '0 14px 34px rgba(84,166,232,0.22)' : 'none',
            }}
          >
            {loading
              ? isEditMode
                ? 'Saving updated trip...'
                : 'Building your itinerary...'
              : step === STEPS.length - 1
                ? isEditMode
                  ? 'Save Changes'
                  : 'Generate Itinerary'
                : 'Continue'}
          </button>
        </div>
      </div>

      <AnimatePresence>
        {loading && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.2 }}
              style={{
                position: 'fixed',
                inset: 0,
                zIndex: 80,
                display: 'grid',
                placeItems: 'center',
                background: 'rgba(251,250,247,0.92)',
                backdropFilter: 'blur(18px)',
                padding: 24,
              }}
            >
              <motion.div
                initial={{ scale: 0.96, y: 12 }}
              animate={{ scale: 1, y: 0 }}
              transition={{ type: 'spring', stiffness: 160, damping: 18 }}
                style={{
                  width: 'min(100%, 520px)',
                  borderRadius: 24,
                  border: '1px solid rgba(222,211,196,0.9)',
                  background: 'rgba(255,255,255,0.92)',
                  boxShadow: '0 40px 120px rgba(46,40,51,0.16)',
                  padding: 28,
                }}
              >
                <div style={{ display: 'flex', alignItems: 'center', gap: 16, marginBottom: 24 }}>
                  <div
                    style={{
                      width: 56,
                      height: 56,
                      borderRadius: 18,
                      display: 'grid',
                      placeItems: 'center',
                      background: '#5aa7e8',
                      boxShadow: '0 20px 40px rgba(90,167,232,0.2)',
                    }}
                  >
                  <motion.div
                    animate={{ rotate: 360 }}
                    transition={{ repeat: Infinity, duration: 1.5, ease: 'linear' }}
                    style={{
                      width: 24,
                      height: 24,
                      borderRadius: '50%',
                      border: '3px solid rgba(255,255,255,0.35)',
                      borderTopColor: '#ffffff',
                    }}
                  />
                </div>
                <div>
                  <div style={{ color: '#2e2833', fontSize: 22, fontWeight: 800 }}>Generating your itinerary</div>
                  <div style={{ color: '#756978', fontSize: 14, marginTop: 4 }}>
                    Live APIs are running in parallel to keep this as fast as possible.
                  </div>
                </div>
              </div>

              <div style={{ display: 'flex', gap: 8, marginBottom: 20 }}>
                {GENERATION_PHASES.map((_, index) => (
                  <motion.div
                    key={index}
                    animate={{
                      opacity: index === loadingPhase ? 1 : 0.32,
                      scale: index === loadingPhase ? 1 : 0.9,
                    }}
                      transition={{ duration: 0.25 }}
                      style={{
                        flex: 1,
                        height: 6,
                        borderRadius: 999,
                        background: index <= loadingPhase ? '#5aa7e8' : '#eadde5',
                      }}
                  />
                ))}
              </div>

              <motion.div
                key={loadingPhase}
                initial={{ opacity: 0, y: 8 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -8 }}
                transition={{ duration: 0.2 }}
                style={{ color: '#2e2833', fontSize: 16, fontWeight: 700, minHeight: 28 }}
              >
                {GENERATION_PHASES[loadingPhase]}
              </motion.div>

              <p style={{ margin: '12px 0 0', color: '#756978', lineHeight: 1.6, fontSize: 14 }}>
                We are pulling live POIs, weather, and trip details, then asking the model for a
                compact JSON itinerary.
              </p>

              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 12, marginTop: 24 }}>
                {['Places', 'Weather', 'Itinerary'].map((label, index) => (
                  <motion.div
                    key={label}
                    animate={{ y: [0, -4, 0] }}
                      transition={{
                      repeat: Infinity,
                      duration: 1.6,
                      delay: index * 0.2,
                      ease: 'easeInOut',
                    }}
                    style={{
                      padding: '12px 10px',
                      borderRadius: 14,
                      border: '1px solid rgba(222,211,196,0.9)',
                      background: 'rgba(252,250,247,0.95)',
                      textAlign: 'center',
                      color: '#2e2833',
                      fontSize: 13,
                      fontWeight: 700,
                    }}
                  >
                    {label}
                  </motion.div>
                ))}
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
