'use client';

import { motion } from 'framer-motion';
import { Users, MapPin, Lock, Unlock } from 'lucide-react';
import Link from 'next/link';
import type { TripRoom } from '@/services/social';

interface DestinationRoomCardProps {
  room: TripRoom;
  isMember?: boolean;
  onJoin?: (roomId: string) => void;
  joining?: boolean;
}

export function DestinationRoomCard({
  room,
  isMember = room.is_member ?? false,
  onJoin,
  joining = false,
}: DestinationRoomCardProps) {
  const spotsLeft = room.max_members - room.member_count;
  const isFull    = spotsLeft <= 0;

  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      whileHover={{ y: -2 }}
      transition={{ duration: 0.2 }}
      className="flex flex-col rounded-2xl border border-[#eaddc7] bg-white p-5 shadow-sm transition-shadow hover:shadow-md"
    >
      {/* Room title + destination */}
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <p className="truncate font-bold text-[#1c1018]">
            {room.title ?? `Trip to ${room.destination}`}
          </p>
          <div className="mt-1 flex items-center gap-1 text-xs text-[#9b8b92]">
            <MapPin size={11} className="shrink-0" />
            <span>{room.destination}</span>
            {room.travel_month && <span>· {room.travel_month}</span>}
          </div>
        </div>

        {/* Open / closed indicator */}
        <span
          className={`shrink-0 rounded-full px-2.5 py-1 text-[11px] font-bold uppercase tracking-wider ${
            room.is_open && !isFull
              ? 'bg-[#F0FFF8] text-[#1B7A5A]'
              : 'bg-[#f7f1e8] text-[#9b8b92]'
          }`}
        >
          {room.is_open && !isFull ? (
            <span className="flex items-center gap-1"><Unlock size={10} /> Open</span>
          ) : (
            <span className="flex items-center gap-1"><Lock size={10} /> Full</span>
          )}
        </span>
      </div>

      {/* Member count */}
      <div className="mt-3 flex items-center gap-2">
        <div className="flex -space-x-2">
          {[...Array(Math.min(room.member_count, 5))].map((_, i) => (
            <div
              key={i}
              className="h-7 w-7 rounded-full border-2 border-white bg-gradient-to-br from-[#ea580c] to-[#f43f5e]"
              style={{ zIndex: 5 - i }}
            />
          ))}
        </div>
        <span className="text-xs text-[#7c6a72]">
          <span className="font-semibold text-[#3a2540]">{room.member_count}</span>
          {' / '}
          {room.max_members} members
          {!isFull && room.is_open && (
            <span className="text-[#1B7A5A]"> · {spotsLeft} spot{spotsLeft !== 1 ? 's' : ''} left</span>
          )}
        </span>
      </div>

      {/* Actions */}
      <div className="mt-4 flex gap-2">
        <Link
          href={`/rooms/${room.id}`}
          className="flex-1 rounded-xl border border-[#eaddc7] bg-white py-2 text-center text-sm font-semibold text-[#3a2540] transition hover:bg-[#fffbf4]"
        >
          View room
        </Link>

        {!isMember && room.is_open && !isFull && onJoin && (
          <button
            type="button"
            disabled={joining}
            onClick={() => onJoin(room.id)}
            className="flex-1 rounded-xl bg-[#ea580c] py-2 text-sm font-semibold text-white transition hover:bg-[#9a3412] disabled:cursor-not-allowed disabled:opacity-60"
          >
            {joining ? 'Joining…' : 'Join room'}
          </button>
        )}

        {isMember && (
          <span className="flex-1 rounded-xl bg-[#fff7ed] py-2 text-center text-sm font-semibold text-[#ea580c]">
            <Users size={14} className="mr-1.5 inline" />
            Joined
          </span>
        )}
      </div>
    </motion.div>
  );
}
