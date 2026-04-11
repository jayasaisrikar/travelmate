'use client';

import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useEffect, useState } from 'react';
import { motion } from 'framer-motion';
import { deleteTrip, listTrips, Trip } from '@/lib/supabase-trips';
import { supabaseBrowser } from '@/services/supabase-browser';

function getEstimatedCost(itinerary: any): string | null {
  const rawValue = itinerary?.totalEstimatedCost ?? itinerary?.total_estimated_cost;

  if (typeof rawValue === 'number' || typeof rawValue === 'string') {
    return String(rawValue);
  }

  return null;
}

export default function DashboardPage() {
  const router = useRouter();
  const [trips, setTrips] = useState<Trip[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    const loadTrips = async () => {
      try {
        const loadedTrips = await listTrips();
        setTrips(loadedTrips);
      } catch (err: unknown) {
        console.error('Error loading trips:', err);
        setError(err instanceof Error ? err.message : 'Failed to load trips');
      } finally {
        setLoading(false);
      }
    };

    loadTrips();
  }, []);

  const handleDeleteTrip = async (id: string) => {
    try {
      await deleteTrip(id);
      setTrips(currentTrips => currentTrips.filter(trip => trip.id !== id));
    } catch (err: unknown) {
      console.error('Error deleting trip:', err);
      setError(err instanceof Error ? err.message : 'Failed to delete trip');
    }
  };

  const handleSignOut = async () => {
    await supabaseBrowser.auth.signOut();
    router.replace('/login');
  };

  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-[#fbfaf7] text-[#2e2833]">
        <div className="rounded-[28px] border border-[#eadde5] bg-white px-6 py-5 shadow-[0_20px_70px_rgba(46,40,51,0.12)]">
          <div className="flex items-center gap-3">
            <motion.div
              animate={{ rotate: 360 }}
              transition={{ repeat: Infinity, duration: 1.1, ease: 'linear' }}
              className="h-5 w-5 rounded-full border-2 border-[#4ea0e8] border-t-transparent"
            />
            <span className="font-medium">Loading trips...</span>
          </div>
        </div>
      </div>
    );
  }

  return (
    <main className="min-h-screen bg-[#fbfaf7] text-[#2e2833]">
      <nav className="relative z-10 border-b border-[#eadde5] bg-white">
        <div className="mx-auto flex max-w-6xl items-center justify-between px-4 py-4 sm:px-6">
          <Link href="/" className="flex items-center gap-2">
            <div className="h-7 w-7 rounded-xl bg-[#5aa7e8] shadow-sm" />
            <span className="font-extrabold tracking-tight">TravelMate</span>
          </Link>
          <div className="flex items-center gap-3">
            <button
              onClick={handleSignOut}
              className="border border-[#2e2833] bg-white px-4 py-2 text-sm font-semibold text-[#2e2833] transition hover:bg-[#fffdf9]"
            >
              Sign Out
            </button>
            <button
              onClick={() => router.push('/dashboard/onboarding')}
              className="bg-[#5aa7e8] px-4 py-2 text-sm font-semibold text-white transition hover:bg-[#4ea0e8]"
            >
              New Trip
            </button>
          </div>
        </div>
      </nav>

      <div className="relative z-10 mx-auto max-w-6xl px-4 py-8 sm:px-6 sm:py-12">
        <div className="mb-8 grid gap-4 border border-[#eadde5] bg-white p-5 shadow-[0_20px_70px_rgba(46,40,51,0.08)] sm:p-7 lg:grid-cols-[1.2fr_0.8fr]">
          <div>
            <div className="mb-3 inline-flex rounded-full border border-[#eadde5] bg-[#fff8ef] px-3 py-1 text-xs font-bold uppercase tracking-[0.2em] text-[#756978]">
              Saved trips
            </div>
            <h1 className="text-3xl font-black tracking-tight sm:text-5xl">My Trips</h1>
            <p className="mt-3 max-w-2xl text-base leading-7 text-[#756978] sm:text-lg">
              {trips.length === 0
                ? 'Create your first trip'
                : `You have ${trips.length} saved trip${trips.length !== 1 ? 's' : ''}`}
            </p>
          </div>
          <div className="grid gap-3 sm:grid-cols-3">
            {[
              { label: 'Trips', value: trips.length.toString(), tone: 'plum' },
              { label: 'Storage', value: trips.length > 0 ? 'Live' : 'Empty', tone: 'blue' },
              { label: 'Assistant', value: 'Ready', tone: 'green' },
            ].map(card => (
              <div
                key={card.label}
                className="rounded-[22px] border border-[#eadde5] bg-[#fffdf9] px-4 py-4 shadow-sm"
              >
                <div className="text-[11px] font-semibold uppercase tracking-[0.18em] text-[#a79aaa]">{card.label}</div>
                <div className={`mt-2 text-2xl font-black tracking-tight ${card.tone === 'blue' ? 'text-[#4ea0e8]' : card.tone === 'green' ? 'text-[#ff9a45]' : 'text-[#2e2833]'}`}>
                  {card.value}
                </div>
              </div>
            ))}
          </div>
        </div>

        {error && (
          <div className="mb-8 rounded-2xl border border-[#f0d7de] bg-[#fff3f7] px-4 py-3 text-sm font-medium text-[#a65372] shadow-sm">
            {error}
          </div>
        )}

        {trips.length === 0 ? (
          <motion.div
            initial={{ opacity: 0, y: 18 }}
            animate={{ opacity: 1, y: 0 }}
            className="overflow-hidden rounded-[30px] border border-[#eadde5] bg-white p-8 text-center shadow-[0_20px_70px_rgba(46,40,51,0.08)] sm:p-12"
          >
            <div className="mx-auto mb-5 flex h-16 w-16 items-center justify-center rounded-2xl bg-[#5aa7e8] text-white shadow-lg">
              TM
            </div>
            <h2 className="mb-3 text-2xl font-black tracking-tight sm:text-3xl">No trips yet</h2>
            <p className="mx-auto mb-8 max-w-xl text-sm leading-7 text-[#756978] sm:text-base">
              Create a trip after connecting your real destination and preferences.
            </p>
            <button
              onClick={() => router.push('/dashboard/onboarding')}
              className="rounded-full bg-[#5aa7e8] px-6 py-3 font-semibold text-white shadow-[0_12px_30px_rgba(90,167,232,0.24)] transition hover:translate-y-[-1px]"
            >
              Create First Trip
            </button>
          </motion.div>
        ) : (
          <div className="grid gap-5 md:grid-cols-2 xl:grid-cols-3">
            {trips.map((trip, index) => {
              const estimatedCost = getEstimatedCost(trip.itinerary);

              return (
                <motion.article
                  key={trip.id}
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: index * 0.05 }}
                  className="overflow-hidden rounded-[28px] border border-[#eadde5] bg-white shadow-[0_20px_70px_rgba(46,40,51,0.08)] transition hover:-translate-y-1 hover:shadow-[0_24px_90px_rgba(46,40,51,0.14)]"
                >
                  <div className="bg-[#5aa7e8] p-6 text-white">
                    <div className="mb-4 inline-flex border border-white bg-[#fbfaf7] px-3 py-1 text-[11px] font-semibold uppercase tracking-[0.18em] text-[#2e2833]">
                      Saved trip
                    </div>
                    <h3 className="text-2xl font-black tracking-tight">{trip.destination}</h3>
                    <p className="mt-1 text-sm text-white">{trip.duration} days</p>
                  </div>

                  <div className="space-y-5 p-6">
                    <div className="grid gap-3 sm:grid-cols-2">
                      <div className="rounded-2xl bg-[#fffdf9] p-4">
                        <div className="text-[11px] font-semibold uppercase tracking-[0.18em] text-[#a79aaa]">Budget</div>
                        <p className="mt-2 font-semibold text-[#2e2833]">{trip.budget || 'Not set'}</p>
                      </div>
                      <div className="rounded-2xl bg-[#fffdf9] p-4">
                        <div className="text-[11px] font-semibold uppercase tracking-[0.18em] text-[#a79aaa]">Interests</div>
                        <p className="mt-2 text-sm leading-6 text-[#756978]">
                          {trip.interests.length > 0 ? trip.interests.join(', ') : 'No interests saved'}
                        </p>
                      </div>
                    </div>

                    {estimatedCost && (
                      <div className="rounded-2xl border border-[#fde2b7] bg-[#fff4e3] p-4">
                        <div className="text-[11px] font-semibold uppercase tracking-[0.18em] text-[#ff9a45]">Estimated Cost</div>
                        <p className="mt-2 text-2xl font-black tracking-tight text-[#2e2833]">${estimatedCost}</p>
                      </div>
                    )}

                    <div className="flex flex-col gap-3 sm:flex-row">
                      <button
                        onClick={() => router.push(`/trip/${trip.id}`)}
                        className="flex-1 rounded-full bg-[#5aa7e8] px-4 py-3 text-sm font-semibold text-white shadow-[0_12px_30px_rgba(90,167,232,0.2)] transition hover:translate-y-[-1px]"
                      >
                        View Details
                      </button>
                      <button
                        onClick={() => handleDeleteTrip(trip.id)}
                        className="rounded-full border border-[#f0d7de] bg-white px-4 py-3 text-sm font-semibold text-[#a65372] transition hover:border-[#f6d23c] hover:bg-[#fff8e6]"
                      >
                        Delete
                      </button>
                    </div>
                  </div>
                </motion.article>
              );
            })}
          </div>
        )}
      </div>
    </main>
  );
}
