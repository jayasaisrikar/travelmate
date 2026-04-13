import { generateJson } from '@/services/gemini';
import type { TripRow } from '@/services/trip-sharing';
import type {
  GeneratedItinerary,
  ItineraryActivity,
  ItineraryDayPlan,
} from '@/lib/travel-types';

interface RegeneratedActivityPayload {
  time?: string;
  name: string;
  description: string;
  duration?: number | null;
  cost?: number | null;
  category: string;
  latitude?: number | null;
  longitude?: number | null;
  address?: string | null;
}

interface RegeneratedDayPayload {
  theme: string;
  activities: RegeneratedActivityPayload[];
  restSlots?: { time: string; duration: string }[];
  totalActiveHours?: number | null;
  intensity?: string | null;
}

export type RegenerationScope = 'day' | 'cluster';

export interface RegenerationRequest {
  trip: TripRow;
  itinerary: GeneratedItinerary;
  dayIndex: number;
  activityIndex?: number | null;
  instruction: string;
  scope: RegenerationScope;
}

function normalizeString(value: unknown): string {
  return typeof value === 'string' ? value.trim() : '';
}

function normalizeNullableString(value: unknown): string | null {
  const normalized = normalizeString(value);
  return normalized || null;
}

function cloneDayPlans(dailyPlans: ItineraryDayPlan[]): ItineraryDayPlan[] {
  return dailyPlans.map((day) => ({
    ...day,
    activities: day.activities.map((activity) => ({ ...activity })),
    restSlots: day.restSlots?.map((slot) => ({ ...slot })),
  }));
}

function getDailyPlans(itinerary: GeneratedItinerary): ItineraryDayPlan[] {
  if (Array.isArray(itinerary.dailyPlans)) {
    return itinerary.dailyPlans;
  }

  if (Array.isArray(itinerary.daily_plans)) {
    return itinerary.daily_plans;
  }

  return [];
}

function summarizeConfirmation(confirmation: GeneratedItinerary['sourceData']['confirmation']): string {
  if (!confirmation) {
    return 'Not provided';
  }

  const flightSummary = confirmation.flightSegments
    .slice(0, 3)
    .map((segment) => {
      const route = [segment.departurePlace, segment.arrivalPlace].filter(Boolean).join(' -> ');
      return [segment.airline, segment.flightNumber, route, segment.confirmationCode].filter(Boolean).join(' | ');
    })
    .join('; ');

  const transportSummary = confirmation.transportLegs
    .slice(0, 3)
    .map((leg) => [leg.kind, leg.provider, leg.from, leg.to, leg.date, leg.time].filter(Boolean).join(' | '))
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
    `summary: ${confirmation.summary}`,
  ].join('\n- ');
}

function formatActivity(activity: ItineraryActivity): string {
  return [
    `${activity.time} | ${activity.name}`,
    activity.category ? `category: ${activity.category}` : null,
    activity.description ? `description: ${activity.description}` : null,
    activity.address ? `address: ${activity.address}` : null,
  ]
    .filter(Boolean)
    .join(' | ');
}

function buildTripContext(trip: TripRow, itinerary: GeneratedItinerary): string {
  const confirmation = itinerary.sourceData.confirmation;

  return [
    `trip_destination: ${trip.destination}`,
    `itinerary_title: ${itinerary.title}`,
    `trip_duration: ${trip.duration} days`,
    `budget: ${trip.budget}`,
    `interests: ${trip.interests.length > 0 ? trip.interests.join(', ') : 'None provided'}`,
    `confirmation_context: ${summarizeConfirmation(confirmation)}`,
    `destination_source: ${itinerary.sourceData.destination.name}`,
    `poi_count: ${itinerary.sourceData.pois.length}`,
    `stay_candidate_count: ${itinerary.sourceData.stayCandidates.length}`,
  ].join('\n- ');
}

function buildDayPayloadContext(day: ItineraryDayPlan): string {
  return [
    `day: ${day.day}`,
    `date: ${day.date}`,
    `theme: ${day.theme}`,
    `intensity: ${day.intensity ?? 'Not provided'}`,
    `total_active_hours: ${day.totalActiveHours ?? 'Not provided'}`,
    `activities:\n${day.activities.map((activity, index) => `${index + 1}. ${formatActivity(activity)}`).join('\n')}`,
    day.restSlots?.length
      ? `rest_slots:\n${day.restSlots.map((slot) => `- ${slot.time} for ${slot.duration}`).join('\n')}`
      : 'rest_slots: None',
  ].join('\n- ');
}

