'use client';

import { useParams } from 'next/navigation';
import { useEffect, useState } from 'react';
import Link from 'next/link';
import { motion } from 'framer-motion';
import { loadTrip } from '@/lib/supabase-trips';

export const dynamicParams = true;

interface Trip {
  id: string;
  destination: string;
  duration: number;
  budget: string;
  interests: string[];
  itinerary: any;
  created_at: string;
}

export default function TripDetailsPage() {
  const params = useParams();
  const tripId = (params?.id || 'unknown') as string;
  const [trip, setTrip] = useState<Trip | null>(null);
  const [loading, setLoading] = useState(true);
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  useEffect(() => {
    if (!mounted) return;

    const fetchTrip = async () => {
      try {
        const tripData = await loadTrip(tripId);
        setTrip(tripData);
      } catch (err) {
        console.error('Error loading trip:', err);
      } finally {
        setLoading(false);
      }
    };

    fetchTrip();
  }, [tripId, mounted]);

  if (!mounted) {
    return null;
  }

  if (loading) {
    return <div className="flex items-center justify-center min-h-screen text-slate-50">Loading trip...</div>;
  }

  if (!trip) {
    return (
      <main className="min-h-screen bg-slate-950 text-slate-50">
        <nav className="border-b border-slate-800 bg-slate-900/50 backdrop-blur">
          <div className="max-w-7xl mx-auto px-6 py-4 flex justify-between items-center">
            <Link href="/" className="flex items-center gap-2 hover:opacity-80 transition">
              <div className="w-6 h-6 bg-gradient-to-br from-blue-500 to-cyan-500 rounded" />
              <span className="font-semibold">TravelMate</span>
            </Link>
          </div>
        </nav>

        <div className="max-w-7xl mx-auto px-6 py-12 text-center">
          <h1 className="text-4xl font-bold mb-4 text-slate-50">Trip Not Found</h1>
          <p className="text-slate-400 mb-8">The trip you're looking for doesn't exist or hasn't been saved yet.</p>
          <Link href="/dashboard" className="inline-block px-6 py-3 bg-blue-600 hover:bg-blue-700 rounded-lg text-white transition">
            Back to Dashboard
          </Link>
        </div>
      </main>
    );
  }

  return (
    <main className="min-h-screen bg-slate-950 text-slate-50">
      <nav className="border-b border-slate-800 bg-slate-900/50 backdrop-blur">
        <div className="max-w-7xl mx-auto px-6 py-4 flex justify-between items-center">
          <Link href="/" className="flex items-center gap-2 hover:opacity-80 transition">
            <div className="w-6 h-6 bg-gradient-to-br from-blue-500 to-cyan-500 rounded" />
            <span className="font-semibold">TravelMate</span>
          </Link>
          <Link href="/dashboard" className="text-slate-400 hover:text-slate-200 transition text-sm">
            ← Back to Trips
          </Link>
        </div>
      </nav>

      <div className="max-w-7xl mx-auto px-6 py-12">
        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="mb-8">
          <h1 className="text-4xl font-bold mb-2 bg-gradient-to-r from-blue-400 to-cyan-400 bg-clip-text text-transparent">
            {trip.destination} Trip
          </h1>
          <p className="text-slate-400">
            {trip.duration} Days • ${trip.itinerary.totalEstimatedCost || trip.itinerary.total_estimated_cost || 'N/A'}
          </p>
        </motion.div>

        {/* Trip Stats */}
        <div className="grid md:grid-cols-3 gap-4 mb-12">
          <div className="bg-slate-800/50 p-6 rounded-lg border border-slate-700">
            <div className="text-slate-400 text-sm mb-1">Destination</div>
            <div className="text-2xl font-bold text-blue-400">{trip.destination}</div>
          </div>
          <div className="bg-slate-800/50 p-6 rounded-lg border border-slate-700">
            <div className="text-slate-400 text-sm mb-1">Duration</div>
            <div className="text-2xl font-bold text-cyan-400">{trip.duration} days</div>
          </div>
          <div className="bg-slate-800/50 p-6 rounded-lg border border-slate-700">
            <div className="text-slate-400 text-sm mb-1">Interests</div>
            <div className="text-lg font-semibold text-slate-200">{trip.interests.slice(0, 2).join(', ')}</div>
          </div>
        </div>

        {/* Daily Plans */}
        <div className="space-y-8">
          <h2 className="text-2xl font-bold">Itinerary</h2>
          {(trip.itinerary.dailyPlans || trip.itinerary.daily_plans)?.map((day: any, idx: number) => (
            <motion.div
              key={idx}
              initial={{ opacity: 0, y: 10 }}
              whileInView={{ opacity: 1, y: 0 }}
              className="border-l-4 border-blue-600 pl-6 py-4"
            >
              <h3 className="text-2xl font-bold mb-1">{day.theme || `Day ${day.day}`}</h3>

              {day.activities && day.activities.length > 0 && (
                <div className="space-y-3 mt-4">
                  {day.activities.map((activity: any, i: number) => (
                    <div key={i} className="bg-slate-800/50 p-4 rounded-lg border border-slate-700 hover:border-blue-500 transition">
                      <div className="flex justify-between items-start">
                        <div>
                          <div className="font-semibold">{activity.time} - {activity.name}</div>
                          <div className="text-sm text-slate-400">{activity.category || 'Activity'}</div>
                        </div>
                        <div className="font-bold text-blue-400">${activity.cost || activity.estimated_cost || 0}</div>
                      </div>
                      {activity.description && <p className="text-sm text-slate-400 mt-2">{activity.description}</p>}
                    </div>
                  ))}
                </div>
              )}
            </motion.div>
          ))}
        </div>
      </div>
    </main>
  );
}
