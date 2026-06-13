import { expect, test } from '@playwright/test';

import { DEFAULT_POI_TYPES, INTEREST_TO_POI_TYPES } from '@/lib/constants';
import { derivePoiTypes, scorePoiNotability } from '@/services/places';

import { makePoi } from './fixtures';

test.describe('derivePoiTypes', () => {
  // Regression: temple towns (Tirupati) previously returned all-restaurant
  // itineraries because `culture` never queried places of worship.
  test('culture interest queries places of worship', () => {
    const types = derivePoiTypes(['culture']);
    expect(types).toContain('place_of_worship');
    expect(types).toContain('attraction');
    expect(types).toContain('museum');
  });

  test('every itinerary considers places of worship by default', () => {
    expect(DEFAULT_POI_TYPES).toContain('place_of_worship');
    // No-interest trips should still surface sights, not only the defaults' food.
    expect(derivePoiTypes([])).toContain('place_of_worship');
  });

  test('food/nightlife interests add restaurants and cafes', () => {
    const types = derivePoiTypes(['food']);
    expect(types).toContain('restaurant');
    expect(types).toContain('cafe');
  });

  test('history interest still maps to worship + museums', () => {
    expect(INTEREST_TO_POI_TYPES.history).toContain('place_of_worship');
  });

  test('returns a de-duplicated list', () => {
    const types = derivePoiTypes(['culture', 'history', 'art']);
    expect(new Set(types).size).toBe(types.length);
  });
});

test.describe('scorePoiNotability', () => {
  test('wikidata/wikipedia-tagged sights outrank bare venues', () => {
    const famous = makePoi({ name: 'Sri Venkateswara Temple', tags: { wikidata: 'Q123', wikipedia: 'en:Tirumala' } });
    const plain = makePoi({ name: 'Corner Tea Stall' });
    expect(scorePoiNotability(famous)).toBeGreaterThan(scorePoiNotability(plain));
  });

  test('tourism attractions and historic sites get a bump', () => {
    const attraction = makePoi({ name: 'Old Fort', tags: { tourism: 'attraction', historic: 'castle' } });
    expect(scorePoiNotability(attraction)).toBeGreaterThan(0);
  });
});
