'use client';

import { motion } from 'framer-motion';
import { Plane, MapPin } from 'lucide-react';

/**
 * Boarding-pass hero visual — a real travel-metaphor UI element (not a generic
 * card). A main body with flight-style fields + a dashed route line, joined to a
 * tear-off stub by a perforated edge with punched notches and a CSS barcode.
 */

const FIELDS: Array<{ label: string; value: string }> = [
  { label: 'Depart', value: 'Jun 14' },
  { label: 'Return', value: 'Jun 21' },
  { label: 'Budget', value: 'Comfort' },
  { label: 'Pace', value: 'Balanced' },
];

// cream punch-hole color = page background, so notches read as cut-outs
const NOTCH = '#fbf2e6';

export function BoardingPass() {
  return (
    <motion.div
      initial={{ opacity: 0, y: 24, rotate: -1.5 }}
      whileInView={{ opacity: 1, y: 0, rotate: 0 }}
      viewport={{ once: true }}
      transition={{ duration: 0.5, ease: [0.22, 1, 0.36, 1] }}
      whileHover={{ y: -6, rotate: -0.6 }}
      className="relative mx-auto w-full max-w-md select-none"
    >
      {/* glow */}
      <div className="bg-sunset absolute -inset-3 -z-10 rounded-[34px] opacity-25 blur-2xl" />

      <div className="grid grid-cols-[1fr_auto] overflow-hidden rounded-[28px] bg-white shadow-[0_30px_80px_-20px_rgba(58,37,64,0.4)] ring-1 ring-[#eaddc7]">
        {/* ── main body ─────────────────────────────── */}
        <div className="p-6 sm:p-7">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <span className="bg-sunset flex h-7 w-7 items-center justify-center rounded-lg text-white">
                <Plane className="h-4 w-4 -rotate-45" />
              </span>
              <span className="text-sm font-black uppercase tracking-[0.2em] text-[#3a2540]">Wayflo</span>
            </div>
            <span className="text-[10px] font-bold uppercase tracking-[0.22em] text-[#ea580c]">
              Boarding pass
            </span>
          </div>

          {/* route: FROM -> TO with animated plane along a dashed line */}
          <div className="mt-7 flex items-end justify-between gap-3">
            <div>
              <div className="text-[10px] font-bold uppercase tracking-[0.2em] text-[#9b8b92]">From</div>
              <div className="mt-1 text-3xl font-black leading-none tracking-tight text-[#3a2540]">SFO</div>
              <div className="mt-1 text-[11px] font-medium text-[#7c6a72]">Your city</div>
            </div>

            <div className="relative mb-2 flex-1">
              <div className="route-line h-0.5 w-full opacity-70" />
              <motion.span
                aria-hidden
                initial={{ left: '0%' }}
                whileInView={{ left: '100%' }}
                viewport={{ once: true }}
                transition={{ duration: 1.1, delay: 0.3, ease: 'easeInOut' }}
                className="absolute -top-2 text-[#ea580c]"
                style={{ transform: 'translateX(-50%)' }}
              >
                <Plane className="h-4 w-4 rotate-45" />
              </motion.span>
            </div>

            <div className="text-right">
              <div className="text-[10px] font-bold uppercase tracking-[0.2em] text-[#9b8b92]">To</div>
              <div className="text-sunset mt-1 text-3xl font-black leading-none tracking-tight">DPS</div>
              <div className="mt-1 inline-flex items-center gap-1 text-[11px] font-medium text-[#7c6a72]">
                <MapPin className="h-3 w-3 text-[#f43f5e]" /> Bali
              </div>
            </div>
          </div>

          {/* flight-style field grid */}
          <div className="mt-7 grid grid-cols-4 gap-2 border-t border-dashed border-[#eaddc7] pt-5">
            {FIELDS.map(f => (
              <div key={f.label}>
                <div className="text-[9px] font-bold uppercase tracking-[0.14em] text-[#9b8b92]">{f.label}</div>
                <div className="mt-1 text-sm font-extrabold text-[#3a2540]">{f.value}</div>
              </div>
            ))}
          </div>
        </div>

        {/* ── perforation + tear-off stub ───────────── */}
        <div className="relative w-px bg-transparent">
          <div
            className="absolute inset-y-3 left-1/2 -translate-x-1/2 border-l-2 border-dashed border-[#eaddc7]"
            aria-hidden
          />
          <div
            className="absolute -top-3 left-1/2 h-6 w-6 -translate-x-1/2 rounded-full"
            style={{ background: NOTCH }}
            aria-hidden
          />
          <div
            className="absolute -bottom-3 left-1/2 h-6 w-6 -translate-x-1/2 rounded-full"
            style={{ background: NOTCH }}
            aria-hidden
          />
        </div>

        <div className="bg-sunset-soft col-start-2 flex flex-col items-center justify-between p-5 text-center">
          <div className="text-[9px] font-bold uppercase tracking-[0.2em] text-[#9b8b92]">Seat</div>
          <div className="text-2xl font-black tracking-tight text-[#3a2540]">14A</div>
          {/* CSS barcode */}
          <div className="flex h-12 items-stretch gap-[2px]" aria-hidden>
            {[2, 1, 3, 1, 2, 1, 1, 3, 2, 1, 2, 3, 1, 2].map((w, i) => (
              <span
                key={i}
                className="block bg-[#3a2540]"
                style={{ width: w, opacity: i % 3 === 0 ? 0.55 : 1 }}
              />
            ))}
          </div>
          <div className="text-[9px] font-bold uppercase tracking-[0.2em] text-[#ea580c]">Boarding</div>
        </div>
      </div>
    </motion.div>
  );
}
