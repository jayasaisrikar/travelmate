'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import { useSearchParams } from 'next/navigation';
import { motion, AnimatePresence } from 'framer-motion';
import { ArrowRight, Compass, Globe, MapPinned, Plus, Search, Sparkles, SlidersHorizontal, Users, X } from 'lucide-react';
import Link from 'next/link';
import { Brand } from '@/components/common/Brand';
import { TravelerCard } from '@/components/social/TravelerCard';
import { DestinationRoomCard } from '@/components/social/DestinationRoomCard';
import {
  listDestinationPulses,
  listTravelers,
  listTripRooms,
  createTripRoom,
  joinTripRoom,
  slugifyDestination,
  type DestinationPulse,
  type TravelerWithSignal,
  type TripRoom,
} from '@/services/social';

type Tab = 'travelers' | 'rooms';
type StyleFilter = 'all' | 'solo' | 'couple' | 'group' | 'flexible';

const TABS: { id: Tab; label: string; icon: React.ElementType }[] = [
  { id: 'travelers', label: 'Travelers',  icon: Users },
  { id: 'rooms',     label: 'Trip Rooms', icon: Globe },
];

const STYLE_FILTERS: { id: StyleFilter; label: string }[] = [
  { id: 'all',      label: 'All styles' },
  { id: 'solo',     label: 'Solo'       },
  { id: 'couple',   label: 'Couple'     },
  { id: 'group',    label: 'Group'      },
  { id: 'flexible', label: 'Flexible'   },
];

