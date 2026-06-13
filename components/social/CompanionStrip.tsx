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
  const [error, setError]         = useState(false);

  const slug = destination ? slugifyDestination(destination) : undefined;
  const href = exploreHref ?? (slug ? `/explore/${slug}` : '/explore');

  useEffect(() => {
    let cancelled = false;

    getCompanionSuggestions(4)
      .then(data => { if (!cancelled) setTravelers(data); })
      .catch(() => { if (!cancelled) setError(true); })
      .finally(() => { if (!cancelled) setLoading(false); });

    return () => { cancelled = true; };
  }, []);

  // Nothing to show and no error → stay out of the way.
  if (!loading && !error && travelers.length === 0) return null;

  return (
    <section className="mt-8 rounded-lg border-2 border-ink bg-card p-5 shadow-brutal sm:p-6">
      {/* Header */}
      <div className="flex items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <div className="flex h-9 w-9 items-center justify-center border-2 border-ink bg-primary text-primary-foreground">
            <Users size={18} />
          </div>
          <div>
            <div className="text-[11px] font-bold uppercase tracking-[0.2em] text-muted-foreground">
              Community
            </div>
            <h2 className="mt-0.5 text-title text-foreground">
              {destination
                ? `Travelers going to ${destination}`
                : 'Fellow travelers'}
            </h2>
          </div>
        </div>

        <Link
          href={href}
          className="inline-flex shrink-0 items-center gap-1.5 text-sm font-bold text-primary hover:underline"
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
                className="h-20 animate-pulse rounded-md bg-muted"
              />
            ))}
          </div>
        ) : error ? (
          <div
            role="status"
            className="rounded-md border-2 border-destructive bg-destructive/10 px-4 py-5 text-center text-sm font-semibold text-destructive"
          >
            Couldn’t load travelers right now. Please try again later.
          </div>
        ) : travelers.length === 0 ? (
          <div className="rounded-md border-2 border-ink bg-muted px-4 py-5 text-center text-sm text-muted-foreground">
            No travelers to show yet — check back soon.
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
      <div className="mt-4 flex flex-col gap-2 rounded-md border-2 border-ink bg-secondary p-4 text-secondary-foreground sm:flex-row sm:items-center sm:justify-between">
        <p className="text-sm text-secondary-foreground/70">
          Plan together, explore smarter.{' '}
          <span className="font-bold text-secondary-foreground">Start a trip room</span> and invite companions.
        </p>
        <Link
          href={href}
          className="shrink-0 rounded-md border-2 border-ink bg-accent px-4 py-2 text-sm font-bold text-accent-foreground shadow-brutal transition-all hover:-translate-y-0.5 hover:shadow-brutal-lg active:translate-x-[2px] active:translate-y-[2px] active:shadow-none"
        >
          Explore companions
        </Link>
      </div>
    </section>
  );
}
