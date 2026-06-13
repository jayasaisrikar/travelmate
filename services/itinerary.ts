import { resolveTripCurrency } from '@/services/currency';
import { generateJson } from '@/services/gemini';
import {
  derivePoiTypes,
  fetchPointsOfInterest,
  resolveDestination,
  scorePoiNotability,
} from '@/services/places';
import { fetchWeatherSnapshot } from '@/services/weather';
import type {
  BudgetBreakdown,
  BookingConfirmationExtraction,
  DestinationSearchResult,
  GeneratedItinerary,
  ItineraryActivity,
  ItineraryDayPlan,
  ItineraryGenerationInput,
  PointOfInterest,
  TripCurrency,
  TripTransfer,
  TravelStay,
  WeatherSnapshot,
} from '@/lib/travel-types';

interface GeminiItineraryPayload {
  title: string;
  destination: string;
  duration: number;
  stay?: {
    name: string;
    type: string;
    latitude?: number | null;
    longitude?: number | null;
    address?: string | null;
    checkInDate?: string | null;
    checkInTime?: string | null;
    checkOutDate?: string | null;
    checkOutTime?: string | null;
    notes?: string | null;
  } | null;
  transfers?: Array<{
    kind: 'arrival' | 'departure';
    title: string;
    from?: string | null;
    to?: string | null;
    time?: string | null;
    notes?: string | null;
  }>;
  dailyPlans: Array<{
    day: number;
    date?: string;
    theme: string;
    activities: Array<{
      time: string;
      name: string;
      description: string;
      duration?: number | null;
      cost?: number | null;
      category: string;
      latitude?: number | null;
      longitude?: number | null;
      address?: string | null;
    }>;
    restSlots?: { time: string; duration: string }[];
    totalActiveHours?: number | null;
    intensity?: string | null;
  }>;
  totalEstimatedCost?: number | null;
  budgetBreakdown?: Partial<BudgetBreakdown>;
  tips?: string[];
}

const geminiItineraryResponseSchema = {
  type: 'object',
  properties: {
    title: { type: 'string' },
    destination: { type: 'string' },
    duration: { type: 'integer' },
    stay: {
      type: 'object',
      nullable: true,
      properties: {
        name: { type: 'string' },
        type: { type: 'string' },
        latitude: { type: 'number', nullable: true },
        longitude: { type: 'number', nullable: true },
        address: { type: 'string', nullable: true },
        checkInDate: { type: 'string', nullable: true },
        checkInTime: { type: 'string', nullable: true },
        checkOutDate: { type: 'string', nullable: true },
        checkOutTime: { type: 'string', nullable: true },
        notes: { type: 'string', nullable: true },
      },
      required: ['name', 'type', 'latitude', 'longitude', 'address', 'checkInDate', 'checkInTime', 'checkOutDate', 'checkOutTime', 'notes'],
    },
    transfers: {
      type: 'array',
      items: {
        type: 'object',
        properties: {
          kind: { type: 'string' },
          title: { type: 'string' },
          from: { type: 'string', nullable: true },
          to: { type: 'string', nullable: true },
          time: { type: 'string', nullable: true },
          notes: { type: 'string', nullable: true },
        },
        required: ['kind', 'title', 'from', 'to', 'time', 'notes'],
      },
    },
    dailyPlans: {
      type: 'array',
      items: {
        type: 'object',
        properties: {
          day: { type: 'integer' },
          date: { type: 'string' },
          theme: { type: 'string' },
          activities: {
            type: 'array',
            items: {
              type: 'object',
              properties: {
                time: { type: 'string' },
                name: { type: 'string' },
                description: { type: 'string' },
                duration: { type: 'integer', nullable: true },
                cost: { type: 'number', nullable: true },
                category: { type: 'string' },
                latitude: { type: 'number', nullable: true },
                longitude: { type: 'number', nullable: true },
                address: { type: 'string', nullable: true },
              },
              required: ['time', 'name', 'description', 'duration', 'cost', 'category', 'latitude', 'longitude', 'address'],
            },
          },
          restSlots: {
            type: 'array',
            items: {
              type: 'object',
              properties: {
                time: { type: 'string' },
                duration: { type: 'string' },
              },
              required: ['time', 'duration'],
            },
          },
          totalActiveHours: { type: 'number', nullable: true },
          intensity: { type: 'string', nullable: true },
        },
        required: ['day', 'date', 'theme', 'activities', 'restSlots', 'totalActiveHours', 'intensity'],
      },
    },
    totalEstimatedCost: { type: 'number', nullable: true },
    budgetBreakdown: {
      type: 'object',
      properties: {
        flights: { type: 'number', nullable: true },
        hotels: { type: 'number', nullable: true },
        food: { type: 'number', nullable: true },
        activities: { type: 'number', nullable: true },
        transport: { type: 'number', nullable: true },
        misc: { type: 'number', nullable: true },
        total: { type: 'number', nullable: true },
      },
      required: ['flights', 'hotels', 'food', 'activities', 'transport', 'misc', 'total'],
    },
    tips: {
      type: 'array',
      items: { type: 'string' },
    },
  },
  required: ['title', 'destination', 'duration', 'stay', 'transfers', 'dailyPlans', 'totalEstimatedCost', 'budgetBreakdown', 'tips'],
} as const;

function isValidDate(value: string | null | undefined): value is string {
  return Boolean(value && !Number.isNaN(Date.parse(value)));
}

export function normalizeDuration(input: ItineraryGenerationInput): number {
  if (typeof input.duration === 'number' && Number.isFinite(input.duration) && input.duration > 0) {
    return Math.ceil(input.duration);
  }

  if (isValidDate(input.arrivalDate) && isValidDate(input.departureDate)) {
    const diffMs = new Date(input.departureDate).getTime() - new Date(input.arrivalDate).getTime();
    const diffDays = Math.floor(diffMs / 86_400_000) + 1;

    if (diffDays > 0) {
      return diffDays;
    }
  }

  throw new Error('A valid trip duration or travel date range is required');
}

