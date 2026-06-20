import { NextRequest, NextResponse } from 'next/server';
import { supabase } from '@/services/supabase';
import { rankPublishedItineraries, destinationRatingSummary, type PublishedItinerary } from '@/services/discovery';

export async function GET(_request: NextRequest, { params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;

  const { data: trips, error } = await supabase
    .from('trips')
    .select('id, destination, user_id, published_at')
    .eq('destination_slug', slug)
    .eq('is_published', true)
    .limit(50);
  if (error) return NextResponse.json({ items: [], summary: { average: 0, count: 0 } });

  const tripRows = trips ?? [];
  const tripIds = tripRows.map(t => t.id);
  const ownerIds = [...new Set(tripRows.map(t => t.user_id))];

  const [{ data: ratings }, { data: profiles }] = await Promise.all([
    tripIds.length ? supabase.from('trip_ratings').select('trip_id, stars, review').in('trip_id', tripIds) : Promise.resolve({ data: [] }),
    ownerIds.length ? supabase.from('traveler_profiles').select('id, display_name, avatar_url, is_public').in('id', ownerIds) : Promise.resolve({ data: [] }),
  ]);

  const ratingByTrip = new Map((ratings ?? []).map(r => [r.trip_id, r]));
  const profileById = new Map((profiles ?? []).map(p => [p.id, p]));

  const items: PublishedItinerary[] = tripRows.map(t => {
    const r = ratingByTrip.get(t.id);
    const p = profileById.get(t.user_id);
    const isPublic = p?.is_public ?? false;
    return {
      tripId: t.id,
      destination: t.destination,
      ownerName: isPublic ? (p?.display_name ?? null) : null,
      ownerAvatar: isPublic ? (p?.avatar_url ?? null) : null,
      stars: r?.stars ?? null,
      review: r?.review ?? null,
      publishedAt: t.published_at ?? '',
    };
  });

  return NextResponse.json({ items: rankPublishedItineraries(items), summary: destinationRatingSummary(items) });
}
