'use client';

import { motion } from 'framer-motion';
import { Plane, Compass } from 'lucide-react';
import { DestinationPhotoCover } from '@/components/common/DestinationPhotoCover';

/**
 * Trip card rendered as a boarding-pass ticket artifact — a destination "stamp"
 * photo header, a perforated divider with punched notches, a flight-style field
 * grid, a CSS barcode, and ticket actions. The notch fill matches the dashboard
 * page background so the punches read as cut-outs.
 */

const PAGE_BG = '#fbf6ef'; // dashboard background -> notch cut-out color

function initials(destination: string) {
  return (
    destination
      .split(/\s+/)
      .filter(Boolean)
      .slice(0, 2)
      .map(p => p[0]?.toUpperCase() ?? '')
      .join('') || 'TR'
  );
}

export function TripTicketCard({
  destination,
  durationLabel,
  budget,
  savedLabel,
  deleting,
  onOpen,
  onNew,
  onDelete,
}: {
  destination: string;
  durationLabel: string;
  budget: string;
  savedLabel: string;
  deleting: boolean;
  onOpen: () => void;
  onNew: () => void;
  onDelete: () => void;
}) {
  return (
    <motion.article
      initial={{ opacity: 0, y: 16 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.35 }}
      whileHover={{ y: -4 }}
      className="group relative flex h-full flex-col rounded-[24px] bg-white shadow-[0_18px_44px_-16px_rgba(58,37,64,0.35)] ring-1 ring-[#eaddc7]"
    >
      {/* ── destination stamp header ─────────────── */}
      <div className="relative h-36 overflow-hidden rounded-t-[24px]">
        <div className="absolute inset-0 scale-105 transition-transform duration-700 group-hover:scale-110">
          <DestinationPhotoCover destination={destination} className="h-full w-full" />
        </div>
        <div className="absolute inset-0 bg-gradient-to-t from-[#3a2540]/95 via-[#3a2540]/45 to-transparent" />

        <div className="relative flex h-full flex-col justify-between p-4 text-white">
          <div className="flex items-center justify-between">
            <span className="inline-flex items-center gap-1.5 rounded-md bg-white/15 px-2 py-1 text-[9px] font-black uppercase tracking-[0.18em] backdrop-blur-md">
              <Plane className="h-3 w-3 -rotate-45" /> Wayflo · Boarding
            </span>
            <span className="-rotate-6 rounded-md border-2 border-dashed border-white/50 px-2 py-0.5 text-[9px] font-black uppercase tracking-[0.16em]">
              {durationLabel}
            </span>
          </div>

          <div className="flex items-end gap-3">
            <span className="flex h-11 w-11 items-center justify-center rounded-xl bg-white text-base font-black text-[#ea580c] shadow-lg">
              {initials(destination)}
            </span>
            <div className="min-w-0">
              <div className="text-[9px] font-bold uppercase tracking-[0.22em] text-[#fdba74]">Destination</div>
              <h3 className="truncate text-xl font-black leading-tight tracking-tight drop-shadow">{destination}</h3>
            </div>
          </div>
        </div>
      </div>

      {/* ── perforation ──────────────────────────── */}
      <div className="relative h-0">
        <div className="absolute inset-x-5 top-0 border-t-2 border-dashed border-[#eaddc7]" aria-hidden />
        <span className="absolute -left-3 -top-3 h-6 w-6 rounded-full" style={{ background: PAGE_BG }} aria-hidden />
        <span className="absolute -right-3 -top-3 h-6 w-6 rounded-full" style={{ background: PAGE_BG }} aria-hidden />
      </div>

      {/* ── ticket body ──────────────────────────── */}
      <div className="flex flex-1 flex-col p-5 pt-6">
        <div className="grid grid-cols-3 gap-2">
          {[
            ['Flight', durationLabel],
            ['Class', budget || 'Custom'],
            ['Issued', savedLabel],
          ].map(([label, value]) => (
            <div key={label}>
              <div className="text-[9px] font-bold uppercase tracking-[0.14em] text-[#9b8b92]">{label}</div>
              <div className="mt-1 truncate text-[13px] font-extrabold text-[#3a2540]">{value}</div>
            </div>
          ))}
        </div>

        {/* barcode */}
        <div className="mt-4 flex h-8 items-stretch gap-[2px] overflow-hidden opacity-80" aria-hidden>
          {[2, 1, 3, 1, 1, 2, 3, 1, 2, 1, 3, 2, 1, 1, 2, 3, 1, 2, 1, 3, 2, 1].map((w, i) => (
            <span key={i} className="block bg-[#3a2540]" style={{ width: w, opacity: i % 4 === 0 ? 0.5 : 1 }} />
          ))}
        </div>

        <div className="mt-5 flex items-center gap-2">
          <button
            onClick={onOpen}
            className="bg-sunset shadow-sunset flex flex-1 items-center justify-center gap-1.5 rounded-xl px-4 py-3 text-xs font-black text-white transition hover:brightness-105"
          >
            <Compass className="h-4 w-4" />
            Open trip
          </button>
          <button
            onClick={onNew}
            className="rounded-xl border border-[#eaddc7] bg-white px-4 py-3 text-xs font-bold text-[#5b4a55] shadow-sm transition hover:bg-[#fff7ed]"
          >
            New
          </button>
          <button
            onClick={onDelete}
            disabled={deleting}
            className="rounded-xl border border-rose-100 bg-rose-50 px-4 py-3 text-xs font-black text-rose-600 transition hover:bg-rose-100 disabled:opacity-50"
          >
            {deleting ? '…' : 'Del'}
          </button>
        </div>
      </div>
    </motion.article>
  );
}