// The traveler sets a budget in their home currency, but the model plans costs
// in the destination's currency. Convert the budget so the model has a target in
// the same units it will write costs in, and keep the original for context.
function normalizeBudgetLabel(budget: ItineraryGenerationInput['budget'], currency: TripCurrency): string {
  const numericBudget =
    typeof budget === 'number' && Number.isFinite(budget)
      ? budget
      : typeof budget === 'string' && Number.isFinite(Number.parseFloat(budget))
        ? Number.parseFloat(budget)
        : null;

  if (numericBudget !== null) {
    if (currency.display === currency.home || !currency.rateToHome) {
      return `Total budget: ${numericBudget} ${currency.home}`;
    }
    const inDestination = Math.round(numericBudget / currency.rateToHome);
    return `Total budget: about ${inDestination} ${currency.display} (traveler set ${numericBudget} ${currency.home})`;
  }

  if (typeof budget === 'string' && budget.trim()) {
    return budget.trim();
  }

  return 'Not provided';
}

function normalizeActivities(activities: GeminiItineraryPayload['dailyPlans'][number]['activities']): ItineraryActivity[] {
  return activities.map((activity) => ({
    time: activity.time,
    name: activity.name,
    description: activity.description,
    duration: activity.duration ?? null,
    cost: activity.cost ?? null,
    estimated_cost: activity.cost ?? null,
    category: activity.category,
    latitude: activity.latitude ?? null,
    longitude: activity.longitude ?? null,
    address: activity.address ?? null,
  }));
}

export function normalizeDayPlans(
  dailyPlans: GeminiItineraryPayload['dailyPlans'],
  destination: DestinationSearchResult
): ItineraryDayPlan[] {
  return dailyPlans.map((dayPlan, index) => ({
    day: typeof dayPlan.day === 'number' ? dayPlan.day : index + 1,
    date: dayPlan.date ?? `Day ${index + 1}`,
    theme: dayPlan.theme,
    activities: normalizeActivities(dayPlan.activities).map((activity) => ({
      ...activity,
      latitude: activity.latitude ?? destination.latitude,
      longitude: activity.longitude ?? destination.longitude,
      address: activity.address ?? destination.address ?? destination.name,
    })),
    restSlots: dayPlan.restSlots,
    totalActiveHours: dayPlan.totalActiveHours ?? null,
    intensity: dayPlan.intensity ?? null,
  }));
}

function normalizeCoordinate(value: number | null | undefined): number | null {
  return typeof value === 'number' && Number.isFinite(value) ? value : null;
}

function hasCoordinates(point: { latitude: number | null; longitude: number | null }): boolean {
  return normalizeCoordinate(point.latitude) !== null && normalizeCoordinate(point.longitude) !== null;
}

function normalizeSearchText(value: string): string {
  return value.toLowerCase().replace(/[^a-z0-9]+/g, ' ').trim();
}

type PoiCategory = 'food' | 'culture' | 'park' | 'shopping' | 'stay' | 'other';

type PaceIntensity = 'Relaxed' | 'Balanced' | 'Packed';

interface PaceProfile {
  intensity: PaceIntensity;
  activityCount: number;
  maxFoodPerDay: number;
  restSlots: number;
}

export function inferPoiCategoryFromPoi(poi: PointOfInterest): PoiCategory {
  const normalizedType = normalizeSearchText(poi.type);
  const normalizedName = normalizeSearchText(poi.name);

  if (
    normalizedType.includes('hotel') ||
    normalizedType.includes('hostel') ||
    normalizedType.includes('guest house') ||
    normalizedType.includes('guest_house') ||
    normalizedType.includes('motel') ||
    normalizedType.includes('apartment') ||
    normalizedName.includes('hotel') ||
    normalizedName.includes('hostel') ||
    normalizedName.includes('guest house') ||
    normalizedName.includes('motel') ||
    normalizedName.includes('apartment')
  ) {
    return 'stay';
  }

  if (
    normalizedType.includes('restaurant') ||
    normalizedType.includes('cafe') ||
    normalizedType.includes('fast food') ||
    normalizedType.includes('bakery') ||
    normalizedName.includes('restaurant') ||
    normalizedName.includes('cafe') ||
    normalizedName.includes('breakfast') ||
    normalizedName.includes('coffee') ||
    normalizedName.includes('bistro')
  ) {
    return 'food';
  }

  if (
    normalizedType.includes('museum') ||
    normalizedType.includes('gallery') ||
    normalizedType.includes('attraction') ||
    normalizedType.includes('historic') ||
    normalizedType.includes('monument') ||
    normalizedType.includes('temple') ||
    normalizedType.includes('church') ||
    normalizedType.includes('worship') ||
    normalizedType.includes('shrine') ||
    normalizedType.includes('mosque') ||
    normalizedName.includes('museum') ||
    normalizedName.includes('gallery') ||
    normalizedName.includes('temple') ||
    normalizedName.includes('church') ||
    normalizedName.includes('mosque') ||
    normalizedName.includes('shrine') ||
    normalizedName.includes('monument')
  ) {
    return 'culture';
  }

  if (
    normalizedType.includes('park') ||
    normalizedType.includes('garden') ||
    normalizedType.includes('nature') ||
    normalizedName.includes('park') ||
    normalizedName.includes('garden')
  ) {
    return 'park';
  }

  if (
    normalizedType.includes('market') ||
    normalizedType.includes('shop') ||
    normalizedType.includes('mall') ||
    normalizedType.includes('store') ||
    normalizedName.includes('market') ||
    normalizedName.includes('street') ||
    normalizedName.includes('mall') ||
    normalizedName.includes('shopping')
  ) {
    return 'shopping';
  }

  return 'other';
}

function isFoodInterest(interests: string[] | null | undefined): boolean {
  return (interests ?? []).some((interest) => {
    const normalized = interest.toLowerCase();
    return normalized.includes('food') || normalized.includes('nightlife');
  });
}

