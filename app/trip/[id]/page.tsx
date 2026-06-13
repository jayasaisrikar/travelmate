'use client';

import Link from 'next/link';
import { useParams } from 'next/navigation';
import { useEffect, useMemo, useRef, useState } from 'react';
import { motion } from 'framer-motion';
import { AuthGate } from '@/components/auth/AuthGate';
import { Brand } from '@/components/common/Brand';
import { DestinationPhotoCover } from '@/components/common/DestinationPhotoCover';
import { StatusCard } from '@/components/common/StatusCard';
import ItineraryChat from '@/components/ItineraryChat';
import { MapView } from '@/components/trip/MapView';
import { BudgetBreakdown } from '@/components/trip/BudgetBreakdown';
import { TimelineView } from '@/components/trip/TimelineView';
import { CompanionStrip } from '@/components/social/CompanionStrip';
import { ShareModal } from '@/components/trip/ShareModal';
import { Modal } from '@/components/ui/modal';
import { Button } from '@/components/ui/button';
import { loadTrip, loadTripSuggestions, retryTripStay, updateTripDetails, Trip } from '@/lib/supabase-trips';
import { formatTripMoney } from '@/lib/utils';
import type {
  GeneratedItinerary,
  ItineraryActivity,
  ItineraryDayPlan,
  TravelStay,
  TripCurrency,
  TripSuggestion,
} from '@/lib/travel-types';

export const dynamicParams = true;

type TripItinerary = GeneratedItinerary;

type TripMapActivity = {
  day: number;
  dayTheme: string;
  activityIndex: number;
  time: string;
  name: string;
  category: string;
  description: string;
  address: string | null;
  latitude: number | null;
  longitude: number | null;
  estimated_cost: number | null;
};

function getDailyPlans(itinerary: TripItinerary | null | undefined): ItineraryDayPlan[] {
  if (Array.isArray(itinerary?.dailyPlans)) {
    return itinerary.dailyPlans;
  }

  if (Array.isArray(itinerary?.daily_plans)) {
    return itinerary.daily_plans;
  }

  return [];
}

function getTotalEstimatedCost(itinerary: TripItinerary | null | undefined): string | null {
  const rawValue = itinerary?.totalEstimatedCost ?? itinerary?.total_estimated_cost;

  if (typeof rawValue === 'number' || typeof rawValue === 'string') {
    return String(rawValue);
  }

  return null;
}

function getDestinationCoordinates(itinerary: TripItinerary | null | undefined) {
  const destination = itinerary?.sourceData?.destination;

  if (
    destination &&
    typeof destination.latitude === 'number' &&
    typeof destination.longitude === 'number'
  ) {
    return {
      latitude: destination.latitude,
      longitude: destination.longitude,
    };
  }

  return null;
}

function getStay(itinerary: TripItinerary | null | undefined): TravelStay | null {
  const stay = itinerary?.stay;

  if (
    stay &&
    typeof stay.latitude === 'number' &&
    typeof stay.longitude === 'number' &&
    typeof stay.name === 'string'
  ) {
    return stay;
  }

  return null;
}

function getFlatActivities(dailyPlans: ItineraryDayPlan[]): TripMapActivity[] {
  return dailyPlans.flatMap((day, dayIndex) => {
    const activities = Array.isArray(day?.activities) ? day.activities : [];

    return activities.map((activity: ItineraryActivity, activityIndex: number) => ({
      day: typeof day.day === 'number' ? day.day : dayIndex + 1,
      dayTheme: day.theme || `Day ${dayIndex + 1}`,
      activityIndex,
      time: activity.time || '',
      name: activity.name || 'Activity',
      category: activity.category || 'Stop',
      description: activity.description || '',
      address: activity.address || null,
      latitude: typeof activity.latitude === 'number' ? activity.latitude : null,
      longitude: typeof activity.longitude === 'number' ? activity.longitude : null,
      estimated_cost:
        typeof activity.estimated_cost === 'number' ? activity.estimated_cost : activity.cost ?? null,
    }));
  });
}

