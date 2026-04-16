'use client';

import Link from 'next/link';
import { useParams } from 'next/navigation';
import { useEffect, useMemo, useRef, useState } from 'react';
import { motion } from 'framer-motion';
import { AuthGate } from '@/components/auth/AuthGate';
import { Brand } from '@/components/common/Brand';
import ItineraryChat from '@/components/ItineraryChat';
import { MapComponent } from '@/components/MapComponent';
import { TimelineView } from '@/components/trip/TimelineView';
import { ShareModal } from '@/components/trip/ShareModal';
import { loadTrip, loadTripSuggestions, retryTripStay, updateTripDetails, Trip } from '@/lib/supabase-trips';
import type { TripSuggestion } from '@/lib/travel-types';

export const dynamicParams = true;

function getDailyPlans(itinerary: any): any[] {
  if (Array.isArray(itinerary?.dailyPlans)) {
    return itinerary.dailyPlans;
  }

  if (Array.isArray(itinerary?.daily_plans)) {
    return itinerary.daily_plans;
  }

  return [];
}

function getTotalEstimatedCost(itinerary: any): string | null {
  const rawValue = itinerary?.totalEstimatedCost ?? itinerary?.total_estimated_cost;

  if (typeof rawValue === 'number' || typeof rawValue === 'string') {
    return String(rawValue);
  }

  return null;
}

