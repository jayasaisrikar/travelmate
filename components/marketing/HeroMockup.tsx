'use client';

import Image from 'next/image';
import { motion } from 'framer-motion';
import { CalendarRange, MapPin, Star, Wallet } from 'lucide-react';
import { EASE } from '@/components/common/motion';

const COVER =
  'https://images.unsplash.com/photo-1585208798174-6cedd86e019a?auto=format&fit=crop&q=80&w=800';
const THUMB =
  'https://images.unsplash.com/photo-1555881400-74d7acaacd8b?auto=format&fit=crop&q=80&w=400';

const days = [
  { day: 'Day 1', place: 'Alfama walk · Miradouro sunset', tone: '#6C63FF' },
  { day: 'Day 2', place: 'Belém · pastéis de nata run', tone: '#FF6584' },
  { day: 'Day 3', place: 'Sintra day trip', tone: '#6C63FF' },
];

/**
 * Photo-led mockup of a Wayflo itinerary for the hero's right column.
 * Decorative (aria-hidden). Entrance only — no looping motion.
 */
export function HeroMockup() {
  return (
    <div aria-hidden className="relative mx-auto h-[460px] w-full max-w-md">
      {/* Soft glow behind the stack */}
      <div className="absolute left-1/2 top-1/2 h-72 w-72 -translate-x-1/2 -translate-y-1/2 rounded-full bg-[radial-gradient(circle,rgba(108,99,255,0.4),transparent_65%)] blur-2xl" />

      {/* Main itinerary card with a real destination photo */}
      <motion.div
        initial={{ opacity: 0, y: 28 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.8, ease: EASE, delay: 0.15 }}
        className="absolute left-1 top-4 w-[310px] overflow-hidden rounded-[26px] border border-white/70 bg-white/90 shadow-[0_30px_70px_rgba(31,29,43,0.34)] backdrop-blur-xl"
      >
        <div className="relative h-36 w-full">
          <Image src={COVER} alt="" fill sizes="310px" className="object-cover" />
          <div className="absolute inset-0 bg-gradient-to-t from-[#1A1726]/80 via-[#1A1726]/10 to-transparent" />
          <div className="absolute bottom-3 left-4 right-4 flex items-end justify-between">
            <div className="flex items-center gap-2 text-white">
              <span className="flex h-8 w-8 items-center justify-center rounded-xl bg-white/20 backdrop-blur">
                <MapPin className="h-4 w-4" />
              </span>
              <div>
                <div className="text-sm font-semibold leading-tight">Lisbon</div>
                <div className="text-[11px] text-white/75">3 nights · 2 travelers</div>
              </div>
            </div>
            <span className="rounded-full bg-white/90 px-2.5 py-1 text-[10px] font-semibold uppercase tracking-wide text-[#6C63FF]">
              Saved
            </span>
          </div>
        </div>

        <div className="space-y-2 p-4">
          {days.map((d, i) => (
            <motion.div
              key={d.day}
              initial={{ opacity: 0, x: -10 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ duration: 0.5, ease: EASE, delay: 0.55 + i * 0.14 }}
              className="flex items-center gap-3 rounded-2xl border border-[#ECEAF6] bg-white px-3 py-2.5"
            >
              <span className="h-8 w-1 rounded-full" style={{ background: d.tone }} />
              <div className="min-w-0">
                <div className="text-[11px] font-semibold uppercase tracking-wide text-[#8C89A0]">{d.day}</div>
                <div className="truncate text-[13px] font-medium text-[#3F3D56]">{d.place}</div>
              </div>
            </motion.div>
          ))}
        </div>
      </motion.div>

      {/* Polaroid-style photo card */}
      <motion.div
        initial={{ opacity: 0, scale: 0.92, rotate: 6 }}
        animate={{ opacity: 1, scale: 1, rotate: 6 }}
        transition={{ duration: 0.7, ease: EASE, delay: 0.5 }}
        className="absolute -right-1 top-1 w-36 rounded-2xl border border-white/80 bg-white p-2 shadow-[0_22px_50px_rgba(31,29,43,0.28)]"
      >
        <div className="relative h-28 w-full overflow-hidden rounded-xl">
          <Image src={THUMB} alt="" fill sizes="144px" className="object-cover" />
        </div>
        <div className="flex items-center gap-1 px-1 pb-0.5 pt-2 text-[11px] font-semibold text-[#3F3D56]">
          <Star className="h-3 w-3 fill-[#FFB020] text-[#FFB020]" />
          Tram 28 · saved spot
        </div>
      </motion.div>

      {/* Trip window chip */}
      <motion.div
        initial={{ opacity: 0, y: 12 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.6, ease: EASE, delay: 0.8 }}
        className="absolute bottom-12 -right-2 rounded-2xl border border-white/70 bg-white/95 px-4 py-3 shadow-[0_18px_40px_rgba(31,29,43,0.22)] backdrop-blur-xl"
      >
        <div className="flex items-center gap-2.5">
          <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-[#FFE3EA] text-[#FF6584]">
            <CalendarRange className="h-4 w-4" />
          </span>
          <div>
            <div className="text-[10px] font-semibold uppercase tracking-wide text-[#8C89A0]">Trip window</div>
            <div className="text-[12px] font-semibold text-[#3F3D56]">Jun 12 — Jun 15</div>
          </div>
        </div>
      </motion.div>

      {/* Budget chip */}
      <motion.div
        initial={{ opacity: 0, y: 12 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.6, ease: EASE, delay: 1 }}
        className="absolute bottom-0 left-4 rounded-2xl border border-white/70 bg-white/95 px-4 py-3 shadow-[0_18px_40px_rgba(31,29,43,0.22)] backdrop-blur-xl"
      >
        <div className="flex items-center gap-2.5">
          <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-[#E6F7EF] text-[#1FA971]">
            <Wallet className="h-4 w-4" />
          </span>
          <div>
            <div className="text-[10px] font-semibold uppercase tracking-wide text-[#8C89A0]">Budget · on track</div>
            <div className="text-[12px] font-semibold text-[#3F3D56]">€840 / €1,000</div>
          </div>
        </div>
      </motion.div>
    </div>
  );
}
