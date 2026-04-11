import { generateJson } from '@/services/gemini';
import type { DestinationSearchResult, PointOfInterest, TravelStay } from '@/lib/travel-types';

interface StayRetrySelection {
  selectedIndex: number;
  notes?: string | null;
}

function formatCandidate(candidate: PointOfInterest, destination: DestinationSearchResult, index: number): string {
  const distanceKm = Math.sqrt(
    Math.pow(candidate.latitude - destination.latitude, 2) +
      Math.pow(candidate.longitude - destination.longitude, 2)
  );

  return [
    `${index + 1}. ${candidate.name}`,
    `type: ${candidate.type}`,
    `coordinates: ${candidate.latitude},${candidate.longitude}`,
    candidate.address ? `address: ${candidate.address}` : null,
    `relative_distance: ${distanceKm.toFixed(4)}`,
  ]
    .filter(Boolean)
    .join(' | ');
}

export async function suggestStayRetry(input: {
  destination: DestinationSearchResult;
  currentStay: TravelStay | null;
  stayCandidates: PointOfInterest[];
  budgetRange: string;
  preferredLocation: string;
}): Promise<{ stay: TravelStay | null; notes: string | null }> {
  if (input.stayCandidates.length === 0) {
    return { stay: null, notes: 'No live lodging options were available for retry.' };
  }

  const prompt = `
You are choosing a stay for a traveler from live lodging candidates only.

Destination:
- name: ${input.destination.name}
- address: ${input.destination.address ?? input.destination.name}
- latitude: ${input.destination.latitude}
- longitude: ${input.destination.longitude}

Traveler preferences:
- budget_range: ${input.budgetRange}
- preferred_location: ${input.preferredLocation}

Current stay:
${input.currentStay ? JSON.stringify(input.currentStay, null, 2) : 'No existing stay'}

Live lodging candidates:
${input.stayCandidates.map((candidate, index) => formatCandidate(candidate, input.destination, index)).join('\n')}

Rules:
- Choose exactly one candidate from the live lodging list.
- Prefer the candidate that best fits the stated budget range and location preference.
- If budget is tight, prefer hostel, guest house, motel, or apartment.
- If budget is flexible or high, prefer hotel or boutique hotel-style options when available.
- Do not invent lodging names or coordinates.
- Return a concise note that explains why the selected option fits the request.

Return JSON only with this shape:
{
  "selectedIndex": 1,
  "notes": "string"
}
`.trim();

  const selection = await generateJson<StayRetrySelection>(prompt);
  const normalizedIndex = Number.isFinite(selection.selectedIndex) ? Math.trunc(selection.selectedIndex) - 1 : 0;
  const selectedCandidate =
    input.stayCandidates[Math.min(Math.max(normalizedIndex, 0), input.stayCandidates.length - 1)] ??
    input.stayCandidates[0];

  if (!selectedCandidate) {
    return { stay: null, notes: selection.notes?.trim() || null };
  }

  return {
    stay: {
      name: selectedCandidate.name,
      type: selectedCandidate.type,
      latitude: selectedCandidate.latitude,
      longitude: selectedCandidate.longitude,
      address: selectedCandidate.address ?? null,
      checkInDate: input.currentStay?.checkInDate ?? null,
      checkInTime: input.currentStay?.checkInTime ?? null,
      checkOutDate: input.currentStay?.checkOutDate ?? null,
      checkOutTime: input.currentStay?.checkOutTime ?? null,
      notes: selection.notes?.trim() || input.currentStay?.notes || null,
    },
    notes: selection.notes?.trim() || null,
  };
}
