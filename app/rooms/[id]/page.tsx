'use client';

import { use, useCallback, useEffect, useState } from 'react';
import Link from 'next/link';
import { ArrowLeft, Crown, LoaderCircle, LogOut, MapPin, Users } from 'lucide-react';
import { Brand } from '@/components/common/Brand';
import { MessageButton } from '@/components/social/MessageButton';
import { Button } from '@/components/ui/button';
import { ConfirmDialog } from '@/components/ui/modal';
import { useToast } from '@/components/ui/toast';
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
  const [confirmLeave, setConfirmLeave] = useState(false);
  const toast = useToast();

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
      setConfirmLeave(false);
      toast.success('You left the room.');
      await loadRoom();
    } catch (err) {
      const messageText = err instanceof Error ? err.message : 'Failed to leave room';
      setError(messageText);
      toast.error(messageText);
    } finally {
      setAction('');
    }
  };

  return (
    <main className="min-h-screen bg-background text-foreground">
      <header className="sticky top-0 z-30 border-b-2 border-ink bg-background">
        <div className="mx-auto flex max-w-5xl items-center justify-between gap-4 px-5 py-3 sm:px-8">
          <Brand href="/dashboard" />
          <Link href="/explore" className="inline-flex items-center gap-1.5 text-sm font-bold text-primary hover:underline">
            <ArrowLeft size={15} />
            Back to Explore
          </Link>
        </div>
      </header>

      <div className="mx-auto max-w-5xl px-5 py-10 sm:px-8">
        {loading ? (
          <div className="flex items-center gap-2 text-sm font-semibold text-muted-foreground">
            <LoaderCircle size={16} className="animate-spin text-primary" />
            Loading room...
          </div>
        ) : !room ? (
          <div className="rounded-md border-2 border-destructive bg-destructive/10 px-4 py-3 text-sm font-semibold text-destructive">
            {error || 'Room not found'}
          </div>
        ) : (
          <>
            <section className="rounded-lg border-2 border-ink bg-card p-6 shadow-brutal sm:p-8">
              <div className="flex flex-wrap items-start justify-between gap-4">
                <div>
                  <div className="inline-flex items-center gap-1.5 border-2 border-ink bg-primary px-3 py-1 text-[11px] font-bold uppercase tracking-[0.2em] text-primary-foreground">
                    <Users size={12} />
                    Trip room
                  </div>
                  <h1 className="mt-4 text-headline text-foreground">
                    {room.title ?? `Trip to ${room.destination}`}
                  </h1>
                  <div className="mt-2 flex flex-wrap items-center gap-1.5 text-sm text-muted-foreground">
                    <MapPin size={15} />
                    <span>{room.destination}</span>
                    {room.travel_month && <span>· {room.travel_month}</span>}
                  </div>
                </div>

                {room.is_member ? (
                  <Button
                    type="button"
                    variant="outline"
                    onClick={() => setConfirmLeave(true)}
                    disabled={action === 'leave'}
                  >
                    {action === 'leave' ? <LoaderCircle size={15} className="animate-spin" /> : <LogOut size={15} />}
                    Leave room
                  </Button>
                ) : (
                  <Button
                    type="button"
                    variant="brutal"
                    onClick={() => void handleJoin()}
                    disabled={action === 'join' || !room.is_open || room.member_count >= room.max_members}
                  >
                    {action === 'join' ? 'Joining...' : 'Join room'}
                  </Button>
                )}
              </div>

              <p className="mt-5 text-sm text-muted-foreground">
                {room.member_count} / {room.max_members} members
              </p>

              {error && (
                <p className="mt-4 rounded-md border-2 border-destructive bg-destructive/10 px-4 py-3 text-sm font-semibold text-destructive">
                  {error}
                </p>
              )}
            </section>

            <section className="mt-6 rounded-lg border-2 border-ink bg-card p-6 shadow-brutal">
              <h2 className="text-title text-foreground">Room travelers</h2>
              <div className="mt-4 grid gap-3 sm:grid-cols-2">
                {room.members.map(member => (
                  <article key={member.user_id} className="rounded-md border-2 border-ink bg-muted p-4">
                    <div className="flex items-start justify-between gap-3">
                      <div>
                        <div className="flex items-center gap-1.5">
                          <span className="text-sm font-bold text-foreground">
                            {member.profile?.display_name ?? 'Traveler'}
                          </span>
                          {member.role === 'host' && <Crown size={14} className="text-accent" />}
                        </div>
                        <p className="mt-1 text-[11px] font-bold uppercase tracking-[0.2em] text-muted-foreground">
                          {member.role}
                        </p>
                      </div>
                      {member.is_self ? (
                        <span className="rounded-md border-2 border-ink bg-primary/10 px-2.5 py-1 text-[11px] font-bold text-primary">You</span>
                      ) : (
                        <MessageButton userId={member.user_id} travelerName={member.profile?.display_name ?? null} />
                      )}
                    </div>
                    {member.profile?.bio && (
                      <p className="mt-3 text-sm leading-5 text-muted-foreground">{member.profile.bio}</p>
                    )}
                  </article>
                ))}
              </div>
            </section>
          </>
        )}
      </div>

      <ConfirmDialog
        open={confirmLeave}
        onClose={() => { if (action !== 'leave') setConfirmLeave(false); }}
        onConfirm={() => void handleLeave()}
        title="Leave this room?"
        description="You'll stop receiving updates from this trip room. You can rejoin later if it's still open."
        confirmLabel="Leave room"
        destructive
        loading={action === 'leave'}
      />
    </main>
  );
}
