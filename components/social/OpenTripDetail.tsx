'use client';

import { useCallback, useEffect, useState } from 'react';
import { useParams } from 'next/navigation';
import Link from 'next/link';
import { ArrowLeft, Crown, LoaderCircle, LogOut, MapPin, Users } from 'lucide-react';
import { Brand } from '@/components/common/Brand';
import { MessageButton } from '@/components/social/MessageButton';
import { VerifyToUnlock } from '@/components/social/VerifyToUnlock';
import { useVerificationGate, isVerificationRequiredError } from '@/hooks/useVerificationGate';
import {
  getTripRoom,
  joinTripRoom,
  leaveTripRoom,
  type TripRoom,
  type TripRoomMember,
} from '@/services/social';

type RoomDetails = TripRoom & { members: TripRoomMember[] };

export function OpenTripDetail() {
  const params = useParams<{ id: string }>();
  const roomId = params.id;
  const { isVerified } = useVerificationGate();

  const [room, setRoom] = useState<RoomDetails | null>(null);
  const [loading, setLoading] = useState(true);
  const [action, setAction] = useState('');
  const [error, setError] = useState('');
  const [showVerify, setShowVerify] = useState(false);

  const loadRoom = useCallback(async () => {
    if (!roomId) return;
    setLoading(true);
    setError('');
    try {
      setRoom(await getTripRoom(roomId));
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load room');
    } finally {
      setLoading(false);
    }
  }, [roomId]);

  useEffect(() => {
    void loadRoom();
  }, [loadRoom]);

  const handleJoin = async () => {
    if (!isVerified) {
      setShowVerify(true);
      return;
    }
    setAction('join');
    setError('');
    try {
      await joinTripRoom(roomId);
      await loadRoom();
    } catch (err) {
      if (isVerificationRequiredError(err)) setShowVerify(true);
      else setError(err instanceof Error ? err.message : 'Failed to join room');
    } finally {
      setAction('');
    }
  };

  const handleLeave = async () => {
    setAction('leave');
    setError('');
    try {
      await leaveTripRoom(roomId);
      await loadRoom();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to leave room');
    } finally {
      setAction('');
    }
  };

  const isHost = room?.current_user_role === 'host';

  return (
    <>
      <header className="sticky top-0 z-30 border-b border-[#DDDCE8] bg-white/85 backdrop-blur-md">
        <div className="mx-auto flex max-w-5xl items-center justify-between gap-4 px-5 py-3 sm:px-8">
          <Brand href="/dashboard" />
          <Link
            href="/explore"
            className="inline-flex items-center gap-1.5 rounded-lg text-sm font-semibold text-[#6F6C82] transition hover:text-[#3F3D56] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#6C63FF] focus-visible:ring-offset-2"
          >
            <ArrowLeft size={15} />
            Back to Explore
          </Link>
        </div>
      </header>

      <div className="mx-auto max-w-5xl px-5 py-10 sm:px-8">
        {loading ? (
          <div role="status" aria-live="polite" className="flex items-center gap-2 text-sm font-semibold text-[#6F6C82]">
            <LoaderCircle size={16} className="animate-spin text-[#6C63FF]" />
            Loading room...
          </div>
        ) : !room ? (
          <div role="alert" className="rounded-2xl border border-[#C14D72] bg-[#FFF0F4] p-5 text-sm text-[#C14D72]">
            {error || 'Room not found'}
          </div>
        ) : (
          <>
            <section className="rounded-[28px] border border-[#DDDCE8] bg-white p-6 shadow-sm sm:p-8">
              <div className="flex flex-wrap items-start justify-between gap-4">
                <div>
                  <div className="inline-flex items-center gap-1.5 rounded-full bg-[#F4F3FF] px-3 py-1 text-[11px] font-bold uppercase tracking-wider text-[#6C63FF]">
                    <Users size={12} />
                    Trip room
                  </div>
                  <h1 className="mt-4 text-3xl font-black tracking-tight text-[#1A1726] sm:text-4xl">
                    {room.title ?? `Trip to ${room.destination}`}
                  </h1>
                  <div className="mt-2 flex flex-wrap items-center gap-1.5 text-sm text-[#6F6C82]">
                    <MapPin size={15} />
                    <span>{room.destination}</span>
                    {room.travel_month && <span>· {room.travel_month}</span>}
                  </div>
                </div>

                {room.is_member ? (
                  <button
                    type="button"
                    onClick={() => void handleLeave()}
                    disabled={action === 'leave' || isHost}
                    className="inline-flex items-center gap-1.5 rounded-xl border border-[#DDDCE8] bg-white px-4 py-2.5 text-sm font-semibold text-[#6F6C82] transition hover:bg-[#FFF0F4] hover:text-[#C14D72] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#6C63FF] focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-60"
                  >
                    {action === 'leave' ? (
                      <LoaderCircle size={15} className="animate-spin" />
                    ) : (
                      <LogOut size={15} />
                    )}
                    {isHost ? 'You host this trip' : 'Leave room'}
                  </button>
                ) : (
                  <button
                    type="button"
                    onClick={() => void handleJoin()}
                    disabled={action === 'join' || !room.is_open || room.member_count >= room.max_members}
                    className="rounded-xl bg-[#6C63FF] px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-[#5a52d5] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#6C63FF] focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-60"
                  >
                    {action === 'join' ? 'Joining...' : 'Join room'}
                  </button>
                )}
              </div>

              <p className="mt-5 text-sm text-[#6F6C82]">
                {room.member_count} / {room.max_members} members
              </p>

              {error && (
                <p role="alert" className="mt-4 rounded-xl border border-[#C14D72] bg-[#FFF0F4] px-4 py-3 text-sm text-[#C14D72]">
                  {error}
                </p>
              )}
            </section>

            <section className="mt-6 rounded-[28px] border border-[#DDDCE8] bg-white p-6 shadow-sm">
              <h2 className="text-xl font-black tracking-tight text-[#1A1726]">Room travelers</h2>
              <div className="mt-4 grid gap-3 sm:grid-cols-2">
                {room.members.map(member => (
                  <article key={member.user_id} className="rounded-2xl border border-[#DDDCE8] bg-[#FBFAFF] p-4">
                    <div className="flex items-start justify-between gap-3">
                      <div>
                        <div className="flex items-center gap-1.5">
                          <span className="text-sm font-bold text-[#1A1726]">
                            {member.profile?.display_name ?? 'Traveler'}
                          </span>
                          {member.role === 'host' && <Crown size={14} className="text-[#A07800]" />}
                        </div>
                        <p className="mt-1 text-xs font-semibold uppercase tracking-wider text-[#8A869C]">
                          {member.role}
                        </p>
                      </div>
                      {member.is_self ? (
                        <span className="rounded-full bg-[#F4F3FF] px-2.5 py-1 text-[11px] font-semibold text-[#6C63FF]">You</span>
                      ) : (
                        <MessageButton userId={member.user_id} travelerName={member.profile?.display_name ?? null} />
                      )}
                    </div>
                    {member.profile?.bio && (
                      <p className="mt-3 text-sm leading-5 text-[#6F6C82]">{member.profile.bio}</p>
                    )}
                  </article>
                ))}
                {room.members.length === 0 && (
                  <p className="text-sm text-[#6F6C82]">No travelers yet.</p>
                )}
              </div>
            </section>
          </>
        )}
      </div>

      <VerifyToUnlock open={showVerify} onClose={() => setShowVerify(false)} returnTo={`/rooms/${roomId}`} />
    </>
  );
}