export default function TripDetailsPage() {
  const params = useParams();
  const tripId = typeof params?.id === 'string' ? params.id : '';
  const [trip, setTrip] = useState<Trip | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [isChatOpen, setIsChatOpen] = useState(false);
  const [isShareOpen, setIsShareOpen] = useState(false);
  const [selectedStopIndex, setSelectedStopIndex] = useState<number | null>(null);
  const [isStayRetryOpen, setIsStayRetryOpen] = useState(false);
  const [stayBudgetRange, setStayBudgetRange] = useState('');
  const [stayPreferredLocation, setStayPreferredLocation] = useState('');
  const [stayRetryLoading, setStayRetryLoading] = useState(false);
  const [stayRetryError, setStayRetryError] = useState('');
  const [focusStayTrigger, setFocusStayTrigger] = useState(0);
  const [shareUrl, setShareUrl] = useState('');
  const [shareToken, setShareToken] = useState('');
  const [isGuestSuggestionsOpen, setIsGuestSuggestionsOpen] = useState(false);
  const [isEditTripOpen, setIsEditTripOpen] = useState(false);
  const [editTripLoading, setEditTripLoading] = useState(false);
  const [editTripError, setEditTripError] = useState('');
  const [editDestination, setEditDestination] = useState('');
  const [editDuration, setEditDuration] = useState('');
  const [editBudget, setEditBudget] = useState('');
  const [editInterests, setEditInterests] = useState('');
  const [suggestions, setSuggestions] = useState<TripSuggestion[]>([]);
  const [suggestionsLoading, setSuggestionsLoading] = useState(false);
  const [suggestionsError, setSuggestionsError] = useState('');
  const mapSectionRef = useRef<HTMLElement | null>(null);

  const openEditTrip = () => {
    if (!trip) {
      return;
    }

    setEditDestination(trip.destination);
    setEditDuration(String(trip.duration));
    setEditBudget(trip.budget || '');
    setEditInterests(Array.isArray(trip.interests) ? trip.interests.join(', ') : '');
    setEditTripError('');
    setIsEditTripOpen(true);
  };

  const closeEditTrip = () => {
    setIsEditTripOpen(false);
    setEditTripError('');
    setEditTripLoading(false);
  };

  useEffect(() => {
    if (!tripId) {
      setLoading(false);
      setError('Invalid trip id');
      return;
    }

    const fetchTrip = async () => {
      try {
        const tripData = await loadTrip(tripId);
        setTrip(tripData.trip);
        setShareUrl(tripData.shareUrl || '');
        setShareToken(tripData.share?.token || '');
      } catch (err: unknown) {
        console.error('Error loading trip:', err);
        setError(err instanceof Error ? err.message : 'Failed to load trip');
      } finally {
        setLoading(false);
      }
    };

    fetchTrip();
  }, [tripId]);

  useEffect(() => {
    if (!tripId || !trip) {
      return;
    }

    let mounted = true;

    const fetchSuggestions = async () => {
      setSuggestionsLoading(true);
      setSuggestionsError('');

      try {
        const loadedSuggestions = await loadTripSuggestions(tripId);

        if (!mounted) {
          return;
        }

        setSuggestions(loadedSuggestions);
      } catch (err: unknown) {
        if (!mounted) {
          return;
        }

        setSuggestionsError(err instanceof Error ? err.message : 'Failed to load suggestions');
      } finally {
        if (mounted) {
          setSuggestionsLoading(false);
        }
      }
    };

    fetchSuggestions();

    return () => {
      mounted = false;
    };
  }, [trip, tripId]);

  const dailyPlans = useMemo(() => getDailyPlans(trip?.itinerary), [trip]);
  const totalEstimatedCost = useMemo(() => getTotalEstimatedCost(trip?.itinerary), [trip]);
  const destinationCoordinates = useMemo(() => getDestinationCoordinates(trip?.itinerary), [trip]);
  const stay = useMemo(() => getStay(trip?.itinerary), [trip]);
  const mapActivities = useMemo(() => getFlatActivities(dailyPlans), [dailyPlans]);
  const budgetBreakdown = useMemo(
    () => trip?.itinerary?.budgetBreakdown ?? trip?.itinerary?.budget_breakdown ?? null,
    [trip]
  );
  const [tripCurrency, setTripCurrency] = useState<TripCurrency | null>(null);
  const totalEstimatedCostValue = useMemo(() => {
    if (!totalEstimatedCost) return Number.NaN;
    return Number.parseFloat(totalEstimatedCost.replace(/[^0-9.]+/g, ''));
  }, [totalEstimatedCost]);

  // Use the trip's own currency when present; otherwise backfill — older trips
  // have no currency block and their costs were generated in USD, so we convert
  // them to the viewer's detected home currency for a consistent symbol.
  useEffect(() => {
    if (!trip) {
      return;
    }
    const existing = trip.itinerary?.currency ?? null;
    if (existing) {
      setTripCurrency(existing);
      return;
    }

    let cancelled = false;
    fetch('/api/locale/currency')
      .then(response => (response.ok ? response.json() : null))
      .then(data => {
        if (cancelled || typeof data?.currency !== 'string') {
          return;
        }
        setTripCurrency({
          display: 'USD',
          home: data.currency,
          rateToHome: typeof data.usdToHome === 'number' && data.usdToHome > 0 ? data.usdToHome : 1,
        });
      })
      .catch(() => {
        /* leave as USD */
      });

    return () => {
      cancelled = true;
    };
  }, [trip]);

  const scrollToMap = () => {
    mapSectionRef.current?.scrollIntoView({
      behavior: 'smooth',
      block: 'start',
    });
  };

  const handleStayRetry = async () => {
    const budgetRange = stayBudgetRange.trim();
    const preferredLocation = stayPreferredLocation.trim();

    if (!budgetRange || !preferredLocation || !trip) {
      setStayRetryError('Please share both a budget range and a preferred area.');
      return;
    }

    setStayRetryLoading(true);
    setStayRetryError('');

    try {
      const updatedTrip = await retryTripStay(trip.id, {
        budgetRange,
        preferredLocation,
      });

      setTrip(updatedTrip);
      setIsStayRetryOpen(false);
      setStayBudgetRange('');
      setStayPreferredLocation('');
    } catch (err: unknown) {
      console.error('Error retrying stay:', err);
      setStayRetryError(err instanceof Error ? err.message : 'Failed to update the stay');
    } finally {
      setStayRetryLoading(false);
    }
  };

  const handleEditTrip = async () => {
    if (!trip) {
      return;
    }

    const destination = editDestination.trim();
    const budget = editBudget.trim();
    const duration = Number.parseInt(editDuration, 10);
    const interests = editInterests
      .split(',')
      .map(interest => interest.trim())
      .filter(Boolean);

    if (!destination) {
      setEditTripError('Destination is required.');
      return;
    }

    if (!Number.isInteger(duration) || duration < 1) {
      setEditTripError('Duration must be at least 1 day.');
      return;
    }

    if (!budget) {
      setEditTripError('Budget is required.');
      return;
    }

    if (interests.length === 0) {
      setEditTripError('Add at least one interest.');
      return;
    }

    setEditTripLoading(true);
    setEditTripError('');

    try {
      const updatedTrip = await updateTripDetails(trip.id, {
        destination,
        duration,
        budget,
        interests,
      });

      setTrip(updatedTrip.trip);
      setShareUrl(updatedTrip.shareUrl ?? '');
      setShareToken(updatedTrip.shareToken ?? '');
      closeEditTrip();
    } catch (err: unknown) {
      setEditTripError(err instanceof Error ? err.message : 'Failed to update trip');
    } finally {
      setEditTripLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-background px-4 text-foreground">
        <div className="w-full max-w-xl">
          <StatusCard
            tone="neutral"
            eyebrow="Trip"
            title="Loading your trip"
            description="We’re pulling in the itinerary, map stops, and share state so the page opens with the latest details."
          />
        </div>
      </div>
    );
  }

  if (!trip) {
    return (
      <main className="min-h-screen bg-background text-foreground">
        <nav className="sticky top-0 z-40 border-b-2 border-ink bg-background">
          <div className="mx-auto flex max-w-7xl items-center justify-between px-4 py-4 sm:px-6">
            <Brand href="/" compact />
          </div>
        </nav>

        <div className="mx-auto max-w-7xl px-4 py-16 sm:px-6">
          <StatusCard
            tone="warning"
            eyebrow="Trip not found"
            title="We couldn’t load this trip"
            description={error || 'The requested trip is unavailable. It may have been deleted or not saved correctly.'}
            actions={
              <Link
                href="/dashboard"
                className="rounded-md border-2 border-ink bg-secondary px-6 py-3 font-bold text-secondary-foreground shadow-brutal transition hover:-translate-y-0.5 hover:shadow-brutal-lg"
              >
                Back to Dashboard
              </Link>
            }
          />
        </div>
      </main>
    );
  }

  return (
    <AuthGate>
      <main className="min-h-screen bg-background text-foreground">
      <ShareModal
        tripId={trip.id}
        destination={trip.destination}
        shareUrl={shareUrl}
        shareToken={shareToken}
        isOpen={isShareOpen}
        onClose={() => setIsShareOpen(false)}
      />
      <ItineraryChat
        itinerary={trip.itinerary}
        isOpen={isChatOpen}
        onClose={() => setIsChatOpen(false)}
      />

      <nav className="sticky top-0 z-40 border-b-2 border-ink bg-background">
        <div className="mx-auto flex max-w-7xl flex-wrap items-center justify-between gap-3 px-4 py-4 sm:px-6">
          <Brand href="/" compact />
          <div className="flex items-center gap-3">
            <Link href="/dashboard" className="text-sm font-semibold text-muted-foreground transition hover:text-foreground">
              Back to Trips
            </Link>
          </div>
        </div>
      </nav>

      <div className="mx-auto max-w-7xl px-4 py-6 sm:px-6 sm:py-10">
        <motion.section
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          className="grid gap-6 lg:grid-cols-[1.1fr_0.9fr]"
        >
          <div className="relative overflow-hidden group rounded-lg border-2 border-ink shadow-brutal-lg flex flex-col justify-between min-h-[360px]">
            <div className="absolute inset-0 z-0 scale-105 transition-transform duration-700 group-hover:scale-100">
              <DestinationPhotoCover destination={trip.destination} className="h-full w-full" />
            </div>
            <div className="absolute inset-0 z-10 bg-gradient-to-t from-slate-950/95 via-slate-950/60 to-slate-950/20 pointer-events-none" />
            <div className="absolute inset-0 z-10 ring-1 ring-inset ring-white/10 pointer-events-none" />

            <div className="relative z-20 p-6 sm:p-8 flex flex-col h-full justify-end text-white">
              <div>
                <span className="inline-flex items-center gap-1.5 border-2 border-ink bg-accent px-3 py-1 text-[11px] font-bold uppercase tracking-[0.2em] text-accent-foreground">
                  Saved trip
                </span>
                <h1 className="mt-4 text-headline sm:text-display drop-shadow-[0_4px_10px_rgba(0,0,0,0.9)]">
                  {trip.destination}
                </h1>
                <p className="mt-3 max-w-2xl text-sm leading-7 text-slate-200 sm:text-base drop-shadow-[0_2px_4px_rgba(0,0,0,0.8)]">
                  A trip built from live destination data, your trip window, and the places we can actually map.
                </p>
              </div>

              <div className="mt-8 flex flex-wrap gap-3">
                <button
                  onClick={() => setIsChatOpen(true)}
                  className="rounded-md border-2 border-ink bg-primary px-5 py-3 text-sm font-bold text-primary-foreground shadow-brutal transition-all hover:-translate-y-0.5 hover:shadow-brutal-lg active:translate-x-[2px] active:translate-y-[2px] active:shadow-none"
                >
                  Open Trip Assistant
                </button>
                <Link
                  href={`/dashboard/onboarding?tripId=${encodeURIComponent(trip.id)}`}
                  className="rounded-md border-2 border-ink bg-card px-5 py-3 text-sm font-bold text-foreground shadow-brutal transition-all hover:-translate-y-0.5 hover:shadow-brutal-lg active:translate-x-[2px] active:translate-y-[2px] active:shadow-none"
                >
                  Edit trip
                </Link>
                <button
                  onClick={() => setIsShareOpen(true)}
                  className="rounded-md border-2 border-ink bg-card px-5 py-3 text-sm font-bold text-foreground shadow-brutal transition-all hover:-translate-y-0.5 hover:shadow-brutal-lg active:translate-x-[2px] active:translate-y-[2px] active:shadow-none"
                >
                  Share trip
                </button>
                <Link
                  href="/dashboard"
                  className="rounded-md border-2 border-ink bg-card px-5 py-3 text-sm font-bold text-foreground shadow-brutal transition-all hover:-translate-y-0.5 hover:shadow-brutal-lg active:translate-x-[2px] active:translate-y-[2px] active:shadow-none"
                >
                  Back to Dashboard
                </Link>
              </div>
            </div>
          </div>

          <div className="grid gap-3 sm:grid-cols-3 lg:grid-cols-1">
            <div className="rounded-lg border-2 border-ink bg-card p-5 shadow-brutal flex flex-col justify-center">
              <div className="text-[11px] font-bold uppercase tracking-[0.2em] text-muted-foreground">Duration</div>
              <div className="mt-2 text-2xl font-extrabold text-foreground">{trip.duration} days</div>
            </div>
            <div className="rounded-lg border-2 border-ink bg-card p-5 shadow-brutal flex flex-col justify-center">
              <div className="text-[11px] font-bold uppercase tracking-[0.2em] text-muted-foreground">Map stops</div>
              <div className="mt-2 text-2xl font-extrabold text-primary">{mapActivities.length}</div>
            </div>
            <div className="rounded-lg border-2 border-ink bg-card p-5 shadow-brutal flex flex-col justify-center">
              <div className="text-[11px] font-bold uppercase tracking-[0.2em] text-muted-foreground">Estimated cost</div>
              <div className="mt-2 text-2xl font-extrabold text-accent">
                {Number.isFinite(totalEstimatedCostValue)
                  ? formatTripMoney(totalEstimatedCostValue, tripCurrency)
                  : totalEstimatedCost || 'Not set'}
              </div>
            </div>
          </div>
        </motion.section>

        <section className="mt-6">
          <BudgetBreakdown breakdown={budgetBreakdown} total={totalEstimatedCost} currency={tripCurrency} />
        </section>

        {error && (
          <div className="mt-6 rounded-md border-2 border-destructive bg-destructive/10 px-4 py-3 text-sm font-semibold text-destructive">
            {error}
          </div>
        )}

        <MapView
          mapSectionRef={mapSectionRef}
          activities={mapActivities}
          destination={trip.destination}
          destinationCoordinates={destinationCoordinates}
          stay={stay}
          selectedActivityIndex={selectedStopIndex}
          focusStayTrigger={focusStayTrigger}
          onSelectActivity={setSelectedStopIndex}
          onOpenStayRetry={() => setIsStayRetryOpen(true)}
          onFocusStay={() => {
            setFocusStayTrigger(current => current + 1);
            scrollToMap();
          }}
        />

        <section className="mt-8">
          <div className="grid gap-4 lg:grid-cols-[1.02fr_0.98fr]">
          <details className="group rounded-lg border-2 border-ink bg-card p-5 shadow-brutal sm:p-6">
              <summary className="cursor-pointer list-none">
                <div className="flex items-start justify-between gap-4">
                  <div>
                    <div className="text-[11px] font-bold uppercase tracking-[0.2em] text-muted-foreground">Stay</div>
                    <h2 className="mt-1 text-title">Where you’re staying</h2>
                  </div>
                  <button
                    type="button"
                    onClick={event => {
                      event.preventDefault();
                      setIsStayRetryOpen(true);
                      scrollToMap();
                    }}
                    className="rounded-md border-2 border-ink bg-secondary px-3 py-2 text-sm font-bold text-secondary-foreground shadow-brutal transition hover:-translate-y-0.5 hover:shadow-brutal-lg active:translate-x-[2px] active:translate-y-[2px] active:shadow-none"
                  >
                    Retry stay
                  </button>
                </div>
                <p className="mt-2 max-w-2xl text-sm leading-6 text-muted-foreground">
                  Live lodging data gets pinned here so the trip always has a real base.
                </p>
                <div className="mt-4 flex flex-wrap gap-2">
                  <span className="rounded-md border-2 border-ink bg-muted px-3 py-1 text-xs font-bold uppercase tracking-[0.16em]">
                    {stay ? stay.name : 'No stay yet'}
                  </span>
                  {stay && (
                    <span className="rounded-md border-2 border-ink bg-primary/10 px-3 py-1 text-xs font-bold uppercase tracking-[0.16em] text-primary">
                      {stay.type}
                    </span>
                  )}
                </div>
              </summary>

              <div className="mt-5 grid gap-4 md:grid-cols-[1.05fr_0.95fr]">
                {stay ? (
                  <>
                    <div className="rounded-md border-2 border-ink bg-muted p-4">
                      <div className="inline-flex border-2 border-ink bg-accent px-3 py-1 text-[11px] font-bold uppercase tracking-[0.18em] text-accent-foreground">
                        Live lodging
                      </div>
                      <h3 className="mt-4 text-title text-foreground">{stay.name}</h3>
                      <p className="mt-2 text-sm leading-6 text-muted-foreground">{stay.type}</p>

                      <div className="mt-4 grid gap-3 sm:grid-cols-2">
                        <div className="rounded-md border-2 border-ink bg-card p-4">
                          <div className="text-[11px] font-bold uppercase tracking-[0.18em] text-muted-foreground">Check-in</div>
                          <div className="mt-2 text-sm font-semibold text-foreground">
                            {stay.checkInDate ? `${stay.checkInDate} ` : ''}
                            {stay.checkInTime || 'Not set'}
                          </div>
                        </div>
                        <div className="rounded-md border-2 border-ink bg-card p-4">
                          <div className="text-[11px] font-bold uppercase tracking-[0.18em] text-muted-foreground">Check-out</div>
                          <div className="mt-2 text-sm font-semibold text-foreground">
                            {stay.checkOutDate ? `${stay.checkOutDate} ` : ''}
                            {stay.checkOutTime || 'Not set'}
                          </div>
                        </div>
                      </div>

                      {stay.notes && (
                        <div className="mt-4 rounded-md border-2 border-ink bg-accent/10 p-4 text-sm leading-6 text-foreground">
                          {stay.notes}
                        </div>
                      )}
                    </div>

                    <div className="rounded-md border-2 border-ink bg-muted p-4">
                      <div className="text-[11px] font-bold uppercase tracking-[0.18em] text-muted-foreground">Map location</div>
                      <div className="mt-2 text-sm font-semibold text-foreground">
                        {stay.latitude.toFixed(4)}, {stay.longitude.toFixed(4)}
                      </div>
                      <p className="mt-3 text-sm leading-6 text-muted-foreground">
                        The stay marker is shown on the map alongside the places you visit so the route and lodging are visible in one place.
                      </p>
                      <div className="mt-4 flex flex-wrap gap-2">
                        <button
                          type="button"
                          onClick={() => {
                            setFocusStayTrigger(current => current + 1);
                            scrollToMap();
                          }}
                          className="rounded-md border-2 border-ink bg-card px-4 py-2 text-sm font-bold text-foreground shadow-brutal transition hover:-translate-y-0.5 hover:shadow-brutal-lg active:translate-x-[2px] active:translate-y-[2px] active:shadow-none"
                        >
                          Show stay on map
                        </button>
                        {stay.address && (
                          <div className="rounded-md border-2 border-ink bg-card px-4 py-2 text-sm text-muted-foreground">
                            {stay.address}
                          </div>
                        )}
                      </div>
                    </div>
                  </>
                ) : (
                  <div className="rounded-md border-2 border-dashed border-ink bg-muted p-4 text-sm leading-6 text-muted-foreground md:col-span-2">
                    No live stay option was returned for this trip. Tap retry and we will ask for your budget range and preferred area again.
                  </div>
                )}
              </div>
            </details>

            <div className="rounded-lg border-2 border-ink bg-card p-5 shadow-brutal sm:p-6">
              <div className="flex items-start justify-between gap-4">
                <div>
                  <div className="text-[11px] font-bold uppercase tracking-[0.2em] text-muted-foreground">Guest suggestions</div>
                  <h2 className="mt-1 text-title">People can respond to your trip</h2>
                </div>
                <div className="text-sm font-semibold text-muted-foreground">
                  {suggestionsLoading ? 'Loading...' : `${suggestions.length} total`}
                </div>
              </div>
              <p className="mt-2 text-sm leading-6 text-muted-foreground">
                Guests submit suggestions from the public share page, and you can review them later.
              </p>

              <div className="mt-4 space-y-3">
                {suggestionsError && (
                  <div className="rounded-md border-2 border-destructive bg-destructive/10 px-4 py-3 text-sm font-semibold text-destructive">
                    {suggestionsError}
                  </div>
                )}

                {suggestions.length > 0 ? (
                  suggestions.slice(0, 2).map(suggestion => (
                    <div key={suggestion.id} className="rounded-md border-2 border-ink bg-muted px-4 py-4">
                      <div className="flex items-center justify-between gap-3">
                        <div className="text-sm font-bold text-foreground">
                          {suggestion.guest_name || 'Anonymous guest'}
                        </div>
                        <div className="text-xs font-bold uppercase tracking-[0.16em] text-muted-foreground">
                          {new Date(suggestion.created_at).toLocaleDateString()}
                        </div>
                      </div>
                      <p className="mt-2 text-sm leading-6 text-muted-foreground">
                        {suggestion.message || suggestion.suggestion}
                      </p>
                    </div>
                  ))
                ) : (
                  <div className="rounded-md border-2 border-dashed border-ink bg-muted px-4 py-3 text-sm leading-6 text-muted-foreground">
                    No suggestions yet. Share the trip publicly and ask guests to react.
                  </div>
                )}
              </div>

              <button
                type="button"
                onClick={() => setIsGuestSuggestionsOpen(true)}
                className="mt-5 w-full rounded-md border-2 border-ink bg-secondary px-4 py-3 text-sm font-bold text-secondary-foreground shadow-brutal transition hover:-translate-y-0.5 hover:shadow-brutal-lg active:translate-x-[2px] active:translate-y-[2px] active:shadow-none"
              >
                Review all suggestions
              </button>
            </div>
          </div>
        </section>

        <TimelineView
          tripId={trip.id}
          itinerary={trip.itinerary}
          dailyPlans={dailyPlans}
          interests={trip.interests}
          selectedActivityIndex={selectedStopIndex}
          onSelectActivity={setSelectedStopIndex}
          onTripUpdated={updatedTrip => setTrip(updatedTrip)}
        />

        <CompanionStrip destination={trip.destination} />

        <button
          onClick={() => setIsChatOpen(true)}
          className="fixed bottom-4 right-4 z-30 rounded-md border-2 border-ink bg-secondary px-4 py-3 text-sm font-bold text-secondary-foreground shadow-brutal transition hover:-translate-y-0.5 hover:shadow-brutal-lg active:translate-x-[2px] active:translate-y-[2px] active:shadow-none sm:hidden"
        >
          Ask assistant
        </button>

        <Modal
          open={isStayRetryOpen}
          onClose={() => setIsStayRetryOpen(false)}
          dismissable={!stayRetryLoading}
          className="max-w-lg"
          title="Tell us your budget and preferred area"
          description="We will use live lodging options and update only the stay card and its transfer legs."
          footer={
            <>
              <Button
                type="button"
                variant="outline"
                onClick={() => setIsStayRetryOpen(false)}
                disabled={stayRetryLoading}
              >
                Cancel
              </Button>
              <Button
                type="button"
                variant="secondary"
                onClick={handleStayRetry}
                disabled={stayRetryLoading}
              >
                {stayRetryLoading ? 'Updating stay…' : 'Update stay'}
              </Button>
            </>
          }
        >
              <div className="space-y-4">
                <div>
                  <label className="mb-2 block text-[11px] font-bold uppercase tracking-[0.2em] text-muted-foreground">
                    Budget range
                  </label>
                  <input
                    value={stayBudgetRange}
                    onChange={event => setStayBudgetRange(event.target.value)}
                    placeholder="Example: $80-$140 per night or mid-range"
                    className="w-full rounded-md border-2 border-ink bg-background px-4 py-3 text-base outline-none placeholder:text-muted-foreground focus:ring-2 focus:ring-ring focus:ring-offset-2 focus:ring-offset-background"
                  />
                </div>

                <div>
                  <label className="mb-2 block text-[11px] font-bold uppercase tracking-[0.2em] text-muted-foreground">
                    Preferred location
                  </label>
                  <input
                    value={stayPreferredLocation}
                    onChange={event => setStayPreferredLocation(event.target.value)}
                    placeholder="Example: near the station, old town, downtown, or the beach"
                    className="w-full rounded-md border-2 border-ink bg-background px-4 py-3 text-base outline-none placeholder:text-muted-foreground focus:ring-2 focus:ring-ring focus:ring-offset-2 focus:ring-offset-background"
                  />
                </div>
              </div>

              {stayRetryError && (
                <div role="alert" className="mt-4 rounded-md border-2 border-destructive bg-destructive/10 px-4 py-3 text-sm font-semibold text-destructive">
                  {stayRetryError}
                </div>
              )}
        </Modal>

        <Modal
          open={isEditTripOpen}
          onClose={closeEditTrip}
          dismissable={!editTripLoading}
          className="max-w-2xl"
          title="Update the saved trip"
          description="These changes update the trip record and refresh the public share preview. The itinerary itself stays as-is unless you regenerate it separately."
          footer={
            <>
              <Button
                type="button"
                variant="outline"
                onClick={closeEditTrip}
                disabled={editTripLoading}
              >
                Cancel
              </Button>
              <Button
                type="button"
                variant="secondary"
                onClick={handleEditTrip}
                disabled={editTripLoading}
              >
                {editTripLoading ? 'Saving changes…' : 'Save changes'}
              </Button>
            </>
          }
        >
              <div className="grid gap-4 md:grid-cols-2">
                <div className="md:col-span-2">
                  <label className="mb-2 block text-[11px] font-bold uppercase tracking-[0.2em] text-muted-foreground">
                    Destination
                  </label>
                  <input
                    value={editDestination}
                    onChange={event => setEditDestination(event.target.value)}
                    placeholder="Example: Kyoto, Japan"
                    className="w-full rounded-md border-2 border-ink bg-background px-4 py-3 text-base outline-none placeholder:text-muted-foreground focus:ring-2 focus:ring-ring focus:ring-offset-2 focus:ring-offset-background"
                  />
                </div>

                <div>
                  <label className="mb-2 block text-[11px] font-bold uppercase tracking-[0.2em] text-muted-foreground">
                    Duration
                  </label>
                  <input
                    type="number"
                    min="1"
                    value={editDuration}
                    onChange={event => setEditDuration(event.target.value)}
                    className="w-full rounded-md border-2 border-ink bg-background px-4 py-3 text-base outline-none placeholder:text-muted-foreground focus:ring-2 focus:ring-ring focus:ring-offset-2 focus:ring-offset-background"
                  />
                </div>

                <div>
                  <label className="mb-2 block text-[11px] font-bold uppercase tracking-[0.2em] text-muted-foreground">
                    Budget
                  </label>
                  <input
                    value={editBudget}
                    onChange={event => setEditBudget(event.target.value)}
                    placeholder="Example: $1,500"
                    className="w-full rounded-md border-2 border-ink bg-background px-4 py-3 text-base outline-none placeholder:text-muted-foreground focus:ring-2 focus:ring-ring focus:ring-offset-2 focus:ring-offset-background"
                  />
                </div>

                <div className="md:col-span-2">
                  <label className="mb-2 block text-[11px] font-bold uppercase tracking-[0.2em] text-muted-foreground">
                    Interests
                  </label>
                  <textarea
                    value={editInterests}
                    onChange={event => setEditInterests(event.target.value)}
                    placeholder="Example: food, museums, nightlife"
                    rows={4}
                    className="w-full resize-none rounded-md border-2 border-ink bg-background px-4 py-3 text-base outline-none placeholder:text-muted-foreground focus:ring-2 focus:ring-ring focus:ring-offset-2 focus:ring-offset-background"
                  />
                  <p className="mt-2 text-xs leading-5 text-muted-foreground">
                    Separate interests with commas.
                  </p>
                </div>
              </div>

              {editTripError && (
                <div role="alert" className="mt-4 rounded-md border-2 border-destructive bg-destructive/10 px-4 py-3 text-sm font-semibold text-destructive">
                  {editTripError}
                </div>
              )}
        </Modal>

        <Modal
          open={isGuestSuggestionsOpen}
          onClose={() => setIsGuestSuggestionsOpen(false)}
          className="max-w-3xl"
          title="What guests are saying"
        >
              <div className="grid gap-4 lg:grid-cols-[0.95fr_1.05fr]">
                <div className="rounded-md border-2 border-ink bg-card p-4">
                  <div className="text-[11px] font-bold uppercase tracking-[0.18em] text-muted-foreground">Public badge</div>
                  <div className="mt-2 text-sm leading-6 text-foreground">
                    Check out my trip on wayflo and send your suggestions.
                  </div>
                  <button
                    type="button"
                    onClick={() => setIsShareOpen(true)}
                    className="mt-4 rounded-md border-2 border-ink bg-secondary px-4 py-2 text-sm font-bold text-secondary-foreground shadow-brutal transition hover:-translate-y-0.5 hover:shadow-brutal-lg active:translate-x-[2px] active:translate-y-[2px] active:shadow-none"
                  >
                    Open sharing tools
                  </button>
                </div>

                <div className="rounded-md border-2 border-ink bg-muted p-4">
                  <div className="flex items-center justify-between gap-4">
                    <div>
                      <div className="text-[11px] font-bold uppercase tracking-[0.18em] text-muted-foreground">Latest suggestions</div>
                      <div className="mt-1 text-lg font-extrabold tracking-tight text-foreground">
                        {suggestions.length} total
                      </div>
                    </div>
                    {suggestionsLoading && <div className="text-sm font-medium text-muted-foreground">Loading...</div>}
                  </div>

                  {suggestionsError && (
                    <div className="mt-4 rounded-md border-2 border-destructive bg-destructive/10 px-4 py-3 text-sm font-semibold text-destructive">
                      {suggestionsError}
                    </div>
                  )}

                  <div className="mt-4 space-y-3 max-h-[300px] overflow-y-scroll pr-1">
                    {suggestions.length > 0 ? (
                      suggestions.map(suggestion => (
                        <div key={suggestion.id} className="rounded-md border-2 border-ink bg-card px-4 py-4">
                          <div className="flex items-center justify-between gap-3">
                            <div className="text-sm font-bold text-foreground">
                              {suggestion.guest_name || 'Anonymous guest'}
                            </div>
                            <div className="text-xs font-bold uppercase tracking-[0.16em] text-muted-foreground">
                              {new Date(suggestion.created_at).toLocaleDateString()}
                            </div>
                          </div>
                          <p className="mt-2 text-sm leading-6 text-muted-foreground">
                            {suggestion.message || suggestion.suggestion}
                          </p>
                        </div>
                      ))
                    ) : (
                      <div className="rounded-md border-2 border-dashed border-ink bg-card px-4 py-3 text-sm leading-6 text-muted-foreground">
                        No suggestions yet. Share the trip publicly and ask guests to react.
                      </div>
                    )}
                  </div>
                </div>
              </div>
        </Modal>
      </div>
    </main>
    </AuthGate>
  );
}
