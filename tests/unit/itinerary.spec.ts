import { expect, test } from '@playwright/test';

import {
  attachCoordinatesByName,
  buildFallbackDailyPlans,
  getPaceProfile,
  haversineDistanceKm,
  inferPoiCategoryFromPoi,
  normalizeBudgetBreakdown,
  normalizeDuration,
  normalizeStay,
  normalizeTransfers,
  prioritizePois,
  rebalanceDailyPlansForPace,
} from '@/services/itinerary';

import { makeDay, makePoi, TIRUPATI } from './fixtures';

test.describe('normalizeDuration', () => {
  test('uses an explicit positive duration', () => {
    expect(normalizeDuration({ destination: 'X', duration: 3 })).toBe(3);
  });

  test('derives an inclusive day count from a date range', () => {
    expect(
      normalizeDuration({ destination: 'X', arrivalDate: '2026-07-10', departureDate: '2026-07-12' })
    ).toBe(3);
  });

  test('throws when neither a duration nor a valid range is provided', () => {
    expect(() => normalizeDuration({ destination: 'X' })).toThrow();
    expect(() =>
      normalizeDuration({ destination: 'X', arrivalDate: '2026-07-12', departureDate: '2026-07-10' })
    ).toThrow();
  });
});

test.describe('getPaceProfile', () => {
  test('maps intensity to an activity count', () => {
    expect(getPaceProfile('Relaxed', []).activityCount).toBe(3);
    expect(getPaceProfile('Balanced', []).activityCount).toBe(4);
    expect(getPaceProfile('Packed', []).activityCount).toBe(5);
  });

  test('defaults unknown intensity to Balanced', () => {
    expect(getPaceProfile(null, []).intensity).toBe('Balanced');
    expect(getPaceProfile('whatever', []).intensity).toBe('Balanced');
  });

  test('only allows food stops when food/nightlife is an interest on a relaxed trip', () => {
    expect(getPaceProfile('Relaxed', []).maxFoodPerDay).toBe(0);
    expect(getPaceProfile('Relaxed', ['food']).maxFoodPerDay).toBe(1);
    expect(getPaceProfile('Packed', ['nightlife']).maxFoodPerDay).toBe(2);
  });
});

test.describe('inferPoiCategoryFromPoi', () => {
  test('classifies places of worship as culture', () => {
    expect(inferPoiCategoryFromPoi(makePoi({ name: 'Govindaraja Swamy Temple', type: 'place_of_worship' }))).toBe(
      'culture'
    );
    expect(inferPoiCategoryFromPoi(makePoi({ name: 'Jama Masjid', type: 'place_of_worship' }))).toBe('culture');
  });

  test('classifies the obvious categories', () => {
    expect(inferPoiCategoryFromPoi(makePoi({ name: 'Blue Fox', type: 'restaurant' }))).toBe('food');
    expect(inferPoiCategoryFromPoi(makePoi({ name: 'Taj Tirupati', type: 'hotel' }))).toBe('stay');
    expect(inferPoiCategoryFromPoi(makePoi({ name: 'City Garden', type: 'park' }))).toBe('park');
    expect(inferPoiCategoryFromPoi(makePoi({ name: 'Central Market', type: 'marketplace' }))).toBe('shopping');
  });
});

