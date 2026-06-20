import { test, expect } from '@playwright/test';
import { rankPublishedItineraries, destinationRatingSummary, type PublishedItinerary } from '../../services/discovery';

const mk = (o: Partial<PublishedItinerary> & { tripId: string }): PublishedItinerary => ({
  destination: 'Mumbai', ownerName: null, ownerAvatar: null, stars: null, review: null, publishedAt: '2026-06-01T00:00:00Z', ...o,
});

test('rated come before unrated, sorted by stars desc then recency', () => {
  const items = [
    mk({ tripId: 'a', stars: 3, publishedAt: '2026-06-02T00:00:00Z' }),
    mk({ tripId: 'b', stars: null, publishedAt: '2026-06-05T00:00:00Z' }),
    mk({ tripId: 'c', stars: 5, publishedAt: '2026-06-01T00:00:00Z' }),
    mk({ tripId: 'd', stars: 5, publishedAt: '2026-06-03T00:00:00Z' }),
    mk({ tripId: 'e', stars: null, publishedAt: '2026-06-04T00:00:00Z' }),
  ];
  expect(rankPublishedItineraries(items).map(i => i.tripId)).toEqual(['d', 'c', 'a', 'b', 'e']);
});

test('summary averages rated only', () => {
  const items = [mk({ tripId: 'a', stars: 5 }), mk({ tripId: 'b', stars: 4 }), mk({ tripId: 'c', stars: null })];
  expect(destinationRatingSummary(items)).toEqual({ average: 4.5, count: 2 });
  expect(destinationRatingSummary([])).toEqual({ average: 0, count: 0 });
});
