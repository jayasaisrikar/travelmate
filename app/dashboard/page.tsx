'use client';

import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { deleteTrip } from '@/lib/supabase-trips';

interface Trip {
  id: string;
  destination: string;
  duration: number;
  budget: string;
  interests: string[];
  itinerary: any;
  created_at: string;
}

export default function DashboardPage() {
  const router = useRouter();
  const [trips, setTrips] = useState<Trip[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // Load trips from localStorage only on client
    if (typeof window !== 'undefined') {
      try {
        const trips: Trip[] = []
        for (let i = 0; i < localStorage.length; i++) {
          const key = localStorage.key(i)
          if (key?.startsWith('trip-')) {
            const stored = localStorage.getItem(key)
            if (stored) {
              trips.push(JSON.parse(stored))
            }
          }
        }
        setTrips(trips.sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime()))
      } catch (err) {
        console.error('Error loading trips:', err)
      } finally {
        setLoading(false)
      }
    }
  }, []);

  const handleDeleteTrip = async (id: string) => {
    await deleteTrip(id);
    setTrips(trips.filter(t => t.id !== id));
  };

  if (loading) {
    return <div className="flex items-center justify-center min-h-screen">Loading...</div>;
  }

  return (
    <main className="min-h-screen bg-white text-slate-900">
      <nav className="border-b border-slate-200">
        <div className="max-w-6xl mx-auto px-6 py-4 flex justify-between items-center">
          <Link href="/" className="flex items-center gap-2">
            <div className="w-6 h-6 bg-gradient-to-br from-blue-600 to-blue-700 rounded" />
            <span className="font-semibold">TravelMate</span>
          </Link>
          <button
            onClick={() => router.push('/dashboard/onboarding')}
            className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition text-sm"
          >
            New Trip
          </button>
        </div>
      </nav>

      <div className="max-w-6xl mx-auto px-6 py-12">
        <h1 className="text-5xl font-bold mb-2">My Trips</h1>
        <p className="text-xl text-slate-600 mb-12">
          {trips.length === 0 ? 'Create your first trip' : `You have ${trips.length} saved trip${trips.length !== 1 ? 's' : ''}`}
        </p>

        {trips.length === 0 ? (
          <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="text-center py-20">
            <h2 className="text-3xl font-bold mb-4">No trips yet</h2>
            <p className="text-slate-600 mb-8">Start planning your next adventure!</p>
            <button
              onClick={() => router.push('/dashboard/onboarding')}
              className="px-8 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition font-medium"
            >
              Create First Trip
            </button>
          </motion.div>
        ) : (
          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
            {trips.map((trip, idx) => (
              <motion.div
                key={trip.id}
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: idx * 0.05 }}
                className="bg-slate-50 rounded-lg border border-slate-200 overflow-hidden hover:shadow-lg transition"
              >
                <div className="bg-gradient-to-br from-blue-600 to-blue-700 p-6 text-white">
                  <h3 className="text-2xl font-bold">{trip.destination}</h3>
                  <p className="text-blue-100">{trip.duration} days</p>
                </div>
                
                <div className="p-6">
                  <div className="space-y-3 mb-6">
                    <div>
                      <span className="text-xs text-slate-500 uppercase font-semibold">Budget Level</span>
                      <p className="text-slate-900 font-medium">{trip.budget}</p>
                    </div>
                    <div>
                      <span className="text-xs text-slate-500 uppercase font-semibold">Interests</span>
                      <p className="text-slate-600 text-sm">{trip.interests.slice(0, 3).join(', ')}{trip.interests.length > 3 ? '...' : ''}</p>
                    </div>
                    <div>
                      <span className="text-xs text-slate-500 uppercase font-semibold">Estimated Cost</span>
                      <p className="text-slate-900 font-bold text-lg">${trip.itinerary.total_estimated_cost}</p>
                    </div>
                  </div>

                  <div className="flex gap-2">
                    <button
                      onClick={() => router.push(`/trip/${trip.id}`)}
                      className="flex-1 px-3 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition text-sm font-medium"
                    >
                      View Details
                    </button>
                    <button
                      onClick={() => handleDeleteTrip(trip.id)}
                      className="px-3 py-2 border border-red-300 text-red-600 rounded-lg hover:bg-red-50 transition text-sm font-medium"
                    >
                      Delete
                    </button>
                  </div>
                </div>
              </motion.div>
            ))}
          </div>
        )}
      </div>
    </main>
  );
}