function buildDayRegenerationPrompt(input: {
  trip: TripRow;
  itinerary: GeneratedItinerary;
  day: ItineraryDayPlan;
  instruction: string;
}): string {
  return `
You are editing an existing travel itinerary as strict JSON.

Global trip context:
- ${buildTripContext(input.trip, input.itinerary)}

Target day to regenerate:
- ${buildDayPayloadContext(input.day)}

User instruction:
- ${input.instruction.trim()}

Rules:
- Regenerate only the target day.
- Keep the rest of the trip unchanged in the calling app.
- Do not change the trip destination, total duration, or overall tone.
- Keep venue-specific names grounded in the live itinerary context and destination.
- Return a coherent day with sensible pacing.
- Keep all costs numeric or null.
- Keep each activity description to one short sentence.

Return only JSON with this exact shape:
{
  "theme": "string",
  "activities": [
    {
      "time": "HH:MM",
      "name": "string",
      "description": "string",
      "duration": 0,
      "cost": 0,
      "category": "string",
      "latitude": 0,
      "longitude": 0,
      "address": "string"
    }
  ],
  "restSlots": [{ "time": "HH:MM", "duration": "string" }],
  "totalActiveHours": 0,
  "intensity": "string or null"
}
`.trim();
}

function buildClusterRegenerationPrompt(input: {
  trip: TripRow;
  itinerary: GeneratedItinerary;
  day: ItineraryDayPlan;
  clusterStart: number;
  clusterEnd: number;
  instruction: string;
}): string {
  const selected = input.day.activities.slice(input.clusterStart, input.clusterEnd + 1);

  return `
You are editing an existing travel itinerary as strict JSON.

Global trip context:
- ${buildTripContext(input.trip, input.itinerary)}

Target day:
- day: ${input.day.day}
- date: ${input.day.date}
- theme: ${input.day.theme}

Selected activity cluster to replace:
${selected.map((activity, index) => `${index + 1}. ${formatActivity(activity)}`).join('\n')}

User instruction:
- ${input.instruction.trim()}

Rules:
- Regenerate only this selected cluster.
- Return the same number of activities as the selected cluster.
- Keep the surrounding day structure stable and preserve the original time ordering.
- Do not change the trip destination or the rest of the itinerary.
- Use venue-specific names that fit the existing trip context.
- Keep all costs numeric or null.
- Keep each activity description to one short sentence.

Return only JSON with this exact shape:
{
  "theme": "string or null",
  "activities": [
    {
      "time": "HH:MM",
      "name": "string",
      "description": "string",
      "duration": 0,
      "cost": 0,
      "category": "string",
      "latitude": 0,
      "longitude": 0,
      "address": "string"
    }
  ],
  "restSlots": [{ "time": "HH:MM", "duration": "string" }],
  "totalActiveHours": 0,
  "intensity": "string or null"
}
`.trim();
}

function normalizeActivities(
  payloadActivities: RegeneratedActivityPayload[] | undefined,
  originalActivities: ItineraryActivity[],
  preserveTimes: boolean
): ItineraryActivity[] {
  const sourceActivities = Array.isArray(payloadActivities) ? payloadActivities : [];
  const targetLength = originalActivities.length || sourceActivities.length;
  const activities: ItineraryActivity[] = [];

  for (let index = 0; index < targetLength; index += 1) {
    const source = sourceActivities[index] ?? sourceActivities[sourceActivities.length - 1] ?? null;
    const fallback = originalActivities[index] ?? originalActivities[originalActivities.length - 1] ?? null;

    const time = preserveTimes
      ? fallback?.time ?? source?.time ?? `Day stop ${index + 1}`
      : normalizeString(source?.time) || fallback?.time || `Day stop ${index + 1}`;

    activities.push({
      time,
      name: normalizeString(source?.name) || fallback?.name || `Stop ${index + 1}`,
      description: normalizeString(source?.description) || fallback?.description || '',
      duration: typeof source?.duration === 'number' ? source.duration : fallback?.duration ?? null,
      cost: typeof source?.cost === 'number' ? source.cost : fallback?.cost ?? null,
      estimated_cost:
        typeof source?.cost === 'number' ? source.cost : fallback?.estimated_cost ?? fallback?.cost ?? null,
      category: normalizeString(source?.category) || fallback?.category || 'Stop',
      latitude: typeof source?.latitude === 'number' ? source.latitude : fallback?.latitude ?? null,
      longitude: typeof source?.longitude === 'number' ? source.longitude : fallback?.longitude ?? null,
      address: normalizeNullableString(source?.address) ?? fallback?.address ?? null,
    });
  }

  return activities;
}

function normalizeRestSlots(
  restSlots: RegeneratedDayPayload['restSlots'] | undefined,
  fallback: ItineraryDayPlan['restSlots']
): ItineraryDayPlan['restSlots'] {
  if (!Array.isArray(restSlots)) {
    return fallback?.map((slot) => ({ ...slot })) ?? [];
  }

  const normalized = restSlots
    .map((slot) => ({
      time: normalizeString(slot.time),
      duration: normalizeString(slot.duration),
    }))
    .filter((slot) => Boolean(slot.time && slot.duration));

  return normalized.length > 0 ? normalized : fallback?.map((slot) => ({ ...slot })) ?? [];
}