export function getPaceProfile(intensity: string | null | undefined, interests: string[] | null | undefined): PaceProfile {
  const normalizedIntensity =
    intensity === 'Relaxed' || intensity === 'Balanced' || intensity === 'Packed'
      ? intensity
      : 'Balanced';
  const wantsFood = isFoodInterest(interests);

  if (normalizedIntensity === 'Relaxed') {
    return {
      intensity: 'Relaxed',
      activityCount: 3,
      maxFoodPerDay: wantsFood ? 1 : 0,
      restSlots: 1,
    };
  }

  if (normalizedIntensity === 'Packed') {
    return {
      intensity: 'Packed',
      activityCount: 5,
      maxFoodPerDay: wantsFood ? 2 : 1,
      restSlots: 1,
    };
  }

  return {
    intensity: 'Balanced',
    activityCount: 4,
    maxFoodPerDay: 1,
    restSlots: 1,
  };
}

function buildPaceGuidance(profile: PaceProfile): string {
  if (profile.intensity === 'Relaxed') {
    return [
      'Relaxed pacing means 2 or 3 activities max, with real breathing room.',
      `Do not make the day restaurant-heavy: keep food stops to at most ${profile.maxFoodPerDay}.`,
      'Prefer scenic, cultural, park, or slow-neighborhood stops over repeated dining stops.',
      'If live POIs are mostly food, use generic slow-paced activities instead of forcing restaurants.',
    ].join(' ');
  }

  if (profile.intensity === 'Packed') {
    return [
      'Packed pacing means a fuller day, but still avoid repeating the same venue type over and over.',
      `Keep food stops to at most ${profile.maxFoodPerDay} and spread the rest across culture, shopping, park, or other anchors.`,
      'If the destination is sparse, mix in short rest or stroll blocks instead of back-to-back meals.',
    ].join(' ');
  }

  return [
    'Balanced pacing should mix anchors and breathing room.',
    `Keep food stops to at most ${profile.maxFoodPerDay} and make sure the day is not all restaurants.`,
    'Prefer a mix of culture, park, shopping, and one meal stop if useful.',
  ].join(' ');
}

// Lightly enforces the pace profile on the model's output without rewriting its
// content: caps the activity count, drops exact duplicate venues within a day,
// and guarantees a rest slot and intensity tag. The pacing/variety rules live in
// the prompt, so we trust the model's selection rather than substituting filler.
export function rebalanceDailyPlansForPace(
  dailyPlans: ItineraryDayPlan[],
  request: ItineraryGenerationInput
): ItineraryDayPlan[] {
  const profile = getPaceProfile(request.activityIntensity, request.interests ?? []);

  return dailyPlans.map((dayPlan) => {
    const seenNames = new Set<string>();
    const activities = dayPlan.activities
      .filter((activity) => {
        const key = normalizeSearchText(activity.name);
        if (key && seenNames.has(key)) {
          return false;
        }
        seenNames.add(key);
        return true;
      })
      .slice(0, profile.activityCount);

    return {
      ...dayPlan,
      activities,
      restSlots:
        dayPlan.restSlots ?? [{ time: '14:00', duration: profile.restSlots === 1 ? '45 minutes' : '30 minutes' }],
      intensity: profile.intensity,
    };
  });
}

function getPoiSector(destination: DestinationSearchResult, poi: PointOfInterest): number {
  const latDelta = poi.latitude - destination.latitude;
  const lonDelta = poi.longitude - destination.longitude;
  const angle = (Math.atan2(latDelta, lonDelta) * 180) / Math.PI;
  const normalizedAngle = (angle + 360 + 22.5) % 360;

  return Math.floor(normalizedAngle / 45) % 8;
}

// Fills coordinates onto the LLM's chosen activities by matching the venue name
// against the live POI list. The model's names and descriptions are preserved;
// we only enrich location data. Activities that name a real place (not a generic
// neighbourhood walk) get exact coordinates; everything else falls back to the
// destination centre rather than being rewritten into a different venue.
export function attachCoordinatesByName(
  dailyPlans: ItineraryDayPlan[],
  pois: PointOfInterest[],
  destination: DestinationSearchResult
): ItineraryDayPlan[] {
  const coordinatePois = pois.filter((poi) => hasCoordinates(poi));
  const byName = new Map<string, PointOfInterest>();

  for (const poi of coordinatePois) {
    const key = normalizeSearchText(poi.name);
    if (key && !byName.has(key)) {
      byName.set(key, poi);
    }
  }

  const findMatch = (name: string): PointOfInterest | null => {
    const normalized = normalizeSearchText(name);
    if (!normalized) {
      return null;
    }

    const exact = byName.get(normalized);
    if (exact) {
      return exact;
    }

    for (const poi of coordinatePois) {
      const poiName = normalizeSearchText(poi.name);
      if (poiName.length >= 4 && (normalized.includes(poiName) || poiName.includes(normalized))) {
        return poi;
      }
    }

    return null;
  };

  return dailyPlans.map((dayPlan) => ({
    ...dayPlan,
    activities: dayPlan.activities.map((activity) => {
      const match = findMatch(activity.name);

      if (match) {
        return {
          ...activity,
          latitude: match.latitude,
          longitude: match.longitude,
          address: activity.address ?? match.address ?? destination.address ?? destination.name,
        };
      }

      return {
        ...activity,
        latitude: normalizeCoordinate(activity.latitude) ?? destination.latitude,
        longitude: normalizeCoordinate(activity.longitude) ?? destination.longitude,
        address: activity.address ?? destination.address ?? destination.name,
      };
    }),
  }));
}

