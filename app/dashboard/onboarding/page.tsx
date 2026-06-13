'use client';

import { useEffect, useMemo, useRef, useState } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import { useRouter, useSearchParams } from 'next/navigation';
import { loadTrip, regenerateFullTrip, saveTrip } from '@/lib/supabase-trips';
import { Brand } from '@/components/common/Brand';
import { getSupabaseBrowser } from '@/services/supabase-browser';
import type { TravelerPreferences } from '@/lib/travel-types';

const STEPS = ['Destination', 'Trip details', 'Review'];
const DEFAULT_ARRIVAL_TIME = '10:00';
const DEFAULT_DEPARTURE_TIME = '18:00';
const DEFAULT_ARRIVAL_METHOD = 'flight' as const;
const DEFAULT_ACTIVITY_INTENSITY = 'Balanced' as const;
const ARRIVAL_METHODS = ['flight', 'train', 'drive'] as const;
const ACTIVITY_LEVELS = ['Relaxed', 'Balanced', 'Packed'] as const;
const BUDGET_PRESETS = ['500', '1000', '1500', '2500'];
const INTEREST_SUGGESTIONS = ['food', 'museums', 'nature', 'nightlife', 'shopping', 'coffee'];
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
  countryCode?: string;
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
  /** Destination's ISO 3166-1 alpha-2 country code, from the selected result. */
  countryCode: string | null;
  /** Traveler's home currency (ISO 4217), detected from their location. */
  homeCurrency: string;
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
  countryCode: null,
  homeCurrency: 'USD',
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
  const tripWindow = itinerary?.sourceData?.tripWindow;
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
      tripWindow?.arrivalDate ||
      confirmation?.tripWindow?.arrivalDate ||
      '',
    departureDate:
      itinerary?.stay?.checkOutDate ||
      tripWindow?.departureDate ||
      confirmation?.tripWindow?.departureDate ||
      '',
    arrivalTime:
      itinerary?.stay?.checkInTime ||
      tripWindow?.arrivalTime ||
      confirmation?.tripWindow?.arrivalTime ||
      '',
    departureTime:
      itinerary?.stay?.checkOutTime ||
      tripWindow?.departureTime ||
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
  const [curatedInterests, setCuratedInterests] = useState<string[] | null>(null);
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
      // Only the dates are required; times, arrival method, interests, budget,
      // and pace all fall back to sensible defaults at submit time so a traveler
      // can generate a trip with just a destination and a date range.
      const sameDayTrip = form.arrivalDate === form.departureDate;
      const bothTimesProvided = Boolean(form.arrivalTime && form.departureTime);
      const departureAfterArrival =
        !bothTimesProvided || timeToMinutes(form.departureTime) > timeToMinutes(form.arrivalTime);

      return Boolean(
        form.arrivalDate &&
          form.departureDate &&
          form.departureDate >= form.arrivalDate &&
          (!sameDayTrip || departureAfterArrival)
      );
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
      countryCode: null,
    }));
    setResults([]);
    setHasSearched(false);
    setCuratedInterests(null);
  };

  const handleSelectDestination = (result: SearchResult) => {
    setForm(previous => ({
      ...previous,
      destination: result.name,
      latitude: result.latitude,
      longitude: result.longitude,
      countryCode: result.countryCode ?? null,
    }));
    setResults([]);
    setHasSearched(true);
    setError('');

    // Curate the interest chips to this destination from its live POIs.
    void fetch(`/api/destination-interests?lat=${result.latitude}&lon=${result.longitude}`)
      .then(response => (response.ok ? response.json() : null))
      .then(data => {
        if (Array.isArray(data?.interests) && data.interests.length > 0) {
          setCuratedInterests(data.interests as string[]);
        }
      })
      .catch(() => {
        /* keep the generic suggestions on failure */
      });
  };

  const parsedInterests = useMemo(() => {
    return form.interestsText
      .split(',')
      .map(interest => interest.trim())
      .filter(Boolean);
  }, [form.interestsText]);

  const stepProgress = ((step + 1) / STEPS.length) * 100;

  const appendInterest = (interest: string) => {
    setError('');
    setForm(previous => {
      const interests = previous.interestsText
        .split(',')
        .map(item => item.trim())
        .filter(Boolean);

      if (interests.some(item => item.toLowerCase() === interest.toLowerCase())) {
        return previous;
      }

      return {
        ...previous,
        interestsText: [...interests, interest].join(', '),
      };
    });
  };

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

  // Debounced autocomplete: search as the traveler types, but skip once a live
  // result is selected (coordinates present) or while editing an existing trip's
  // prefilled destination, so we don't re-query a confirmed selection.
  useEffect(() => {
    const query = form.destination.trim();

    if (query.length < 2 || form.latitude !== null || form.longitude !== null) {
      return;
    }

    const timer = window.setTimeout(() => {
      void searchDestinations(query);
    }, 350);

    return () => window.clearTimeout(timer);
  }, [form.destination, form.latitude, form.longitude]);

  // Ask for location once on load and localise the budget to the traveler's home
  // currency. If permission is denied or unavailable we silently keep USD.
  useEffect(() => {
    if (typeof navigator === 'undefined' || !navigator.geolocation) {
      return;
    }

    navigator.geolocation.getCurrentPosition(
      async position => {
        try {
          const { latitude, longitude } = position.coords;
          const response = await fetch(`/api/locale/currency?lat=${latitude}&lon=${longitude}`);
          if (!response.ok) {
            return;
          }
          const data = await response.json();
          if (typeof data?.currency === 'string' && data.currency) {
            setForm(previous => ({ ...previous, homeCurrency: data.currency }));
          }
        } catch {
          /* keep the USD default */
        }
      },
      () => {
        /* permission denied — keep the USD default */
      },
      { timeout: 8_000, maximumAge: 10 * 60 * 1000 }
    );
  }, []);

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

    setLoading(true);
    setError('');

    // Apply sensible defaults so the only things a traveler must choose are a
    // destination and a date range. Everything else is optional and editable.
    const arrivalMethod = form.arrivalMethod ?? DEFAULT_ARRIVAL_METHOD;
    const activityIntensity = form.activityIntensity ?? DEFAULT_ACTIVITY_INTENSITY;
    const arrivalTime = form.arrivalTime || DEFAULT_ARRIVAL_TIME;
    const departureTime = form.departureTime || DEFAULT_DEPARTURE_TIME;
    const arrivalTransferContext = form.arrivalTransferContext.trim();
    const departureTransferContext = form.departureTransferContext.trim();

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
          arrivalTime,
          departureTime,
          arrivalMethod,
          activityIntensity,
          arrivalTransferContext,
          departureTransferContext,
          budget: form.budget,
          interests: parsedInterests,
          preferences: {
            arrivalMethod,
            activityIntensity,
            budget: form.budget,
            interests: parsedInterests,
            arrivalTransferContext,
            departureTransferContext,
          },
        });

        router.replace(`/trip/${updatedTrip.trip.id}`);
        return;
      }

      const response = await fetch('/api/generate-itinerary', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          ...form,
          arrivalMethod,
          activityIntensity,
          arrivalTime,
          departureTime,
          budget: parsedBudget,
          interests: parsedInterests,
          duration,
          arrivalTransferContext,
          departureTransferContext,
          destinationCountryCode: form.countryCode,
          homeCurrency: form.homeCurrency,
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
          arrivalMethod,
          activityIntensity,
          budget: form.budget,
          interests: parsedInterests,
          arrivalTransferContext,
          departureTransferContext,
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
          background: '#F2F2F2',
          color: '#3F3D56',
          fontFamily: 'system-ui, sans-serif',
          display: 'grid',
          placeItems: 'center',
          padding: 24,
        }}
      >
        <div style={{ border: '1px solid #3F3D56', background: '#ffffff', padding: '18px 20px', fontWeight: 700 }}>
          Loading trip details...
        </div>
      </div>
    );
  }

  return (
    <div
      style={{
        minHeight: '100vh',
        background: '#F2F2F2',
        color: '#3F3D56',
        fontFamily: 'system-ui, sans-serif',
      }}
    >
      <div
        style={{
          position: 'sticky',
          top: 0,
          zIndex: 20,
          borderBottom: '1px solid #DDDCE8',
          padding: '14px 16px',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          gap: 12,
          background: '#FBFAFF',
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
          <Brand href="/" compact />
        </div>
      </div>

      <div style={{ maxWidth: 680, margin: '0 auto', padding: '24px 16px 104px' }}>
        <div style={{ marginBottom: 18 }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 12 }}>
            <div style={{ fontSize: 12, fontWeight: 800, letterSpacing: 1.2, textTransform: 'uppercase', color: '#8A869C' }}>
              Step {step + 1} of {STEPS.length}
            </div>
            <div style={{ fontSize: 12, fontWeight: 800, color: '#6C63FF' }}>{Math.round(stepProgress)}%</div>
          </div>
          <div style={{ marginTop: 10, height: 8, borderRadius: 999, background: '#DDDCE8', overflow: 'hidden' }}>
            <div
              style={{
                width: `${stepProgress}%`,
                height: '100%',
                borderRadius: 999,
                background: 'linear-gradient(90deg, #6C63FF 0%, #FF6584 100%)',
                transition: 'width .25s ease',
              }}
            />
          </div>
        </div>

        <div style={{ display: 'flex', gap: 8, marginBottom: 28, flexWrap: 'wrap' }}>
          {STEPS.map((label, index) => (
            <div key={label} style={{ flex: '1 1 140px', minWidth: 120 }}>
              <div
                style={{
                  height: 5,
                  borderRadius: 999,
                  background: index <= step ? '#6C63FF' : '#DDDCE8',
                  transition: 'background .3s',
                }}
              />
              <div style={{ marginTop: 8, fontSize: 11, color: index === step ? '#3F3D56' : '#8A869C', fontWeight: 800, textTransform: 'uppercase', letterSpacing: 1.2 }}>
                {label}
              </div>
            </div>
          ))}
        </div>

        <h1 style={{ fontSize: 'clamp(2rem, 5vw, 3.4rem)', fontWeight: 900, marginBottom: 10, letterSpacing: -1.5, lineHeight: 1 }}>
          {(
            isEditMode
              ? ['Edit your destination', 'Edit your trip details', 'Review before saving']
              : ['Search for your destination', 'Plan your trip', 'Review before generating']
          )[step]}
        </h1>
        <p style={{ color: '#6F6C82', marginBottom: 28, fontSize: 'clamp(0.98rem, 2.5vw, 1.05rem)', lineHeight: 1.65, maxWidth: 640 }}>
          {(
            isEditMode
              ? [
                  'Update the destination from live search results so we can regenerate the trip with verified place data.',
                  'Adjust your dates and, if you like, your pace, budget, and interests. Anything you leave alone keeps its current value.',
                  'Confirm the updated trip details before we call the regeneration API.',
                ]
              : [
                  'Select a real destination from live search results so we can generate your trip with verified place data.',
                  'Pick your dates to get started. Times, pace, budget, and interests are optional — we fill in sensible defaults.',
                  'Confirm the trip details pulled from your choices before we call the itinerary API.',
                ]
          )[step]}
        </p>

        {preferencesLoaded && form.budget && step <= 1 && (
          <div style={{ marginBottom: 24, padding: '12px 14px', borderRadius: 18, border: '1px solid #DDDCE8', background: '#FBFAFF', color: '#6F6C82', fontSize: 14 }}>
            Saved preferences loaded where available. We will reuse your budget and pacing defaults unless you change them.
          </div>
        )}

        {error && (
          <div style={{ marginBottom: 24, padding: '14px 16px', background: '#FFF0F4', border: '1px solid #f0d7de', borderRadius: 18, color: '#C14D72', fontSize: 14, boxShadow: '0 10px 30px rgba(165,58,83,0.08)' }}>
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
                style={{ flex: '1 1 280px', minWidth: 0, padding: '16px 20px', fontSize: 18, background: '#ffffff', border: '1px solid #DDDCE8', borderRadius: 18, color: '#3F3D56', outline: 'none', boxSizing: 'border-box', boxShadow: '0 14px 36px rgba(67,32,79,0.06)' }}
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
                  background: searching || form.destination.trim().length < 2 ? '#DDDCE8' : '#3F3D56',
                  color: searching || form.destination.trim().length < 2 ? '#8A869C' : '#ffffff',
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
              <div style={{ marginTop: 10, background: '#ffffff', border: '1px solid #DDDCE8', borderRadius: 18, overflow: 'hidden', zIndex: 50, boxShadow: '0 16px 42px rgba(46,40,51,0.12)', maxHeight: 320, overflowY: 'auto' }}>
                  {searching ? (
                    <div style={{ padding: '14px 20px', color: '#6F6C82', fontSize: 14 }}>
                      Searching destinations...
                    </div>
                  ) : (
                    results.map(result => (
                      <button
                        key={`${result.name}-${result.latitude}-${result.longitude}`}
                        onClick={() => handleSelectDestination(result)}
                        style={{ width: '100%', padding: '14px 20px', textAlign: 'left', background: 'none', border: 'none', borderBottom: '1px solid #f4e5ee', cursor: 'pointer', color: '#3F3D56' }}
                        onMouseEnter={event => (event.currentTarget.style.background = '#FBFAFF')}
                        onMouseLeave={event => (event.currentTarget.style.background = 'none')}
                      >
                        <div style={{ fontWeight: 600 }}>{result.name}</div>
                        <div style={{ fontSize: 13, color: '#8A869C', marginTop: 2 }}>{result.address}</div>
                      </button>
                    ))
                  )}
                </div>
              )}

            <div style={{ marginTop: 16, padding: '14px 16px', borderRadius: 18, border: '1px solid #DDDCE8', background: '#ffffff', boxShadow: '0 10px 28px rgba(67,32,79,0.06)' }}>
              {typeof form.latitude === 'number' && typeof form.longitude === 'number' ? (
                <p style={{ margin: 0, color: '#6C63FF', fontSize: 14, fontWeight: 600 }}>
                  Destination selected from live results. Coordinates saved for itinerary generation.
                </p>
              ) : hasSearched && !searching && results.length === 0 ? (
                <p style={{ margin: 0, color: '#C14D72', fontSize: 14, fontWeight: 600 }}>
                  No matching destination found. Refine your search to continue.
                </p>
              ) : (
                <p style={{ margin: 0, color: '#6F6C82', fontSize: 14 }}>
                  Start typing and pick one of the live results as they appear. We use the exact place you select for accurate coordinates.
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
                  <label style={{ display: 'block', marginBottom: 8, fontSize: 13, fontWeight: 700, color: '#6F6C82', textTransform: 'uppercase', letterSpacing: 1.1 }}>
                    {label}
                  </label>
                  <input
                    type={type}
                    value={form[key]}
                    onChange={event => setForm(previous => ({ ...previous, [key]: event.target.value }))}
                    style={{ width: '100%', padding: '14px 16px', background: '#ffffff', border: '1px solid #DDDCE8', borderRadius: 16, color: '#3F3D56', colorScheme: 'light', fontSize: 16, boxSizing: 'border-box', boxShadow: '0 10px 28px rgba(67,32,79,0.06)' }}
                  />
                </div>
              ))}
            </div>

            <div style={{ padding: '14px 16px', border: '1px solid #DDDCE8', background: '#FBFAFF' }}>
              <p style={{ margin: 0, color: '#6F6C82', fontSize: 14, lineHeight: 1.6 }}>
                We use your arrival and departure times as hard boundaries, but the transfer notes are optional. The planner should not assume the day starts at 9:00.
              </p>
            </div>

              <div style={{ border: '1px solid #DDDCE8', background: '#ffffff', padding: 18 }}>
                <div style={{ display: 'flex', gap: 12, alignItems: 'flex-start' }}>
                  <div style={{ width: 34, height: 34, borderRadius: 12, background: '#6C63FF', flexShrink: 0 }} />
                  <div style={{ flex: 1 }}>
                    <div style={{ fontSize: 12, fontWeight: 800, letterSpacing: 1, textTransform: 'uppercase', color: '#8A869C' }}>
                      Trip Assistant
                    </div>
                    <p style={{ margin: '6px 0 0', color: '#3F3D56', fontSize: 15, lineHeight: 1.6 }}>
                    Tell us the basics first. Transfer notes help, but they are optional and can be rough.
                    </p>
                    <p style={{ margin: '10px 0 0', color: '#6F6C82', fontSize: 13, lineHeight: 1.6 }}>
                    Your stay is chosen automatically from live lodging options, so these fields only refine the arrival and departure legs.
                    </p>
                  </div>
                </div>

              <div style={{ display: 'grid', gap: 14, marginTop: 16 }}>
                <div>
                  <label style={{ display: 'block', marginBottom: 8, fontSize: 13, fontWeight: 700, color: '#6F6C82', textTransform: 'uppercase', letterSpacing: 1.1 }}>
                    Arrival drop-off
                    <span style={{ marginLeft: 6, color: '#8A869C' }}>(optional)</span>
                  </label>
                  <textarea
                    value={form.arrivalTransferContext}
                    onChange={event =>
                    setForm(previous => ({ ...previous, arrivalTransferContext: event.target.value }))
                  }
                    placeholder="Example: a station, airport, ferry terminal, or neighborhood"
                    rows={2}
                    style={{ width: '100%', resize: 'vertical', minHeight: 72, padding: '14px 16px', background: '#FBFAFF', border: '1px solid #DDDCE8', color: '#3F3D56', fontSize: 16, boxSizing: 'border-box' }}
                  />
                </div>

                <div>
                  <label style={{ display: 'block', marginBottom: 8, fontSize: 13, fontWeight: 700, color: '#6F6C82', textTransform: 'uppercase', letterSpacing: 1.1 }}>
                    Departure pick-up
                    <span style={{ marginLeft: 6, color: '#8A869C' }}>(optional)</span>
                  </label>
                  <textarea
                    value={form.departureTransferContext}
                    onChange={event =>
                      setForm(previous => ({ ...previous, departureTransferContext: event.target.value }))
                    }
                    placeholder="Example: train station, railway station, airport, or ferry terminal"
                    rows={2}
                    style={{ width: '100%', resize: 'vertical', minHeight: 72, padding: '14px 16px', background: '#FBFAFF', border: '1px solid #DDDCE8', color: '#3F3D56', fontSize: 16, boxSizing: 'border-box' }}
                  />
                </div>
              </div>
            </div>

            <div>
              <label style={{ display: 'block', marginBottom: 12, fontSize: 13, fontWeight: 700, color: '#6F6C82', textTransform: 'uppercase', letterSpacing: 1.1 }}>
                Arriving by <span style={{ color: '#8A869C', textTransform: 'none', letterSpacing: 0 }}>(optional, defaults to flight)</span>
              </label>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(120px, 1fr))', gap: 12 }}>
                {ARRIVAL_METHODS.map(method => (
                  <button
                    key={method}
                    onClick={() => setForm(previous => ({ ...previous, arrivalMethod: method }))}
                    style={{ padding: '16px 12px', borderRadius: 16, border: `2px solid ${form.arrivalMethod === method ? '#6C63FF' : '#DDDCE8'}`, background: form.arrivalMethod === method ? '#6C63FF' : '#ffffff', color: form.arrivalMethod === method ? '#ffffff' : '#6F6C82', cursor: 'pointer', fontWeight: 800, textTransform: 'capitalize', fontSize: 14, boxShadow: '0 10px 26px rgba(67,32,79,0.06)' }}
                  >
                    {method}
                  </button>
                ))}
              </div>
            </div>
          </div>
        )}

        {step === 1 && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 24, marginTop: 24, paddingTop: 24, borderTop: '1px solid #DDDCE8' }}>
            <div>
              <label
                style={{
                  display: 'block',
                  marginBottom: 12,
                  fontSize: 13,
                  fontWeight: 700,
                  color: '#6F6C82',
                  textTransform: 'uppercase',
                  letterSpacing: 1.1,
                }}
              >
                Interests <span style={{ color: '#8A869C', textTransform: 'none', letterSpacing: 0 }}>(optional)</span>
              </label>
              <input
                type="text"
                value={form.interestsText}
                onChange={event => setForm(previous => ({ ...previous, interestsText: event.target.value }))}
                placeholder="Enter interests separated by commas"
                style={{
                  width: '100%',
                  padding: '14px 16px',
                  background: '#ffffff',
                  border: '1px solid #DDDCE8',
                  borderRadius: 16,
                  color: '#3F3D56',
                  fontSize: 16,
                  boxSizing: 'border-box',
                  boxShadow: '0 10px 28px rgba(67,32,79,0.06)',
                }}
              />
              <p style={{ marginTop: 8, fontSize: 13, color: '#8A869C' }}>
                {curatedInterests
                  ? `Suggestions tailored to ${form.destination || 'your destination'} — tap to add, or type your own.`
                  : 'You can type your own interests or tap a suggestion to add it quickly.'}
              </p>
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8, marginTop: 12 }}>
                {(curatedInterests ?? INTEREST_SUGGESTIONS).map(interest => (
                  <button
                    key={interest}
                    type="button"
                    onClick={() => appendInterest(interest)}
                    style={{
                      border: '1px solid #DDDCE8',
                      background: '#FBFAFF',
                      color: '#3F3D56',
                      borderRadius: 999,
                      padding: '8px 12px',
                      fontSize: 13,
                      fontWeight: 700,
                      cursor: 'pointer',
                    }}
                  >
                    + {interest}
                  </button>
                ))}
              </div>
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: 16 }}>
              <div>
                <label
                  style={{
                    display: 'block',
                    marginBottom: 8,
                    fontSize: 13,
                    fontWeight: 700,
                    color: '#6F6C82',
                    textTransform: 'uppercase',
                    letterSpacing: 1.1,
                  }}
                >
                  Budget <span style={{ color: '#8A869C', textTransform: 'none', letterSpacing: 0 }}>(optional, in {form.homeCurrency})</span>
                </label>
                <input
                  type="number"
                  min={1}
                  value={form.budget}
                  onChange={event => setForm(previous => ({ ...previous, budget: event.target.value }))}
                  placeholder="Enter your total trip budget"
                  style={{
                    width: '100%',
                    padding: '14px 16px',
                    background: '#ffffff',
                    border: '1px solid #DDDCE8',
                    borderRadius: 16,
                    color: '#3F3D56',
                    fontSize: 16,
                    boxSizing: 'border-box',
                    boxShadow: '0 10px 28px rgba(67,32,79,0.06)',
                  }}
                />
                <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8, marginTop: 12 }}>
                  {BUDGET_PRESETS.map(preset => (
                    <button
                      key={preset}
                      type="button"
                      onClick={() => setForm(previous => ({ ...previous, budget: preset }))}
                      style={{
                        border: `1px solid ${form.budget === preset ? '#6C63FF' : '#DDDCE8'}`,
                        background: form.budget === preset ? '#EEEDFE' : '#FFFFFF',
                        color: '#3F3D56',
                        borderRadius: 999,
                        padding: '8px 12px',
                        fontSize: 13,
                        fontWeight: 700,
                        cursor: 'pointer',
                      }}
                    >
                      ${preset}
                    </button>
                  ))}
                </div>
              </div>

              <div>
                <label
                  style={{
                    display: 'block',
                    marginBottom: 8,
                    fontSize: 13,
                    fontWeight: 700,
                    color: '#6F6C82',
                    textTransform: 'uppercase',
                    letterSpacing: 1.1,
                  }}
                >
                  Intensity <span style={{ color: '#8A869C', textTransform: 'none', letterSpacing: 0 }}>(optional, defaults to Balanced)</span>
                </label>
                <div style={{ display: 'grid', gap: 10 }}>
                  {ACTIVITY_LEVELS.map(level => (
                    <button
                      key={level}
                      type="button"
                      onClick={() => setForm(previous => ({ ...previous, activityIntensity: level }))}
                      style={{
                        padding: '14px 14px',
                        borderRadius: 16,
                        border: `2px solid ${form.activityIntensity === level ? '#FF6584' : '#DDDCE8'}`,
                        background: form.activityIntensity === level ? '#FF6584' : '#ffffff',
                        color: form.activityIntensity === level ? '#fff' : '#6F6C82',
                        cursor: 'pointer',
                        fontWeight: 800,
                        textAlign: 'left',
                        boxShadow: '0 10px 26px rgba(67,32,79,0.06)',
                      }}
                    >
                      <div style={{ fontSize: 14 }}>{level}</div>
                      <div style={{ marginTop: 4, fontSize: 12, fontWeight: 500, opacity: 0.85 }}>
                        {level === 'Relaxed'
                          ? 'More buffer and fewer stops'
                          : level === 'Balanced'
                            ? 'A steady pace with room to breathe'
                            : 'More stops and less downtime'}
                      </div>
                    </button>
                  ))}
                </div>
              </div>
            </div>
          </div>
        )}

        {step === 2 && (
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
              <div key={label} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 16, padding: '16px 18px', background: '#ffffff', border: '1px solid #DDDCE8', borderRadius: 18, boxShadow: '0 10px 28px rgba(67,32,79,0.06)', flexWrap: 'wrap' }}>
                <span style={{ color: '#8A869C', fontWeight: 700, fontSize: 14, textTransform: 'uppercase', letterSpacing: 0.8 }}>{label}</span>
                <span style={{ color: '#3F3D56', fontWeight: 700, fontSize: 14, textAlign: 'right', maxWidth: '100%' }}>{value || 'Not set'}</span>
              </div>
            ))}
            <div style={{ padding: '16px 18px', borderRadius: 18, border: '1px solid #DDDCE8', background: '#FBFAFF', color: '#6F6C82', lineHeight: 1.6, fontSize: 14 }}>
              This is the last check. After you generate, you can still refine the trip in the saved itinerary view.
            </div>
          </div>
        )}

        <div style={{ display: 'flex', gap: 12, marginTop: 32, flexWrap: 'wrap' }}>
          {step > 0 && (
            <button
              onClick={() => setStep(currentStep => currentStep - 1)}
              disabled={loading}
              style={{ padding: '16px 28px', borderRadius: 16, border: '1px solid #DDDCE8', background: '#ffffff', color: '#3F3D56', cursor: 'pointer', fontWeight: 800, fontSize: 16, flex: '1 1 160px', boxShadow: '0 10px 28px rgba(67,32,79,0.06)' }}
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
              background: isValid() && !loading ? '#3F3D56' : '#DDDCE8',
              color: isValid() && !loading ? '#fff' : '#8A869C',
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
                      background: '#6C63FF',
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
                  <div style={{ color: '#3F3D56', fontSize: 22, fontWeight: 800 }}>Generating your itinerary</div>
                  <div style={{ color: '#6F6C82', fontSize: 14, marginTop: 4 }}>
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
                        background: index <= loadingPhase ? '#6C63FF' : '#DDDCE8',
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
                style={{ color: '#3F3D56', fontSize: 16, fontWeight: 700, minHeight: 28 }}
              >
                {GENERATION_PHASES[loadingPhase]}
              </motion.div>

              <p style={{ margin: '12px 0 0', color: '#6F6C82', lineHeight: 1.6, fontSize: 14 }}>
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
                      color: '#3F3D56',
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