export default function ExplorePage() {
  const searchParams = useSearchParams();
  const initialTab = searchParams.get('tab') === 'rooms' ? 'rooms' : 'travelers';
  const initialSearch = searchParams.get('destination') ?? '';

  const [tab,         setTab]         = useState<Tab>(initialTab);
  const [search,      setSearch]      = useState(initialSearch);
  const [styleFilter, setStyleFilter] = useState<StyleFilter>('all');
  const [travelers,   setTravelers]   = useState<TravelerWithSignal[]>([]);
  const [rooms,       setRooms]       = useState<TripRoom[]>([]);
  const [destinations,setDestinations]= useState<DestinationPulse[]>([]);
  const [loading,     setLoading]     = useState(true);
  const [joiningId,   setJoiningId]   = useState<string | null>(null);
  const [showCreate,  setShowCreate]  = useState(false);
  const [newRoomDest, setNewRoomDest] = useState('');
  const [newRoomTitle,setNewRoomTitle]= useState('');
  const [creating,    setCreating]    = useState(false);
  const [createError, setCreateError] = useState('');
  const [loadError,   setLoadError]   = useState('');

  const searchSlug = search.trim() ? slugifyDestination(search.trim()) : undefined;

  const fetchTravelers = useCallback(async () => {
    setLoading(true);
    setLoadError('');
    try {
      const data = await listTravelers({ destinationSlug: searchSlug, limit: 24 });
      setTravelers(data);
    } catch (err) {
      setTravelers([]);
      setLoadError(err instanceof Error ? err.message : 'Failed to load travelers');
    } finally {
      setLoading(false);
    }
  }, [searchSlug]);

  const fetchRooms = useCallback(async () => {
    setLoading(true);
    setLoadError('');
    try {
      const data = await listTripRooms(searchSlug);
      setRooms(data);
    } catch (err) {
      setRooms([]);
      setLoadError(err instanceof Error ? err.message : 'Failed to load trip rooms');
    } finally {
      setLoading(false);
    }
  }, [searchSlug]);

  useEffect(() => {
    let mounted = true;

    listDestinationPulses(6)
      .then(data => {
        if (mounted) {
          setDestinations(data);
        }
      })
      .catch(() => {
        if (mounted) {
          setDestinations([]);
        }
      });

    return () => {
      mounted = false;
    };
  }, []);

  useEffect(() => {
    if (tab === 'travelers') fetchTravelers();
    else fetchRooms();
  }, [tab, fetchTravelers, fetchRooms]);

  // Debounce search
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const handleSearchChange = (value: string) => {
    setSearch(value);
    if (debounceRef.current) clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(() => {
      if (tab === 'travelers') fetchTravelers();
      else fetchRooms();
    }, 400);
  };

  const filteredTravelers = styleFilter === 'all'
    ? travelers
    : travelers.filter(t => t.travel_style === styleFilter);
  const liveRoomCount = destinations.reduce((total, pulse) => total + pulse.room_count, 0);

  const openCreateRoom = () => {
    if (!newRoomDest.trim() && search.trim()) {
      setNewRoomDest(search.trim());
    }

    setCreateError('');
    setShowCreate(true);
  };

  const handleJoinRoom = async (roomId: string) => {
    setJoiningId(roomId);
    try {
      const result = await joinTripRoom(roomId);
      setRooms(prev =>
        prev.map(r =>
          r.id === roomId
            ? {
              ...r,
              member_count: result.already_joined ? r.member_count : r.member_count + 1,
              is_member: true,
              current_user_role: r.current_user_role ?? 'member',
            }
            : r
        )
      );
    } catch {
      // TODO: surface error
    } finally {
      setJoiningId(null);
    }
  };

  const handleCreateRoom = async () => {
    if (!newRoomDest.trim()) {
      setCreateError('Please enter a destination.');
      return;
    }
    setCreating(true);
    setCreateError('');
    try {
      const room = await createTripRoom({
        destination: newRoomDest.trim(),
        title: newRoomTitle.trim() || undefined,
      });
      setRooms(prev => [{ ...room }, ...prev]);
      setShowCreate(false);
      setNewRoomDest('');
      setNewRoomTitle('');
      setTab('rooms');
    } catch (err) {
      setCreateError(err instanceof Error ? err.message : 'Failed to create room');
    } finally {
      setCreating(false);
    }
  };

  return (
    <div className="min-h-screen bg-[#F9F9FC] text-[#3F3D56]">
      {/* ── Nav ─────────────────────────────────────────────── */}
      <nav className="sticky top-0 z-40 border-b border-[#DDDCE8] bg-[rgba(249,249,252,0.9)] px-5 py-3 backdrop-blur-xl sm:px-8">
        <div className="mx-auto flex max-w-6xl items-center justify-between gap-4">
          <Brand href="/dashboard" />
          <div className="flex items-center gap-3">
            <Link
              href="/dashboard"
              className="text-sm font-semibold text-[#6F6C82] hover:text-[#3F3D56]"
            >
              Dashboard
            </Link>
            <Link
              href="/rooms"
              className="text-sm font-semibold text-[#6F6C82] hover:text-[#3F3D56]"
            >
              Rooms
            </Link>
            <Link
              href="/explore"
              className="rounded-xl bg-[#6C63FF] px-4 py-2 text-sm font-semibold text-white shadow-[0_12px_24px_rgba(108,99,255,0.2)]"
            >
              Explore
            </Link>
          </div>
        </div>
      </nav>

      <main className="mx-auto max-w-6xl px-5 py-10 sm:px-8">
        {/* ── Hero header ─────────────────────────────────── */}
        <section className="grid gap-6 lg:grid-cols-[1.08fr_0.92fr] lg:items-end">
          <div className="space-y-5">
            <div className="inline-flex items-center gap-2 rounded-full border border-[#DDDCE8] bg-white px-3 py-1.5 text-xs font-semibold text-[#6C63FF] shadow-sm">
              <Compass size={13} />
              Wayflo Community
            </div>
            <h1 className="max-w-3xl text-4xl font-black tracking-tight text-[#1A1726] sm:text-5xl lg:text-6xl">
              Find your travel
              <span className="block text-[#6C63FF]">companions.</span>
            </h1>
            <p className="max-w-2xl text-base leading-7 text-[#6F6C82] sm:text-lg">
              Discover travelers heading to the same destination, see where the rooms are forming, and keep the whole
              experience privacy-first from the first wave to the shared itinerary.
            </p>

            <div className="flex flex-wrap gap-3">
              <Link
                href="/rooms"
                className="inline-flex items-center gap-2 rounded-xl bg-[#3F3D56] px-5 py-3 text-sm font-semibold text-white transition hover:bg-[#302F43]"
              >
                View your rooms
                <ArrowRight size={15} />
              </Link>
              <button
                type="button"
                onClick={openCreateRoom}
                className="inline-flex items-center gap-2 rounded-xl border border-[#DDDCE8] bg-white px-5 py-3 text-sm font-semibold text-[#3F3D56] transition hover:bg-[#F8F7FF]"
              >
                <Plus size={15} />
                Start a room
              </button>
            </div>

            <div className="grid gap-3 sm:grid-cols-3">
              {[
                { label: 'Traveler pulses', value: destinations.length.toString(), icon: Users },
                { label: 'Trip rooms', value: liveRoomCount.toString(), icon: Globe },
                { label: 'Active filters', value: styleFilter === 'all' ? 'All' : styleFilter, icon: Sparkles },
              ].map(item => {
                const Icon = item.icon;
                return (
                  <div key={item.label} className="rounded-2xl border border-white/80 bg-white p-4 shadow-sm">
                    <div className="flex items-center justify-between gap-2 text-[10px] font-semibold uppercase tracking-[0.18em] text-[#7E7A92]">
                      <span>{item.label}</span>
                      <Icon size={13} className="text-[#6C63FF]" />
                    </div>
                    <div className="mt-3 text-2xl font-black tracking-tight text-[#1A1726]">{item.value}</div>
                  </div>
                );
              })}
            </div>
          </div>

          <motion.div
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.4 }}
            className="overflow-hidden rounded-[30px] border border-white/80 bg-[linear-gradient(135deg,#EEEDFE_0%,#FFFFFF_48%,#FFE9EF_100%)] p-5 shadow-[0_24px_80px_rgba(108,99,255,0.12)] sm:p-6"
          >
            <div className="flex items-center justify-between gap-3">
              <div>
                <div className="text-[10px] font-semibold uppercase tracking-[0.2em] text-[#7E7A92]">
                  Destination pulse
                </div>
                <h2 className="mt-1 text-2xl font-black tracking-tight text-[#1A1726]">
                  Live travel clusters
                </h2>
              </div>
              <div className="rounded-full bg-[#3F3D56] px-3 py-1.5 text-xs font-semibold text-white">
                <MapPinned size={13} className="mr-1 inline" />
                Today
              </div>
            </div>

            <div className="mt-5 grid gap-3">
              {destinations.length > 0 ? (
                destinations.slice(0, 4).map((pulse, index) => (
                  <Link
                    key={pulse.destination_slug}
                    href={`/explore/${pulse.destination_slug}`}
                    className="group rounded-2xl border border-[#E4E2F0] bg-white/90 p-4 transition hover:-translate-y-0.5 hover:shadow-md"
                  >
                    <div className="flex items-start justify-between gap-3">
                      <div className="min-w-0">
                        <p className="truncate text-sm font-bold text-[#1A1726]">{pulse.destination}</p>
                        <p className="mt-1 text-xs text-[#8A869C]">
                          {pulse.traveler_count} traveler{pulse.traveler_count !== 1 ? 's' : ''} going
                          {pulse.room_count > 0 ? ` · ${pulse.room_count} room${pulse.room_count !== 1 ? 's' : ''}` : ''}
                        </p>
                      </div>
                      <span
                        className="flex h-9 w-9 items-center justify-center rounded-2xl text-sm font-black text-white shadow-sm"
                        style={{
                          background:
                            index % 3 === 0
                              ? 'linear-gradient(180deg, #6C63FF 0%, #8B84FF 100%)'
                              : index % 3 === 1
                                ? 'linear-gradient(180deg, #FF6584 0%, #FF8DA5 100%)'
                                : 'linear-gradient(180deg, #3F3D56 0%, #5A5671 100%)',
                        }}
                      >
                        {pulse.destination
                          .split(/\s+/)
                          .filter(Boolean)
                          .slice(0, 2)
                          .map(part => part[0]?.toUpperCase() ?? '')
                          .join('')}
                      </span>
                    </div>

                    <div className="mt-3 flex items-center justify-between gap-2">
                      <div className="flex -space-x-2">
                        {pulse.recent_travelers.map(traveler => (
                          traveler.avatar_url ? (
                            <img
                              key={traveler.id}
                              src={traveler.avatar_url}
                              alt={traveler.display_name ?? 'Traveler'}
                              className="h-7 w-7 rounded-full border-2 border-white object-cover"
                            />
                          ) : (
                            <div
                              key={traveler.id}
                              className="flex h-7 w-7 items-center justify-center rounded-full border-2 border-white bg-gradient-to-br from-[#6C63FF] to-[#FF6584] text-[10px] font-semibold text-white"
                            >
                              {(traveler.display_name ?? '?').slice(0, 1).toUpperCase()}
                            </div>
                          )
                        ))}
                      </div>
                      <span className="text-xs font-semibold text-[#6C63FF] group-hover:underline">
                        Explore
                      </span>
                    </div>

                    {pulse.travel_months.length > 0 && (
                      <div className="mt-3 flex flex-wrap gap-1.5">
                        {pulse.travel_months.map(month => (
                          <span key={month} className="rounded-full bg-[#F4F3FF] px-2.5 py-1 text-[11px] font-semibold text-[#6C63FF]">
                            {month}
                          </span>
                        ))}
                      </div>
                    )}
                  </Link>
                ))
              ) : (
                <div className="rounded-2xl border border-dashed border-[#DDDCE8] bg-white/80 p-5 text-sm leading-6 text-[#6F6C82]">
                  No active destination pulses yet. As more travelers opt in, this area will show the live clusters people
                  are planning around.
                </div>
              )}
            </div>
          </motion.div>
        </section>

        {/* ── Search + filter bar ──────────────────────────── */}
        <div className="mb-6 mt-8 flex flex-col gap-3 sm:flex-row sm:items-center">
          <div className="relative flex-1">
            <Search
              size={16}
              className="pointer-events-none absolute left-3.5 top-1/2 -translate-y-1/2 text-[#8A869C]"
            />
            <input
              type="text"
              placeholder="Search destination…"
              value={search}
              onChange={e => handleSearchChange(e.target.value)}
              className="w-full rounded-xl border border-[#DDDCE8] bg-white py-2.5 pl-9 pr-4 text-sm text-[#3F3D56] outline-none placeholder:text-[#8A869C] focus:border-[#6C63FF] focus:ring-2 focus:ring-[#6C63FF]/20"
            />
            {search && (
              <button
                type="button"
                onClick={() => handleSearchChange('')}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-[#8A869C] hover:text-[#3F3D56]"
              >
                <X size={15} />
              </button>
            )}
          </div>

          <button
            type="button"
            onClick={openCreateRoom}
            className="shrink-0 rounded-xl bg-[#6C63FF] px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-[#5a52d5]"
          >
            + Start a room
          </button>
        </div>

        {/* ── Tabs ────────────────────────────────────────── */}
        <div className="mb-5 flex gap-1 rounded-2xl border border-[#DDDCE8] bg-white p-1 w-fit">
          {TABS.map(t => (
            <button
              key={t.id}
              type="button"
              onClick={() => setTab(t.id)}
              className={`flex items-center gap-2 rounded-xl px-4 py-2 text-sm font-semibold transition-all ${
                tab === t.id
                  ? 'bg-[#6C63FF] text-white shadow-sm'
                  : 'text-[#6F6C82] hover:text-[#3F3D56]'
              }`}
            >
              <t.icon size={15} />
              {t.label}
            </button>
          ))}
        </div>

        {/* ── Style filter (travelers tab only) ───────────── */}
        <AnimatePresence>
          {tab === 'travelers' && (
            <motion.div
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: 'auto' }}
              exit={{ opacity: 0, height: 0 }}
              className="mb-5 flex flex-wrap items-center gap-2"
            >
              <SlidersHorizontal size={14} className="text-[#8A869C]" />
              {STYLE_FILTERS.map(f => (
                <button
                  key={f.id}
                  type="button"
                  onClick={() => setStyleFilter(f.id)}
                  className={`rounded-full px-3 py-1 text-xs font-semibold transition ${
                    styleFilter === f.id
                      ? 'bg-[#3F3D56] text-white'
                      : 'border border-[#DDDCE8] bg-white text-[#6F6C82] hover:border-[#3F3D56]'
                  }`}
                >
                  {f.label}
                </button>
              ))}
            </motion.div>
          )}
        </AnimatePresence>

        {/* ── Content ─────────────────────────────────────── */}
        {loadError && (
          <p className="mb-5 rounded-xl border border-[#C14D72] bg-[#FFF0F4] px-4 py-3 text-sm text-[#C14D72]">
            {loadError}
          </p>
        )}
        {loading ? (
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {[...Array(6)].map((_, i) => (
              <div key={i} className="h-48 animate-pulse rounded-2xl bg-white shadow-sm" />
            ))}
          </div>
        ) : (
          <AnimatePresence mode="wait">
            {tab === 'travelers' ? (
              <motion.div
                key="travelers"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
              >
                {filteredTravelers.length === 0 ? (
                  <EmptyState
                    icon={Users}
                    title={search ? `No travelers found for "${search}"` : 'No travelers yet'}
                    body="Be the first — enable your traveler profile in settings to appear here."
                    cta={{ label: 'Update your profile', href: '/dashboard/community' }}
                  />
                ) : (
                  <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
                    {filteredTravelers.map(t => (
                      <TravelerCard key={t.signal_id} traveler={t} />
                    ))}
                  </div>
                )}
              </motion.div>
            ) : (
              <motion.div
                key="rooms"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
              >
                {rooms.length === 0 ? (
                  <EmptyState
                    icon={Globe}
                    title={search ? `No rooms for "${search}"` : 'No trip rooms yet'}
                    body="Start the first trip room for your destination and invite others to plan together."
                    cta={{ label: 'Start a room', action: openCreateRoom }}
                  />
                ) : (
                  <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                    {rooms.map(room => (
                      <DestinationRoomCard
                        key={room.id}
                        room={room}
                        onJoin={handleJoinRoom}
                        joining={joiningId === room.id}
                      />
                    ))}
                  </div>
                )}
              </motion.div>
            )}
          </AnimatePresence>
        )}
      </main>

      {/* ── Create Room Modal ───────────────────────────────── */}
      <AnimatePresence>
        {showCreate && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 px-4">
            <motion.div
              initial={{ opacity: 0, scale: 0.97, y: 12 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.97, y: 12 }}
              className="w-full max-w-md rounded-2xl border border-[#DDDCE8] bg-white p-6 shadow-[0_30px_80px_rgba(46,40,51,0.22)]"
            >
              <div className="mb-5 flex items-start justify-between">
                <div>
                  <h2 className="text-xl font-black text-[#1A1726]">Start a trip room</h2>
                  <p className="mt-1 text-sm text-[#6F6C82]">
                    Up to 6 travelers can plan together.
                  </p>
                </div>
                <button
                  type="button"
                  onClick={() => { setShowCreate(false); setCreateError(''); }}
                  className="rounded-lg border border-[#DDDCE8] p-1.5 text-[#8A869C] hover:bg-[#F4F3FF]"
                >
                  <X size={16} />
                </button>
              </div>

              <div className="space-y-4">
                <div>
                  <label className="mb-1.5 block text-xs font-bold uppercase tracking-wider text-[#6F6C82]">
                    Destination *
                  </label>
                  <input
                    type="text"
                    placeholder="e.g. Bali, Indonesia"
                    value={newRoomDest}
                    onChange={e => setNewRoomDest(e.target.value)}
                    className="w-full rounded-xl border border-[#DDDCE8] bg-[#FBFAFF] px-4 py-2.5 text-sm text-[#3F3D56] outline-none placeholder:text-[#8A869C] focus:border-[#6C63FF] focus:ring-2 focus:ring-[#6C63FF]/20"
                  />
                </div>

                <div>
                  <label className="mb-1.5 block text-xs font-bold uppercase tracking-wider text-[#6F6C82]">
                    Room title (optional)
                  </label>
                  <input
                    type="text"
                    placeholder="e.g. Week in Ubud — June 2026"
                    value={newRoomTitle}
                    onChange={e => setNewRoomTitle(e.target.value)}
                    className="w-full rounded-xl border border-[#DDDCE8] bg-[#FBFAFF] px-4 py-2.5 text-sm text-[#3F3D56] outline-none placeholder:text-[#8A869C] focus:border-[#6C63FF] focus:ring-2 focus:ring-[#6C63FF]/20"
                  />
                </div>

                {createError && (
                  <p className="rounded-xl border border-[#C14D72] bg-[#FFF0F4] px-4 py-2.5 text-sm text-[#C14D72]">
                    {createError}
                  </p>
                )}

                <div className="flex gap-3 pt-1">
                  <button
                    type="button"
                    onClick={handleCreateRoom}
                    disabled={creating}
                    className="flex-1 rounded-xl bg-[#6C63FF] py-2.5 text-sm font-semibold text-white transition hover:bg-[#5a52d5] disabled:opacity-60"
                  >
                    {creating ? 'Creating…' : 'Create room'}
                  </button>
                  <button
                    type="button"
                    onClick={() => { setShowCreate(false); setCreateError(''); }}
                    className="rounded-xl border border-[#DDDCE8] px-4 py-2.5 text-sm font-semibold text-[#3F3D56]"
                  >
                    Cancel
                  </button>
                </div>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
}

// ── Internal empty state ─────────────────────────────────────────────────────

function EmptyState({
  icon: Icon,
  title,
  body,
  cta,
}: {
  icon: React.ElementType;
  title: string;
  body: string;
  cta?: { label: string; href?: string; action?: () => void };
}) {
  return (
    <div className="flex flex-col items-center py-16 text-center">
      <div className="mb-4 flex h-14 w-14 items-center justify-center rounded-2xl bg-[#F4F3FF]">
        <Icon size={24} className="text-[#6C63FF]" />
      </div>
      <h3 className="text-lg font-bold text-[#1A1726]">{title}</h3>
      <p className="mt-2 max-w-xs text-sm text-[#6F6C82]">{body}</p>
      {cta && (
        <div className="mt-5">
          {cta.href ? (
            <Link
              href={cta.href}
              className="rounded-xl bg-[#6C63FF] px-5 py-2.5 text-sm font-semibold text-white"
            >
              {cta.label}
            </Link>
          ) : (
            <button
              type="button"
              onClick={cta.action}
              className="rounded-xl bg-[#6C63FF] px-5 py-2.5 text-sm font-semibold text-white"
            >
              {cta.label}
            </button>
          )}
        </div>
      )}
    </div>
  );
}
