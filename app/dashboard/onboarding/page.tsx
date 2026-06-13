'use client';

import { useEffect, useMemo, useRef, useState } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import { useRouter, useSearchParams } from 'next/navigation';
import { loadTrip, regenerateFullTrip, saveTrip } from '@/lib/supabase-trips';
import { Brand } from '@/components/common/Brand';
import { getSupabaseBrowser } from '@/services/supabase-browser';
import { useToast } from '@/components/ui/toast';
import { Button } from '@/components/ui/button';
import type { TravelerPreferences } from '@/lib/travel-types';

const STEPS = ['Destination', 'Trip window', 'Preferences', 'Review'];
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
  const [form, setForm] = useState<TripFormState>(INITIAL_FORM);
  const [preferencesLoaded, setPreferencesLoaded] = useState(false);
  const [prefillLoading, setPrefillLoading] = useState(isEditMode);
  const searchAbortRef = useRef<AbortController | null>(null);
  const generatingRef = useRef(false);
  const toast = useToast();

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

    // Guard against double-submit — a second click must not fire a second LLM call.
    if (generatingRef.current) return;
    generatingRef.current = true;

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
      const messageText = err instanceof Error ? err.message : 'Something went wrong. Try again.';
      // Close the loader so the error + Retry (Generate) button are visible (H-1).
      setError(messageText);
      setLoading(false);
      toast.error(messageText);
    } finally {
      generatingRef.current = false;
    }
  };

  if (prefillLoading) {
    return (
      <div className="min-h-screen bg-background grid place-items-center px-6">
        <div className="surface-brutal px-6 py-5 font-bold">
          Loading trip details...
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background text-foreground">
      <div className="sticky top-0 z-20 flex items-center justify-between gap-3 border-b-2 border-ink bg-background px-4 py-3.5">
        <div className="flex items-center gap-3">
          <Brand href="/" compact />
        </div>
      </div>

      <div className="mx-auto max-w-[680px] px-4 pb-[104px] pt-6">
        <div className="mb-[18px]">
          <div className="flex items-center justify-between gap-3">
            <div className="text-[11px] font-bold uppercase tracking-[0.2em] text-muted-foreground">
              Step {step + 1} of {STEPS.length}
            </div>
            <div className="text-xs font-extrabold text-primary">{Math.round(stepProgress)}%</div>
          </div>
          <div className="mt-2.5 h-2 overflow-hidden rounded-none border-2 border-ink bg-muted">
            <div
              className="h-full bg-primary transition-[width] duration-200"
              style={{ width: `${stepProgress}%` }}
            />
          </div>
        </div>

        <div className="mb-7 flex flex-wrap gap-2">
          {STEPS.map((label, index) => (
            <div key={label} className="min-w-[120px] flex-[1_1_140px]">
              <div
                className={`h-[5px] border-2 border-ink transition-colors ${index <= step ? 'bg-primary' : 'bg-muted'}`}
              />
              <div className={`mt-2 text-[11px] font-extrabold uppercase tracking-[0.2em] ${index === step ? 'text-foreground' : 'text-muted-foreground'}`}>
                {label}
              </div>
            </div>
          ))}
        </div>

        <h1 className="mb-2.5 text-headline">
          {(
            isEditMode
              ? ['Edit your destination', 'Edit your trip window', 'Update your preferences', 'Review before saving']
              : ['Search for your destination', 'Choose your trip window', 'Set your preferences', 'Review before generating']
          )[step]}
        </h1>
        <p className="mb-7 max-w-[640px] text-base leading-relaxed text-muted-foreground">
          {(
            isEditMode
              ? [
                  'Update the destination from live search results so we can regenerate the trip with verified place data.',
                  'Set your trip window and optional transfer notes so the route starts and ends cleanly.',
                  'Change your interests, budget, and pace. Anything you edit here will be used for the regenerated trip.',
                  'Confirm the updated trip details before we call the regeneration API.',
                ]
              : [
                  'Select a real destination from live search results so we can generate your trip with verified place data.',
                  'Tell us your trip window and any optional transfer notes that help the route feel right.',
                  'Choose your interests, budget, and pace with quick presets or your own words.',
                  'Confirm the trip details pulled from your choices before we call the itinerary API.',
                ]
          )[step]}
        </p>

        {preferencesLoaded && form.budget && step <= 2 && (
          <div className="mb-6 border-2 border-ink bg-muted px-4 py-3 text-sm">
            Saved preferences loaded where available. We will reuse your budget and pacing defaults unless you change them.
          </div>
        )}

        {error && (
          <div className="mb-6 border-2 border-destructive bg-destructive/10 px-4 py-3 text-sm font-semibold text-destructive">
            {error}
          </div>
        )}

        {step === 0 && (
          <div>
            <div className="flex flex-wrap items-stretch gap-3">
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
                className="min-w-0 flex-[1_1_280px] rounded-md border-2 border-ink bg-background px-5 py-4 text-lg outline-none placeholder:text-muted-foreground focus:ring-2 focus:ring-ring focus:ring-offset-2 focus:ring-offset-background"
              />
              <Button
                type="button"
                variant="secondary"
                size="lg"
                onClick={() => void searchDestinations(form.destination)}
                disabled={searching || form.destination.trim().length < 2}
                className="min-w-[124px] flex-[0_0_auto]"
              >
                {searching ? 'Searching...' : 'Search'}
              </Button>
            </div>

            {(searching || results.length > 0) && (
              <div className="surface-brutal z-50 mt-2.5 max-h-[320px] overflow-y-auto p-0">
                  {searching ? (
                    <div className="px-5 py-3.5 text-sm text-muted-foreground">
                      Searching destinations...
                    </div>
                  ) : (
                    results.map(result => (
                      <button
                        key={`${result.name}-${result.latitude}-${result.longitude}`}
                        onClick={() => handleSelectDestination(result)}
                        className="w-full border-b-2 border-ink/10 px-5 py-3.5 text-left text-foreground last:border-b-0 hover:bg-muted"
                      >
                        <div className="font-semibold">{result.name}</div>
                        <div className="mt-0.5 text-[13px] text-muted-foreground">{result.address}</div>
                      </button>
                    ))
                  )}
                </div>
              )}

            <div className="mt-4 border-2 border-ink bg-card px-4 py-3.5 shadow-brutal">
              {typeof form.latitude === 'number' && typeof form.longitude === 'number' ? (
                <p className="m-0 text-sm font-semibold text-primary">
                  Destination selected from live results. Coordinates saved for itinerary generation.
                </p>
              ) : hasSearched && !searching && results.length === 0 ? (
                <p className="m-0 text-sm font-semibold text-destructive">
                  No matching destination found. Refine your search to continue.
                </p>
              ) : (
                <p className="m-0 text-sm text-muted-foreground">
                  Search and then pick one of the live results. We do not prefill destinations anymore.
                </p>
              )}
            </div>
          </div>
        )}

        {step === 1 && (
          <div className="flex flex-col gap-5">
            <div className="grid grid-cols-[repeat(auto-fit,minmax(160px,1fr))] gap-3.5">
              {[
                { label: 'Arrival Date', key: 'arrivalDate' as const, type: 'date' as const },
                { label: 'Departure Date', key: 'departureDate' as const, type: 'date' as const },
                { label: 'Arrival Time', key: 'arrivalTime' as const, type: 'time' as const },
                { label: 'Departure Time', key: 'departureTime' as const, type: 'time' as const },
              ].map(({ label, key, type }) => (
                <div key={key}>
                  <label className="mb-2 block text-[11px] font-bold uppercase tracking-[0.2em] text-muted-foreground">
                    {label}
                  </label>
                  <input
                    type={type}
                    value={form[key]}
                    onChange={event => setForm(previous => ({ ...previous, [key]: event.target.value }))}
                    className="w-full rounded-md border-2 border-ink bg-background px-4 py-3 text-base outline-none placeholder:text-muted-foreground focus:ring-2 focus:ring-ring focus:ring-offset-2 focus:ring-offset-background"
                  />
                </div>
              ))}
            </div>

            <div className="border-2 border-ink bg-muted px-4 py-3 text-sm">
              <p className="m-0 leading-relaxed text-muted-foreground">
                We use your arrival and departure times as hard boundaries, but the transfer notes are optional. The planner should not assume the day starts at 9:00.
              </p>
            </div>

              <div className="border-2 border-ink bg-secondary p-5 text-secondary-foreground">
                <div className="flex items-start gap-3">
                  <div className="h-[34px] w-[34px] flex-shrink-0 border-2 border-secondary-foreground/30 bg-primary" />
                  <div className="flex-1">
                    <div className="text-[11px] font-bold uppercase tracking-[0.2em] text-secondary-foreground/60">
                      Trip Assistant
                    </div>
                    <p className="mt-1.5 text-[15px] leading-relaxed text-secondary-foreground">
                    Tell us the basics first. Transfer notes help, but they are optional and can be rough.
                    </p>
                    <p className="mt-2.5 text-[13px] leading-relaxed text-secondary-foreground/70">
                    Your stay is chosen automatically from live lodging options, so these fields only refine the arrival and departure legs.
                    </p>
                  </div>
                </div>

              <div className="mt-4 grid gap-3.5">
                <div>
                  <label className="mb-2 block text-[11px] font-bold uppercase tracking-[0.2em] text-secondary-foreground/60">
                    Arrival drop-off
                    <span className="ml-1.5 text-secondary-foreground/50">(optional)</span>
                  </label>
                  <textarea
                    value={form.arrivalTransferContext}
                    onChange={event =>
                    setForm(previous => ({ ...previous, arrivalTransferContext: event.target.value }))
                  }
                    placeholder="Example: a station, airport, ferry terminal, or neighborhood"
                    rows={2}
                    className="min-h-[72px] w-full resize-y rounded-md border-2 border-ink bg-background px-4 py-3 text-base text-foreground outline-none placeholder:text-muted-foreground focus:ring-2 focus:ring-ring focus:ring-offset-2 focus:ring-offset-background"
                  />
                </div>

                <div>
                  <label className="mb-2 block text-[11px] font-bold uppercase tracking-[0.2em] text-secondary-foreground/60">
                    Departure pick-up
                    <span className="ml-1.5 text-secondary-foreground/50">(optional)</span>
                  </label>
                  <textarea
                    value={form.departureTransferContext}
                    onChange={event =>
                      setForm(previous => ({ ...previous, departureTransferContext: event.target.value }))
                    }
                    placeholder="Example: train station, railway station, airport, or ferry terminal"
                    rows={2}
                    className="min-h-[72px] w-full resize-y rounded-md border-2 border-ink bg-background px-4 py-3 text-base text-foreground outline-none placeholder:text-muted-foreground focus:ring-2 focus:ring-ring focus:ring-offset-2 focus:ring-offset-background"
                  />
                </div>
              </div>
            </div>

            <div>
              <label className="mb-3 block text-[11px] font-bold uppercase tracking-[0.2em] text-muted-foreground">
                Arriving by
              </label>
              <div className="grid grid-cols-[repeat(auto-fit,minmax(120px,1fr))] gap-3">
                {ARRIVAL_METHODS.map(method => (
                  <button
                    key={method}
                    onClick={() => setForm(previous => ({ ...previous, arrivalMethod: method }))}
                    className={`rounded-md border-2 border-ink px-3 py-4 text-sm font-extrabold capitalize ${form.arrivalMethod === method ? 'bg-primary text-primary-foreground shadow-brutal' : 'bg-card text-foreground hover:bg-muted'}`}
                  >
                    {method}
                  </button>
                ))}
              </div>
            </div>
          </div>
        )}

        {step === 2 && (
          <div className="flex flex-col gap-6">
            <div>
              <label className="mb-3 block text-[11px] font-bold uppercase tracking-[0.2em] text-muted-foreground">
                Interests
              </label>
              <input
                type="text"
                value={form.interestsText}
                onChange={event => setForm(previous => ({ ...previous, interestsText: event.target.value }))}
                placeholder="Enter interests separated by commas"
                className="w-full rounded-md border-2 border-ink bg-background px-4 py-3 text-base outline-none placeholder:text-muted-foreground focus:ring-2 focus:ring-ring focus:ring-offset-2 focus:ring-offset-background"
              />
              <p className="mt-2 text-[13px] text-muted-foreground">
                You can type your own interests or tap a suggestion to add it quickly.
              </p>
              <div className="mt-3 flex flex-wrap gap-2">
                {INTEREST_SUGGESTIONS.map(interest => (
                  <button
                    key={interest}
                    type="button"
                    onClick={() => appendInterest(interest)}
                    className="border-2 border-ink bg-card px-3 py-1.5 text-xs font-bold transition-all hover:-translate-y-0.5 hover:shadow-brutal"
                  >
                    + {interest}
                  </button>
                ))}
              </div>
            </div>

            <div className="grid grid-cols-[repeat(auto-fit,minmax(220px,1fr))] gap-4">
              <div>
                <label className="mb-2 block text-[11px] font-bold uppercase tracking-[0.2em] text-muted-foreground">
                  Budget
                </label>
                <input
                  type="number"
                  min={1}
                  value={form.budget}
                  onChange={event => setForm(previous => ({ ...previous, budget: event.target.value }))}
                  placeholder="Enter your total trip budget"
                  className="w-full rounded-md border-2 border-ink bg-background px-4 py-3 text-base outline-none placeholder:text-muted-foreground focus:ring-2 focus:ring-ring focus:ring-offset-2 focus:ring-offset-background"
                />
                <div className="mt-3 flex flex-wrap gap-2">
                  {BUDGET_PRESETS.map(preset => (
                    <button
                      key={preset}
                      type="button"
                      onClick={() => setForm(previous => ({ ...previous, budget: preset }))}
                      className={`border-2 border-ink px-3 py-1.5 text-xs font-bold ${form.budget === preset ? 'bg-primary text-primary-foreground shadow-brutal' : 'bg-card text-foreground hover:bg-muted'}`}
                    >
                      ${preset}
                    </button>
                  ))}
                </div>
              </div>

              <div>
                <label className="mb-2 block text-[11px] font-bold uppercase tracking-[0.2em] text-muted-foreground">
                  Intensity
                </label>
                <div className="grid gap-2.5">
                  {ACTIVITY_LEVELS.map(level => (
                    <button
                      key={level}
                      type="button"
                      onClick={() => setForm(previous => ({ ...previous, activityIntensity: level }))}
                      className={`rounded-md border-2 border-ink px-3.5 py-3.5 text-left font-extrabold ${form.activityIntensity === level ? 'bg-accent text-accent-foreground shadow-brutal' : 'bg-card text-foreground hover:bg-muted'}`}
                    >
                      <div className="text-sm">{level}</div>
                      <div className="mt-1 text-xs font-medium opacity-85">
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

        {step === 3 && (
          <div className="flex flex-col gap-4">
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
              <div key={label} className="flex flex-wrap items-center justify-between gap-4 border-2 border-ink bg-card px-4 py-4 shadow-brutal">
                <span className="text-sm font-bold uppercase tracking-[0.12em] text-muted-foreground">{label}</span>
                <span className="max-w-full text-right text-sm font-bold text-foreground">{value || 'Not set'}</span>
              </div>
            ))}
            <div className="border-2 border-ink bg-muted px-4 py-4 text-sm leading-relaxed text-muted-foreground">
              This is the last check. After you generate, you can still refine the trip in the saved itinerary view.
            </div>
          </div>
        )}

        <div className="mt-8 flex flex-wrap gap-3">
          {step > 0 && (
            <Button
              variant="outline"
              size="lg"
              onClick={() => setStep(currentStep => currentStep - 1)}
              disabled={loading}
              className="flex-[1_1_160px]"
            >
              Back
            </Button>
          )}
          <Button
            variant="brutal"
            size="lg"
            onClick={handleNext}
            disabled={!isValid() || loading}
            className="flex-[1_1_220px]"
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
          </Button>
        </div>
      </div>

      <AnimatePresence>
        {loading && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.2 }}
              className="fixed inset-0 z-[80] grid place-items-center bg-background/90 p-6 backdrop-blur-lg"
            >
              <motion.div
                initial={{ scale: 0.96, y: 12 }}
              animate={{ scale: 1, y: 0 }}
              transition={{ type: 'spring', stiffness: 160, damping: 18 }}
                className="w-[min(100%,520px)] rounded-lg border-2 border-ink bg-card p-7 shadow-brutal-lg"
              >
                <div className="mb-6 flex items-center gap-4">
                  <div className="grid h-14 w-14 place-items-center border-2 border-ink bg-primary">
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
                  <div className="text-[22px] font-extrabold text-foreground">Generating your itinerary</div>
                  <div className="mt-1 text-sm text-muted-foreground">
                    Live APIs are running in parallel to keep this as fast as possible (usually 20–60s).
                  </div>
                </div>
              </div>

              <div className="mb-5 flex gap-2">
                {GENERATION_PHASES.map((_, index) => (
                  <motion.div
                    key={index}
                    animate={{
                      opacity: index === loadingPhase ? 1 : 0.32,
                      scale: index === loadingPhase ? 1 : 0.9,
                    }}
                      transition={{ duration: 0.25 }}
                      className={`h-1.5 flex-1 border-2 border-ink ${index <= loadingPhase ? 'bg-primary' : 'bg-muted'}`}
                  />
                ))}
              </div>

              <motion.div
                key={loadingPhase}
                initial={{ opacity: 0, y: 8 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -8 }}
                transition={{ duration: 0.2 }}
                className="min-h-[28px] text-base font-bold text-foreground"
              >
                {GENERATION_PHASES[loadingPhase]}
              </motion.div>

              <p className="mt-3 text-sm leading-relaxed text-muted-foreground">
                We are pulling live POIs, weather, and trip details, then asking the model for a
                compact JSON itinerary.
              </p>

              <div className="mt-6 grid grid-cols-3 gap-3">
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
                    className="border-2 border-ink bg-muted px-2.5 py-3 text-center text-[13px] font-bold text-foreground"
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
