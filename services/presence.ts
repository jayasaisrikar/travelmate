import { haversineDistanceKm } from '@/services/itinerary';

export const PRESENCE_RADIUS_KM = 50;

/** ISO YYYY-MM-DD lexical compare; both bounds required. */
export function isWithinTripWindow(today: string, start: string | null, end: string | null): boolean {
  if (!start || !end) return false;
  return start <= today && today <= end;
}

export function evaluatePresence(input: {
  destLat: number;
  destLng: number;
  lat: number;
  lng: number;
}): { withinRadius: boolean; distanceKm: number } {
  const distanceKm = haversineDistanceKm(
    { latitude: input.destLat, longitude: input.destLng },
    { latitude: input.lat, longitude: input.lng }
  );
  return { withinRadius: distanceKm <= PRESENCE_RADIUS_KM, distanceKm };
}