export function normalizeBudgetBreakdown(
  budgetBreakdown: Partial<BudgetBreakdown> | undefined,
  totalEstimatedCost: number | null
): BudgetBreakdown {
  return {
    flights: budgetBreakdown?.flights ?? null,
    hotels: budgetBreakdown?.hotels ?? null,
    food: budgetBreakdown?.food ?? null,
    activities: budgetBreakdown?.activities ?? null,
    transport: budgetBreakdown?.transport ?? null,
    misc: budgetBreakdown?.misc ?? null,
    total: budgetBreakdown?.total ?? totalEstimatedCost,
  };
}

export function prioritizePois(
  pois: PointOfInterest[],
  interests: string[],
  destination: DestinationSearchResult
): PointOfInterest[] {
  const searchTerms = new Set(interests.map((interest) => interest.toLowerCase()));
  const categoryOrder: PoiCategory[] = ['culture', 'park', 'shopping', 'food', 'other'];
  const categoryQuotas: Record<PoiCategory, number> = {
    food: 1,
    culture: 3,
    park: 2,
    shopping: 1,
    stay: 0,
    other: 1,
  };
  const wantsFood = Array.from(searchTerms).some((term) => term.includes('food') || term.includes('nightlife'));

  const buckets = new Map<PoiCategory, PointOfInterest[]>();

  for (const poi of pois) {
    const category = inferPoiCategoryFromPoi(poi);
    const list = buckets.get(category) ?? [];
    list.push(poi);
    buckets.set(category, list);
  }

  const scorePoi = (poi: PointOfInterest): number => {
    const name = normalizeSearchText(poi.name);
    const type = normalizeSearchText(poi.type);
    const interestMatch = Array.from(searchTerms).some(
      (term) => name.includes(term) || type.includes(term)
    );
    let score = interestMatch ? 5 : 0;

    if (inferPoiCategoryFromPoi(poi) === 'food' && !wantsFood) {
      score -= 6;
    }

    score += scorePoiNotability(poi);
    score += categoryOrder.length - categoryOrder.indexOf(inferPoiCategoryFromPoi(poi));
    score += Math.max(0, 4 - Math.min(4, haversineDistanceKm(destination, poi) / 3));
    score += 2 / (1 + getPoiSector(destination, poi));

    return score;
  };

  for (const bucket of buckets.values()) {
    bucket.sort((left, right) => scorePoi(right) - scorePoi(left) || left.name.localeCompare(right.name));
  }

  const selected = new Map<string, PointOfInterest>();
  const pickedCounts: Record<PoiCategory, number> = {
    food: 0,
    culture: 0,
    park: 0,
    shopping: 0,
    stay: 0,
    other: 0,
  };

  const pickFromBucket = (category: PoiCategory): PointOfInterest | null => {
    const bucket = buckets.get(category);

    while (bucket && bucket.length > 0) {
      const candidate = bucket.shift() as PointOfInterest;
      const key = `${candidate.name.toLowerCase()}-${candidate.latitude.toFixed(4)}-${candidate.longitude.toFixed(4)}`;

      if (selected.has(key)) {
        continue;
      }

      return candidate;
    }

    return null;
  };

  while (selected.size < 8) {
    let progressed = false;

    for (const category of categoryOrder) {
      if (selected.size >= 8) {
        break;
      }

      if (pickedCounts[category] >= categoryQuotas[category]) {
        continue;
      }

      const candidate = pickFromBucket(category);
      if (!candidate) {
        continue;
      }

      const key = `${candidate.name.toLowerCase()}-${candidate.latitude.toFixed(4)}-${candidate.longitude.toFixed(4)}`;
      selected.set(key, candidate);
      pickedCounts[category] += 1;
      progressed = true;
    }

    if (!progressed) {
      break;
    }
  }

  if (selected.size < 8) {
    const leftovers = [...buckets.values()].flat();
    leftovers.sort((left, right) => scorePoi(right) - scorePoi(left) || left.name.localeCompare(right.name));

    for (const poi of leftovers) {
      if (selected.size >= 8) {
        break;
      }

      const key = `${poi.name.toLowerCase()}-${poi.latitude.toFixed(4)}-${poi.longitude.toFixed(4)}`;
      if (!selected.has(key)) {
        selected.set(key, poi);
      }
    }
  }

  return Array.from(selected.values()).slice(0, 8);
}

export function haversineDistanceKm(
  left: { latitude: number; longitude: number },
  right: { latitude: number; longitude: number }
): number {
  const earthRadiusKm = 6371;
  const toRadians = (degrees: number) => (degrees * Math.PI) / 180;
  const deltaLat = toRadians(right.latitude - left.latitude);
  const deltaLon = toRadians(right.longitude - left.longitude);
  const lat1 = toRadians(left.latitude);
  const lat2 = toRadians(right.latitude);

  const a =
    Math.sin(deltaLat / 2) * Math.sin(deltaLat / 2) +
    Math.sin(deltaLon / 2) * Math.sin(deltaLon / 2) * Math.cos(lat1) * Math.cos(lat2);

  return 2 * earthRadiusKm * Math.asin(Math.min(1, Math.sqrt(a)));
}

function prioritizeStayCandidates(
  stays: PointOfInterest[],
  destination: DestinationSearchResult
): PointOfInterest[] {
  const typeWeight: Record<string, number> = {
    hotel: 0,
    guest_house: 1,
    hostel: 2,
    motel: 3,
    apartment: 4,
  };

  return [...stays]
    .filter((stay) => stay.name.trim().length > 0)
    .sort((left, right) => {
      const leftWeight = typeWeight[left.type.toLowerCase()] ?? 10;
      const rightWeight = typeWeight[right.type.toLowerCase()] ?? 10;

      if (leftWeight !== rightWeight) {
        return leftWeight - rightWeight;
      }

      const leftDistance = haversineDistanceKm(destination, left);
      const rightDistance = haversineDistanceKm(destination, right);

      if (leftDistance !== rightDistance) {
        return leftDistance - rightDistance;
      }

      return left.name.localeCompare(right.name);
    })
    .slice(0, 8);
}

