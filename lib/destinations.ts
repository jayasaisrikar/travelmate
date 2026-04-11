import { INTERESTS } from '@/lib/constants';
import type { DestinationSearchResult, PointOfInterest } from '@/lib/travel-types';

export function deriveInterestsForDestination(pois: PointOfInterest[]): string[] {
  const derived = new Set<string>();

  for (const poi of pois) {
    const type = poi.type.toLowerCase();

    if (type.includes('museum') || type.includes('gallery') || type.includes('attraction')) {
      derived.add('culture');
    }
    if (type.includes('restaurant') || type.includes('cafe') || type.includes('market')) {
      derived.add('food');
    }
    if (type.includes('beach') || type.includes('park') || type.includes('viewpoint')) {
      derived.add('nature');
    }
    if (type.includes('bar') || type.includes('pub')) {
      derived.add('nightlife');
    }
    if (type.includes('place_of_worship') || type.includes('museum')) {
      derived.add('history');
    }
  }

  return Array.from(derived).filter((interest): interest is (typeof INTERESTS)[number] =>
    INTERESTS.includes(interest as (typeof INTERESTS)[number])
  );
}

export function getInterestsForDestination(pois: PointOfInterest[]): string[] {
  return deriveInterestsForDestination(pois);
}

export function getPopularDestinations(results: DestinationSearchResult[]): DestinationSearchResult[] {
  return [...results]
    .sort((left, right) => (right.importance ?? 0) - (left.importance ?? 0))
    .slice(0, 12);
}

export function searchDestinations(
  results: DestinationSearchResult[],
  query: string
): DestinationSearchResult[] {
  const normalizedQuery = query.trim().toLowerCase();

  if (!normalizedQuery) {
    return getPopularDestinations(results);
  }

  return results.filter((result) => {
    const name = result.name.toLowerCase();
    const address = result.address?.toLowerCase() ?? '';

    return name.includes(normalizedQuery) || address.includes(normalizedQuery);
  });
}