test.describe('prioritizePois', () => {
  const pois = [
    makePoi({ name: 'Sri Venkateswara Temple', type: 'place_of_worship', tags: { wikidata: 'Q1' } }),
    makePoi({ name: 'Kapila Theertham', type: 'place_of_worship' }),
    makePoi({ name: 'ISKCON Mandir', type: 'place_of_worship' }),
    makePoi({ name: 'Regional Science Museum', type: 'museum' }),
    makePoi({ name: 'Deer Park', type: 'park' }),
    makePoi({ name: 'Blue Fox', type: 'restaurant' }),
    makePoi({ name: 'Ginger Hotel Restaurant', type: 'restaurant' }),
    makePoi({ name: 'Hotel Sri Nandhi Restaurant', type: 'restaurant' }),
    makePoi({ name: 'Dakshin', type: 'restaurant' }),
    makePoi({ name: 'Hyderabad House', type: 'restaurant' }),
  ];

  test('keeps the selection within the prompt cap', () => {
    expect(prioritizePois(pois, ['culture'], TIRUPATI).length).toBeLessThanOrEqual(8);
  });

  test('does not let restaurants crowd out the sights when food is not requested', () => {
    const selected = prioritizePois(pois, ['culture'], TIRUPATI);
    const foodCount = selected.filter((poi) => inferPoiCategoryFromPoi(poi) === 'food').length;
    const cultureCount = selected.filter((poi) => inferPoiCategoryFromPoi(poi) === 'culture').length;
    expect(cultureCount).toBeGreaterThanOrEqual(2);
    expect(foodCount).toBeLessThanOrEqual(1);
  });
});

test.describe('attachCoordinatesByName', () => {
  test('fills coordinates from the POI the activity names, and falls back to the centre otherwise', () => {
    const pois = [makePoi({ name: 'Kapila Theertham', latitude: 13.65, longitude: 79.36 })];
    const days = [
      makeDay({
        day: 1,
        activities: [
          {
            time: '09:00',
            name: 'Kapila Theertham',
            description: 'Morning temple visit.',
            duration: 90,
            cost: null,
            estimated_cost: null,
            category: 'culture',
            latitude: null,
            longitude: null,
            address: null,
          },
          {
            time: '13:00',
            name: 'Lunch somewhere local',
            description: 'A meal.',
            duration: 60,
            cost: 15,
            estimated_cost: 15,
            category: 'food',
            latitude: null,
            longitude: null,
            address: null,
          },
        ],
      }),
    ];

    const [day] = attachCoordinatesByName(days, pois, TIRUPATI);
    expect(day.activities[0].latitude).toBeCloseTo(13.65, 5);
    expect(day.activities[0].longitude).toBeCloseTo(79.36, 5);
    // Unmatched activity falls back to the destination centre rather than 0,0.
    expect(day.activities[1].latitude).toBeCloseTo(TIRUPATI.latitude, 5);
    expect(day.activities[1].longitude).toBeCloseTo(TIRUPATI.longitude, 5);
  });
});

test.describe('rebalanceDailyPlansForPace', () => {
  test('caps the activity count, drops same-day duplicates, and tags intensity', () => {
    const activity = (name: string, time: string) => ({
      time,
      name,
      description: 'x',
      duration: 60,
      cost: null,
      estimated_cost: null,
      category: 'culture',
      latitude: 1,
      longitude: 1,
      address: null,
    });
    const days = [
      makeDay({
        day: 1,
        activities: [
          activity('Temple A', '09:00'),
          activity('Temple A', '10:00'), // duplicate name
          activity('Temple B', '11:00'),
          activity('Temple C', '12:00'),
          activity('Temple D', '13:00'),
          activity('Temple E', '14:00'),
        ],
      }),
    ];

    const [day] = rebalanceDailyPlansForPace(days, { destination: 'X', activityIntensity: 'Balanced' });
    expect(day.activities.length).toBeLessThanOrEqual(4);
    const names = day.activities.map((a) => a.name);
    expect(new Set(names).size).toBe(names.length);
    expect(day.intensity).toBe('Balanced');
  });
});

test.describe('normalizeBudgetBreakdown', () => {
  test('fills missing fields with null and defaults total to the estimate', () => {
    const result = normalizeBudgetBreakdown(undefined, 500);
    expect(result.total).toBe(500);
    expect(result.flights).toBeNull();
    expect(result.food).toBeNull();
  });

  test('keeps a provided total', () => {
    expect(normalizeBudgetBreakdown({ total: 320 }, 500).total).toBe(320);
  });
});

