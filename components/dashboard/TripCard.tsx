'use client';

import { motion, useReducedMotion } from 'framer-motion';
import { ArrowRight, CalendarRange, Clock, Globe2, Trash2 } from 'lucide-react';
import { DestinationPhotoCover } from '@/components/common/DestinationPhotoCover';
import { formatCurrency } from '@/lib/utils';
import { getTripStatus, formatTripDateRange, daysUntilStart, type TripStatusTone } from '@/lib/trip-display';
import type { Trip } from '@/lib/supabase-trips';

const TONE: Record<TripStatusTone, { dot: string; pill: string }> = {
  draft: { dot: 'bg-[#8A869C]', pill: 'bg-white/15 text-white ring-1 ring-white/25' },
  upcoming: { dot: 'bg-[#6C63FF]', pill: 'bg-white/90 text-[#4B45C6] ring-1 ring-white/60' },
  live: { dot: 'bg-[#FF6584]', pill: 'bg-[#FF6584] text-white ring-1 ring-white/30' },
  completed: { dot: 'bg-[#1B7A5A]', pill: 'bg-white/90 text-[#1B7A5A] ring-1 ring-white/60' },
};

function budgetLabel(trip: Trip): string {
  if (!trip.budget) return 'Flexible budget';
  const n = Number.parseFloat(trip.budget);
  return Number.isFinite(n) ? formatCurrency(n, trip.itinerary?.currency?.home ?? 'USD') : trip.budget;
}

export function TripCard({
  trip,
  onOpen,
  onDelete,
  deleting = false,
}: {
  trip: Trip;
  onOpen: () => void;
  onDelete: () => void;
  deleting?: boolean;
}) {
  const reduce = useReducedMotion();
  const status = getTripStatus(trip);
  const tone = TONE[status.tone];
  const range = formatTripDateRange(trip);
  const countdown = daysUntilStart(trip);

  return (
    <motion.article
      variants={reduce ? undefined : { hidden: { opacity: 0, y: 16 }, show: { opacity: 1, y: 0 } }}
      whileHover={reduce ? undefined : { y: -4 }}
      transition={{ type: 'spring', stiffness: 300, damping: 26 }}
      className="group flex h-full flex-col overflow-hidden rounded-3xl border border-[#E7E5F0] bg-white shadow-[0_1px_2px_rgba(63,61,86,0.04)] transition-shadow hover:shadow-[0_18px_40px_rgba(108,99,255,0.10)]"
    >
      {/* Cover */}
      <button
        type="button"
        onClick={onOpen}
        aria-label={`Open ${trip.destination} trip`}
        className="relative block h-44 w-full overflow-hidden text-left focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#6C63FF] focus-visible:ring-offset-2"
      >
        <div className="absolute inset-0 transition-transform duration-700 ease-out group-hover:scale-[1.04]">
          <DestinationPhotoCover destination={trip.destination} className="h-full w-full" />
        </div>
        <div className="absolute inset-0 bg-gradient-to-t from-[#26233A]/72 via-[#26233A]/18 to-transparent" />

        <div className="absolute inset-x-4 top-4 flex items-center justify-between gap-2">
          <span className={`inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-[11px] font-semibold backdrop-blur-sm ${tone.pill}`}>
            <span className={`h-1.5 w-1.5 rounded-full ${tone.dot}`} />
            {status.label}
          </span>
          {trip.is_published && (
            <span className="inline-flex items-center gap-1 rounded-full bg-white/90 px-2.5 py-1 text-[11px] font-semibold text-[#4B45C6]" title="Published publicly">
              <Globe2 className="h-3 w-3" /> Public
            </span>
          )}
        </div>

        <div className="absolute inset-x-4 bottom-3.5">
          <div className="text-[11px] font-medium uppercase tracking-[0.16em] text-white/70">Destination</div>
          <h3 className="mt-0.5 truncate text-xl font-semibold tracking-tight text-white">{trip.destination}</h3>
        </div>
      </button>

      {/* Body */}
      <div className="flex flex-1 flex-col p-4 sm:p-5">
        <div className="flex flex-wrap items-center gap-x-3 gap-y-1.5 text-xs text-[#6F6C82]">
          <span className="inline-flex items-center gap-1.5">
            <CalendarRange className="h-3.5 w-3.5 text-[#6C63FF]" />
            {range ?? `${trip.duration || '—'} days · add dates`}
          </span>
          <span className="h-1 w-1 rounded-full bg-[#DDDCE8]" />
          <span className="font-medium tabular-nums text-[#53506A]">{budgetLabel(trip)}</span>
          {countdown != null && (
            <>
              <span className="h-1 w-1 rounded-full bg-[#DDDCE8]" />
              <span className="inline-flex items-center gap-1 font-medium text-[#6C63FF]">
                <Clock className="h-3.5 w-3.5" /> in {countdown} {countdown === 1 ? 'day' : 'days'}
              </span>
            </>
          )}
        </div>

        <div className="mt-4 flex items-center gap-2">
          <button
            type="button"
            onClick={onOpen}
            className="inline-flex flex-1 items-center justify-center gap-1.5 rounded-xl bg-[#6C63FF] px-4 py-2.5 text-sm font-semibold text-white transition-colors hover:bg-[#5b54e7] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#6C63FF] focus-visible:ring-offset-2"
          >
            Open trip <ArrowRight className="h-4 w-4 transition-transform group-hover:translate-x-0.5" />
          </button>
          <button
            type="button"
            onClick={onDelete}
            disabled={deleting}
            aria-label={`Delete ${trip.destination} trip`}
            title="Delete trip"
            className="inline-flex h-10 w-10 items-center justify-center rounded-xl border border-[#E7E5F0] text-[#8A869C] transition-colors hover:border-[#F5B8C8] hover:bg-[#FFF1F5] hover:text-[#C14D72] disabled:opacity-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#C14D72] focus-visible:ring-offset-2"
          >
            {deleting ? (
              <span className="h-4 w-4 animate-spin rounded-full border-2 border-[#C14D72] border-t-transparent" />
            ) : (
              <Trash2 className="h-4 w-4" />
            )}
          </button>
        </div>
      </div>
    </motion.article>
  );
}
