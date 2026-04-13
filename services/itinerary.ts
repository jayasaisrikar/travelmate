import { generateJson } from '@/services/gemini';
import {
  derivePoiTypes,
  fetchPointsOfInterest,
  resolveDestination,
  searchStayCandidates,
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

function prioritizePois(pois: PointOfInterest[], interests: string[]): PointOfInterest[] {
  const searchTerms = new Set(interests.map(interest => interest.toLowerCase()));

  return [...pois]
    .sort((left, right) => {
      const leftName = left.name.toLowerCase();
      const rightName = right.name.toLowerCase();
      const leftMatch = Array.from(searchTerms).some(term => leftName.includes(term) || left.type.toLowerCase().includes(term));
      const rightMatch = Array.from(searchTerms).some(term => rightName.includes(term) || right.type.toLowerCase().includes(term));

      if (leftMatch !== rightMatch) {
        return leftMatch ? -1 : 1;
      }

      return left.name.localeCompare(right.name);
    })
    .slice(0, 12);
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

function buildItineraryPrompt(input: {
  request: ItineraryGenerationInput;
  destination: DestinationSearchResult;
  weather: WeatherSnapshot | null;
  pois: PointOfInterest[];
  stayOptions: PointOfInterest[];
  duration: number;
}): string {
  const interestList = input.request.interests?.filter(Boolean).join(', ') || 'No interests provided';
  const dietaryRestrictions =
    input.request.dietaryRestrictions?.filter(Boolean).join(', ') || 'None provided';
  const weatherSummary = input.weather
    ? `${input.weather.description}, ${input.weather.temperature}C, feels like ${input.weather.feelsLike}C, wind ${input.weather.windSpeed} km/h`
    : 'Weather unavailable';
  const activityCap =
    input.duration > 7 ? 'Keep each day to 2 or 3 activities maximum.' : 'Keep each day to 3 or 4 activities maximum.';
  const confirmationSummary = buildConfirmationContext(input.request.confirmation);

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

Live POIs for this destination:
${buildPoiContext(input.pois)}

Live stay options:
${buildStayContext(input.stayOptions, input.destination)}

Rules:
- Use only POI names from the live POI list for named activities.
- Do not invent attractions, restaurants, or destination names.
- Do not ask the user for a hotel or lodging preference. Choose the stay from live stay options only.
- If a day needs lighter pacing, add generic transit/rest/free-time entries, but all venue-specific entries must come from the POI list.
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
- ${activityCap}
- Keep each activity description to one short sentence.

Return only JSON with this shape:
{
  "title": "string",
  "destination": "string",
  "duration": ${input.duration},
  "stay": {
    "name": "string",
    "type": "string",
    "latitude": 0,
    "longitude": 0,
    "address": "string",
    "checkInDate": "YYYY-MM-DD or null",
    "checkInTime": "HH:MM or null",
    "checkOutDate": "YYYY-MM-DD or null",
    "checkOutTime": "HH:MM or null",
    "notes": "string or null"
  },
  "transfers": [
    {
      "kind": "arrival",
      "title": "string",
      "from": "string or null",
      "to": "string or null",
      "time": "HH:MM or null",
      "notes": "string or null"
    },
    {
      "kind": "departure",
      "title": "string",
      "from": "string or null",
      "to": "string or null",
      "time": "HH:MM or null",
      "notes": "string or null"
    }
  ],
  "dailyPlans": [
    {
      "day": 1,
      "date": "YYYY-MM-DD or Day 1",
      "theme": "string",
      "activities": [
        {
          "time": "09:00",
          "name": "string",
          "description": "string",
          "duration": 90,
          "cost": 20,
          "category": "string",
          "latitude": 0,
          "longitude": 0,
          "address": "string"
        }
      ],
      "restSlots": [{ "time": "15:00", "duration": "45 minutes" }],
      "totalActiveHours": 6,
      "intensity": "Balanced"
    }
  ],
  "totalEstimatedCost": 300,
  "budgetBreakdown": {
    "flights": null,
    "hotels": null,
    "food": 90,
    "activities": 140,
    "transport": 40,
    "misc": 30,
    "total": 300
  },
  "tips": ["string", "string", "string"]
}
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
  const hasCoordinates =
    typeof request.latitude === 'number' && typeof request.longitude === 'number';
  const destinationPromise = request.resolvedDestination
    ? Promise.resolve(request.resolvedDestination)
    : resolveDestination(request.destination, {
        latitude: request.latitude,
        longitude: request.longitude,
      }).catch(() => ({
        name: request.destination.trim(),
        latitude: request.latitude ?? 0,
        longitude: request.longitude ?? 0,
        type: 'destination',
        address: request.destination.trim(),
      }));
  const poiTypes = derivePoiTypes(request.interests ?? []);
  const poiLimit = duration > 7 ? 10 : duration > 3 ? 12 : 16;
  const stayLimit = duration > 7 ? 4 : 6;
  const poiPromise = hasCoordinates
    ? fetchPointsOfInterest({
        latitude: request.latitude as number,
        longitude: request.longitude as number,
        radius: 8_000,
        types: poiTypes,
        limit: poiLimit,
      })
    : Promise.resolve([] as PointOfInterest[]);
  const stayPromise = hasCoordinates
    ? fetchPointsOfInterest({
        latitude: request.latitude as number,
        longitude: request.longitude as number,
        radius: 5_000,
        types: ['hotel', 'guest_house', 'hostel', 'motel', 'apartment'],
        limit: stayLimit,
      })
    : Promise.resolve([] as PointOfInterest[]);
  const weatherPromise = hasCoordinates
    ? fetchWeatherSnapshot(request.latitude as number, request.longitude as number)
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
  const prioritizedPois = prioritizePois(pois, request.interests ?? []);
  const staySearchCandidates =
    stayCandidatesRaw.length > 0
      ? []
      : await searchStayCandidates(request.destination, {
          destination,
          lodgingCandidates: stayCandidatesRaw,
        });
  const prioritizedStayCandidates = prioritizeStayCandidates(
    [...stayCandidatesRaw, ...staySearchCandidates],
    destination
  );
  const maxTokens = Math.min(8000, 2500 + duration * 400);
  const payload = await generateJson<GeminiItineraryPayload>(
    buildItineraryPrompt({
      request,
      destination,
      weather,
      pois: prioritizedPois,
      stayOptions: prioritizedStayCandidates,
      duration,
    }),
    {
      maxTokens,
      repairMaxTokens: Math.max(2000, Math.floor(maxTokens / 2)),
    }
  );

  if (!payload.dailyPlans?.length) {
    throw new Error('Kimi 2.5 did not return any itinerary days');
  }

  const dailyPlans = normalizeDayPlans(payload.dailyPlans, destination);
  const totalEstimatedCost = payload.totalEstimatedCost ?? null;
  const budgetBreakdown = normalizeBudgetBreakdown(payload.budgetBreakdown, totalEstimatedCost);
  const stay = normalizeStay(payload.stay, prioritizedStayCandidates[0] ?? null, request);
  const transfers = normalizeTransfers(payload.transfers, request, stay);

  return {
    title: payload.title,
    destination: payload.destination || destination.name,
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
      stayCandidates: [...stayCandidatesRaw, ...staySearchCandidates],
      confirmation: request.confirmation ?? null,
    },
  };
}
