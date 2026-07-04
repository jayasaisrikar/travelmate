'use client';

import { useEffect, useState } from 'react';
import { motion } from 'framer-motion';
import { Users, ArrowRight } from 'lucide-react';
import Link from 'next/link';
import { getCompanionSuggestions, slugifyDestination, type TravelerWithSignal } from '@/services/social';
import { TravelerCard } from '@/components/social/TravelerCard';

interface CompanionStripProps {
  /** Pass the trip destination to anchor the strip */
  destination?: string;
  /** Where the "See all" link goes — defaults to /explore */
  exploreHref?: string;
}

export function CompanionStrip({ destination, exploreHref }: CompanionStripProps) {
  const [travelers, setTravelers] = useState<TravelerWithSignal[]>([]);
  const [loading, setLoading]     = useState(true);

  const slug = destination ? slugifyDestination(destination) : undefined;
  const href = exploreHref ?? (slug ? `/explore/${slug}` : '/explore');

  useEffect(() => {
    let cancelled = false;

    getCompanionSuggestions(4)
      .then(data => { if (!cancelled) setTravelers(data); })
      .catch(() => {})
      .finally(() => { if (!cancelled) setLoading(false); });

    return () => { cancelled = true; };
  }, []);

  // Don't render the strip if there's nothing to show
  if (!loading && travelers.length === 0) return null;

  return (
    <section className="mt-8 rounded-[30px] border border-[#DDDCE8] bg-white p-5 shadow-[0_16px_48px_rgba(46,40,51,0.06)] sm:p-6">
      {/* Header */}
      <div className="flex items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <div className="flex h-9 w-9 items-center justify-center rounded-2xl bg-[#F4F3FF]">
            <Users size={18} className="text-[#6C63FF]" />
          </div>
          <div>
            <div className="text-xs font-bold uppercase tracking-[0.22em] text-[#8A869C]">
              Community
            </div>
            <h2 className="mt-0.5 text-lg font-black tracking-tight text-[#1A1726]">
              {destination
                ? `Travelers going to ${destination}`
                : 'Fellow travelers'}
            </h2>
          </div>
        </div>

        <Link
          href={href}
          className="inline-flex shrink-0 items-center gap-1.5 text-sm font-semibold text-[#6C63FF] hover:underline"
        >
          See all
          <ArrowRight size={15} />
        </Link>
      </div>

      {/* Cards */}
      <div className="mt-4">
        {loading ? (
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
            {[...Array(4)].map((_, i) => (
              <div
                key={i}
                className="h-20 animate-pulse rounded-2xl bg-[#F4F3FF]"
              />
            ))}
          </div>
        ) : (
          <motion.div
            initial="hidden"
            animate="visible"
            variants={{
              visible: { transition: { staggerChildren: 0.06 } },
              hidden:  {},
            }}
            className="grid grid-cols-1 gap-3 sm:grid-cols-2"
          >
            {travelers.map(t => (
              <TravelerCard key={t.signal_id} traveler={t} compact />
            ))}
          </motion.div>
        )}
      </div>

      {/* CTA footer */}
      <div className="mt-4 flex flex-col gap-2 rounded-2xl bg-[#F8F7FF] p-4 sm:flex-row sm:items-center sm:justify-between">
        <p className="text-sm text-[#6F6C82]">
          Plan together, explore smarter.{' '}
          <span className="font-semibold text-[#3F3D56]">Start a trip room</span> and invite companions.
        </p>
        <Link
          href={href}
          className="shrink-0 rounded-xl bg-[#6C63FF] px-4 py-2 text-sm font-semibold text-white transition hover:bg-[#5a52d5]"
        >
          Explore companions
        </Link>
      </div>
    </section>
  );
}