function buildStayContext(stays: PointOfInterest[], destination: DestinationSearchResult): string {
  if (stays.length === 0) {
    return 'No live stay options were returned for this destination. Do not ask the user for a hotel. If you cannot name a lodging, return null for stay and keep the itinerary honest.';
  }

  return stays
    .map((stay, index) => {
      const distanceKm = haversineDistanceKm(destination, stay);
      return `${index + 1}. ${stay.name} | ${stay.type} | ${stay.latitude},${stay.longitude} | ${distanceKm.toFixed(1)} km away${stay.address ? ` | ${stay.address}` : ''}`;
    })
    .join('\n');
}

function buildTransferHint(label: string, context: string | null | undefined, stayName: string | null): string {
  const trimmedContext = context?.trim();

  if (!trimmedContext) {
    return `${label}: Not provided`;
  }

  if (stayName) {
    return `${label}: ${trimmedContext} -> ${stayName}`;
  }

  return `${label}: ${trimmedContext}`;
}

export function normalizeStay(
  stay: GeminiItineraryPayload['stay'],
  fallback: PointOfInterest | null,
  request: ItineraryGenerationInput
): TravelStay | null {
  const hasPayloadCoordinates =
    stay &&
    stay.name.trim().length > 0 &&
    typeof stay.latitude === 'number' &&
    typeof stay.longitude === 'number';

  const selected = hasPayloadCoordinates ? stay : fallback;

  if (!selected) {
    return null;
  }

  const latitude = selected.latitude;
  const longitude = selected.longitude;

  if (!Number.isFinite(latitude) || !Number.isFinite(longitude)) {
    return null;
  }

  return {
    name: selected.name,
    type: selected.type,
    latitude: latitude as number,
    longitude: longitude as number,
    address: selected.address ?? null,
    checkInDate: request.arrivalDate ?? null,
    checkInTime: request.arrivalTime ?? null,
    checkOutDate: request.departureDate ?? null,
    checkOutTime: request.departureTime ?? null,
    notes:
      !hasPayloadCoordinates && selected === fallback
        ? 'Selected from live stay POIs because the model did not return a custom stay.'
        : stay?.notes ?? null,
  };
}

export function normalizeTransfers(
  transfers: GeminiItineraryPayload['transfers'],
  request: ItineraryGenerationInput,
  stay: TravelStay | null
): TripTransfer[] {
  const stayName = stay?.name ?? null;
  const fallbackTransfers: TripTransfer[] = [];

  const arrivalContext = request.arrivalTransferContext?.trim() || null;
  const departureContext = request.departureTransferContext?.trim() || null;

  if (arrivalContext || stayName) {
    fallbackTransfers.push({
      kind: 'arrival',
      title: 'Arrival transfer',
      from: arrivalContext,
      to: stayName,
      time: request.arrivalTime ?? null,
      notes: arrivalContext
        ? 'Start the trip with the transfer the traveler specified, then move into the stay.'
        : null,
    });
  }

  if (departureContext || stayName) {
    fallbackTransfers.push({
      kind: 'departure',
      title: 'Departure transfer',
      from: stayName,
      to: departureContext,
      time: request.departureTime ?? null,
      notes: departureContext
        ? 'End the trip by leaving the stay in time for the stated departure transfer.'
        : null,
    });
  }

  if (!Array.isArray(transfers) || transfers.length === 0) {
    return fallbackTransfers;
  }

  return transfers
    .filter((transfer) => transfer.kind === 'arrival' || transfer.kind === 'departure')
    .map((transfer) => ({
      kind: transfer.kind,
      title: transfer.title,
      from: transfer.from ?? null,
      to: transfer.to ?? null,
      time: transfer.time ?? null,
      notes: transfer.notes ?? null,
    }));
}

function buildPoiContext(pois: PointOfInterest[]): string {
  if (pois.length === 0) {
    return 'No live POIs were returned for this destination. Use generic exploration activities without inventing venue names.';
  }

  return pois
    .map((poi, index) => {
      const tags = poi.tags ?? {};
      const detail = [
        tags.cuisine ? `cuisine: ${tags.cuisine}` : null,
        tags.opening_hours ? `hours: ${tags.opening_hours}` : null,
        tags.fee === 'yes' ? 'paid entry' : null,
        tags.website || tags['contact:website'] ? 'has website' : null,
      ]
        .filter(Boolean)
        .join(', ');

      return `${index + 1}. ${poi.name} | ${poi.type} | ${poi.latitude},${poi.longitude}${poi.address ? ` | ${poi.address}` : ''}${detail ? ` | ${detail}` : ''}`;
    })
    .join('\n');
}

