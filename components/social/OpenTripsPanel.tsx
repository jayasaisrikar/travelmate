'use client';

import { useCallback, useEffect, useState } from 'react';
import Link from 'next/link';
import { Compass, Plus, Users } from 'lucide-react';
import { listTripRooms, listMyTripRooms, type TripRoom } from '@/services/social';
import { useVerificationGate } from '@/hooks/useVerificationGate';
import { VerifyToUnlock } from '@/components/social/VerifyToUnlock';
import { CreateOpenTripModal } from '@/components/social/CreateOpenTripModal';

export function OpenTripsPanel() {
  const { isVerified } = useVerificationGate();
  const [rooms, setRooms] = useState<TripRoom[]>([]);
  const [myRoomIds, setMyRoomIds] = useState<Set<string>>(new Set());
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [showCreate, setShowCreate] = useState(false);
  const [showVerify, setShowVerify] = useState(false);

  const load = useCallback(() => {
    setLoading(true);
    setError('');
    Promise.all([listTripRooms(), listMyTripRooms()])
      .then(([all, mine]) => {
        setRooms(all);
        setMyRoomIds(new Set(mine.map((r) => r.id)));
      })
      .catch((e) => setError(e instanceof Error ? e.message : 'Failed to load Open Trips'))
      .finally(() => setLoading(false));
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  function handleCreateClick() {
    if (!isVerified) {
      setShowVerify(true);
      return;
    }
    setShowCreate(true);
  }

  return (
    <section className="rounded-[28px] border border-slate-200 bg-white p-5 shadow-sm sm:p-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <div className="inline-flex items-center gap-2 rounded-full bg-pink-100 px-3 py-1 text-[10px] font-extrabold uppercase tracking-widest text-[#FF6584]">
            <Compass className="h-3 w-3" />
            Open Trips
          </div>
          <h2 className="mt-3 text-xl font-black tracking-tight text-slate-950">Discover and join public trips</h2>
          <p className="mt-1 text-sm leading-6 text-[#6F6C82]">
            Public trips other travelers can join, or start your own.
          </p>
        </div>
        <button
          type="button"
          onClick={handleCreateClick}
          className="inline-flex items-center gap-2 rounded-2xl bg-[#6C63FF] px-4 py-2.5 text-sm font-semibold text-white shadow-sm transition hover:bg-[#5b53e6] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#6C63FF] focus-visible:ring-offset-2"
        >
          <Plus className="h-4 w-4" /> Create
        </button>
      </div>

      <div className="mt-5">
        {loading && (
          <div
            role="status"
            aria-live="polite"
            className="flex h-24 items-center justify-center gap-2 text-sm font-semibold text-[#6F6C82]"
          >
            <Compass className="h-4 w-4 animate-pulse text-[#6C63FF]" />
            Loading Open Trips...
          </div>
        )}

        {!loading && error && (
          <p role="alert" className="rounded-2xl border border-rose-100 bg-rose-50 px-4 py-3 text-sm font-semibold text-rose-600">
            {error}
          </p>
        )}

        {!loading && !error && rooms.length === 0 && (
          <div className="rounded-2xl border border-dashed border-slate-200 p-8 text-center text-sm text-[#6F6C82]">
            No Open Trips yet. Be the first to start one.
          </div>
        )}

        {!loading && !error && rooms.length > 0 && (
          <div className="grid gap-3 sm:grid-cols-2">
            {rooms.map((room) => (
              <Link
                key={room.id}
                href={`/rooms/${room.id}`}
                className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm transition hover:border-[#6C63FF]/40 hover:shadow-md focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#6C63FF] focus-visible:ring-offset-2"
              >
                <div className="flex items-start justify-between gap-2">
                  <div className="text-sm font-semibold text-[#3F3D56]">
                    {room.title ?? `Trip to ${room.destination}`}
                  </div>
                  {myRoomIds.has(room.id) && (
                    <span className="shrink-0 rounded-full bg-[#EEEDFE] px-2 py-0.5 text-[10px] font-bold uppercase tracking-wide text-[#6C63FF]">
                      Joined
                    </span>
                  )}
                </div>
                <div className="mt-1 text-xs text-[#6F6C82]">{room.destination}</div>
                <div className="mt-3 inline-flex items-center gap-1.5 text-xs text-[#6F6C82]">
                  <Users className="h-3.5 w-3.5" />
                  {room.member_count} traveler{room.member_count === 1 ? '' : 's'}
                </div>
              </Link>
            ))}
          </div>
        )}
      </div>

      <CreateOpenTripModal
        open={showCreate}
        onClose={() => setShowCreate(false)}
        onCreated={() => load()}
        onNeedsVerification={() => setShowVerify(true)}
      />
      <VerifyToUnlock open={showVerify} onClose={() => setShowVerify(false)} returnTo="/dashboard/community" />
    </section>
  );
}
