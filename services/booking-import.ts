import { generateItineraryFromLiveData } from '@/services/itinerary';
import { resolveDestination } from '@/services/places';
import { createTripForUser } from '@/services/trip-writer';
import type {
  BookingConfirmationExtraction,
  ItineraryGenerationInput,
  TravelerPreferences,
} from '@/lib/travel-types';

function firstNonEmpty(...values: Array<string | null | undefined>): string | null {
  for (const value of values) {
    if (typeof value === 'string' && value.trim()) {
      return value.trim();
    }
  }

  return null;
}

function summarizeFlightContext(confirmation: BookingConfirmationExtraction): string | null {
  const [firstFlight] = confirmation.flightSegments;

  if (!firstFlight) {
    return null;
  }

  const parts = [
    firstFlight.airline ? `Airline: ${firstFlight.airline}` : null,
    firstFlight.flightNumber ? `Flight: ${firstFlight.flightNumber}` : null,
    [firstFlight.departurePlace, firstFlight.arrivalPlace].filter(Boolean).join(' -> ') || null,
    [firstFlight.departureDate, firstFlight.departureTime, firstFlight.arrivalDate, firstFlight.arrivalTime]
      .filter(Boolean)
      .join(' ') || null,
    firstFlight.confirmationCode ? `Confirmation: ${firstFlight.confirmationCode}` : null,
  ].filter(Boolean);

  return parts.length > 0 ? parts.join(' | ') : null;
}

function summarizeStayContext(confirmation: BookingConfirmationExtraction): string | null {
  if (!confirmation.stay) {
    return null;
  }

  const parts = [
    confirmation.stay.name ? `Stay: ${confirmation.stay.name}` : null,
    confirmation.stay.address ? `Address: ${confirmation.stay.address}` : null,
    confirmation.stay.checkInDate ? `Check-in: ${confirmation.stay.checkInDate}` : null,
    confirmation.stay.checkOutDate ? `Check-out: ${confirmation.stay.checkOutDate}` : null,
    confirmation.stay.confirmationCode ? `Confirmation: ${confirmation.stay.confirmationCode}` : null,
  ].filter(Boolean);

  return parts.length > 0 ? parts.join(' | ') : null;
}

function summarizeTransportContext(confirmation: BookingConfirmationExtraction): string | null {
  const transportLeg = confirmation.transportLegs[0];

  if (!transportLeg) {
    return null;
  }

  const parts = [
    transportLeg.kind ? `Transport: ${transportLeg.kind}` : null,
    transportLeg.provider ? `Provider: ${transportLeg.provider}` : null,
    [transportLeg.from, transportLeg.to].filter(Boolean).join(' -> ') || null,
    [transportLeg.date, transportLeg.time].filter(Boolean).join(' ') || null,
    transportLeg.confirmationCode ? `Confirmation: ${transportLeg.confirmationCode}` : null,
  ].filter(Boolean);

  return parts.length > 0 ? parts.join(' | ') : null;
}

function buildTripWindow(confirmation: BookingConfirmationExtraction) {
  const firstFlight = confirmation.flightSegments[0] ?? null;
  const lastFlight = confirmation.flightSegments[confirmation.flightSegments.length - 1] ?? null;

  return {
    arrivalDate: firstNonEmpty(
      confirmation.tripWindow.arrivalDate,
      confirmation.stay?.checkInDate,
      firstFlight?.arrivalDate,
      firstFlight?.departureDate,
      confirmation.transportLegs[0]?.date,
    ),
    departureDate: firstNonEmpty(
      confirmation.tripWindow.departureDate,
      confirmation.stay?.checkOutDate,
      lastFlight?.departureDate,
      lastFlight?.arrivalDate,
      confirmation.transportLegs[confirmation.transportLegs.length - 1]?.date,
    ),
    arrivalTime: firstNonEmpty(
      confirmation.tripWindow.arrivalTime,
      firstFlight?.arrivalTime,
      firstFlight?.departureTime,
      confirmation.transportLegs[0]?.time,
    ),
    departureTime: firstNonEmpty(
      confirmation.tripWindow.departureTime,
      lastFlight?.departureTime,
      lastFlight?.arrivalTime,
      confirmation.transportLegs[confirmation.transportLegs.length - 1]?.time,
    ),
  };
}

export function buildItineraryInputFromConfirmation(input: {
  confirmation: BookingConfirmationExtraction;
  preferences?: TravelerPreferences | null;
  destinationOverride?: string | null;
  coordinates?: { latitude?: number | null; longitude?: number | null } | null;
  resolvedDestination?: Awaited<ReturnType<typeof resolveDestination>> | null;
}): ItineraryGenerationInput {
  const window = buildTripWindow(input.confirmation);
  const fallbackBudget = input.preferences?.budget ?? null;
  const fallbackInterests = input.preferences?.interests ?? null;

  return {
    destination: input.destinationOverride?.trim() || input.confirmation.destinationName,
    latitude: input.coordinates?.latitude ?? null,
    longitude: input.coordinates?.longitude ?? null,
    arrivalDate: window.arrivalDate,
    departureDate: window.departureDate,
    arrivalTime: window.arrivalTime,
    departureTime: window.departureTime,
    arrivalMethod: input.confirmation.arrivalMethod ?? input.preferences?.arrivalMethod ?? null,
    activityIntensity: input.preferences?.activityIntensity ?? null,
    budget: fallbackBudget,
    interests: fallbackInterests,
    arrivalTransferContext: summarizeFlightContext(input.confirmation) ?? summarizeTransportContext(input.confirmation),
    departureTransferContext: summarizeStayContext(input.confirmation) ?? summarizeTransportContext(input.confirmation),
    dietaryRestrictions: input.preferences?.dietaryRestrictions ?? null,
    confirmation: input.confirmation,
    resolvedDestination: input.resolvedDestination ?? null,
  };
}

export async function createTripFromConfirmation(input: {
  userId: string;
  userEmail: string | null | undefined;
  tripId: string;
  confirmation: BookingConfirmationExtraction;
  preferences?: TravelerPreferences | null;
}): Promise<{
  trip: Awaited<ReturnType<typeof createTripForUser>>['trip'];
  share: Awaited<ReturnType<typeof createTripForUser>>['share'];
  itinerary: Awaited<ReturnType<typeof generateItineraryFromLiveData>>;
  resolvedDestination: Awaited<ReturnType<typeof resolveDestination>> | null;
}> {
  const resolvedDestination = await resolveDestination(input.confirmation.destinationName).catch(() => null);

  const itineraryInput = buildItineraryInputFromConfirmation({
    confirmation: input.confirmation,
    preferences: input.preferences,
    destinationOverride: resolvedDestination?.name ?? input.confirmation.destinationName,
    coordinates: resolvedDestination
      ? {
          latitude: resolvedDestination.latitude,
          longitude: resolvedDestination.longitude,
        }
      : null,
    resolvedDestination: resolvedDestination ?? null,
  });

  const itinerary = await generateItineraryFromLiveData(itineraryInput);
  const { trip, share } = await createTripForUser({
    id: input.tripId,
    userId: input.userId,
    userEmail: input.userEmail,
    destination: itineraryInput.destination,
    duration: itinerary.duration,
    budget: input.preferences?.budget || 'Imported from booking confirmation',
    interests: input.preferences?.interests || [],
    itinerary,
    preferences: input.preferences ?? null,
  });

  return {
    trip,
    share,
    itinerary,
    resolvedDestination,
  };
}
