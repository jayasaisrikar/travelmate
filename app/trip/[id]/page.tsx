'use client';

import Link from 'next/link';
import { useParams } from 'next/navigation';
import { useEffect, useMemo, useRef, useState } from 'react';
import { motion } from 'framer-motion';
import { AuthGate } from '@/components/auth/AuthGate';
import { Brand } from '@/components/common/Brand';
import {
  Counter,
  ParallaxLayer,
  RevealWords,
  ScrollProgressBar,
  TiltCard,
  revealOnView,
  rise,
} from '@/components/common/motion';
import { DestinationPhotoCover } from '@/components/common/DestinationPhotoCover';
import { StatusCard } from '@/components/common/StatusCard';
import ItineraryChat from '@/components/ItineraryChat';
import { MapView } from '@/components/trip/MapView';
import { TripDatesEditor } from '@/components/trip/TripDatesEditor';
import { BudgetBreakdown } from '@/components/trip/BudgetBreakdown';
import { TimelineView } from '@/components/trip/TimelineView';
import { RatingCard } from '@/components/trip/RatingCard';
import { PublishToggle } from '@/components/trip/PublishToggle';
import { CompanionStrip } from '@/components/social/CompanionStrip';
import { ShareModal } from '@/components/trip/ShareModal';
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
      <div className="flex min-h-screen items-center justify-center bg-[#F2F2F2] px-4 text-[#3F3D56]">
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
      <main className="min-h-screen bg-[#F2F2F2] text-[#3F3D56]">
        <nav className="sticky top-0 z-40 border-b border-[#DDDCE8] bg-white">
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
                className="rounded-full bg-[#3F3D56] px-6 py-3 font-semibold text-white shadow-[0_12px_30px_rgba(46,40,51,0.18)] transition hover:translate-y-[-1px]"
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
      <main className="min-h-screen bg-[#F2F2F2] text-[#3F3D56]">
      <ScrollProgressBar />
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

      <nav className="sticky top-0 z-40 border-b border-[#DDDCE8] bg-white">
        <div className="mx-auto flex max-w-7xl flex-wrap items-center justify-between gap-3 px-4 py-4 sm:px-6">
          <Brand href="/" compact />
          <div className="flex items-center gap-3">
            <Link href="/dashboard" className="text-sm font-medium text-[#6F6C82] transition hover:text-[#3F3D56]">
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
          <div className="relative overflow-hidden group rounded-[32px] border border-slate-200 shadow-[0_24px_50px_rgba(108,99,255,0.08)] flex flex-col justify-between min-h-[360px]">
            <ParallaxLayer range={50} className="absolute inset-0 z-0">
              <DestinationPhotoCover destination={trip.destination} className="h-full w-full" />
            </ParallaxLayer>
            <div className="absolute inset-0 z-10 bg-gradient-to-t from-slate-950/95 via-slate-950/60 to-slate-950/20 pointer-events-none" />
            <div className="absolute inset-0 z-10 ring-1 ring-inset ring-white/10 pointer-events-none" />

            <div className="relative z-20 p-6 sm:p-8 flex flex-col h-full justify-end text-white">
              <div>
                <span className="inline-flex items-center gap-1.5 rounded-full bg-slate-900/60 backdrop-blur-md px-3 py-1 text-[10px] font-extrabold uppercase tracking-widest text-[#FF6584] border border-white/10 shadow-sm">
                  Saved trip
                </span>
                <h1 className="mt-4 text-3xl font-black tracking-tight sm:text-5xl drop-shadow-[0_4px_10px_rgba(0,0,0,0.9)]">
                  <RevealWords text={trip.destination} />
                </h1>
                <p className="mt-3 max-w-2xl text-sm leading-7 text-slate-200 sm:text-base drop-shadow-[0_2px_4px_rgba(0,0,0,0.8)]">
                  A trip built from live destination data, your trip window, and the places we can actually map.
                </p>
              </div>

              <div className="mt-8 flex flex-wrap gap-3">
                <button
                  onClick={() => setIsChatOpen(true)}
                  className="rounded-2xl bg-[#6C63FF] px-5 py-3.5 text-sm font-bold text-white shadow-lg shadow-[#6C63FF]/30 hover:bg-[#5b54e7] transition-all"
                >
                  Open Trip Assistant
                </button>
                <button
                  onClick={openEditTrip}
                  className="rounded-2xl border border-white/20 bg-white/10 backdrop-blur-md px-5 py-3.5 text-sm font-bold text-white transition hover:bg-white/20"
                >
                  Edit trip
                </button>
                <button
                  onClick={() => setIsShareOpen(true)}
                  className="rounded-2xl border border-white/20 bg-white/10 backdrop-blur-md px-5 py-3.5 text-sm font-bold text-white transition hover:bg-white/20"
                >
                  Share trip
                </button>
              </div>
            </div>
          </div>

          <motion.div {...revealOnView} className="grid gap-3 sm:grid-cols-3 lg:grid-cols-1">
            <motion.div variants={rise}>
              <TiltCard className="rounded-[28px] border border-slate-200 bg-white p-5 shadow-sm transition-shadow flex flex-col justify-center">
                <div className="text-[10px] font-bold uppercase tracking-[0.2em] text-[#8A869C]">Duration</div>
                <div className="mt-2 text-2xl font-black text-slate-950">
                  <Counter to={trip.duration} suffix=" days" />
                </div>
              </TiltCard>
            </motion.div>
            <motion.div variants={rise}>
              <TiltCard className="rounded-[28px] border border-slate-200 bg-white p-5 shadow-sm transition-shadow flex flex-col justify-center">
                <div className="text-[10px] font-bold uppercase tracking-[0.2em] text-[#8A869C]">Map stops</div>
                <div className="mt-2 text-2xl font-black text-[#6C63FF]">
                  <Counter to={mapActivities.length} />
                </div>
              </TiltCard>
            </motion.div>
            <motion.div variants={rise}>
              <TiltCard className="rounded-[28px] border border-slate-200 bg-white p-5 shadow-sm transition-shadow flex flex-col justify-center">
                <div className="text-[10px] font-bold uppercase tracking-[0.2em] text-[#8A869C]">Estimated cost</div>
                <div className="mt-2 text-2xl font-black text-[#FF6584]">
                  {Number.isFinite(totalEstimatedCostValue)
                    ? formatTripMoney(totalEstimatedCostValue, tripCurrency)
                    : totalEstimatedCost || 'Not set'}
                </div>
              </TiltCard>
            </motion.div>
          </motion.div>
        </motion.section>

        {(!trip.trip_start_date || !trip.trip_end_date) && (
          <section className="mt-6">
            <TripDatesEditor trip={trip} onSaved={setTrip} />
          </section>
        )}

        <section className="mt-6">
          <BudgetBreakdown breakdown={budgetBreakdown} total={totalEstimatedCost} currency={tripCurrency} />
        </section>

        {error && (
          <div className="mt-6 rounded-2xl border border-[#f0d7de] bg-[#FFF0F4] px-4 py-3 text-sm font-medium text-[#C14D72]">
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
          <details className="group rounded-[28px] border border-[#DDDCE8] bg-white p-5 shadow-[0_16px_48px_rgba(46,40,51,0.06)] sm:p-6">
              <summary className="cursor-pointer list-none">
                <div className="flex items-start justify-between gap-4">
                  <div>
                    <div className="text-xs font-bold uppercase tracking-[0.22em] text-[#8A869C]">Stay</div>
                    <h2 className="mt-1 text-2xl font-black tracking-tight">Where you’re staying</h2>
                  </div>
                  <button
                    type="button"
                    onClick={event => {
                      event.preventDefault();
                      setIsStayRetryOpen(true);
                      scrollToMap();
                    }}
                    className="rounded-xl border border-[#3F3D56] bg-[#3F3D56] px-3 py-2 text-sm font-semibold text-white transition hover:bg-[#302F43]"
                  >
                    Retry stay
                  </button>
                </div>
                <p className="mt-2 max-w-2xl text-sm leading-6 text-[#6F6C82]">
                  Live lodging data gets pinned here so the trip always has a real base.
                </p>
                <div className="mt-4 flex flex-wrap gap-2">
                  <span className="border border-[#3F3D56] bg-[#FBFAFF] rounded-full px-3 py-1 text-xs font-semibold uppercase tracking-[0.16em]">
                    {stay ? stay.name : 'No stay yet'}
                  </span>
                  {stay && (
                    <span className="border border-[#3F3D56] bg-[#EEEDFE] rounded-full px-3 py-1 text-xs font-semibold uppercase tracking-[0.16em] text-[#6C63FF]">
                      {stay.type}
                    </span>
                  )}
                </div>
              </summary>

              <div className="mt-5 grid gap-4 md:grid-cols-[1.05fr_0.95fr]">
                {stay ? (
                  <>
                    <div className="rounded-[16px] border border-[#DDDCE8] bg-[#FBFAFF] p-4">
                      <div className="inline-flex rounded-full border border-[#3F3D56] bg-[#FF6584] px-3 py-1 text-[11px] font-bold uppercase tracking-[0.18em] text-white">
                        Live lodging
                      </div>
                      <h3 className="mt-4 text-2xl font-black tracking-tight text-[#3F3D56]">{stay.name}</h3>
                      <p className="mt-2 text-sm leading-6 text-[#6F6C82]">{stay.type}</p>

                      <div className="mt-4 grid gap-3 sm:grid-cols-2">
                        <div className="rounded-[16px] border border-[#DDDCE8] bg-white p-4">
                          <div className="text-[11px] font-semibold uppercase tracking-[0.18em] text-[#8A869C]">Check-in</div>
                          <div className="mt-2 text-sm font-semibold text-[#3F3D56]">
                            {stay.checkInDate ? `${stay.checkInDate} ` : ''}
                            {stay.checkInTime || 'Not set'}
                          </div>
                        </div>
                        <div className="rounded-[16px] border border-[#DDDCE8] bg-white p-4">
                          <div className="text-[11px] font-semibold uppercase tracking-[0.18em] text-[#8A869C]">Check-out</div>
                          <div className="mt-2 text-sm font-semibold text-[#3F3D56]">
                            {stay.checkOutDate ? `${stay.checkOutDate} ` : ''}
                            {stay.checkOutTime || 'Not set'}
                          </div>
                        </div>
                      </div>

                      {stay.notes && (
                        <div className="mt-4 border border-[#FF6584]/40 bg-[#FFEAF0] p-4 text-sm leading-6 text-[#3F3D56]">
                          {stay.notes}
                        </div>
                      )}
                    </div>

                    <div className="rounded-[16px] border border-[#DDDCE8] bg-[#FBFAFF] p-4">
                      <div className="text-[11px] font-semibold uppercase tracking-[0.18em] text-[#8A869C]">Map location</div>
                      <div className="mt-2 text-sm font-semibold text-[#3F3D56]">
                        {stay.latitude.toFixed(4)}, {stay.longitude.toFixed(4)}
                      </div>
                      <p className="mt-3 text-sm leading-6 text-[#6F6C82]">
                        The stay marker is shown on the map alongside the places you visit so the route and lodging are visible in one place.
                      </p>
                      <div className="mt-4 flex flex-wrap gap-2">
                        <button
                          type="button"
                          onClick={() => {
                            setFocusStayTrigger(current => current + 1);
                            scrollToMap();
                          }}
                          className="rounded-xl border border-[#3F3D56] bg-white px-4 py-2 text-sm font-semibold text-[#3F3D56] transition hover:bg-[#FBFAFF]"
                        >
                          Show stay on map
                        </button>
                        {stay.address && (
                          <div className="rounded-xl border border-[#DDDCE8] bg-white px-4 py-2 text-sm text-[#6F6C82]">
                            {stay.address}
                          </div>
                        )}
                      </div>
                    </div>
                  </>
                ) : (
                  <div className="rounded-2xl border border-dashed border-[#DDDCE8] bg-[#FBFAFF] p-4 text-sm leading-6 text-[#6F6C82] md:col-span-2">
                    No live stay option was returned for this trip. Tap retry and we will ask for your budget range and preferred area again.
                  </div>
                )}
              </div>
            </details>

            <div className="rounded-[28px] border border-[#DDDCE8] bg-white p-5 shadow-[0_16px_48px_rgba(46,40,51,0.06)] sm:p-6">
              <div className="flex items-start justify-between gap-4">
                <div>
                  <div className="text-xs font-bold uppercase tracking-[0.22em] text-[#8A869C]">Guest suggestions</div>
                  <h2 className="mt-1 text-2xl font-black tracking-tight">People can respond to your trip</h2>
                </div>
                <div className="text-sm font-semibold text-[#6F6C82]">
                  {suggestionsLoading ? 'Loading...' : `${suggestions.length} total`}
                </div>
              </div>
              <p className="mt-2 text-sm leading-6 text-[#6F6C82]">
                Guests submit suggestions from the public share page, and you can review them later.
              </p>

              <div className="mt-4 space-y-3">
                {suggestionsError && (
                  <div className="rounded-xl border border-[#C14D72] bg-[#FFF0F4] px-4 py-3 text-sm font-medium text-[#C14D72]">
                    {suggestionsError}
                  </div>
                )}

                {suggestions.length > 0 ? (
                  suggestions.slice(0, 2).map(suggestion => (
                    <div key={suggestion.id} className="rounded-2xl border border-[#3F3D56] bg-[#FBFAFF] px-4 py-4">
                      <div className="flex items-center justify-between gap-3">
                        <div className="text-sm font-bold text-[#3F3D56]">
                          {suggestion.guest_name || 'Anonymous guest'}
                        </div>
                        <div className="text-xs font-semibold uppercase tracking-[0.16em] text-[#8A869C]">
                          {new Date(suggestion.created_at).toLocaleDateString()}
                        </div>
                      </div>
                      <p className="mt-2 text-sm leading-6 text-[#6F6C82]">
                        {suggestion.message || suggestion.suggestion}
                      </p>
                    </div>
                  ))
                ) : (
                  <div className="rounded-2xl border border-dashed border-[#DDDCE8] bg-[#FBFAFF] px-4 py-3 text-sm leading-6 text-[#6F6C82]">
                    No suggestions yet. Share the trip publicly and ask guests to react.
                  </div>
                )}
              </div>

              <button
                type="button"
                onClick={() => setIsGuestSuggestionsOpen(true)}
                className="mt-5 w-full rounded-xl border border-[#3F3D56] bg-[#3F3D56] px-4 py-3 text-sm font-semibold text-white transition hover:bg-[#302F43]"
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

        <section className="mt-6 grid gap-4 lg:grid-cols-2">
          <PublishToggle trip={trip} />
          <RatingCard tripId={trip.id} destination={trip.destination} />
        </section>

        <CompanionStrip destination={trip.destination} />

        <button
          onClick={() => setIsChatOpen(true)}
          className="fixed bottom-4 right-4 z-30 rounded-full bg-[#3F3D56] px-4 py-3 text-sm font-semibold text-white shadow-[0_18px_40px_rgba(46,40,51,0.18)] transition hover:translate-y-[-1px] sm:hidden"
        >
          Ask assistant
        </button>

        {isStayRetryOpen && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 px-4">
            <div className="w-full max-w-lg rounded-[28px] border border-[#3F3D56] bg-[#F2F2F2] p-5 text-[#3F3D56] shadow-[0_30px_120px_rgba(46,40,51,0.24)] sm:p-6">
              <div className="flex items-start justify-between gap-4">
                <div>
                  <div className="text-xs font-bold uppercase tracking-[0.22em] text-[#8A869C]">Retry stay</div>
                  <h3 className="mt-1 text-2xl font-black tracking-tight">Tell us your budget and preferred area</h3>
                </div>
                <button
                  type="button"
                  onClick={() => setIsStayRetryOpen(false)}
                  className="rounded-xl border border-[#3F3D56] bg-white px-3 py-2 text-sm font-semibold text-[#3F3D56]"
                >
                  Close
                </button>
              </div>

              <p className="mt-3 text-sm leading-6 text-[#6F6C82]">
                We will use live lodging options and update only the stay card and its transfer legs.
              </p>

              <div className="mt-5 space-y-4">
                <div>
                  <label className="mb-2 block text-xs font-bold uppercase tracking-[0.2em] text-[#6F6C82]">
                    Budget range
                  </label>
                  <input
                    value={stayBudgetRange}
                    onChange={event => setStayBudgetRange(event.target.value)}
                    placeholder="Example: $80-$140 per night or mid-range"
                    className="w-full rounded-xl border border-[#3F3D56] bg-white px-4 py-3 text-base text-[#3F3D56] outline-none placeholder:text-[#8A869C] focus:border-[#6C63FF] focus:ring-2 focus:ring-[#6C63FF]/20"
                  />
                </div>

                <div>
                  <label className="mb-2 block text-xs font-bold uppercase tracking-[0.2em] text-[#6F6C82]">
                    Preferred location
                  </label>
                  <input
                    value={stayPreferredLocation}
                    onChange={event => setStayPreferredLocation(event.target.value)}
                    placeholder="Example: near the station, old town, downtown, or the beach"
                    className="w-full rounded-xl border border-[#3F3D56] bg-white px-4 py-3 text-base text-[#3F3D56] outline-none placeholder:text-[#8A869C] focus:border-[#6C63FF] focus:ring-2 focus:ring-[#6C63FF]/20"
                  />
                </div>
              </div>

              {stayRetryError && (
                <div className="mt-4 rounded-xl border border-[#C14D72] bg-[#FFF0F4] px-4 py-3 text-sm font-medium text-[#C14D72]">
                  {stayRetryError}
                </div>
              )}

              <div className="mt-5 flex flex-col gap-3 sm:flex-row">
                <button
                  type="button"
                  onClick={handleStayRetry}
                  disabled={stayRetryLoading}
                  className="flex-1 rounded-xl border border-[#3F3D56] bg-[#3F3D56] px-4 py-3 text-sm font-semibold text-white transition hover:bg-[#302F43] disabled:cursor-not-allowed disabled:opacity-70"
                >
                  {stayRetryLoading ? 'Updating stay...' : 'Update stay'}
                </button>
                <button
                  type="button"
                  onClick={() => setIsStayRetryOpen(false)}
                  className="rounded-xl border border-[#3F3D56] bg-white px-4 py-3 text-sm font-semibold text-[#3F3D56]"
                >
                  Cancel
                </button>
              </div>
            </div>
          </div>
        )}

        {isEditTripOpen && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/45 px-4">
            <div className="w-full max-w-2xl rounded-[28px] border border-[#3F3D56] bg-[#F2F2F2] p-5 text-[#3F3D56] shadow-[0_30px_120px_rgba(46,40,51,0.28)] sm:p-6">
              <div className="flex items-start justify-between gap-4 border-b border-[#3F3D56] pb-4">
                <div>
                  <div className="text-xs font-bold uppercase tracking-[0.22em] text-[#8A869C]">Edit trip</div>
                  <h3 className="mt-1 text-2xl font-black tracking-tight">Update the saved trip</h3>
                </div>
                <button
                  type="button"
                  onClick={closeEditTrip}
                  className="rounded-xl border border-[#3F3D56] bg-white px-3 py-2 text-sm font-semibold text-[#3F3D56]"
                >
                  Close
                </button>
              </div>

              <p className="mt-3 text-sm leading-6 text-[#6F6C82]">
                These changes update the trip record and refresh the public share preview. The itinerary itself stays as-is unless you regenerate it separately.
              </p>

              <div className="mt-5 grid gap-4 md:grid-cols-2">
                <div className="md:col-span-2">
                  <label className="mb-2 block text-xs font-bold uppercase tracking-[0.2em] text-[#6F6C82]">
                    Destination
                  </label>
                  <input
                    value={editDestination}
                    onChange={event => setEditDestination(event.target.value)}
                    placeholder="Example: Kyoto, Japan"
                    className="w-full rounded-xl border border-[#3F3D56] bg-white px-4 py-3 text-base text-[#3F3D56] outline-none placeholder:text-[#8A869C] focus:border-[#6C63FF] focus:ring-2 focus:ring-[#6C63FF]/20"
                  />
                </div>

                <div>
                  <label className="mb-2 block text-xs font-bold uppercase tracking-[0.2em] text-[#6F6C82]">
                    Duration
                  </label>
                  <input
                    type="number"
                    min="1"
                    value={editDuration}
                    onChange={event => setEditDuration(event.target.value)}
                    className="w-full rounded-xl border border-[#3F3D56] bg-white px-4 py-3 text-base text-[#3F3D56] outline-none placeholder:text-[#8A869C] focus:border-[#6C63FF] focus:ring-2 focus:ring-[#6C63FF]/20"
                  />
                </div>

                <div>
                  <label className="mb-2 block text-xs font-bold uppercase tracking-[0.2em] text-[#6F6C82]">
                    Budget
                  </label>
                  <input
                    value={editBudget}
                    onChange={event => setEditBudget(event.target.value)}
                    placeholder="Example: $1,500"
                    className="w-full rounded-xl border border-[#3F3D56] bg-white px-4 py-3 text-base text-[#3F3D56] outline-none placeholder:text-[#8A869C] focus:border-[#6C63FF] focus:ring-2 focus:ring-[#6C63FF]/20"
                  />
                </div>

                <div className="md:col-span-2">
                  <label className="mb-2 block text-xs font-bold uppercase tracking-[0.2em] text-[#6F6C82]">
                    Interests
                  </label>
                  <textarea
                    value={editInterests}
                    onChange={event => setEditInterests(event.target.value)}
                    placeholder="Example: food, museums, nightlife"
                    rows={4}
                    className="w-full resize-none rounded-xl border border-[#3F3D56] bg-white px-4 py-3 text-base text-[#3F3D56] outline-none placeholder:text-[#8A869C] focus:border-[#6C63FF] focus:ring-2 focus:ring-[#6C63FF]/20"
                  />
                  <p className="mt-2 text-xs leading-5 text-[#8A869C]">
                    Separate interests with commas.
                  </p>
                </div>
              </div>

              {editTripError && (
                <div className="mt-4 rounded-xl border border-[#C14D72] bg-[#FFF0F4] px-4 py-3 text-sm font-medium text-[#C14D72]">
                  {editTripError}
                </div>
              )}

              <div className="mt-5 flex flex-col gap-3 sm:flex-row">
                <button
                  type="button"
                  onClick={handleEditTrip}
                  disabled={editTripLoading}
                  className="flex-1 rounded-xl border border-[#3F3D56] bg-[#3F3D56] px-4 py-3 text-sm font-semibold text-white transition hover:bg-[#302F43] disabled:cursor-not-allowed disabled:opacity-70"
                >
                  {editTripLoading ? 'Saving changes...' : 'Save changes'}
                </button>
                <button
                  type="button"
                  onClick={closeEditTrip}
                  className="rounded-xl border border-[#3F3D56] bg-white px-4 py-3 text-sm font-semibold text-[#3F3D56]"
                >
                  Cancel
                </button>
              </div>
            </div>
          </div>
        )}

        {isGuestSuggestionsOpen && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/45 px-4">
            <div className="w-full max-w-3xl rounded-[28px] border border-[#3F3D56] bg-[#F2F2F2] p-5 text-[#3F3D56] shadow-[0_30px_120px_rgba(46,40,51,0.28)] sm:p-6">
              <div className="flex items-start justify-between gap-4 border-b border-[#3F3D56] pb-4">
                <div>
                  <div className="text-xs font-bold uppercase tracking-[0.22em] text-[#8A869C]">Guest suggestions</div>
                  <h3 className="mt-1 text-2xl font-black tracking-tight">What guests are saying</h3>
                </div>
                <button
                  type="button"
                  onClick={() => setIsGuestSuggestionsOpen(false)}
                  className="rounded-xl border border-[#3F3D56] bg-white px-3 py-2 text-sm font-semibold text-[#3F3D56]"
                >
                  Close
                </button>
              </div>

              <div className="mt-5 grid gap-4 lg:grid-cols-[0.95fr_1.05fr]">
                <div className="rounded-2xl border border-[#3F3D56] bg-white p-4">
                  <div className="text-[11px] font-semibold uppercase tracking-[0.18em] text-[#8A869C]">Public badge</div>
                  <div className="mt-2 text-sm leading-6 text-[#3F3D56]">
                    Check out my trip on wayflo and send your suggestions.
                  </div>
                  <button
                    type="button"
                    onClick={() => setIsShareOpen(true)}
                    className="mt-4 border border-[#3F3D56] bg-[#3F3D56] px-4 py-2 text-sm font-semibold text-white transition hover:bg-[#302F43]"
                  >
                    Open sharing tools
                  </button>
                </div>

                <div className="rounded-2xl border border-[#3F3D56] bg-[#FBFAFF] p-4">
                  <div className="flex items-center justify-between gap-4">
                    <div>
                      <div className="text-[11px] font-semibold uppercase tracking-[0.18em] text-[#8A869C]">Latest suggestions</div>
                      <div className="mt-1 text-lg font-black tracking-tight text-[#3F3D56]">
                        {suggestions.length} total
                      </div>
                    </div>
                    {suggestionsLoading && <div className="text-sm font-medium text-[#6F6C82]">Loading...</div>}
                  </div>

                  {suggestionsError && (
                    <div className="mt-4 rounded-xl border border-[#C14D72] bg-[#FFF0F4] px-4 py-3 text-sm font-medium text-[#C14D72]">
                      {suggestionsError}
                    </div>
                  )}

                  <div className="mt-4 space-y-3 max-h-[300px] overflow-y-auto pr-1">
                    {suggestions.length > 0 ? (
                      suggestions.map(suggestion => (
                        <div key={suggestion.id} className="rounded-2xl border border-[#3F3D56] bg-white px-4 py-4">
                          <div className="flex items-center justify-between gap-3">
                            <div className="text-sm font-bold text-[#3F3D56]">
                              {suggestion.guest_name || 'Anonymous guest'}
                            </div>
                            <div className="text-xs font-semibold uppercase tracking-[0.16em] text-[#8A869C]">
                              {new Date(suggestion.created_at).toLocaleDateString()}
                            </div>
                          </div>
                          <p className="mt-2 text-sm leading-6 text-[#6F6C82]">
                            {suggestion.message || suggestion.suggestion}
                          </p>
                        </div>
                      ))
                    ) : (
                      <div className="rounded-2xl border border-dashed border-[#DDDCE8] bg-white px-4 py-3 text-sm leading-6 text-[#6F6C82]">
                        No suggestions yet. Share the trip publicly and ask guests to react.
                      </div>
                    )}
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
    </main>
    </AuthGate>
  );
}
