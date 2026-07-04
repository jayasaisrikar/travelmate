'use client';

import { use, useCallback, useEffect, useState } from 'react';
import { motion } from 'framer-motion';
import { ArrowLeft, Users, Globe } from 'lucide-react';
import Link from 'next/link';
import { Brand } from '@/components/common/Brand';
import { TravelerCard } from '@/components/social/TravelerCard';
import { DestinationRoomCard } from '@/components/social/DestinationRoomCard';
import { PublishedItinerariesSection } from '@/components/explore/PublishedItinerariesSection';
import {
  listTravelers,
  listTripRooms,
  joinTripRoom,
  type TravelerWithSignal,
  type TripRoom,
} from '@/services/social';

export default function DestinationExplorePage({
  params,
}: {
  params: Promise<{ destination: string }>;
}) {
  const { destination } = use(params);
  const slug = decodeURIComponent(destination);

  const [travelers, setTravelers] = useState<TravelerWithSignal[]>([]);
  const [rooms,     setRooms]     = useState<TripRoom[]>([]);
  const [loading,   setLoading]   = useState(true);
  const [joiningId, setJoiningId] = useState<string | null>(null);
  const [loadError, setLoadError] = useState('');

  // Reconstruct display name from slug
  const displayName = slug.replace(/-/g, ' ').replace(/\b\w/g, c => c.toUpperCase());

  const fetchData = useCallback(async () => {
    setLoading(true);
    setLoadError('');
    try {
      const [t, r] = await Promise.all([
        listTravelers({ destinationSlug: slug, limit: 30 }),
        listTripRooms(slug),
      ]);
      setTravelers(t);
      setRooms(r);
    } catch (err) {
      setLoadError(err instanceof Error ? err.message : 'Failed to load destination community');
    } finally {
      setLoading(false);
    }
  }, [slug]);

  useEffect(() => { fetchData(); }, [fetchData]);

  const handleJoin = async (roomId: string) => {
    setJoiningId(roomId);
    try {
      const result = await joinTripRoom(roomId);
      setRooms(prev =>
        prev.map(r => r.id === roomId
          ? {
            ...r,
            member_count: result.already_joined ? r.member_count : r.member_count + 1,
            is_member: true,
            current_user_role: r.current_user_role ?? 'member',
          }
          : r)
      );
    } catch {
      // no-op
    } finally {
      setJoiningId(null);
    }
  };

  return (
    <div className="min-h-screen bg-[#F9F9FC] text-[#3F3D56]">
      <nav className="sticky top-0 z-40 border-b border-[#DDDCE8] bg-[rgba(249,249,252,0.9)] px-5 py-3 backdrop-blur-xl sm:px-8">
        <div className="mx-auto flex max-w-5xl items-center justify-between gap-4">
          <Brand href="/dashboard" />
          <Link href="/explore" className="flex items-center gap-1.5 text-sm font-semibold text-[#6F6C82] hover:text-[#3F3D56]">
            <ArrowLeft size={15} /> Back to Explore
          </Link>
        </div>
      </nav>

      <main className="mx-auto max-w-5xl px-5 py-10 sm:px-8">
        {/* Header */}
        <div className="mb-8">
          <Link href="/explore" className="mb-4 inline-flex items-center gap-1.5 text-sm text-[#6F6C82] hover:text-[#3F3D56]">
            <ArrowLeft size={14} /> All destinations
          </Link>
          <h1 className="text-4xl font-black tracking-tight text-[#1A1726] sm:text-5xl">
            {displayName}
          </h1>
          <p className="mt-2 text-base text-[#6F6C82]">
            {travelers.length > 0
              ? `${travelers.length} traveler${travelers.length !== 1 ? 's' : ''} are planning a trip here.`
              : 'Be the first to share your trip here.'}
          </p>
        </div>

        {loading ? (
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {[...Array(6)].map((_, i) => (
              <div key={i} className="h-44 animate-pulse rounded-2xl bg-white" />
            ))}
          </div>
        ) : (
          <div className="space-y-10">
            {loadError && (
              <p className="rounded-xl border border-[#C14D72] bg-[#FFF0F4] px-4 py-3 text-sm text-[#C14D72]">
                {loadError}
              </p>
            )}
            {/* Travelers */}
            <section>
              <div className="mb-4 flex items-center gap-2">
                <Users size={18} className="text-[#6C63FF]" />
                <h2 className="text-xl font-black text-[#1A1726]">
                  Travelers ({travelers.length})
                </h2>
              </div>
              {travelers.length > 0 ? (
                <motion.div
                  initial="hidden"
                  animate="visible"
                  variants={{ visible: { transition: { staggerChildren: 0.05 } }, hidden: {} }}
                  className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3"
                >
                  {travelers.map(t => <TravelerCard key={t.signal_id} traveler={t} />)}
                </motion.div>
              ) : (
                <div className="rounded-2xl border border-dashed border-[#DDDCE8] bg-white p-8 text-center text-sm text-[#6F6C82]">
                  No travelers have shared their plans for {displayName} yet.
                </div>
              )}
            </section>

            {/* Trip Rooms */}
            <section>
              <div className="mb-4 flex items-center justify-between gap-2">
                <div className="flex items-center gap-2">
                  <Globe size={18} className="text-[#6C63FF]" />
                  <h2 className="text-xl font-black text-[#1A1726]">
                    Trip Rooms ({rooms.length})
                  </h2>
                </div>
                <Link
                  href={`/explore?tab=rooms&destination=${encodeURIComponent(displayName)}`}
                  className="text-sm font-semibold text-[#6C63FF] hover:underline"
                >
                  + Start a room
                </Link>
              </div>
              {rooms.length > 0 ? (
                <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                  {rooms.map(room => (
                    <DestinationRoomCard
                      key={room.id}
                      room={room}
                      onJoin={handleJoin}
                      joining={joiningId === room.id}
                    />
                  ))}
                </div>
              ) : (
                <div className="rounded-2xl border border-dashed border-[#DDDCE8] bg-white p-8 text-center text-sm text-[#6F6C82]">
                  No open trip rooms for {displayName} yet.
                </div>
              )}
            </section>

            {/* Published Itineraries */}
            <PublishedItinerariesSection slug={slug} />
          </div>
        )}
      </main>
    </div>
  );
}