// Deterministic safety net used only when every AI provider fails. It lays the
// real, already-prioritised POIs out across the days with honest, concrete
// descriptions — no invented venue names and no flowery filler. When the live
// POIs run out, the remaining time is left as honest open exploration rather than
// padded with fictional stops.
export function buildFallbackDailyPlans(input: {
  destination: DestinationSearchResult;
  pois: PointOfInterest[];
  duration: number;
  request: ItineraryGenerationInput;
  profile: PaceProfile;
}): ItineraryDayPlan[] {
  const sights = input.pois.filter((poi) => inferPoiCategoryFromPoi(poi) !== 'stay');
  const times =
    input.profile.intensity === 'Relaxed'
      ? ['09:30', '13:00', '16:30']
      : ['09:00', '11:30', '14:00', '16:30', '19:00'];
  const plans: ItineraryDayPlan[] = [];
  let cursor = 0;

  for (let dayIndex = 0; dayIndex < input.duration; dayIndex += 1) {
    const activities: ItineraryActivity[] = [];

    for (let slot = 0; slot < input.profile.activityCount; slot += 1) {
      const time = times[slot] ?? `${9 + slot * 2}:00`;
      const poi = sights[cursor];

      if (!poi) {
        // Out of live anchors: keep the day honest instead of inventing a venue.
        if (activities.length === 0) {
          activities.push({
            time,
            name: `Explore ${input.destination.name}`,
            description: `Open time to wander ${input.destination.name} at your own pace or revisit a favourite spot.`,
            duration: 60,
            cost: null,
            estimated_cost: null,
            category: 'other',
            latitude: input.destination.latitude ?? null,
            longitude: input.destination.longitude ?? null,
            address: input.destination.address ?? input.destination.name,
          });
        }
        break;
      }

      cursor += 1;
      const category = inferPoiCategoryFromPoi(poi);
      const locationHint = poi.address ? ` (${poi.address})` : '';
      activities.push({
        time,
        name: poi.name,
        description:
          category === 'food'
            ? `Stop for a meal at ${poi.name}${locationHint}.`
            : `Visit ${poi.name}${locationHint}, one of the notable ${category === 'other' ? 'spots' : `${category} spots`} in ${input.destination.name}.`,
        duration: slot === 0 ? 90 : 75,
        cost: category === 'food' ? 20 : 0,
        estimated_cost: category === 'food' ? 20 : 0,
        category,
        latitude: poi.latitude,
        longitude: poi.longitude,
        address: poi.address ?? input.destination.address ?? input.destination.name,
      });
    }

    plans.push({
      day: dayIndex + 1,
      date: `Day ${dayIndex + 1}`,
      theme:
        input.profile.intensity === 'Relaxed'
          ? dayIndex === 0
            ? `Ease into ${input.destination.name}`
            : `${input.destination.name} at a slower pace`
          : dayIndex === 0
            ? `Start in ${input.destination.name}`
            : `${input.destination.name} at your pace`,
      activities,
      restSlots:
        input.profile.intensity === 'Relaxed'
          ? [{ time: '14:30', duration: '60 minutes' }]
          : [{ time: '14:30', duration: '45 minutes' }],
      totalActiveHours:
        input.profile.intensity === 'Relaxed' ? 4.5 : input.profile.intensity === 'Packed' ? 7 : 5.5,
      intensity: input.profile.intensity,
    });
  }

  return plans;
}

function buildFallbackItinerary(input: {
  request: ItineraryGenerationInput;
  destination: DestinationSearchResult;
  stayCandidates: PointOfInterest[];
  weather: WeatherSnapshot | null;
  pois: PointOfInterest[];
  duration: number;
  stay: TravelStay | null;
  profile: PaceProfile;
  currency: TripCurrency;
}): GeneratedItinerary {
  const dailyPlans = buildFallbackDailyPlans({
    destination: input.destination,
    pois: input.pois,
    duration: input.duration,
    request: input.request,
    profile: input.profile,
  });
  const estimatedCost =
    typeof input.request.budget === 'number' && Number.isFinite(input.request.budget)
      ? input.request.budget
      : typeof input.request.budget === 'string' && Number.isFinite(Number.parseFloat(input.request.budget))
        ? Number.parseFloat(input.request.budget)
        : null;

  return {
    title: `${input.destination.name} trip on wayflo`,
    destination: input.destination.name,
    duration: input.duration,
    stay: input.stay,
    transfers: normalizeTransfers(undefined, input.request, input.stay),
    dailyPlans,
    daily_plans: dailyPlans,
    totalEstimatedCost: estimatedCost,
    total_estimated_cost: estimatedCost,
    budgetBreakdown: {
      flights: null,
      hotels: null,
      food: null,
      activities: null,
      transport: null,
      misc: null,
      total: estimatedCost,
    },
    budget_breakdown: {
      flights: null,
      hotels: null,
      food: null,
      activities: null,
      transport: null,
      misc: null,
      total: estimatedCost,
    },
    tips: [
      `Use the trip page to refine ${input.destination.name} day by day.`,
      input.weather ? `Weather: ${input.weather.description}.` : 'Weather data was unavailable for this run.',
      input.stay ? `Stay: ${input.stay.name}.` : 'No live stay was selected, so the trip stays flexible.',
    ],
    currency: input.currency,
    sourceData: {
      destination: input.destination,
      weather: input.weather,
      pois: input.pois,
      stayCandidates: input.stayCandidates,
      confirmation: input.request.confirmation ?? null,
      tripWindow: {
        arrivalDate: input.request.arrivalDate ?? null,
        departureDate: input.request.departureDate ?? null,
        arrivalTime: input.request.arrivalTime ?? null,
        departureTime: input.request.departureTime ?? null,
        timezone: input.request.confirmation?.tripWindow.timezone ?? null,
      },
    },
  };
}

