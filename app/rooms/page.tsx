'use client';

import { useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import { motion } from 'framer-motion';
import { ArrowRight, Compass, LoaderCircle, MapPin, Plus, Sparkles, Users } from 'lucide-react';
import { Brand } from '@/components/common/Brand';
import { DestinationRoomCard } from '@/components/social/DestinationRoomCard';
import { listMyTripRooms, type TripRoom } from '@/services/social';

export default function RoomsPage() {
  const [rooms, setRooms] = useState<TripRoom[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    let mounted = true;

    listMyTripRooms()
      .then(data => {
        if (mounted) {
          setRooms(data);
        }
      })
      .catch(err => {
        if (mounted) {
          setError(err instanceof Error ? err.message : 'Failed to load your rooms');
        }
      })
      .finally(() => {
        if (mounted) {
          setLoading(false);
        }
      });

    return () => {
      mounted = false;
    };
  }, []);

  const stats = useMemo(() => {
    const joined = rooms.filter(room => room.is_member).length;
    const open = rooms.filter(room => room.is_open).length;
    const destinations = new Set(rooms.map(room => room.destination_slug)).size;

    return { joined, open, destinations };
  }, [rooms]);

  return (
    <main className="min-h-screen bg-[#fffcf6] text-[#3a2540]">
      <nav className="sticky top-0 z-40 border-b border-[#eaddc7] bg-[rgba(249,249,252,0.9)] px-4 py-3 backdrop-blur-xl sm:px-8">
        <div className="mx-auto flex max-w-6xl items-center justify-between gap-3">
          <Brand href="/dashboard" compact className="min-w-0 shrink-0 sm:[&_svg]:h-12 sm:[&_svg]:w-12" />
          <div className="flex min-w-0 items-center gap-2 sm:gap-3">
            <Link href="/explore" className="text-sm font-semibold text-[#7c6a72] hover:text-[#3a2540]">
              Explore
            </Link>
            <Link
              href="/dashboard"
              className="rounded-xl border border-[#eaddc7] bg-white px-3 py-2 text-sm font-semibold text-[#3a2540] transition hover:bg-[#fffbf4] sm:px-4"
            >
              Dashboard
            </Link>
          </div>
        </div>
      </nav>

      <div className="mx-auto max-w-6xl px-4 py-8 sm:px-8 sm:py-10">
        <section className="grid gap-6 lg:grid-cols-[1.05fr_0.95fr] lg:items-center">
          <div>
            <div className="inline-flex items-center gap-2 rounded-full border border-[#eaddc7] bg-white px-3 py-1.5 text-xs font-semibold text-[#ea580c] shadow-sm">
              <Sparkles size={13} />
              Your trip rooms
            </div>
            <h1 className="mt-4 max-w-2xl text-4xl font-black leading-[1.04] tracking-tight text-[#1c1018] sm:text-5xl">
              Keep the room that turns a trip into a plan.
            </h1>
            <p className="mt-3 max-w-2xl text-base leading-7 text-[#7c6a72]">
              Trip rooms are the collaborative layer for destination-specific planning. See the rooms you host or joined,
              then jump into the shared route when you want to keep momentum going.
            </p>

            <div className="mt-6 grid gap-3 sm:flex sm:flex-wrap">
              <Link
                href="/explore"
                className="inline-flex items-center justify-center gap-2 rounded-xl bg-[#ea580c] px-5 py-3 text-sm font-semibold text-white shadow-[0_18px_34px_rgba(234,88,12,0.24)] transition hover:bg-[#9a3412]"
              >
                Browse travelers
                <ArrowRight size={15} />
              </Link>
              <Link
                href="/explore"
                className="inline-flex items-center justify-center gap-2 rounded-xl border border-[#eaddc7] bg-white px-5 py-3 text-sm font-semibold text-[#3a2540] transition hover:bg-[#fffbf4]"
              >
                <Plus size={15} />
                Start a room
              </Link>
            </div>
          </div>

          <div className="rounded-[30px] border border-white/80 bg-[linear-gradient(135deg,#ffedd5_0%,#FFFFFF_54%,#ffe4e6_100%)] p-5 shadow-[0_24px_80px_rgba(234,88,12,0.12)] sm:p-6">
            <div className="grid gap-3 sm:grid-cols-3">
              {[
                { label: 'Rooms joined', value: stats.joined.toString(), icon: Users },
                { label: 'Open rooms', value: stats.open.toString(), icon: Compass },
                { label: 'Destinations', value: stats.destinations.toString(), icon: MapPin },
              ].map(item => {
                const Icon = item.icon;

                return (
                  <div key={item.label} className="rounded-2xl border border-[#f0e2d0] bg-white/90 p-4">
                    <div className="flex items-center justify-between">
                      <div className="text-[9px] font-semibold uppercase tracking-[0.12em] text-[#8c7882] sm:text-[10px] sm:tracking-[0.18em]">
                        {item.label}
                      </div>
                      <Icon size={14} className="text-[#ea580c]" />
                    </div>
                    <div className="mt-3 text-3xl font-black tracking-tight text-[#1c1018]">{item.value}</div>
                  </div>
                );
              })}
            </div>
            <div className="mt-4 rounded-2xl bg-[#3a2540] px-4 py-4 text-white">
              <div className="text-[10px] font-semibold uppercase tracking-[0.18em] text-white/60">
                The room loop
              </div>
              <p className="mt-2 text-sm leading-6 text-white/85">
                Join a room, keep the itinerary shared, and use the room as the place where conversations become a route.
              </p>
            </div>
          </div>
        </section>

        <section className="mt-10">
          <div className="mb-4 flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
            <div>
              <h2 className="text-2xl font-black tracking-tight text-[#1c1018]">Your rooms</h2>
              <p className="mt-1 text-sm text-[#7c6a72]">Rooms you host or joined show up here with the latest membership state.</p>
            </div>
            <Link href="/explore" className="text-sm font-semibold text-[#ea580c] hover:underline">
              Explore more rooms
            </Link>
          </div>

          {loading ? (
            <div className="flex items-center gap-2 rounded-2xl border border-[#eaddc7] bg-white px-4 py-5 text-sm font-semibold text-[#7c6a72]">
              <LoaderCircle size={16} className="animate-spin text-[#ea580c]" />
              Loading your rooms...
            </div>
          ) : error ? (
            <p className="rounded-2xl border border-[#be123c] bg-[#ffe4e6] px-4 py-3 text-sm text-[#be123c]">
              {error}
            </p>
          ) : rooms.length === 0 ? (
            <div className="rounded-[28px] border border-dashed border-[#eaddc7] bg-white p-6 text-center sm:p-8">
              <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl bg-[#fff7ed]">
                <Users size={24} className="text-[#ea580c]" />
              </div>
              <h3 className="mt-4 text-xl font-black text-[#1c1018]">No rooms yet</h3>
              <p className="mx-auto mt-2 max-w-lg text-sm leading-6 text-[#7c6a72]">
                Start from Explore when you find a destination with good overlap, then come back here to keep that room organized.
              </p>
              <Link
                href="/explore"
                className="mt-5 inline-flex items-center gap-2 rounded-xl bg-[#ea580c] px-5 py-3 text-sm font-semibold text-white transition hover:bg-[#9a3412]"
              >
                Open Explore
                <ArrowRight size={15} />
              </Link>
            </div>
          ) : (
            <motion.div
              initial="hidden"
              animate="visible"
              variants={{ hidden: {}, visible: { transition: { staggerChildren: 0.05 } } }}
              className="grid grid-cols-1 gap-4 sm:grid-cols-2"
            >
              {rooms.map(room => (
                <DestinationRoomCard key={room.id} room={room} />
              ))}
            </motion.div>
          )}
        </section>
      </div>
    </main>
  );
}
