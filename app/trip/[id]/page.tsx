'use client';

import Link from 'next/link';
import { useParams } from 'next/navigation';
import { useEffect, useMemo, useRef, useState } from 'react';
import { motion } from 'framer-motion';
import { AuthGate } from '@/components/auth/AuthGate';
import ItineraryChat from '@/components/ItineraryChat';
import { MapComponent } from '@/components/MapComponent';
import { loadTrip, retryTripStay, Trip } from '@/lib/supabase-trips';

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

function getTransfers(itinerary: any): any[] {
  if (Array.isArray(itinerary?.transfers)) {
    return itinerary.transfers;
  }

  return [];
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
  const [selectedStopIndex, setSelectedStopIndex] = useState<number | null>(null);
  const [isStayRetryOpen, setIsStayRetryOpen] = useState(false);
  const [stayBudgetRange, setStayBudgetRange] = useState('');
  const [stayPreferredLocation, setStayPreferredLocation] = useState('');
  const [stayRetryLoading, setStayRetryLoading] = useState(false);
  const [stayRetryError, setStayRetryError] = useState('');
  const [focusStayTrigger, setFocusStayTrigger] = useState(0);
  const mapSectionRef = useRef<HTMLElement | null>(null);

  useEffect(() => {
    if (!tripId) {
      setLoading(false);
      setError('Invalid trip id');
      return;
    }

    const fetchTrip = async () => {
      try {
        const tripData = await loadTrip(tripId);
        setTrip(tripData);
      } catch (err: unknown) {
        console.error('Error loading trip:', err);
        setError(err instanceof Error ? err.message : 'Failed to load trip');
      } finally {
        setLoading(false);
      }
    };

    fetchTrip();
  }, [tripId]);

  const dailyPlans = useMemo(() => getDailyPlans(trip?.itinerary), [trip]);
  const totalEstimatedCost = useMemo(() => getTotalEstimatedCost(trip?.itinerary), [trip]);
  const destinationCoordinates = useMemo(() => getDestinationCoordinates(trip?.itinerary), [trip]);
  const stay = useMemo(() => getStay(trip?.itinerary), [trip]);
  const transfers = useMemo(() => getTransfers(trip?.itinerary), [trip]);
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

  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-[#fbfaf7] text-[#2e2833]">
        <div className="rounded-[28px] border border-[#eadde5] bg-white px-6 py-5 shadow-[0_20px_70px_rgba(46,40,51,0.12)]">
          Loading trip...
        </div>
      </div>
    );
  }

  if (!trip) {
    return (
      <main className="min-h-screen bg-[#fbfaf7] text-[#2e2833]">
        <nav className="sticky top-0 z-40 border-b border-[#eadde5] bg-white">
          <div className="mx-auto flex max-w-7xl items-center justify-between px-4 py-4 sm:px-6">
            <Link href="/" className="flex items-center gap-2 transition hover:opacity-80">
              <div className="h-7 w-7 rounded-xl bg-[#5aa7e8]" />
              <span className="font-extrabold tracking-tight">TravelMate</span>
            </Link>
          </div>
        </nav>

        <div className="mx-auto max-w-7xl px-4 py-16 text-center sm:px-6">
          <h1 className="mb-4 text-3xl font-black tracking-tight sm:text-5xl">Trip not found</h1>
          <p className="mb-8 text-[#756978]">
            {error || 'The requested trip is unavailable. It may have been deleted or not saved correctly.'}
          </p>
          <Link
            href="/dashboard"
            className="inline-block rounded-full bg-[#2e2833] px-6 py-3 font-semibold text-white shadow-[0_12px_30px_rgba(46,40,51,0.18)] transition hover:translate-y-[-1px]"
          >
            Back to Dashboard
          </Link>
        </div>
      </main>
    );
  }

  return (
    <AuthGate>
      <main className="min-h-screen bg-[#fbfaf7] text-[#2e2833]">
      <ItineraryChat
        itinerary={trip.itinerary}
        isOpen={isChatOpen}
        onClose={() => setIsChatOpen(false)}
      />

      <nav className="sticky top-0 z-40 border-b border-[#eadde5] bg-white">
        <div className="mx-auto flex max-w-7xl flex-wrap items-center justify-between gap-3 px-4 py-4 sm:px-6">
          <Link href="/" className="flex items-center gap-2 transition hover:opacity-80">
            <div className="h-7 w-7 rounded-xl bg-[#5aa7e8]" />
            <span className="font-extrabold tracking-tight">TravelMate</span>
          </Link>
          <div className="flex items-center gap-3">
            <button
              onClick={() => setIsChatOpen(true)}
              className="rounded-full bg-[#2e2833] px-4 py-2 text-sm font-semibold text-white shadow-[0_12px_30px_rgba(46,40,51,0.18)] transition hover:translate-y-[-1px]"
            >
              Ask assistant
            </button>
            <Link href="/dashboard" className="text-sm font-medium text-[#756978] transition hover:text-[#2e2833]">
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
          <div className="rounded-[32px] border border-[#eadde5] bg-white p-6 shadow-[0_18px_60px_rgba(46,40,51,0.07)] sm:p-8">
            <div className="inline-flex rounded-full bg-[#f6d23c] px-3 py-1 text-[11px] font-bold uppercase tracking-[0.2em] text-[#2e2833]">
              Saved trip
            </div>
            <h1 className="mt-4 text-3xl font-black tracking-tight sm:text-5xl">
              {trip.itinerary?.title || trip.destination}
            </h1>
            <p className="mt-3 max-w-2xl text-sm leading-7 text-[#756978] sm:text-base">
              A trip built from live destination data, your trip window, and the places we can actually map.
            </p>

            <div className="mt-6 flex flex-wrap gap-3">
              <button
                onClick={() => setIsChatOpen(true)}
                className="rounded-full bg-[#5aa7e8] px-5 py-3 text-sm font-semibold text-white shadow-[0_12px_30px_rgba(90,167,232,0.22)] transition hover:translate-y-[-1px]"
              >
                Open Trip Assistant
              </button>
              <Link
                href="/dashboard"
                className="rounded-full border border-[#eadde5] bg-[#fffdf9] px-5 py-3 text-sm font-semibold text-[#2e2833] transition hover:border-[#5aa7e8] hover:text-[#5aa7e8]"
              >
                Back to Dashboard
              </Link>
            </div>
          </div>

          <div className="grid gap-3 sm:grid-cols-3 lg:grid-cols-1">
            <div className="rounded-[28px] border border-[#eadde5] bg-white p-5 shadow-[0_16px_48px_rgba(46,40,51,0.06)]">
              <div className="text-[11px] font-semibold uppercase tracking-[0.18em] text-[#a79aaa]">Duration</div>
              <div className="mt-2 text-2xl font-black tracking-tight text-[#2e2833]">{trip.duration} days</div>
            </div>
            <div className="rounded-[28px] border border-[#eadde5] bg-white p-5 shadow-[0_16px_48px_rgba(46,40,51,0.06)]">
              <div className="text-[11px] font-semibold uppercase tracking-[0.18em] text-[#a79aaa]">Map stops</div>
              <div className="mt-2 text-2xl font-black tracking-tight text-[#5aa7e8]">{mapActivities.length}</div>
            </div>
            <div className="rounded-[28px] border border-[#eadde5] bg-white p-5 shadow-[0_16px_48px_rgba(46,40,51,0.06)]">
              <div className="text-[11px] font-semibold uppercase tracking-[0.18em] text-[#a79aaa]">Estimated cost</div>
              <div className="mt-2 text-2xl font-black tracking-tight text-[#ff9a45]">
                {totalEstimatedCost ? `$${totalEstimatedCost}` : 'Not set'}
              </div>
            </div>
          </div>
        </motion.section>

        {error && (
          <div className="mt-6 rounded-2xl border border-[#f0d7de] bg-[#fff3f7] px-4 py-3 text-sm font-medium text-[#a65372]">
            {error}
          </div>
        )}

        <section ref={mapSectionRef} className="relative z-0 mt-8 grid gap-6 lg:grid-cols-[1.12fr_0.88fr]">
          <MapComponent
            activities={mapActivities}
            destination={trip.destination}
            destinationCoordinates={destinationCoordinates}
            stay={stay}
            selectedActivityIndex={selectedStopIndex}
            focusStayTrigger={focusStayTrigger}
          />

          <div className="rounded-[28px] border border-[#eadde5] bg-white p-5 shadow-[0_16px_48px_rgba(46,40,51,0.06)] sm:p-6">
            <div className="text-xs font-bold uppercase tracking-[0.22em] text-[#a79aaa]">Location guide</div>
            <h2 className="mt-1 text-2xl font-black tracking-tight">Places in order</h2>
            <p className="mt-2 text-sm leading-6 text-[#756978]">
              The numbers on the map match the order below, so first-time users can quickly see where each stop sits.
            </p>

            <div className="mt-5 space-y-3">
              {mapActivities.length > 0 ? (
                mapActivities.map((activity, index) => (
                  <button
                    key={`${activity.day}-${activity.activityIndex}-${activity.name}`}
                    type="button"
                    onClick={() => {
                      setSelectedStopIndex(index);
                      scrollToMap();
                    }}
                    className={`w-full rounded-[22px] border p-4 text-left transition hover:-translate-y-0.5 hover:shadow-[0_12px_28px_rgba(46,40,51,0.08)] ${
                      selectedStopIndex === index
                        ? 'border-[#5aa7e8] bg-[#eef7ff]'
                        : 'border-[#eadde5] bg-[#fffdf9]'
                    }`}
                  >
                    <div className="flex items-start gap-3">
                      <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-2xl bg-[#2e2833] text-sm font-black text-white">
                        {index + 1}
                      </div>
                      <div className="min-w-0 flex-1">
                        <div className="text-sm font-bold text-[#2e2833]">
                          Day {activity.day} · {activity.time} · {activity.name}
                        </div>
                        <div className="mt-1 text-xs font-semibold uppercase tracking-[0.16em] text-[#a79aaa]">
                          {activity.category}
                        </div>
                        <div className="mt-2 text-sm leading-6 text-[#756978]">
                          {activity.address || 'No address provided'}
                        </div>
                      </div>
                    </div>
                  </button>
                ))
              ) : (
                <div className="rounded-[22px] border border-[#eadde5] bg-[#fffdf9] p-4 text-sm leading-6 text-[#756978]">
                  This itinerary does not have geocoded stops yet. The trip details are still available below.
                </div>
              )}
            </div>
          </div>
        </section>

        <section className="mt-8 rounded-[30px] border border-[#eadde5] bg-white p-5 shadow-[0_16px_48px_rgba(46,40,51,0.06)] sm:p-6">
          <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
            <div>
              <div className="text-xs font-bold uppercase tracking-[0.22em] text-[#a79aaa]">Stay</div>
              <h2 className="mt-1 text-2xl font-black tracking-tight">Where you’re staying</h2>
              <p className="mt-2 max-w-2xl text-sm leading-6 text-[#756978]">
                This is pulled from live lodging POIs near the destination so the itinerary includes a real place to stay.
              </p>
            </div>
            <button
              type="button"
              onClick={() => {
                setIsStayRetryOpen(true);
                scrollToMap();
              }}
              className="border border-[#2e2833] bg-[#2e2833] px-4 py-3 text-sm font-semibold text-white transition hover:bg-[#1f1b23]"
            >
              Retry stay
            </button>
          </div>

          {stay ? (
            <div className="mt-5 grid gap-4 lg:grid-cols-[1.1fr_0.9fr]">
              <div className="rounded-[24px] border border-[#eadde5] bg-[#fffdf9] p-5">
                <div className="inline-flex rounded-full bg-[#ff9a45] px-3 py-1 text-[11px] font-bold uppercase tracking-[0.18em] text-white">
                  Live lodging
                </div>
                <h3 className="mt-4 text-2xl font-black tracking-tight text-[#2e2833]">{stay.name}</h3>
                <p className="mt-2 text-sm leading-6 text-[#756978]">
                  {stay.type}
                </p>

                <div className="mt-5 grid gap-3 sm:grid-cols-2">
                  <div className="rounded-2xl border border-[#eadde5] bg-white p-4">
                    <div className="text-[11px] font-semibold uppercase tracking-[0.18em] text-[#a79aaa]">Check-in</div>
                    <div className="mt-2 text-sm font-semibold text-[#2e2833]">
                      {stay.checkInDate ? `${stay.checkInDate} ` : ''}
                      {stay.checkInTime || 'Not set'}
                    </div>
                  </div>
                  <div className="rounded-2xl border border-[#eadde5] bg-white p-4">
                    <div className="text-[11px] font-semibold uppercase tracking-[0.18em] text-[#a79aaa]">Check-out</div>
                    <div className="mt-2 text-sm font-semibold text-[#2e2833]">
                      {stay.checkOutDate ? `${stay.checkOutDate} ` : ''}
                      {stay.checkOutTime || 'Not set'}
                    </div>
                  </div>
                </div>

                {stay.notes && (
                  <div className="mt-4 rounded-2xl border border-[#f6d23c]/40 bg-[#fff8e6] p-4 text-sm leading-6 text-[#2e2833]">
                    {stay.notes}
                  </div>
                )}
              </div>

            <div className="rounded-[24px] border border-[#eadde5] bg-[#fffdf9] p-5">
              <div className="text-[11px] font-semibold uppercase tracking-[0.18em] text-[#a79aaa]">Map location</div>
              <div className="mt-2 text-sm font-semibold text-[#2e2833]">{stay.latitude.toFixed(4)}, {stay.longitude.toFixed(4)}</div>
              <p className="mt-3 text-sm leading-6 text-[#756978]">
                The stay marker is shown on the map alongside the places you visit so the route and lodging are visible in one place.
              </p>
              <button
                type="button"
                onClick={() => {
                  setFocusStayTrigger(current => current + 1);
                  scrollToMap();
                }}
                className="mt-4 border border-[#2e2833] bg-white px-4 py-2 text-sm font-semibold text-[#2e2833] transition hover:bg-[#fffdf9]"
              >
                Show stay on map
              </button>
              {stay.address && (
                <div className="mt-4 border border-[#eadde5] bg-white px-4 py-3 text-sm text-[#756978]">
                  {stay.address}
                </div>
              )}
              </div>
            </div>
          ) : (
            <div className="mt-5 rounded-[24px] border border-dashed border-[#eadde5] bg-[#fffdf9] p-5 text-sm leading-6 text-[#756978]">
              No live stay option was returned for this trip. Tap retry and we will ask for your budget range and preferred area again.
            </div>
          )}
        </section>

        <section className="mt-8 rounded-[30px] border border-[#eadde5] bg-white p-5 shadow-[0_16px_48px_rgba(46,40,51,0.06)] sm:p-6">
          <div className="flex flex-col gap-2 sm:flex-row sm:items-end sm:justify-between">
            <div>
              <div className="text-xs font-bold uppercase tracking-[0.22em] text-[#a79aaa]">Transfers</div>
              <h2 className="mt-1 text-2xl font-black tracking-tight">Arrival and departure legs</h2>
            </div>
            <p className="max-w-2xl text-sm leading-6 text-[#756978]">
              These are the non-negotiable transport legs between the real world and the stay.
            </p>
          </div>

          <div className="mt-5 grid gap-4 md:grid-cols-2">
            {transfers.length > 0 ? (
              transfers.map((transfer, index) => (
                <div
                  key={`${transfer.kind}-${index}`}
                  className="rounded-[24px] border border-[#eadde5] bg-[#fffdf9] p-4"
                >
                  <div className="flex items-start justify-between gap-4">
                    <div>
                      <div className="inline-flex rounded-full bg-[#5aa7e8] px-3 py-1 text-[11px] font-bold uppercase tracking-[0.18em] text-white">
                        {transfer.kind}
                      </div>
                      <h3 className="mt-3 text-lg font-black tracking-tight text-[#2e2833]">
                        {transfer.title}
                      </h3>
                    </div>
                    {transfer.time && (
                      <div className="rounded-full bg-white px-3 py-1 text-sm font-bold text-[#ff9a45]">
                        {transfer.time}
                      </div>
                    )}
                  </div>

                  <div className="mt-4 space-y-3">
                    <div className="rounded-2xl border border-[#eadde5] bg-white p-4">
                      <div className="text-[11px] font-semibold uppercase tracking-[0.18em] text-[#a79aaa]">From</div>
                      <div className="mt-1 text-sm font-semibold text-[#2e2833]">
                        {transfer.from || 'Not specified'}
                      </div>
                    </div>
                    <div className="rounded-2xl border border-[#eadde5] bg-white p-4">
                      <div className="text-[11px] font-semibold uppercase tracking-[0.18em] text-[#a79aaa]">To</div>
                      <div className="mt-1 text-sm font-semibold text-[#2e2833]">
                        {transfer.to || 'Not specified'}
                      </div>
                    </div>
                  </div>

                  {transfer.notes && (
                    <p className="mt-4 text-sm leading-6 text-[#756978]">{transfer.notes}</p>
                  )}
                </div>
              ))
            ) : (
              <div className="rounded-[24px] border border-dashed border-[#eadde5] bg-[#fffdf9] p-4 text-sm leading-6 text-[#756978]">
                No transfer legs were generated for this trip.
              </div>
            )}
          </div>
        </section>

        <section className="mt-8 rounded-[30px] border border-[#eadde5] bg-white p-5 shadow-[0_16px_48px_rgba(46,40,51,0.06)] sm:p-6">
          <div className="flex flex-col gap-2 sm:flex-row sm:items-end sm:justify-between">
            <div>
              <div className="text-xs font-bold uppercase tracking-[0.22em] text-[#a79aaa]">Itinerary</div>
              <h2 className="mt-1 text-2xl font-black tracking-tight sm:text-3xl">Day-by-day timeline</h2>
              <p className="mt-1 max-w-2xl text-sm leading-6 text-[#756978]">
                The trip is collapsed by default so the page stays readable. Open a day when you want the detailed stops.
              </p>
            </div>
            <div className="text-sm font-medium text-[#756978]">
              {trip.interests.length > 0 ? trip.interests.join(' · ') : 'No interests saved'}
            </div>
          </div>

          {dailyPlans.length === 0 ? (
            <div className="rounded-[28px] border border-[#eadde5] bg-white p-6 text-[#756978] shadow-[0_16px_48px_rgba(46,40,51,0.06)]">
              This trip was saved without daily plans. Regenerate the itinerary once the API returns structured activities.
            </div>
          ) : (
            dailyPlans.map((day: any, index: number) => {
              const activities = Array.isArray(day?.activities) ? day.activities : [];
              const previewActivities = activities.slice(0, 2);
              const firstTime = activities[0]?.time;
              const lastTime = activities[activities.length - 1]?.time;

              return (
                <details
                  key={`${day?.day ?? index}-${day?.theme ?? 'day'}`}
                  className="group overflow-hidden border border-[#eadde5] bg-white shadow-[0_16px_48px_rgba(46,40,51,0.06)]"
                >
                  <summary className="cursor-pointer list-none p-5 sm:p-6">
                    <div className="flex flex-col gap-4">
                      <div className="flex flex-wrap items-center gap-3">
                        <div className="inline-flex bg-[#5aa7e8] px-3 py-1 text-[11px] font-bold uppercase tracking-[0.18em] text-white">
                          Day {day?.day || index + 1}
                        </div>
                        {day?.intensity && (
                          <div className="border border-[#eadde5] bg-[#fffdf9] px-3 py-1 text-[11px] font-semibold uppercase tracking-[0.18em] text-[#756978]">
                            {day.intensity}
                          </div>
                        )}
                        <div className="text-xs font-semibold uppercase tracking-[0.16em] text-[#a79aaa]">
                          {activities.length} stops
                        </div>
                      </div>

                      <div className="flex items-start justify-between gap-4">
                        <div>
                          <h3 className="text-xl font-black tracking-tight sm:text-2xl">
                            {day?.theme || `Day ${day?.day || index + 1}`}
                          </h3>
                          <p className="mt-1 text-sm text-[#756978]">
                            {day?.date || 'No date'}{firstTime && lastTime ? ` · ${firstTime} to ${lastTime}` : ''}
                          </p>
                        </div>
                        <div className="text-right text-sm text-[#756978]">
                          {typeof day?.totalActiveHours === 'number' ? `${day.totalActiveHours} active hours` : 'Activity details'}
                        </div>
                      </div>

                      <div className="flex items-center justify-between border-t border-[#eadde5] pt-4 text-sm font-semibold text-[#2e2833]">
                        <span>Open day details</span>
                        <span className="text-[#5aa7e8]">Tap to expand</span>
                      </div>
                    </div>
                  </summary>

                  <div className="border-t border-[#eadde5] bg-[#fffdf9] p-5 sm:p-6">
                    {previewActivities.length > 0 && (
                      <div className="mb-4 grid gap-3 md:grid-cols-2">
                        {previewActivities.map((activity: any, activityIndex: number) => {
                          const cost = activity?.cost ?? activity?.estimated_cost;

                          return (
                            <button
                              key={`${activity?.name ?? 'activity'}-${activityIndex}`}
                              type="button"
                              onClick={() => {
                                const targetIndex = mapActivities.findIndex(
                                  stop =>
                                    stop.day === (day?.day || index + 1) &&
                                    stop.activityIndex === activityIndex &&
                                    stop.name === activity?.name
                                );

                                if (targetIndex >= 0) {
                                  setSelectedStopIndex(targetIndex);
                                }
                              }}
                              className="border border-[#eadde5] bg-white p-4 text-left transition hover:-translate-y-0.5 hover:border-[#5aa7e8] hover:shadow-[0_16px_36px_rgba(46,40,51,0.08)]"
                            >
                              <div className="flex flex-col gap-2">
                                <div className="flex items-start justify-between gap-3">
                                  <div className="min-w-0">
                                    <div className="text-sm font-bold text-[#2e2833]">
                                      {[activity?.time, activity?.name].filter(Boolean).join(' · ')}
                                    </div>
                                    {activity?.category && (
                                      <div className="mt-2 inline-flex bg-[#eef7ff] px-3 py-1 text-xs font-semibold text-[#5aa7e8]">
                                        {activity.category}
                                      </div>
                                    )}
                                  </div>
                                  {cost !== undefined && cost !== null && (
                                    <div className="bg-[#fff4e3] px-3 py-1 text-sm font-bold text-[#ff9a45]">
                                      ${cost}
                                    </div>
                                  )}
                                </div>
                                {activity?.address && (
                                  <div className="text-xs leading-6 text-[#756978]">{activity.address}</div>
                                )}
                              </div>
                            </button>
                          );
                        })}
                      </div>
                    )}

                    {activities.length > previewActivities.length && (
                      <div className="mb-4 border border-[#eadde5] bg-white px-4 py-3 text-sm font-medium text-[#756978]">
                        Open this day to view the remaining {activities.length - previewActivities.length} stops.
                      </div>
                    )}

                    {activities.length > 0 ? (
                      <div className="grid gap-3">
                        {activities.map((activity: any, activityIndex: number) => {
                          const cost = activity?.cost ?? activity?.estimated_cost;

                          return (
                            <div
                              key={`${activity?.name ?? 'activity'}-${activityIndex}`}
                              className="border border-[#eadde5] bg-white p-4"
                            >
                              <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
                                <div className="min-w-0">
                                  <div className="text-base font-bold text-[#2e2833]">
                                    {[activity?.time, activity?.name].filter(Boolean).join(' · ')}
                                  </div>
                                  {activity?.category && (
                                    <div className="mt-2 inline-flex bg-[#eef7ff] px-3 py-1 text-xs font-semibold text-[#5aa7e8]">
                                      {activity.category}
                                    </div>
                                  )}
                                </div>
                                {cost !== undefined && cost !== null && (
                                  <div className="bg-[#fff4e3] px-3 py-1 text-sm font-bold text-[#ff9a45]">
                                    ${cost}
                                  </div>
                                )}
                              </div>
                              {activity?.description && (
                                <p className="mt-3 text-sm leading-6 text-[#756978]">{activity.description}</p>
                              )}
                              {(activity?.address || activity?.latitude || activity?.longitude) && (
                                <div className="mt-3 border border-[#eadde5] bg-[#fffdf9] px-3 py-2 text-xs leading-6 text-[#756978]">
                                  {activity.address || 'Address unavailable'}
                                  {activity.latitude && activity.longitude && (
                                    <span className="ml-2 font-semibold text-[#2e2833]">
                                      ({activity.latitude.toFixed(4)}, {activity.longitude.toFixed(4)})
                                    </span>
                                  )}
                                </div>
                              )}
                            </div>
                          );
                        })}
                      </div>
                    ) : (
                      <div className="text-sm text-[#756978]">No activities returned for this day.</div>
                    )}
                  </div>
                </details>
              );
            })
          )}
        </section>

        <button
          onClick={() => setIsChatOpen(true)}
          className="fixed bottom-4 right-4 z-30 rounded-full bg-[#2e2833] px-4 py-3 text-sm font-semibold text-white shadow-[0_18px_40px_rgba(46,40,51,0.18)] transition hover:translate-y-[-1px] sm:hidden"
        >
          Ask assistant
        </button>

        {isStayRetryOpen && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 px-4">
            <div className="w-full max-w-lg border border-[#2e2833] bg-[#fbfaf7] p-5 text-[#2e2833] shadow-[0_30px_120px_rgba(46,40,51,0.24)] sm:p-6">
              <div className="flex items-start justify-between gap-4">
                <div>
                  <div className="text-xs font-bold uppercase tracking-[0.22em] text-[#a79aaa]">Retry stay</div>
                  <h3 className="mt-1 text-2xl font-black tracking-tight">Tell us your budget and preferred area</h3>
                </div>
                <button
                  type="button"
                  onClick={() => setIsStayRetryOpen(false)}
                  className="border border-[#2e2833] bg-white px-3 py-2 text-sm font-semibold text-[#2e2833]"
                >
                  Close
                </button>
              </div>

              <p className="mt-3 text-sm leading-6 text-[#756978]">
                We will use live lodging options and update only the stay card and its transfer legs.
              </p>

              <div className="mt-5 space-y-4">
                <div>
                  <label className="mb-2 block text-xs font-bold uppercase tracking-[0.2em] text-[#756978]">
                    Budget range
                  </label>
                  <input
                    value={stayBudgetRange}
                    onChange={event => setStayBudgetRange(event.target.value)}
                    placeholder="Example: $80-$140 per night or mid-range"
                    className="w-full border border-[#2e2833] bg-white px-4 py-3 text-base text-[#2e2833] outline-none placeholder:text-[#a79aaa]"
                  />
                </div>

                <div>
                  <label className="mb-2 block text-xs font-bold uppercase tracking-[0.2em] text-[#756978]">
                    Preferred location
                  </label>
                  <input
                    value={stayPreferredLocation}
                    onChange={event => setStayPreferredLocation(event.target.value)}
                    placeholder="Example: near the station, old town, downtown, or the beach"
                    className="w-full border border-[#2e2833] bg-white px-4 py-3 text-base text-[#2e2833] outline-none placeholder:text-[#a79aaa]"
                  />
                </div>
              </div>

              {stayRetryError && (
                <div className="mt-4 border border-[#a65372] bg-[#fff3f7] px-4 py-3 text-sm font-medium text-[#a65372]">
                  {stayRetryError}
                </div>
              )}

              <div className="mt-5 flex flex-col gap-3 sm:flex-row">
                <button
                  type="button"
                  onClick={handleStayRetry}
                  disabled={stayRetryLoading}
                  className="flex-1 border border-[#2e2833] bg-[#2e2833] px-4 py-3 text-sm font-semibold text-white transition hover:bg-[#1f1b23] disabled:cursor-not-allowed disabled:opacity-70"
                >
                  {stayRetryLoading ? 'Updating stay...' : 'Update stay'}
                </button>
                <button
                  type="button"
                  onClick={() => setIsStayRetryOpen(false)}
                  className="border border-[#2e2833] bg-white px-4 py-3 text-sm font-semibold text-[#2e2833]"
                >
                  Cancel
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </main>
    </AuthGate>
  );
}