function buildItineraryPrompt(input: {
  request: ItineraryGenerationInput;
  destination: DestinationSearchResult;
  weather: WeatherSnapshot | null;
  pois: PointOfInterest[];
  stayOptions: PointOfInterest[];
  duration: number;
  profile: PaceProfile;
  currency: TripCurrency;
}): string {
  const interestList = input.request.interests?.filter(Boolean).join(', ') || 'No interests provided';
  const dietaryRestrictions =
    input.request.dietaryRestrictions?.filter(Boolean).join(', ') || 'None provided';
  const weatherSummary = input.weather
    ? `${input.weather.description}, ${input.weather.temperature}C, feels like ${input.weather.feelsLike}C, wind ${input.weather.windSpeed} km/h`
    : 'Weather unavailable';
  const activityCap = `Keep each day to at most ${input.profile.activityCount} activities.`;
  const confirmationSummary = buildConfirmationContext(input.request.confirmation);
  const paceGuidance = buildPaceGuidance(input.profile);

  return `
You are generating a production travel itinerary as strict JSON.

Trip request:
- destination: ${input.destination.name}
- duration_days: ${input.duration}
- budget_context: ${normalizeBudgetLabel(input.request.budget, input.currency)}
- cost_currency: ${input.currency.display} (express every cost in this currency)
- interests: ${interestList}
- activity_intensity: ${input.request.activityIntensity ?? 'Not provided'}
- arrival_method: ${input.request.arrivalMethod ?? 'Not provided'}
- arrival_date: ${input.request.arrivalDate ?? 'Not provided'}
- departure_date: ${input.request.departureDate ?? 'Not provided'}
- arrival_time: ${input.request.arrivalTime ?? 'Not provided'}
- departure_time: ${input.request.departureTime ?? 'Not provided'}
- arrival_transfer_context: ${buildTransferHint('arrival', input.request.arrivalTransferContext, null)}
- departure_transfer_context: ${buildTransferHint('departure', input.request.departureTransferContext, null)}
- dietary_restrictions: ${dietaryRestrictions}
- weather_snapshot: ${weatherSummary}
- booking_confirmation_context: ${confirmationSummary}
- pace_profile: ${input.profile.intensity}

Live POIs for this destination:
${buildPoiContext(input.pois)}

Live stay options:
${buildStayContext(input.stayOptions, input.destination)}

Rules:
- Use only POI names from the live POI list for named activities.
- Do not invent attractions, restaurants, or destination names.
- Do not ask the user for a hotel or lodging preference. Choose the stay from live stay options only.
- ${paceGuidance}
- Keep activities geographically plausible.
- Treat arrival_time as the earliest possible start on day 1.
- Do not place any activity before arrival_time on the first day.
- Treat departure_time as a hard stop on the final day.
- If the trip starts and ends on the same calendar day, keep everything inside that time window.
- Do not assume the day begins at 09:00 unless that is within the user window.
- If a live stay option exists, include one best stay in the stay field using only the live stay options.
- If no stay option is available, return stay as null rather than inventing lodging.
- Include a transfers array with arrival and departure transfer details.
- The arrival transfer should move the traveler from their provided arrival context to the stay.
- The departure transfer should move the traveler from the stay to their provided departure context.
- Do not invent station, airport, or hotel names that were not provided by the user or live data.
- Return one itinerary covering all ${input.duration} days.
- All costs must be numeric or null, expressed in ${input.currency.display} (the destination's local currency), not converted to any other currency.
- All coordinates must come from the POI list when the activity is a venue.
- Avoid repeating the same venue type across the whole trip unless the destination genuinely lacks variety.
- If the itinerary is relaxed, do not turn every day into restaurant stops; use scenic, cultural, park, or neighborhood activities for most of the plan.
- Spread the trip across different neighborhoods or city sectors instead of clustering all stops in one area.
- ${activityCap}
- Write each activity description as one or two sentences that give a concrete reason to go and a useful, specific detail (what to see, eat, or know) drawn from the POI data when available.
- When a POI lists opening hours or paid entry, reflect it in the timing or description and do not schedule it when closed.
- Do not use filler phrases like "spend time at" or "explore the area"; be specific to the place.
`.trim();
}

function buildConfirmationContext(confirmation: BookingConfirmationExtraction | null | undefined): string {
  if (!confirmation) {
    return 'Not provided';
  }

  const flightSummary = confirmation.flightSegments
    .slice(0, 3)
    .map((segment) => {
      const flightNumber = segment.flightNumber ? `${segment.flightNumber}` : 'flight';
      const route = [segment.departurePlace, segment.arrivalPlace].filter(Boolean).join(' -> ');
      const time = [segment.departureDate, segment.departureTime, segment.arrivalDate, segment.arrivalTime]
        .filter(Boolean)
        .join(' ');

      return [segment.airline, flightNumber, route, time].filter(Boolean).join(' | ');
    })
    .join('; ');

  const transportSummary = confirmation.transportLegs
    .slice(0, 3)
    .map((leg) => [leg.kind, leg.provider, leg.from, leg.to, leg.date, leg.time].filter(Boolean).join(' | '))
    .join('; ');

  const reservationSummary = confirmation.reservations
    .slice(0, 3)
    .map((reservation) => [reservation.kind, reservation.vendor, reservation.confirmationCode, reservation.date].filter(Boolean).join(' | '))
    .join('; ');

  return [
    `destination_hint: ${confirmation.destinationName}`,
    `trip_window: ${[
      confirmation.tripWindow.arrivalDate,
      confirmation.tripWindow.arrivalTime,
      confirmation.tripWindow.departureDate,
      confirmation.tripWindow.departureTime,
    ]
      .filter(Boolean)
      .join(' -> ') || 'Not provided'}`,
    `arrival_method: ${confirmation.arrivalMethod ?? 'Not provided'}`,
    `stay: ${confirmation.stay ? [confirmation.stay.name, confirmation.stay.address, confirmation.stay.checkInDate, confirmation.stay.checkOutDate].filter(Boolean).join(' | ') : 'Not provided'}`,
    `flight_segments: ${flightSummary || 'Not provided'}`,
    `transport_legs: ${transportSummary || 'Not provided'}`,
    `reservations: ${reservationSummary || 'Not provided'}`,
    `summary: ${confirmation.summary}`,
  ].join('\n- ');
}

