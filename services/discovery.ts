export type PublishedItinerary = {
  tripId: string;
  destination: string;
  ownerName: string | null;
  ownerAvatar: string | null;
  stars: number | null;
  review: string | null;
  publishedAt: string;
};

export function rankPublishedItineraries(items: PublishedItinerary[]): PublishedItinerary[] {
  const byRecency = (a: PublishedItinerary, b: PublishedItinerary) => (a.publishedAt < b.publishedAt ? 1 : a.publishedAt > b.publishedAt ? -1 : 0);
  const rated = items.filter(i => i.stars != null).sort((a, b) => (b.stars! - a.stars!) || byRecency(a, b));
  const unrated = items.filter(i => i.stars == null).sort(byRecency);
  return [...rated, ...unrated];
}

export function destinationRatingSummary(items: PublishedItinerary[]): { average: number; count: number } {
  const rated = items.filter(i => i.stars != null);
  if (rated.length === 0) return { average: 0, count: 0 };
  const sum = rated.reduce((acc, i) => acc + (i.stars as number), 0);
  return { average: Math.round((sum / rated.length) * 10) / 10, count: rated.length };
}
