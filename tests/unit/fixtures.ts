import type {
  DestinationSearchResult,
  ItineraryDayPlan,
  PointOfInterest,
} from '@/lib/travel-types';

export const TIRUPATI: DestinationSearchResult = {
  name: 'Tirupati',
  latitude: 13.6288,
  longitude: 79.4192,
  type: 'city',
  address: 'Tirupati, Andhra Pradesh, India',
};

let poiSeq = 0;

export function makePoi(overrides: Partial<PointOfInterest> & { name: string }): PointOfInterest {
  poiSeq += 1;
  return {
    id: overrides.id ?? `poi-${poiSeq}`,
    type: overrides.type ?? 'attraction',
    latitude: overrides.latitude ?? 13.63,
    longitude: overrides.longitude ?? 79.42,
    address: overrides.address,
    tags: overrides.tags,
    ...overrides,
  };
}

export function makeDay(overrides: Partial<ItineraryDayPlan> & { day: number }): ItineraryDayPlan {
  return {
    date: `Day ${overrides.day}`,
    theme: 'Test day',
    activities: [],
    ...overrides,
  };
}