function buildUpdatedDay(
  originalDay: ItineraryDayPlan,
  payload: RegeneratedDayPayload,
  preserveTimes: boolean
): ItineraryDayPlan {
  return {
    ...originalDay,
    theme: normalizeString(payload.theme) || originalDay.theme,
    activities: normalizeActivities(payload.activities, originalDay.activities, preserveTimes),
    restSlots: normalizeRestSlots(payload.restSlots, originalDay.restSlots),
    totalActiveHours: typeof payload.totalActiveHours === 'number' ? payload.totalActiveHours : originalDay.totalActiveHours ?? null,
    intensity: normalizeNullableString(payload.intensity) ?? originalDay.intensity ?? null,
  };
}

export async function regenerateItineraryDay(
  input: RegenerationRequest
): Promise<{ itinerary: GeneratedItinerary; dayIndex: number }> {
  if (!input.instruction.trim()) {
    throw new Error('A regeneration instruction is required');
  }

  const dailyPlans = cloneDayPlans(getDailyPlans(input.itinerary));
  const originalDay = dailyPlans[input.dayIndex];

  if (!originalDay) {
    throw new Error('Requested itinerary day does not exist');
  }

  const payload = await generateJson<RegeneratedDayPayload>(
    buildDayRegenerationPrompt({
      trip: input.trip,
      itinerary: input.itinerary,
      day: originalDay,
      instruction: input.instruction,
    }),
    {
      maxTokens: 2400,
      repairMaxTokens: 1600,
    }
  );

  const updatedDay = buildUpdatedDay(originalDay, payload, false);
  dailyPlans[input.dayIndex] = updatedDay;

  return {
    itinerary: {
      ...input.itinerary,
      dailyPlans,
      daily_plans: dailyPlans,
    },
    dayIndex: input.dayIndex,
  };
}

export async function regenerateItineraryCluster(
  input: RegenerationRequest
): Promise<{ itinerary: GeneratedItinerary; dayIndex: number; clusterStart: number; clusterEnd: number }> {
  if (!input.instruction.trim()) {
    throw new Error('A regeneration instruction is required');
  }

  const dailyPlans = cloneDayPlans(getDailyPlans(input.itinerary));
  const originalDay = dailyPlans[input.dayIndex];

  if (!originalDay || !Array.isArray(originalDay.activities) || originalDay.activities.length === 0) {
    throw new Error('Requested itinerary day does not exist');
  }

  const originalActivityIndex = typeof input.activityIndex === 'number' ? input.activityIndex : 0;
  const clusterRadius = originalDay.activities.length > 2 ? 1 : 0;
  let clusterStart = Math.max(0, originalActivityIndex - clusterRadius);
  let clusterEnd = Math.min(originalDay.activities.length - 1, originalActivityIndex + clusterRadius);

  if (clusterEnd - clusterStart + 1 < Math.min(3, originalDay.activities.length)) {
    clusterStart = Math.max(0, clusterEnd - (Math.min(3, originalDay.activities.length) - 1));
    clusterEnd = Math.min(originalDay.activities.length - 1, clusterStart + Math.min(3, originalDay.activities.length) - 1);
  }

  const selectedSlice = originalDay.activities.slice(clusterStart, clusterEnd + 1);
  const payload = await generateJson<RegeneratedDayPayload>(
    buildClusterRegenerationPrompt({
      trip: input.trip,
      itinerary: input.itinerary,
      day: originalDay,
      clusterStart,
      clusterEnd,
      instruction: input.instruction,
    }),
    {
      maxTokens: 2000,
      repairMaxTokens: 1400,
    }
  );

  const updatedActivities = normalizeActivities(payload.activities, selectedSlice, true);
  const nextActivities = originalDay.activities.map((activity, index) => {
    if (index < clusterStart || index > clusterEnd) {
      return { ...activity };
    }

    return updatedActivities[index - clusterStart] ?? { ...activity };
  });

  dailyPlans[input.dayIndex] = {
    ...originalDay,
    theme: normalizeString(payload.theme) || originalDay.theme,
    activities: nextActivities,
    restSlots: normalizeRestSlots(payload.restSlots, originalDay.restSlots),
    totalActiveHours: typeof payload.totalActiveHours === 'number' ? payload.totalActiveHours : originalDay.totalActiveHours ?? null,
    intensity: normalizeNullableString(payload.intensity) ?? originalDay.intensity ?? null,
  };

  return {
    itinerary: {
      ...input.itinerary,
      dailyPlans,
      daily_plans: dailyPlans,
    },
    dayIndex: input.dayIndex,
    clusterStart,
    clusterEnd,
  };
}
