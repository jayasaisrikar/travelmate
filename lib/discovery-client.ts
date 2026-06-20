import type { PublishedItinerary } from '@/services/discovery';

export type DestinationItineraries = {
  items: PublishedItinerary[];
  summary: { average: number; count: number };
};

export async function getDestinationItineraries(slug: string): Promise<DestinationItineraries> {
  const res = await fetch(`/api/explore/${encodeURIComponent(slug)}/itineraries`, { cache: 'no-store' });
  if (!res.ok) throw new Error('Failed to load itineraries');
  return res.json();
}
