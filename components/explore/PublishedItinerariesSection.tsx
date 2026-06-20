'use client';

import { useEffect, useState } from 'react';
import { motion } from 'framer-motion';
import Link from 'next/link';
import { BookOpen, Star } from 'lucide-react';
import { getDestinationItineraries, type DestinationItineraries } from '@/lib/discovery-client';

interface PublishedItinerariesSectionProps {
  slug: string;
}

export function PublishedItinerariesSection({ slug }: PublishedItinerariesSectionProps) {
  const [data, setData] = useState<DestinationItineraries | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    let active = true;
    setLoading(true);
    setError('');
    getDestinationItineraries(slug)
      .then(result => { if (active) setData(result); })
      .catch(err => { if (active) setError(err instanceof Error ? err.message : 'Failed to load itineraries'); })
      .finally(() => { if (active) setLoading(false); });
    return () => { active = false; };
  }, [slug]);

  return (
    <section>
      <div className="mb-4 flex items-center justify-between gap-2">
        <div className="flex items-center gap-2">
          <BookOpen size={18} className="text-[#6C63FF]" />
          <h2 className="text-xl font-black text-[#1A1726]">Published itineraries</h2>
        </div>
        {data && data.summary.count > 0 && (
          <div
            className="flex items-center gap-1.5 rounded-full bg-[#FFF8EC] px-3 py-1 text-sm font-bold text-[#1A1726]"
            aria-label={`Average rating ${data.summary.average.toFixed(1)} out of 5 stars from ${data.summary.count} rated ${data.summary.count === 1 ? 'itinerary' : 'itineraries'}`}
          >
            <Star size={14} className="fill-[#FFB020] text-[#FFB020]" aria-hidden="true" />
            <span aria-hidden="true">{data.summary.average.toFixed(1)}</span>
            <span className="font-medium text-[#8A869C]" aria-hidden="true">({data.summary.count})</span>
          </div>
        )}
      </div>

      {loading && (
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {[...Array(3)].map((_, i) => (
            <div key={i} className="h-36 animate-pulse rounded-2xl bg-white" />
          ))}
        </div>
      )}

      {!loading && error && (
        <p className="rounded-xl border border-[#C14D72] bg-[#FFF0F4] px-4 py-3 text-sm text-[#C14D72]">
          {error}
        </p>
      )}

      {!loading && !error && (!data || data.items.length === 0) && (
        <div className="rounded-2xl border border-dashed border-[#DDDCE8] bg-white p-8 text-center text-sm text-[#6F6C82]">
          No published itineraries here yet — be the first to share yours.
        </div>
      )}

      {!loading && !error && data && data.items.length > 0 && (
        <motion.div
          initial="hidden"
          animate="visible"
          variants={{ visible: { transition: { staggerChildren: 0.05 } }, hidden: {} }}
          className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3"
        >
          {data.items.map(item => (
            <motion.div
              key={item.tripId}
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              whileHover={{ y: -2 }}
              transition={{ duration: 0.2 }}
            >
              <Link
                href={`/itinerary/${item.tripId}`}
                aria-label={`View ${item.destination} itinerary by ${item.ownerName ?? 'a Wayflo traveler'}${item.stars != null ? `, rated ${item.stars.toFixed(1)} out of 5` : ', not rated yet'}`}
                className="group flex h-full flex-col rounded-2xl border border-[#DDDCE8] bg-white p-5 shadow-sm transition-all duration-150 ease-out hover:border-[#6C63FF]/40 hover:shadow-md focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#6C63FF] focus-visible:ring-offset-2"
              >
                <div className="flex items-start justify-between gap-3">
                  <p className="truncate font-bold text-[#1A1726]">
                    {item.ownerName ?? 'A Wayflo traveler'}
                  </p>
                  {item.stars != null ? (
                    <span
                      className="flex shrink-0 items-center gap-1 rounded-full bg-[#FFF8EC] px-2 py-0.5 text-xs font-bold text-[#1A1726]"
                      aria-hidden="true"
                    >
                      <Star size={12} className="fill-[#FFB020] text-[#FFB020]" />
                      {item.stars.toFixed(1)}
                    </span>
                  ) : (
                    <span
                      className="shrink-0 rounded-full bg-[#F4F3F4] px-2 py-0.5 text-[11px] font-semibold uppercase tracking-wider text-[#8A869C]"
                      aria-hidden="true"
                    >
                      Not rated yet
                    </span>
                  )}
                </div>

                {item.review ? (
                  <p className="mt-3 line-clamp-3 text-sm text-[#6F6C82]">&ldquo;{item.review}&rdquo;</p>
                ) : (
                  <p className="mt-3 text-sm italic text-[#8A869C]">No review written yet.</p>
                )}

                <span className="mt-auto flex items-center gap-1 pt-4 text-sm font-semibold text-[#6C63FF] transition-transform duration-150 ease-out group-hover:translate-x-0.5">
                  View itinerary <span aria-hidden="true">&rarr;</span>
                </span>
              </Link>
            </motion.div>
          ))}
        </motion.div>
      )}
    </section>
  );
}
