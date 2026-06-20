import type { Metadata } from 'next';
import { notFound } from 'next/navigation';
import { Star } from 'lucide-react';
import { PublicTripShare } from '@/components/trip/PublicTripShare';
import { supabase } from '@/services/supabase';
import type { TripRow } from '@/services/trip-sharing';

async function loadPublished(id: string) {
  const { data: trip } = await supabase
    .from('trips').select('*').eq('id', id).eq('is_published', true).maybeSingle();
  if (!trip) return null;
  const [{ data: profile }, { data: rating }] = await Promise.all([
    supabase.from('traveler_profiles').select('display_name, avatar_url, is_public').eq('id', trip.user_id).maybeSingle(),
    supabase.from('trip_ratings').select('stars, review').eq('trip_id', id).eq('user_id', trip.user_id).maybeSingle(),
  ]);
  return { trip: trip as TripRow, profile, rating };
}

export async function generateMetadata({ params }: { params: Promise<{ id: string }> }): Promise<Metadata> {
  const { id } = await params;
  const data = await loadPublished(id);
  if (!data) return { title: 'Itinerary not found | wayflo' };
  return {
    title: `${data.trip.destination} itinerary | wayflo`,
    description: `A published ${data.trip.duration}-day ${data.trip.destination} itinerary on Wayflo.`,
  };
}

export default async function PublicItineraryPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const data = await loadPublished(id);
  if (!data) notFound();

  const isPublic = data.profile?.is_public ?? false;
  const ownerName = isPublic ? (data.profile?.display_name ?? null) : null;
  const stars = data.rating?.stars ?? null;

  return (
    <main className="min-h-screen bg-[#F8FAFC] text-[#3F3D56]">
      <div className="mx-auto max-w-3xl px-4 py-6 sm:px-6">
        {(ownerName || stars != null) && (
          <div className="mb-4 flex items-center justify-between rounded-2xl border border-[#E4E2F0] bg-white p-4">
            <div className="text-sm text-[#6F6C82]">{ownerName ? `Planned by ${ownerName}` : 'A Wayflo traveler'}</div>
            {stars != null && (
              <div className="flex items-center gap-1 text-sm font-semibold text-[#3F3D56]" aria-label={`${stars} out of 5 stars`}>
                <Star className="h-4 w-4 fill-[#FFB020] text-[#FFB020]" /> {stars.toFixed(1)}
              </div>
            )}
          </div>
        )}
        {stars != null && data.rating?.review && (
          <blockquote className="mb-4 rounded-2xl border border-[#E4E2F0] bg-white p-4 text-sm italic text-[#53506A]">&ldquo;{data.rating.review}&rdquo;</blockquote>
        )}
      </div>
      <PublicTripShare
        variant="public"
        shareToken=""
        shareUrl=""
        shareBadge="A published itinerary on wayflo"
        shareTitle={`${data.trip.destination} itinerary`}
        shareDescription={`A ${data.trip.duration}-day plan for ${data.trip.destination}.`}
        suggestionsCount={0}
        trip={data.trip}
      />
    </main>
  );
}
