'use client';

import { use, useCallback, useEffect, useState } from 'react';
import Link from 'next/link';
import { ArrowLeft, Crown, LoaderCircle, LogOut, MapPin, Users } from 'lucide-react';
import { Brand } from '@/components/common/Brand';
import { MessageButton } from '@/components/social/MessageButton';
import {
  getTripRoom,
  joinTripRoom,
  leaveTripRoom,
  type TripRoom,
  type TripRoomMember,
} from '@/services/social';

type RoomDetails = TripRoom & { members: TripRoomMember[] };

export default function RoomPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  const [room, setRoom] = useState<RoomDetails | null>(null);
  const [loading, setLoading] = useState(true);
  const [action, setAction] = useState('');
  const [error, setError] = useState('');

  const loadRoom = useCallback(async () => {
    setLoading(true);
    setError('');
    try {
      setRoom(await getTripRoom(id));
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load room');
    } finally {
      setLoading(false);
    }
  }, [id]);

  useEffect(() => {
    void loadRoom();
  }, [loadRoom]);

  const handleJoin = async () => {
    setAction('join');
    setError('');
    try {
      await joinTripRoom(id);
      await loadRoom();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to join room');
    } finally {
      setAction('');
    }
  };

  const handleLeave = async () => {
    setAction('leave');
    setError('');
    try {
      await leaveTripRoom(id);
      await loadRoom();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to leave room');
    } finally {
      setAction('');
    }
  };

  return (
    <main className="min-h-screen bg-[#fffcf6] text-[#3a2540]">
      <header className="sticky top-0 z-30 border-b border-[#eaddc7] bg-white/85 backdrop-blur-md">
        <div className="mx-auto flex max-w-5xl items-center justify-between gap-4 px-5 py-3 sm:px-8">
          <Brand href="/dashboard" />
          <Link href="/explore" className="inline-flex items-center gap-1.5 text-sm font-semibold text-[#7c6a72] hover:text-[#3a2540]">
            <ArrowLeft size={15} />
            Back to Explore
          </Link>
        </div>
      </header>

      <div className="mx-auto max-w-5xl px-5 py-10 sm:px-8">
        {loading ? (
          <div className="flex items-center gap-2 text-sm font-semibold text-[#7c6a72]">
            <LoaderCircle size={16} className="animate-spin text-[#ea580c]" />
            Loading room...
          </div>
        ) : !room ? (
          <div className="rounded-2xl border border-[#be123c] bg-[#ffe4e6] p-5 text-sm text-[#be123c]">
            {error || 'Room not found'}
          </div>
        ) : (
          <>
            <section className="rounded-[28px] border border-[#eaddc7] bg-white p-6 shadow-sm sm:p-8">
              <div className="flex flex-wrap items-start justify-between gap-4">
                <div>
                  <div className="inline-flex items-center gap-1.5 rounded-full bg-[#fff7ed] px-3 py-1 text-[11px] font-bold uppercase tracking-wider text-[#ea580c]">
                    <Users size={12} />
                    Trip room
                  </div>
                  <h1 className="mt-4 text-3xl font-black tracking-tight text-[#1c1018] sm:text-4xl">
                    {room.title ?? `Trip to ${room.destination}`}
                  </h1>
                  <div className="mt-2 flex flex-wrap items-center gap-1.5 text-sm text-[#7c6a72]">
                    <MapPin size={15} />
                    <span>{room.destination}</span>
                    {room.travel_month && <span>· {room.travel_month}</span>}
                  </div>
                </div>

                {room.is_member ? (
                  <button
                    type="button"
                    onClick={() => void handleLeave()}
                    disabled={action === 'leave'}
                    className="inline-flex items-center gap-1.5 rounded-xl border border-[#eaddc7] bg-white px-4 py-2.5 text-sm font-semibold text-[#7c6a72] transition hover:bg-[#ffe4e6] hover:text-[#be123c] disabled:opacity-60"
                  >
                    {action === 'leave' ? <LoaderCircle size={15} className="animate-spin" /> : <LogOut size={15} />}
                    Leave room
                  </button>
                ) : (
                  <button
                    type="button"
                    onClick={() => void handleJoin()}
                    disabled={action === 'join' || !room.is_open || room.member_count >= room.max_members}
                    className="rounded-xl bg-[#ea580c] px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-[#9a3412] disabled:opacity-60"
                  >
                    {action === 'join' ? 'Joining...' : 'Join room'}
                  </button>
                )}
              </div>

              <p className="mt-5 text-sm text-[#7c6a72]">
                {room.member_count} / {room.max_members} members
              </p>

              {error && (
                <p className="mt-4 rounded-xl border border-[#be123c] bg-[#ffe4e6] px-4 py-3 text-sm text-[#be123c]">
                  {error}
                </p>
              )}
            </section>

            <section className="mt-6 rounded-[28px] border border-[#eaddc7] bg-white p-6 shadow-sm">
              <h2 className="text-xl font-black tracking-tight text-[#1c1018]">Room travelers</h2>
              <div className="mt-4 grid gap-3 sm:grid-cols-2">
                {room.members.map(member => (
                  <article key={member.user_id} className="rounded-2xl border border-[#eaddc7] bg-[#fffbf2] p-4">
                    <div className="flex items-start justify-between gap-3">
                      <div>
                        <div className="flex items-center gap-1.5">
                          <span className="text-sm font-bold text-[#1c1018]">
                            {member.profile?.display_name ?? 'Traveler'}
                          </span>
                          {member.role === 'host' && <Crown size={14} className="text-[#A07800]" />}
                        </div>
                        <p className="mt-1 text-xs font-semibold uppercase tracking-wider text-[#9b8b92]">
                          {member.role}
                        </p>
                      </div>
                      {member.is_self ? (
                        <span className="rounded-full bg-[#fff7ed] px-2.5 py-1 text-[11px] font-semibold text-[#ea580c]">You</span>
                      ) : (
                        <MessageButton userId={member.user_id} travelerName={member.profile?.display_name ?? null} />
                      )}
                    </div>
                    {member.profile?.bio && (
                      <p className="mt-3 text-sm leading-5 text-[#7c6a72]">{member.profile.bio}</p>
                    )}
                  </article>
                ))}
              </div>
            </section>
          </>
        )}
      </div>
    </main>
  );
}
