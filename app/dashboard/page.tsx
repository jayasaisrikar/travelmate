'use client';

import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useEffect, useState } from 'react';
import { motion } from 'framer-motion';
import { deleteTrip, listTrips, Trip } from '@/lib/supabase-trips';
import { getSupabaseBrowser } from '@/services/supabase-browser';
import { Brand } from '@/components/common/Brand';

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
    await getSupabaseBrowser().auth.signOut();
    router.replace('/login');
  };

  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-[#fbfaf7] px-4 text-[#2e2833]">
        <div className="border border-[#2e2833] bg-white px-5 py-4">
          <div className="flex items-center gap-3">
            <motion.div
              animate={{ rotate: 360 }}
              transition={{ repeat: Infinity, duration: 1.1, ease: 'linear' }}
              className="h-5 w-5 border-2 border-[#5aa7e8] border-t-transparent"
            />
            <span className="text-sm font-semibold sm:text-base">Loading trips...</span>
          </div>
        </div>
      </div>
    );
  }

  return (
    <main className="min-h-screen bg-[#fbfaf7] text-[#2e2833]">
      <div className="border-b border-[#2e2833] bg-[#fffdf9]">
        <div className="mx-auto flex max-w-6xl flex-col gap-4 px-4 py-4 sm:px-6 lg:flex-row lg:items-center lg:justify-between">
          <div className="flex items-center gap-4">
            <Brand href="/" compact className="shrink-0" />
            <div>
              <div className="text-xs font-bold uppercase tracking-[0.22em] text-[#a79aaa]">Dashboard</div>
              <div className="text-lg font-black tracking-tight">Saved trips</div>
            </div>
          </div>

          <div className="flex flex-col gap-2 sm:flex-row">
            <button
              onClick={handleSignOut}
              className="border border-[#2e2833] bg-white px-4 py-3 text-sm font-semibold text-[#2e2833]"
            >
              Sign out
            </button>
            <button
              onClick={() => router.push('/dashboard/onboarding')}
              className="border border-[#2e2833] bg-[#2e2833] px-4 py-3 text-sm font-semibold text-white"
            >
              New trip
            </button>
          </div>
        </div>
      </div>

      <div className="mx-auto max-w-6xl px-4 py-6 sm:px-6 sm:py-8">
        <div className="grid gap-4 border border-[#2e2833] bg-white p-5 sm:p-6 lg:grid-cols-[1.15fr_0.85fr]">
          <div className="space-y-3">
            <div className="inline-flex border border-[#2e2833] bg-[#f6d23c] px-3 py-1 text-[11px] font-bold uppercase tracking-[0.2em]">
              Saved trips
            </div>
            <h1 className="text-3xl font-black tracking-tight sm:text-4xl">My trips</h1>
            <p className="max-w-2xl text-sm leading-7 text-[#756978] sm:text-base">
              {trips.length === 0
                ? 'Create your first trip from a live destination search.'
                : `You have ${trips.length} saved trip${trips.length !== 1 ? 's' : ''}.`}
            </p>
          </div>

          <div className="grid gap-3 sm:grid-cols-3">
            {[
              { label: 'Trips', value: trips.length.toString(), color: '#5aa7e8' },
              { label: 'Storage', value: trips.length > 0 ? 'Live' : 'Empty', color: '#f6d23c' },
              { label: 'Assistant', value: 'Ready', color: '#ff9a45' },
            ].map(card => (
              <div key={card.label} className="border border-[#2e2833] bg-[#fffdf9] p-4">
                <div className="text-[11px] font-semibold uppercase tracking-[0.18em] text-[#a79aaa]">{card.label}</div>
                <div className="mt-2 text-2xl font-black tracking-tight" style={{ color: card.color }}>
                  {card.value}
                </div>
              </div>
            ))}
          </div>
        </div>

        {error && (
          <div className="mt-4 border border-[#a65372] bg-[#fff3f7] px-4 py-3 text-sm font-medium text-[#a65372]">
            {error}
          </div>
        )}

        {trips.length === 0 ? (
          <motion.div
            initial={{ opacity: 0, y: 14 }}
            animate={{ opacity: 1, y: 0 }}
            className="mt-6 border border-[#2e2833] bg-white p-6 text-center sm:p-10"
          >
            <Brand asLink={false} compact className="mx-auto mb-4 justify-center" />
            <h2 className="text-2xl font-black tracking-tight sm:text-3xl">No trips yet</h2>
            <p className="mx-auto mt-3 max-w-xl text-sm leading-7 text-[#756978] sm:text-base">
              Create a trip after connecting your real destination and preferences.
            </p>
            <button
              onClick={() => router.push('/dashboard/onboarding')}
              className="mt-5 border border-[#2e2833] bg-[#2e2833] px-5 py-3 font-semibold text-white"
            >
              Create first trip
            </button>
          </motion.div>
        ) : (
          <div className="mt-6 grid gap-4 md:grid-cols-2 xl:grid-cols-3">
            {trips.map((trip, index) => {
              const estimatedCost = getEstimatedCost(trip.itinerary);

              return (
                <motion.article
                  key={trip.id}
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: index * 0.04 }}
                  className="border border-[#2e2833] bg-white"
                >
                  <div className="border-b border-[#2e2833] bg-[#5aa7e8] p-5 text-white">
                    <div className="inline-flex border border-white bg-[#fbfaf7] px-3 py-1 text-[11px] font-semibold uppercase tracking-[0.18em] text-[#2e2833]">
                      Saved trip
                    </div>
                    <h3 className="mt-4 text-2xl font-black tracking-tight">{trip.destination}</h3>
                    <p className="mt-1 text-sm text-white/90">{trip.duration} days</p>
                  </div>

                  <div className="space-y-4 p-5">
                    <div className="grid gap-3 sm:grid-cols-2">
                      <div className="border border-[#2e2833] bg-[#fffdf9] p-4">
                        <div className="text-[11px] font-semibold uppercase tracking-[0.18em] text-[#a79aaa]">Budget</div>
                        <p className="mt-2 text-sm font-semibold text-[#2e2833]">{trip.budget || 'Not set'}</p>
                      </div>
                      <div className="border border-[#2e2833] bg-[#fffdf9] p-4">
                        <div className="text-[11px] font-semibold uppercase tracking-[0.18em] text-[#a79aaa]">Interests</div>
                        <p className="mt-2 text-sm leading-6 text-[#756978]">
                          {trip.interests.length > 0 ? trip.interests.join(', ') : 'No interests saved'}
                        </p>
                      </div>
                    </div>

                    {estimatedCost && (
                      <div className="border border-[#2e2833] bg-[#fff8e6] p-4">
                        <div className="text-[11px] font-semibold uppercase tracking-[0.18em] text-[#a65372]">Estimated cost</div>
                        <p className="mt-2 text-2xl font-black tracking-tight">${estimatedCost}</p>
                      </div>
                    )}

                    <div className="flex flex-col gap-3 sm:flex-row">
                      <button
                        onClick={() => router.push(`/trip/${trip.id}`)}
                        className="flex-1 border border-[#2e2833] bg-[#2e2833] px-4 py-3 text-sm font-semibold text-white"
                      >
                        View details
                      </button>
                      <button
                        onClick={() => handleDeleteTrip(trip.id)}
                        className="border border-[#2e2833] bg-white px-4 py-3 text-sm font-semibold text-[#a65372]"
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
