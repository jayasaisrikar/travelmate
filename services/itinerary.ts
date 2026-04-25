import { generateJson } from '@/services/gemini';
import {
  derivePoiTypes,
  fetchPointsOfInterest,
  resolveDestination,
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

function normalizeDuration(input: ItineraryGenerationInput): number {
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

function normalizeBudgetLabel(budget: ItineraryGenerationInput['budget']): string {
  if (typeof budget === 'number' && Number.isFinite(budget)) {
    return `Total budget: ${budget} USD`;
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

function normalizeDayPlans(
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

function coordinatesMatch(
  left: { latitude: number | null; longitude: number | null },
  right: { latitude: number; longitude: number }
): boolean {
  const leftLat = normalizeCoordinate(left.latitude);
  const leftLon = normalizeCoordinate(left.longitude);

  if (leftLat === null || leftLon === null) {
    return false;
  }

  return Math.abs(leftLat - right.latitude) < 0.0001 && Math.abs(leftLon - right.longitude) < 0.0001;
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
  preferredCategories: Exclude<PoiCategory, 'stay'>[];
  restSlots: number;
}

const GENERIC_ACTIVITY_NAMES: Record<Exclude<PoiCategory, 'stay'>, string[]> = {
  food: ['Lunch at a local spot', 'Easy meal break', 'Relaxed lunch stop'],
  culture: ['Museum stop', 'Gallery visit', 'Historic district walk'],
  park: ['Park break', 'Waterfront walk', 'Garden pause'],
  shopping: ['Market browse', 'Street stroll', 'Local shop wander'],
  other: ['Slow neighborhood walk', 'Easy afternoon pause', 'Sunset stroll'],
};

const GENERIC_ACTIVITY_DESCRIPTIONS: Record<Exclude<PoiCategory, 'stay'>, string[]> = {
  food: ['Keep the meal simple and unhurried.', 'Pause for a low-key local meal.', 'Take a gentle break for lunch.'],
  culture: ['Spend a calm stretch exploring a cultural stop.', 'Take your time at a local landmark.', 'Enjoy one anchored stop without rushing.'],
  park: ['Keep the pace light with a scenic outdoor break.', 'Take an easy walk and reset.', 'Leave room to linger and breathe.'],
  shopping: ['Browse without making it the whole day.', 'Keep this as a short and casual stop.', 'Move through the area at an easy pace.'],
  other: ['Leave space for wandering and downtime.', 'Keep the day light and flexible.', 'Use this as a slow reset between anchors.'],
};

function inferPoiCategoryFromPoi(poi: PointOfInterest): PoiCategory {
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
    normalizedName.includes('museum') ||
    normalizedName.includes('gallery') ||
    normalizedName.includes('temple') ||
    normalizedName.includes('church') ||
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

function inferPoiCategoryFromActivity(activity: ItineraryActivity): PoiCategory {
  const normalized = normalizeSearchText(`${activity.category} ${activity.name} ${activity.description}`);

  if (
    normalized.includes('hotel') ||
    normalized.includes('stay') ||
    normalized.includes('check in') ||
    normalized.includes('check in') ||
    normalized.includes('lodg')
  ) {
    return 'stay';
  }

  if (
    normalized.includes('food') ||
    normalized.includes('restaurant') ||
    normalized.includes('cafe') ||
    normalized.includes('lunch') ||
    normalized.includes('dinner') ||
    normalized.includes('breakfast') ||
    normalized.includes('meal')
  ) {
    return 'food';
  }

  if (
    normalized.includes('museum') ||
    normalized.includes('gallery') ||
    normalized.includes('culture') ||
    normalized.includes('historic') ||
    normalized.includes('temple') ||
    normalized.includes('church') ||
    normalized.includes('art')
  ) {
    return 'culture';
  }

  if (
    normalized.includes('park') ||
    normalized.includes('garden') ||
    normalized.includes('nature') ||
    normalized.includes('walk') ||
    normalized.includes('stroll')
  ) {
    return 'park';
  }

  if (
    normalized.includes('shop') ||
    normalized.includes('market') ||
    normalized.includes('mall') ||
    normalized.includes('shopping') ||
    normalized.includes('souvenir')
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

function getPaceProfile(intensity: string | null | undefined, interests: string[] | null | undefined): PaceProfile {
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
      preferredCategories: ['culture', 'park', 'shopping', 'other', 'food'],
      restSlots: 1,
    };
  }

  if (normalizedIntensity === 'Packed') {
    return {
      intensity: 'Packed',
      activityCount: 5,
      maxFoodPerDay: wantsFood ? 2 : 1,
      preferredCategories: ['culture', 'shopping', 'park', 'food', 'other'],
      restSlots: 1,
    };
  }

  return {
    intensity: 'Balanced',
    activityCount: 4,
    maxFoodPerDay: wantsFood ? 1 : 1,
    preferredCategories: ['culture', 'park', 'food', 'shopping', 'other'],
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

function createGenericActivity(
  category: Exclude<PoiCategory, 'stay'>,
  destination: DestinationSearchResult,
  dayIndex: number,
  activityIndex: number
): Pick<ItineraryActivity, 'name' | 'description' | 'category'> {
  const nameOptions = GENERIC_ACTIVITY_NAMES[category];
  const descriptionOptions = GENERIC_ACTIVITY_DESCRIPTIONS[category];
  const name = nameOptions[(dayIndex + activityIndex) % nameOptions.length];
  const description = descriptionOptions[(dayIndex * 2 + activityIndex) % descriptionOptions.length];

  return {
    name: `${name} in ${destination.name}`,
    description,
    category,
  };
}

function bucketPoisByCategory(pois: PointOfInterest[]) {
  const buckets = new Map<Exclude<PoiCategory, 'stay'>, PointOfInterest[]>();

  for (const category of ['food', 'culture', 'park', 'shopping', 'other'] as const) {
    buckets.set(category, []);
  }

  for (const poi of pois) {
    const category = inferPoiCategoryFromPoi(poi);

    if (category === 'stay') {
      continue;
    }

    const bucket = buckets.get(category as Exclude<PoiCategory, 'stay'>);

    if (bucket) {
      bucket.push(poi);
    }
  }

  return buckets;
}

function pickPoiFromBucket(
  buckets: Map<Exclude<PoiCategory, 'stay'>, PointOfInterest[]>,
  category: Exclude<PoiCategory, 'stay'>,
  usedPoiKeys: Set<string>
): PointOfInterest | null {
  const bucket = buckets.get(category);

  if (!bucket) {
    return null;
  }

  while (bucket.length > 0) {
    const candidate = bucket.shift() as PointOfInterest;
    const key = `${candidate.name.toLowerCase()}-${candidate.latitude.toFixed(4)}-${candidate.longitude.toFixed(4)}`;

    if (usedPoiKeys.has(key)) {
      continue;
    }

    usedPoiKeys.add(key);
    return candidate;
  }

  return null;
}

function selectSlotCategories(profile: PaceProfile): Exclude<PoiCategory, 'stay'>[] {
  const slots: Exclude<PoiCategory, 'stay'>[] = [];
  let foodCount = 0;

  for (const category of profile.preferredCategories) {
    if (slots.length >= profile.activityCount) {
      break;
    }

    if (category === 'food') {
      if (foodCount >= profile.maxFoodPerDay) {
        continue;
      }

      foodCount += 1;
    }

    slots.push(category);
  }

  while (slots.length < profile.activityCount) {
    slots.push(slots.length % 2 === 0 ? 'other' : 'park');
  }

  return slots.slice(0, profile.activityCount);
}

function rebalanceDailyPlansForPace(
  dailyPlans: ItineraryDayPlan[],
  destination: DestinationSearchResult,
  request: ItineraryGenerationInput
): ItineraryDayPlan[] {
  const profile = getPaceProfile(request.activityIntensity, request.interests ?? []);
  const wantsFood = isFoodInterest(request.interests ?? []);
  const maxFoodPerDay = profile.intensity === 'Relaxed' && !wantsFood ? 0 : profile.maxFoodPerDay;

  return dailyPlans.map((dayPlan, dayIndex) => {
    const seenNames = new Set<string>();
    let foodCount = 0;

    const activities = dayPlan.activities
      .slice(0, profile.activityCount)
      .map((activity, activityIndex) => {
        const category = inferPoiCategoryFromActivity(activity);
        const normalizedName = normalizeSearchText(activity.name);
        const duplicateName = seenNames.has(normalizedName);
        const isFoodActivity = category === 'food';
        const shouldReplace = duplicateName || (isFoodActivity && foodCount >= maxFoodPerDay);

        if (!shouldReplace) {
          seenNames.add(normalizedName);

          if (isFoodActivity) {
            foodCount += 1;
          }

          return { ...activity };
        }

        const fallbackCategory =
          profile.preferredCategories[(dayIndex + activityIndex) % profile.preferredCategories.length] ?? 'other';
        const replacementCategory =
          fallbackCategory === 'food' && foodCount >= maxFoodPerDay
            ? profile.preferredCategories.find((candidate) => candidate !== 'food') ?? 'other'
            : fallbackCategory;

        const generic = createGenericActivity(replacementCategory, destination, dayIndex, activityIndex);

        if (replacementCategory === 'food') {
          foodCount += 1;
        }

        seenNames.add(normalizeSearchText(generic.name));

        return {
          ...activity,
          ...generic,
          latitude: null,
          longitude: null,
          address: activity.address ?? destination.address ?? destination.name,
        };
      });

    return {
      ...dayPlan,
      activities,
      restSlots: dayPlan.restSlots ?? [{ time: '14:00', duration: profile.restSlots === 1 ? '45 minutes' : '30 minutes' }],
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

function scorePoiForActivity(activity: ItineraryActivity, poi: PointOfInterest): number {
  const activityName = normalizeSearchText(activity.name);
  const activityCategory = normalizeSearchText(activity.category);
  const poiName = normalizeSearchText(poi.name);
  const poiType = normalizeSearchText(poi.type);
  let score = 0;

  if (activityName && poiName) {
    if (activityName === poiName) {
      score += 8;
    } else if (activityName.includes(poiName) || poiName.includes(activityName)) {
      score += 5;
    }
  }

  if (activityName && poiType && (activityName.includes(poiType) || poiType.includes(activityName))) {
    score += 4;
  }

  if (activityCategory && poiType && (activityCategory.includes(poiType) || poiType.includes(activityCategory))) {
    score += 3;
  }

  if (activity.address && poi.address) {
    const activityAddress = normalizeSearchText(activity.address);
    const poiAddress = normalizeSearchText(poi.address);

    if (activityAddress && poiAddress && (activityAddress.includes(poiAddress) || poiAddress.includes(activityAddress))) {
      score += 2;
    }
  }

  return score;
}

function attachPoiCoordinates(
  dailyPlans: ItineraryDayPlan[],
  pois: PointOfInterest[],
  destination: DestinationSearchResult,
  options?: {
    maxFoodPerDay?: number;
  }
): ItineraryDayPlan[] {
  const coordinatePois = pois.filter((poi) => hasCoordinates(poi));
  const usedPoiIndices = new Set<number>();
  const globalSectorCounts = new Map<number, number>();
  const maxFoodCount = options?.maxFoodPerDay ?? 1;

  return dailyPlans.map((dayPlan) => {
    const daySectorCounts = new Map<number, number>();
    let dayFoodCount = 0;

    return {
      ...dayPlan,
      activities: dayPlan.activities.map((activity) => {
        let bestPoiIndex = -1;
        let bestScore = Number.NEGATIVE_INFINITY;
        const activityCategory = inferPoiCategoryFromActivity(activity);

        for (let index = 0; index < coordinatePois.length; index += 1) {
          if (usedPoiIndices.has(index)) {
            continue;
          }

          const poi = coordinatePois[index];
          const poiCategory = inferPoiCategoryFromPoi(poi);
          const sector = getPoiSector(destination, poi);
          let score = scorePoiForActivity(activity, poi);

          if (activityCategory === poiCategory) {
            score += 5;
          }

          if (activityCategory === 'food' && poiCategory === 'food') {
            score += 4;
          } else if (activityCategory === 'food' && poiCategory !== 'food') {
            score += 1;
          } else if (activityCategory !== 'food' && poiCategory === 'food') {
            score -= 5;
          }

          if (dayFoodCount >= maxFoodCount && poiCategory === 'food') {
            score -= 20;
          }

          const sectorUsage = daySectorCounts.get(sector) ?? 0;
          const globalSectorUsage = globalSectorCounts.get(sector) ?? 0;

          score += sectorUsage === 0 ? 4 : -2;
          score += globalSectorUsage === 0 ? 2 : -globalSectorUsage * 1.25;

          if (score > bestScore) {
            bestScore = score;
            bestPoiIndex = index;
          }
        }

        if (bestPoiIndex === -1) {
          for (let index = 0; index < coordinatePois.length; index += 1) {
            if (!usedPoiIndices.has(index)) {
              bestPoiIndex = index;
              break;
            }
          }
        }

        if (bestPoiIndex === -1) {
          return {
            ...activity,
            latitude: destination.latitude,
            longitude: destination.longitude,
            address: activity.address ?? destination.address ?? destination.name,
          };
        }

        usedPoiIndices.add(bestPoiIndex);
        const poi = coordinatePois[bestPoiIndex];
        const poiCategory = inferPoiCategoryFromPoi(poi);
        const sector = getPoiSector(destination, poi);
        daySectorCounts.set(sector, (daySectorCounts.get(sector) ?? 0) + 1);
        globalSectorCounts.set(sector, (globalSectorCounts.get(sector) ?? 0) + 1);

        if (poiCategory === 'food') {
          dayFoodCount += 1;
        }

        return {
          ...activity,
          name: poi.name,
          category: poiCategory === 'stay' ? activity.category : poiCategory,
          latitude: poi.latitude,
          longitude: poi.longitude,
          address: activity.address ?? poi.address ?? destination.address ?? destination.name,
          description:
            poiCategory === 'stay'
              ? activity.description
              : `Spend time at ${poi.name}${poi.address ? ` near ${poi.address}` : ''}.`,
        };
      }),
    };
  });
}

function normalizeBudgetBreakdown(
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

function prioritizePois(
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

function haversineDistanceKm(
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

function normalizeStay(
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

function normalizeTransfers(
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
    .map(
      (poi, index) =>
        `${index + 1}. ${poi.name} | ${poi.type} | ${poi.latitude},${poi.longitude}${poi.address ? ` | ${poi.address}` : ''}`
    )
    .join('\n');
}

function buildFallbackDailyPlans(input: {
  destination: DestinationSearchResult;
  pois: PointOfInterest[];
  duration: number;
  request: ItineraryGenerationInput;
  profile: PaceProfile;
}): ItineraryDayPlan[] {
  const buckets = bucketPoisByCategory(input.pois);
  const usedPoiKeys = new Set<string>();
  const plans: ItineraryDayPlan[] = [];
  const slotCategories = selectSlotCategories(input.profile);

  for (let dayIndex = 0; dayIndex < input.duration; dayIndex += 1) {
    const activities: ItineraryActivity[] = [];

    slotCategories.forEach((slotCategory, activityIndex) => {
      const time =
        input.profile.intensity === 'Relaxed'
          ? ['09:30', '13:00', '16:30'][activityIndex] ?? `${10 + activityIndex * 2}:00`
          : ['09:00', '12:00', '15:30', '18:00', '20:00'][activityIndex] ?? `${9 + activityIndex * 2}:00`;
      const poi = pickPoiFromBucket(buckets, slotCategory, usedPoiKeys);

      if (poi) {
        const poiCategory = inferPoiCategoryFromPoi(poi);
        activities.push({
          time,
          name: poi.name,
          description:
            poiCategory === 'food'
              ? `Keep the meal simple and easy at ${poi.name}${poi.address ? ` near ${poi.address}` : ''}.`
              : `Spend a calm stretch at ${poi.name}${poi.address ? ` near ${poi.address}` : ''}.`,
          duration: activityIndex === 0 ? 90 : 75,
          cost: poiCategory === 'food' ? 20 : 0,
          estimated_cost: poiCategory === 'food' ? 20 : 0,
          category: poiCategory,
          latitude: poi.latitude,
          longitude: poi.longitude,
          address: poi.address ?? input.destination.address ?? input.destination.name,
        });
        return;
      }

      activities.push({
        time,
        ...createGenericActivity(slotCategory, input.destination, dayIndex, activityIndex),
        duration: activityIndex === 0 ? 90 : 75,
        cost: slotCategory === 'food' ? 20 : 0,
        estimated_cost: slotCategory === 'food' ? 20 : 0,
        latitude: input.destination.latitude ?? null,
        longitude: input.destination.longitude ?? null,
        address: input.destination.address ?? input.destination.name,
      });
    });

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
    sourceData: {
      destination: input.destination,
      weather: input.weather,
      pois: input.pois,
      stayCandidates: input.stayCandidates,
      confirmation: input.request.confirmation ?? null,
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
- budget_context: ${normalizeBudgetLabel(input.request.budget)}
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
- All costs must be numeric or null.
- All coordinates must come from the POI list when the activity is a venue.
- Avoid repeating the same venue type across the whole trip unless the destination genuinely lacks variety.
- If the itinerary is relaxed, do not turn every day into restaurant stops; use scenic, cultural, park, or neighborhood activities for most of the plan.
- Spread the trip across different neighborhoods or city sectors instead of clustering all stops in one area.
- ${activityCap}
- Keep each activity description to one short sentence.
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
      }).catch(() => ({
        name: request.destination.trim(),
        latitude: request.latitude ?? 0,
        longitude: request.longitude ?? 0,
        type: 'destination',
        address: request.destination.trim(),
      }));
  const poiTypes = derivePoiTypes(request.interests ?? []);
  const poiLimit = duration <= 2 ? 5 : duration > 7 ? 8 : duration > 3 ? 10 : 12;
  const stayLimit = duration <= 2 ? 2 : duration > 7 ? 3 : 4;
  const poiPromise = hasCoordinates
    ? fetchPointsOfInterest({
        latitude: request.latitude as number,
        longitude: request.longitude as number,
        radius: duration <= 2 ? 6_000 : 8_000,
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
      : {
          name: request.destination.trim(),
          latitude: request.latitude ?? 0,
          longitude: request.longitude ?? 0,
          type: 'destination',
          address: request.destination.trim(),
      };
  const pois = poIResult.status === 'fulfilled' ? poIResult.value : [];
  const stayCandidatesRaw = stayResult.status === 'fulfilled' ? stayResult.value : [];
  const weather = weatherResult.status === 'fulfilled' ? weatherResult.value : null;
  const prioritizedPois = prioritizePois(pois, request.interests ?? [], destination);
  const prioritizedStayCandidates = prioritizeStayCandidates(stayCandidatesRaw, destination);
  const maxTokens = duration <= 2 ? 800 : Math.min(3200, 1600 + duration * 320);

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
      }),
      {
        maxTokens,
        repairMaxTokens: Math.max(700, Math.floor(maxTokens / 2)),
        skipRepair: false,
        timeoutMs: duration <= 2 ? 8_000 : 18_000,
        responseSchema: geminiItineraryResponseSchema as Record<string, unknown>,
      }
    );

    if (!payload.dailyPlans?.length) {
      throw new Error('Kimi 2.5 did not return any itinerary days');
    }

    const rebalancePlans = rebalanceDailyPlansForPace(
      normalizeDayPlans(payload.dailyPlans, destination),
      destination,
      request
    );
    const dailyPlans = attachPoiCoordinates(rebalancePlans, prioritizedPois, destination, {
      maxFoodPerDay: paceProfile.maxFoodPerDay,
    });
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
      sourceData: {
        destination,
        weather,
        pois,
        stayCandidates: stayCandidatesRaw,
        confirmation: request.confirmation ?? null,
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
      profile: paceProfile,
    });
  }
}