function getDestinationCoordinates(itinerary: any) {
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

function getStay(itinerary: any) {
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

function getFlatActivities(dailyPlans: any[]) {
  return dailyPlans.flatMap((day: any, dayIndex: number) => {
    const activities = Array.isArray(day?.activities) ? day.activities : [];

    return activities.map((activity: any, activityIndex: number) => ({
      day: typeof day?.day === 'number' ? day.day : dayIndex + 1,
      dayTheme: day?.theme || `Day ${dayIndex + 1}`,
      activityIndex,
      time: activity?.time || '',
      name: activity?.name || 'Activity',
      category: activity?.category || 'Stop',
      description: activity?.description || '',
      address: activity?.address || null,
      latitude: typeof activity?.latitude === 'number' ? activity.latitude : null,
      longitude: typeof activity?.longitude === 'number' ? activity.longitude : null,
      estimated_cost:
        typeof activity?.estimated_cost === 'number' ? activity.estimated_cost : activity?.cost ?? null,
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
      <div className="flex min-h-screen items-center justify-center bg-[#F2F2F2] text-[#3F3D56]">
        <div className="rounded-[28px] border border-[#DDDCE8] bg-white px-6 py-5 shadow-[0_20px_70px_rgba(46,40,51,0.12)]">
          Loading trip...
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

        <div className="mx-auto max-w-7xl px-4 py-16 text-center sm:px-6">
          <h1 className="mb-4 text-3xl font-black tracking-tight sm:text-5xl">Trip not found</h1>
          <p className="mb-8 text-[#6F6C82]">
            {error || 'The requested trip is unavailable. It may have been deleted or not saved correctly.'}
          </p>
          <Link
            href="/dashboard"
            className="inline-block rounded-full bg-[#3F3D56] px-6 py-3 font-semibold text-white shadow-[0_12px_30px_rgba(46,40,51,0.18)] transition hover:translate-y-[-1px]"
          >
            Back to Dashboard
          </Link>
        </div>
      </main>
    );
  }

  return (
    <AuthGate>
      <main className="min-h-screen bg-[#F2F2F2] text-[#3F3D56]">
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
            <button
              onClick={() => setIsChatOpen(true)}
              className="rounded-full bg-[#3F3D56] px-4 py-2 text-sm font-semibold text-white shadow-[0_12px_30px_rgba(46,40,51,0.18)] transition hover:translate-y-[-1px]"
            >
              Ask assistant
            </button>
            <Link
              href={`/dashboard/onboarding?tripId=${encodeURIComponent(trip.id)}`}
              className="rounded-full border border-[#6C63FF] bg-[#EEEDFE] px-4 py-2 text-sm font-semibold text-[#3F3D56] transition hover:bg-[#E6E4FF]"
            >
              Edit trip
            </Link>
            <button
              onClick={() => setIsShareOpen(true)}
              className="rounded-full border border-[#3F3D56] bg-white px-4 py-2 text-sm font-semibold text-[#3F3D56] transition hover:bg-[#FBFAFF]"
            >
              Share trip
            </button>
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
            <div className="rounded-[32px] border border-[#DDDCE8] bg-white p-6 shadow-[0_18px_60px_rgba(46,40,51,0.07)] sm:p-8">
              <div className="inline-flex rounded-full bg-[#FF6584] px-3 py-1 text-[11px] font-bold uppercase tracking-[0.2em] text-[#3F3D56]">
                Saved trip
              </div>
              <h1 className="mt-4 text-3xl font-black tracking-tight sm:text-5xl">
              {trip.destination}
              </h1>
              <p className="mt-3 max-w-2xl text-sm leading-7 text-[#6F6C82] sm:text-base">
                A trip built from live destination data, your trip window, and the places we can actually map.
              </p>

            <div className="mt-6 flex flex-wrap gap-3">
              <button
                onClick={() => setIsChatOpen(true)}
                className="rounded-full bg-[#6C63FF] px-5 py-3 text-sm font-semibold text-white shadow-[0_12px_30px_rgba(90,167,232,0.22)] transition hover:translate-y-[-1px]"
              >
                Open Trip Assistant
              </button>
              <Link
                href={`/dashboard/onboarding?tripId=${encodeURIComponent(trip.id)}`}
                className="rounded-full border border-[#6C63FF] bg-[#EEEDFE] px-5 py-3 text-sm font-semibold text-[#3F3D56] transition hover:bg-[#E6E4FF]"
              >
                Edit trip
              </Link>
              <button
                onClick={() => setIsShareOpen(true)}
                className="rounded-full border border-[#3F3D56] bg-white px-5 py-3 text-sm font-semibold text-[#3F3D56] transition hover:bg-[#FBFAFF]"
              >
                Share trip
              </button>
              <Link
                href="/dashboard"
                className="rounded-full border border-[#DDDCE8] bg-[#FBFAFF] px-5 py-3 text-sm font-semibold text-[#3F3D56] transition hover:border-[#6C63FF] hover:text-[#6C63FF]"
              >
                Back to Dashboard
              </Link>
            </div>
            <p className="mt-4 text-sm leading-6 text-[#6F6C82]">
              Want to adjust the trip after it’s created? Update the destination, duration, budget, or interests and we’ll keep the saved share preview aligned.
            </p>
          </div>

          <div className="grid gap-3 sm:grid-cols-3 lg:grid-cols-1">
            <div className="rounded-[28px] border border-[#DDDCE8] bg-white p-5 shadow-[0_16px_48px_rgba(46,40,51,0.06)]">
              <div className="text-[11px] font-semibold uppercase tracking-[0.18em] text-[#8A869C]">Duration</div>
              <div className="mt-2 text-2xl font-black tracking-tight text-[#3F3D56]">{trip.duration} days</div>
            </div>
            <div className="rounded-[28px] border border-[#DDDCE8] bg-white p-5 shadow-[0_16px_48px_rgba(46,40,51,0.06)]">
              <div className="text-[11px] font-semibold uppercase tracking-[0.18em] text-[#8A869C]">Map stops</div>
              <div className="mt-2 text-2xl font-black tracking-tight text-[#6C63FF]">{mapActivities.length}</div>
            </div>
            <div className="rounded-[28px] border border-[#DDDCE8] bg-white p-5 shadow-[0_16px_48px_rgba(46,40,51,0.06)]">
              <div className="text-[11px] font-semibold uppercase tracking-[0.18em] text-[#8A869C]">Estimated cost</div>
              <div className="mt-2 text-2xl font-black tracking-tight text-[#FF6584]">
                {totalEstimatedCost ? `$${totalEstimatedCost}` : 'Not set'}
              </div>
            </div>
          </div>
        </motion.section>

        {error && (
          <div className="mt-6 rounded-2xl border border-[#f0d7de] bg-[#FFF0F4] px-4 py-3 text-sm font-medium text-[#C14D72]">
            {error}
          </div>
        )}

        <section
          ref={mapSectionRef}
          className="relative z-0 mt-8 grid gap-6 lg:grid-cols-[1.12fr_0.88fr] lg:items-stretch"
        >
          <MapComponent
            activities={mapActivities}
            destination={trip.destination}
            destinationCoordinates={destinationCoordinates}
            stay={stay}
            selectedActivityIndex={selectedStopIndex}
            focusStayTrigger={focusStayTrigger}
          />

          <div className="flex h-full flex-col rounded-[28px] border border-[#DDDCE8] bg-white p-5 shadow-[0_16px_48px_rgba(46,40,51,0.06)] sm:p-6 lg:h-[360px] lg:min-h-0">
            <div className="text-xs font-bold uppercase tracking-[0.22em] text-[#8A869C]">Location guide</div>
            <h2 className="mt-1 text-2xl font-black tracking-tight">Places in order</h2>
            <p className="mt-2 text-sm leading-6 text-[#6F6C82]">
              The numbers on the map match the order below, so first-time users can quickly see where each stop sits.
            </p>

            <div className="mt-5 flex-1 min-h-0 space-y-3 overflow-y-auto pr-2">
              {mapActivities.length > 0 ? (
                mapActivities.map((activity, index) => (
                  <button
                    key={`${activity.day}-${activity.activityIndex}-${activity.name}`}
                    type="button"
                    onClick={() => {
                      setSelectedStopIndex(index);
                      scrollToMap();
                    }}
                    className={`w-full rounded-[20px] border p-3 text-left transition hover:-translate-y-0.5 hover:shadow-[0_12px_28px_rgba(46,40,51,0.08)] ${
                      selectedStopIndex === index
                        ? 'border-[#6C63FF] bg-[#EEEDFE]'
                        : 'border-[#DDDCE8] bg-[#FBFAFF]'
                    }`}
                  >
                    <div className="flex items-start gap-3">
                      <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-2xl bg-[#3F3D56] text-sm font-black text-white">
                        {index + 1}
                      </div>
                      <div className="min-w-0 flex-1">
                        <div className="text-sm font-bold text-[#3F3D56]">
                          Day {activity.day} · {activity.time} · {activity.name}
                        </div>
                        <div className="mt-1 text-xs font-semibold uppercase tracking-[0.16em] text-[#8A869C]">
                          {activity.category}
                        </div>
                        <div className="mt-1 text-sm leading-6 text-[#6F6C82]">
                          {activity.address || 'No address provided'}
                        </div>
                      </div>
                    </div>
                  </button>
                ))
              ) : (
                <div className="rounded-[22px] border border-[#DDDCE8] bg-[#FBFAFF] p-4 text-sm leading-6 text-[#6F6C82]">
                  This itinerary does not have geocoded stops yet. The trip details are still available below.
                </div>
              )}
            </div>
          </div>
        </section>

        <section className="mt-8">
          <div className="grid gap-4 lg:grid-cols-[1.02fr_0.98fr]">
          <details className="group border border-[#DDDCE8] bg-white p-5 shadow-[0_16px_48px_rgba(46,40,51,0.06)] sm:p-6">
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
                    className="border border-[#3F3D56] bg-[#3F3D56] px-3 py-2 text-sm font-semibold text-white transition hover:bg-[#302F43]"
                  >
                    Retry stay
                  </button>
                </div>
                <p className="mt-2 max-w-2xl text-sm leading-6 text-[#6F6C82]">
                  Live lodging data gets pinned here so the trip always has a real base.
                </p>
                <div className="mt-4 flex flex-wrap gap-2">
                  <span className="border border-[#3F3D56] bg-[#FBFAFF] px-3 py-1 text-xs font-semibold uppercase tracking-[0.16em]">
                    {stay ? stay.name : 'No stay yet'}
                  </span>
                  {stay && (
                    <span className="border border-[#3F3D56] bg-[#EEEDFE] px-3 py-1 text-xs font-semibold uppercase tracking-[0.16em] text-[#6C63FF]">
                      {stay.type}
                    </span>
                  )}
                </div>
              </summary>

              <div className="mt-5 grid gap-4 md:grid-cols-[1.05fr_0.95fr]">
                {stay ? (
                  <>
                    <div className="border border-[#DDDCE8] bg-[#FBFAFF] p-4">
                      <div className="inline-flex border border-[#3F3D56] bg-[#FF6584] px-3 py-1 text-[11px] font-bold uppercase tracking-[0.18em] text-white">
                        Live lodging
                      </div>
                      <h3 className="mt-4 text-2xl font-black tracking-tight text-[#3F3D56]">{stay.name}</h3>
                      <p className="mt-2 text-sm leading-6 text-[#6F6C82]">{stay.type}</p>

                      <div className="mt-4 grid gap-3 sm:grid-cols-2">
                        <div className="border border-[#DDDCE8] bg-white p-4">
                          <div className="text-[11px] font-semibold uppercase tracking-[0.18em] text-[#8A869C]">Check-in</div>
                          <div className="mt-2 text-sm font-semibold text-[#3F3D56]">
                            {stay.checkInDate ? `${stay.checkInDate} ` : ''}
                            {stay.checkInTime || 'Not set'}
                          </div>
                        </div>
                        <div className="border border-[#DDDCE8] bg-white p-4">
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

                    <div className="border border-[#DDDCE8] bg-[#FBFAFF] p-4">
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
                          className="border border-[#3F3D56] bg-white px-4 py-2 text-sm font-semibold text-[#3F3D56] transition hover:bg-[#FBFAFF]"
                        >
                          Show stay on map
                        </button>
                        {stay.address && (
                          <div className="border border-[#DDDCE8] bg-white px-4 py-2 text-sm text-[#6F6C82]">
                            {stay.address}
                          </div>
                        )}
                      </div>
                    </div>
                  </>
                ) : (
                  <div className="border border-dashed border-[#DDDCE8] bg-[#FBFAFF] p-4 text-sm leading-6 text-[#6F6C82] md:col-span-2">
                    No live stay option was returned for this trip. Tap retry and we will ask for your budget range and preferred area again.
                  </div>
                )}
              </div>
            </details>

            <div className="border border-[#DDDCE8] bg-white p-5 shadow-[0_16px_48px_rgba(46,40,51,0.06)] sm:p-6">
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
                  <div className="border border-[#C14D72] bg-[#FFF0F4] px-4 py-3 text-sm font-medium text-[#C14D72]">
                    {suggestionsError}
                  </div>
                )}

                {suggestions.length > 0 ? (
                  suggestions.slice(0, 2).map(suggestion => (
                    <div key={suggestion.id} className="border border-[#3F3D56] bg-[#FBFAFF] px-4 py-4">
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
                  <div className="border border-dashed border-[#DDDCE8] bg-[#FBFAFF] px-4 py-3 text-sm leading-6 text-[#6F6C82]">
                    No suggestions yet. Share the trip publicly and ask guests to react.
                  </div>
                )}
              </div>

              <button
                type="button"
                onClick={() => setIsGuestSuggestionsOpen(true)}
                className="mt-5 w-full border border-[#3F3D56] bg-[#3F3D56] px-4 py-3 text-sm font-semibold text-white transition hover:bg-[#302F43]"
              >
                Click to expand
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

        <button
          onClick={() => setIsChatOpen(true)}
          className="fixed bottom-4 right-4 z-30 rounded-full bg-[#3F3D56] px-4 py-3 text-sm font-semibold text-white shadow-[0_18px_40px_rgba(46,40,51,0.18)] transition hover:translate-y-[-1px] sm:hidden"
        >
          Ask assistant
        </button>

        {isStayRetryOpen && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 px-4">
            <div className="w-full max-w-lg border border-[#3F3D56] bg-[#F2F2F2] p-5 text-[#3F3D56] shadow-[0_30px_120px_rgba(46,40,51,0.24)] sm:p-6">
              <div className="flex items-start justify-between gap-4">
                <div>
                  <div className="text-xs font-bold uppercase tracking-[0.22em] text-[#8A869C]">Retry stay</div>
                  <h3 className="mt-1 text-2xl font-black tracking-tight">Tell us your budget and preferred area</h3>
                </div>
                <button
                  type="button"
                  onClick={() => setIsStayRetryOpen(false)}
                  className="border border-[#3F3D56] bg-white px-3 py-2 text-sm font-semibold text-[#3F3D56]"
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
                    className="w-full border border-[#3F3D56] bg-white px-4 py-3 text-base text-[#3F3D56] outline-none placeholder:text-[#8A869C]"
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
                    className="w-full border border-[#3F3D56] bg-white px-4 py-3 text-base text-[#3F3D56] outline-none placeholder:text-[#8A869C]"
                  />
                </div>
              </div>

              {stayRetryError && (
                <div className="mt-4 border border-[#C14D72] bg-[#FFF0F4] px-4 py-3 text-sm font-medium text-[#C14D72]">
                  {stayRetryError}
                </div>
              )}

              <div className="mt-5 flex flex-col gap-3 sm:flex-row">
                <button
                  type="button"
                  onClick={handleStayRetry}
                  disabled={stayRetryLoading}
                  className="flex-1 border border-[#3F3D56] bg-[#3F3D56] px-4 py-3 text-sm font-semibold text-white transition hover:bg-[#302F43] disabled:cursor-not-allowed disabled:opacity-70"
                >
                  {stayRetryLoading ? 'Updating stay...' : 'Update stay'}
                </button>
                <button
                  type="button"
                  onClick={() => setIsStayRetryOpen(false)}
                  className="border border-[#3F3D56] bg-white px-4 py-3 text-sm font-semibold text-[#3F3D56]"
                >
                  Cancel
                </button>
              </div>
            </div>
          </div>
        )}

        {isEditTripOpen && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/45 px-4">
            <div className="w-full max-w-2xl border border-[#3F3D56] bg-[#F2F2F2] p-5 text-[#3F3D56] shadow-[0_30px_120px_rgba(46,40,51,0.28)] sm:p-6">
              <div className="flex items-start justify-between gap-4 border-b border-[#3F3D56] pb-4">
                <div>
                  <div className="text-xs font-bold uppercase tracking-[0.22em] text-[#8A869C]">Edit trip</div>
                  <h3 className="mt-1 text-2xl font-black tracking-tight">Update the saved trip</h3>
                </div>
                <button
                  type="button"
                  onClick={closeEditTrip}
                  className="border border-[#3F3D56] bg-white px-3 py-2 text-sm font-semibold text-[#3F3D56]"
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
                    className="w-full border border-[#3F3D56] bg-white px-4 py-3 text-base text-[#3F3D56] outline-none placeholder:text-[#8A869C]"
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
                    className="w-full border border-[#3F3D56] bg-white px-4 py-3 text-base text-[#3F3D56] outline-none placeholder:text-[#8A869C]"
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
                    className="w-full border border-[#3F3D56] bg-white px-4 py-3 text-base text-[#3F3D56] outline-none placeholder:text-[#8A869C]"
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
                    className="w-full resize-none border border-[#3F3D56] bg-white px-4 py-3 text-base text-[#3F3D56] outline-none placeholder:text-[#8A869C]"
                  />
                  <p className="mt-2 text-xs leading-5 text-[#8A869C]">
                    Separate interests with commas.
                  </p>
                </div>
              </div>

              {editTripError && (
                <div className="mt-4 border border-[#C14D72] bg-[#FFF0F4] px-4 py-3 text-sm font-medium text-[#C14D72]">
                  {editTripError}
                </div>
              )}

              <div className="mt-5 flex flex-col gap-3 sm:flex-row">
                <button
                  type="button"
                  onClick={handleEditTrip}
                  disabled={editTripLoading}
                  className="flex-1 border border-[#3F3D56] bg-[#3F3D56] px-4 py-3 text-sm font-semibold text-white transition hover:bg-[#302F43] disabled:cursor-not-allowed disabled:opacity-70"
                >
                  {editTripLoading ? 'Saving changes...' : 'Save changes'}
                </button>
                <button
                  type="button"
                  onClick={closeEditTrip}
                  className="border border-[#3F3D56] bg-white px-4 py-3 text-sm font-semibold text-[#3F3D56]"
                >
                  Cancel
                </button>
              </div>
            </div>
          </div>
        )}

        {isGuestSuggestionsOpen && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/45 px-4">
            <div className="w-full max-w-3xl border border-[#3F3D56] bg-[#F2F2F2] p-5 text-[#3F3D56] shadow-[0_30px_120px_rgba(46,40,51,0.28)] sm:p-6">
              <div className="flex items-start justify-between gap-4 border-b border-[#3F3D56] pb-4">
                <div>
                  <div className="text-xs font-bold uppercase tracking-[0.22em] text-[#8A869C]">Guest suggestions</div>
                  <h3 className="mt-1 text-2xl font-black tracking-tight">What guests are saying</h3>
                </div>
                <button
                  type="button"
                  onClick={() => setIsGuestSuggestionsOpen(false)}
                  className="border border-[#3F3D56] bg-white px-3 py-2 text-sm font-semibold text-[#3F3D56]"
                >
                  Close
                </button>
              </div>

              <div className="mt-5 grid gap-4 lg:grid-cols-[0.95fr_1.05fr]">
                <div className="border border-[#3F3D56] bg-white p-4">
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

                <div className="border border-[#3F3D56] bg-[#FBFAFF] p-4">
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
                    <div className="mt-4 border border-[#C14D72] bg-[#FFF0F4] px-4 py-3 text-sm font-medium text-[#C14D72]">
                      {suggestionsError}
                    </div>
                  )}

                  <div className="mt-4 space-y-3 max-h-[300px] overflow-y-scroll pr-1">
                    {suggestions.length > 0 ? (
                      suggestions.map(suggestion => (
                        <div key={suggestion.id} className="border border-[#3F3D56] bg-white px-4 py-4">
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
                      <div className="border border-dashed border-[#DDDCE8] bg-white px-4 py-3 text-sm leading-6 text-[#6F6C82]">
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