test.describe('haversineDistanceKm', () => {
  test('approximates one degree of latitude as ~111 km', () => {
    const km = haversineDistanceKm({ latitude: 0, longitude: 0 }, { latitude: 1, longitude: 0 });
    expect(km).toBeGreaterThan(110);
    expect(km).toBeLessThan(112);
  });
});

test.describe('normalizeStay', () => {
  test('selects a live stay candidate when the model returns none', () => {
    const fallback = makePoi({ name: 'Marasa Sarovar Premiere', type: 'hotel', latitude: 13.62, longitude: 79.41 });
    const stay = normalizeStay(null, fallback, {
      destination: 'Tirupati',
      arrivalDate: '2026-08-01',
      departureDate: '2026-08-02',
    });
    expect(stay?.name).toBe('Marasa Sarovar Premiere');
    expect(stay?.checkInDate).toBe('2026-08-01');
  });

  test('returns null when there is no model stay and no candidate', () => {
    expect(normalizeStay(null, null, { destination: 'Tirupati' })).toBeNull();
  });
});

test.describe('normalizeTransfers', () => {
  test('builds arrival/departure transfers from the provided context and stay', () => {
    const stay = normalizeStay(
      null,
      makePoi({ name: 'Taj Tirupati', type: 'hotel', latitude: 13.62, longitude: 79.41 }),
      { destination: 'Tirupati' }
    );
    const transfers = normalizeTransfers(undefined, {
      destination: 'Tirupati',
      arrivalTransferContext: 'Tirupati railway station',
      departureTransferContext: 'Tirupati railway station',
    }, stay);

    const arrival = transfers.find((t) => t.kind === 'arrival');
    const departure = transfers.find((t) => t.kind === 'departure');
    expect(arrival?.from).toBe('Tirupati railway station');
    expect(arrival?.to).toBe('Taj Tirupati');
    expect(departure?.from).toBe('Taj Tirupati');
    expect(departure?.to).toBe('Tirupati railway station');
  });
});

test.describe('buildFallbackDailyPlans (deterministic safety net)', () => {
  const pois = [
    makePoi({ name: 'Sri Venkateswara Temple', type: 'place_of_worship', address: 'Tirumala' }),
    makePoi({ name: 'Kapila Theertham', type: 'place_of_worship' }),
    makePoi({ name: 'Regional Science Museum', type: 'museum' }),
    makePoi({ name: 'Blue Fox', type: 'restaurant' }),
  ];

  test('uses real POI names with no flowery filler', () => {
    const plans = buildFallbackDailyPlans({
      destination: TIRUPATI,
      pois,
      duration: 2,
      request: { destination: 'Tirupati' },
      profile: getPaceProfile('Balanced', ['culture']),
    });

    const allText = JSON.stringify(plans);
    // The old generic-filler vocabulary must never appear again.
    expect(allText).not.toContain('Spend a calm stretch');
    expect(allText).not.toContain('Sunset stroll');
    expect(allText).not.toContain('Garden pause');

    const names = plans.flatMap((day) => day.activities.map((a) => a.name));
    expect(names).toContain('Sri Venkateswara Temple');
    expect(plans).toHaveLength(2);
    for (const day of plans) {
      expect(day.intensity).toBe('Balanced');
      expect(day.activities.length).toBeGreaterThan(0);
    }
  });

  test('leaves honest open time instead of inventing venues when POIs run out', () => {
    const plans = buildFallbackDailyPlans({
      destination: TIRUPATI,
      pois: [makePoi({ name: 'Lone Temple', type: 'place_of_worship' })],
      duration: 2,
      request: { destination: 'Tirupati' },
      profile: getPaceProfile('Packed', []),
    });
    const day2Names = plans[1].activities.map((a) => a.name);
    expect(day2Names).toContain('Explore Tirupati');
  });
});