export async function generateItineraryFromLiveData(
  request: ItineraryGenerationInput
): Promise<GeneratedItinerary> {
  if (!request.destination?.trim()) {
    throw new Error('Destination is required');
  }

  const duration = normalizeDuration(request);
  const paceProfile = getPaceProfile(request.activityIntensity, request.interests ?? []);
  const fastMode = duration <= 2;
  const hasCoordinates =
    typeof request.latitude === 'number' && typeof request.longitude === 'number';
  const destinationNameHint = request.resolvedDestination?.name ?? request.destination.trim();
  const destinationPromise = request.resolvedDestination
    ? Promise.resolve(request.resolvedDestination)
    : resolveDestination(request.destination, {
        latitude: request.latitude,
        longitude: request.longitude,
      }, {
        skipReverseGeocode: hasCoordinates,
      }).catch((): DestinationSearchResult => ({
        name: request.destination.trim(),
        latitude: request.latitude ?? 0,
        longitude: request.longitude ?? 0,
        type: 'destination',
        address: request.destination.trim(),
      }));
  const poiTypes = derivePoiTypes(request.interests ?? []);
  // Fetch a wider candidate pool than we ultimately prompt with; prioritizePois
  // trims to its category-balanced top 8, so a richer pool means better sights.
  const poiLimit = duration <= 2 ? 16 : duration > 7 ? 14 : 12;
  const stayLimit = duration <= 2 ? 2 : duration > 7 ? 3 : 4;
  const poiPromise = hasCoordinates
    ? fetchPointsOfInterest({
        latitude: request.latitude as number,
        longitude: request.longitude as number,
        radius: duration <= 2 ? 10_000 : 9_000,
        types: poiTypes,
        limit: poiLimit,
        timeoutMs: fastMode ? 5_000 : 8_000,
        fallbackQuery: destinationNameHint,
      })
    : Promise.resolve([] as PointOfInterest[]);
  const stayPromise = hasCoordinates
    ? fetchPointsOfInterest({
        latitude: request.latitude as number,
        longitude: request.longitude as number,
        radius: duration <= 2 ? 4_000 : 5_000,
        types: ['hotel', 'guest_house', 'hostel', 'motel', 'apartment'],
        limit: stayLimit,
        timeoutMs: fastMode ? 4_000 : 7_000,
        fallbackQuery: destinationNameHint,
      })
    : Promise.resolve([] as PointOfInterest[]);
  const weatherPromise = hasCoordinates
    ? fastMode
      ? Promise.resolve(null as WeatherSnapshot | null)
      : fetchWeatherSnapshot(request.latitude as number, request.longitude as number)
    : Promise.resolve(null as WeatherSnapshot | null);

  const [destinationResult, poIResult, stayResult, weatherResult] = await Promise.allSettled([
    destinationPromise,
    poiPromise,
    stayPromise,
    weatherPromise,
  ]);

  const destination =
    destinationResult.status === 'fulfilled'
      ? destinationResult.value
      : ({
          name: request.destination.trim(),
          latitude: request.latitude ?? 0,
          longitude: request.longitude ?? 0,
          type: 'destination',
          address: request.destination.trim(),
        } satisfies DestinationSearchResult);
  const pois = poIResult.status === 'fulfilled' ? poIResult.value : [];
  const stayCandidatesRaw = stayResult.status === 'fulfilled' ? stayResult.value : [];
  const weather = weatherResult.status === 'fulfilled' ? weatherResult.value : null;
  const prioritizedPois = prioritizePois(pois, request.interests ?? [], destination);
  const prioritizedStayCandidates = prioritizeStayCandidates(stayCandidatesRaw, destination);
  // Gemini 2.5 Flash-Lite supports 8k output tokens. The schema marks every field
  // required, so the JSON is verbose; an undersized budget truncates mid-array and
  // forces the deterministic fallback. Keep a generous floor so short trips with
  // rich descriptions still complete.
  const maxTokens = Math.min(7168, Math.max(3200, 1800 + duration * 500));
  // Item costs are written in the destination's currency; the budget headline is
  // converted to the traveler's home currency for a familiar total.
  const currency = await resolveTripCurrency({
    destinationCountryCode: request.destinationCountryCode ?? destination.countryCode,
    homeCurrency: request.homeCurrency,
  });

  try {
    const payload = await generateJson<GeminiItineraryPayload>(
      buildItineraryPrompt({
        request,
        destination,
        weather,
        pois: prioritizedPois,
        stayOptions: prioritizedStayCandidates,
        duration,
        profile: paceProfile,
        currency,
      }),
      {
        maxTokens,
        repairMaxTokens: Math.max(900, Math.floor(maxTokens / 2)),
        skipRepair: false,
        timeoutMs: duration <= 2 ? 22_000 : 28_000,
        responseSchema: geminiItineraryResponseSchema as Record<string, unknown>,
        temperature: 0.6,
      }
    );

    if (!payload.dailyPlans?.length) {
      throw new Error('The model did not return any itinerary days');
    }

    const rebalancePlans = rebalanceDailyPlansForPace(
      normalizeDayPlans(payload.dailyPlans, destination),
      request
    );
    const dailyPlans = attachCoordinatesByName(rebalancePlans, prioritizedPois, destination);
    const totalEstimatedCost = payload.totalEstimatedCost ?? null;
    const budgetBreakdown = normalizeBudgetBreakdown(payload.budgetBreakdown, totalEstimatedCost);
    const stay = normalizeStay(payload.stay, prioritizedStayCandidates[0] ?? null, request);
    const transfers = normalizeTransfers(payload.transfers, request, stay);
    const tripDestination = destination.name;

    return {
      title: `${tripDestination} trip on wayflo`,
      destination: tripDestination,
      duration,
      stay,
      transfers,
      dailyPlans,
      daily_plans: dailyPlans,
      totalEstimatedCost,
      total_estimated_cost: totalEstimatedCost,
      budgetBreakdown,
      budget_breakdown: budgetBreakdown,
      tips: payload.tips ?? [],
      currency,
      sourceData: {
        destination,
        weather,
        pois,
        stayCandidates: stayCandidatesRaw,
        confirmation: request.confirmation ?? null,
        tripWindow: {
          arrivalDate: request.arrivalDate ?? null,
          departureDate: request.departureDate ?? null,
          arrivalTime: request.arrivalTime ?? null,
          departureTime: request.departureTime ?? null,
          timezone: request.confirmation?.tripWindow.timezone ?? null,
        },
      },
    };
  } catch (error) {
    console.warn('[itinerary] falling back to deterministic itinerary', error);
    const stay = normalizeStay(null, prioritizedStayCandidates[0] ?? null, request);

    return buildFallbackItinerary({
      request,
      destination,
      stayCandidates: stayCandidatesRaw,
      weather,
      pois: prioritizedPois,
      duration,
      stay,
      currency,
      profile: paceProfile,
    });
  }
}
