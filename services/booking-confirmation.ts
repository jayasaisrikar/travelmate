import { generateJson } from '@/services/gemini';
import type {
  BookingConfirmationExtraction,
  BookingConfirmationFlightSegment,
  BookingConfirmationReservation,
  BookingConfirmationStay,
  BookingConfirmationTransportLeg,
  BookingConfirmationWindow,
} from '@/lib/travel-types';

export interface BookingConfirmationInput {
  subject?: string | null;
  from?: string | null;
  text?: string | null;
  html?: string | null;
  receivedAt?: string | null;
  medium?: 'email' | 'manual' | 'webhook';
}

interface BookingConfirmationParsePayload {
  destinationName: string;
  destinationAddress?: string | null;
  tripWindow: BookingConfirmationWindow;
  arrivalMethod?: BookingConfirmationExtraction['arrivalMethod'];
  flightSegments?: BookingConfirmationFlightSegment[];
  stay?: BookingConfirmationStay | null;
  transportLegs?: BookingConfirmationTransportLeg[];
  reservations?: BookingConfirmationReservation[];
  summary: string;
  confidence?: BookingConfirmationExtraction['confidence'];
}

function normalizeString(value: unknown): string {
  return typeof value === 'string' ? value.trim() : '';
}

function normalizeNullableString(value: unknown): string | null {
  const normalized = normalizeString(value);
  return normalized || null;
}

function stripHtml(html: string): string {
  return html
    .replace(/<script[\s\S]*?<\/script>/gi, ' ')
    .replace(/<style[\s\S]*?<\/style>/gi, ' ')
    .replace(/<[^>]+>/g, ' ')
    .replace(/&nbsp;/gi, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

function limitLength(value: string, max = 12000): string {
  if (value.length <= max) {
    return value;
  }

  return `${value.slice(0, max)}…`;
}

function composeTranscript(input: BookingConfirmationInput): string {
  const sections = [
    input.subject ? `Subject: ${input.subject.trim()}` : null,
    input.from ? `From: ${input.from.trim()}` : null,
    input.text ? `Plain text:\n${input.text.trim()}` : null,
    input.html ? `HTML preview:\n${limitLength(stripHtml(input.html))}` : null,
  ].filter(Boolean);

  return sections.join('\n\n');
}

function normalizeFlightSegments(
  segments: BookingConfirmationFlightSegment[] | undefined
): BookingConfirmationFlightSegment[] {
  if (!Array.isArray(segments)) {
    return [];
  }

  return segments
    .map((segment) => ({
      airline: normalizeNullableString(segment.airline),
      flightNumber: normalizeNullableString(segment.flightNumber),
      confirmationCode: normalizeNullableString(segment.confirmationCode),
      departurePlace: normalizeNullableString(segment.departurePlace),
      arrivalPlace: normalizeNullableString(segment.arrivalPlace),
      departureDate: normalizeNullableString(segment.departureDate),
      departureTime: normalizeNullableString(segment.departureTime),
      arrivalDate: normalizeNullableString(segment.arrivalDate),
      arrivalTime: normalizeNullableString(segment.arrivalTime),
      notes: normalizeNullableString(segment.notes),
    }))
    .filter((segment) => {
      return Boolean(
        segment.airline ||
          segment.flightNumber ||
          segment.confirmationCode ||
          segment.departurePlace ||
          segment.arrivalPlace ||
          segment.departureDate ||
          segment.arrivalDate ||
          segment.notes
      );
    });
}

function normalizeReservations(
  reservations: BookingConfirmationReservation[] | undefined
): BookingConfirmationReservation[] {
  if (!Array.isArray(reservations)) {
    return [];
  }

  return reservations
    .map((reservation) => ({
      kind: normalizeString(reservation.kind) || 'reservation',
      vendor: normalizeNullableString(reservation.vendor),
      confirmationCode: normalizeNullableString(reservation.confirmationCode),
      date: normalizeNullableString(reservation.date),
      time: normalizeNullableString(reservation.time),
      notes: normalizeNullableString(reservation.notes),
    }))
    .filter((reservation) => Boolean(reservation.vendor || reservation.confirmationCode || reservation.notes || reservation.date));
}

function normalizeTransportLegs(
  transportLegs: BookingConfirmationTransportLeg[] | undefined
): BookingConfirmationTransportLeg[] {
  if (!Array.isArray(transportLegs)) {
    return [];
  }

  return transportLegs
    .map((leg) => ({
      kind: normalizeString(leg.kind) || 'other',
      provider: normalizeNullableString(leg.provider),
      confirmationCode: normalizeNullableString(leg.confirmationCode),
      from: normalizeNullableString(leg.from),
      to: normalizeNullableString(leg.to),
      date: normalizeNullableString(leg.date),
      time: normalizeNullableString(leg.time),
      notes: normalizeNullableString(leg.notes),
    }))
    .filter((leg) => Boolean(leg.provider || leg.from || leg.to || leg.date || leg.notes));
}

function normalizeStay(stay: BookingConfirmationStay | null | undefined): BookingConfirmationStay | null {
  if (!stay || typeof stay !== 'object') {
    return null;
  }

  const normalized: BookingConfirmationStay = {
    name: normalizeNullableString(stay.name),
    confirmationCode: normalizeNullableString(stay.confirmationCode),
    address: normalizeNullableString(stay.address),
    checkInDate: normalizeNullableString(stay.checkInDate),
    checkOutDate: normalizeNullableString(stay.checkOutDate),
    notes: normalizeNullableString(stay.notes),
  };

  return normalized.name || normalized.address || normalized.confirmationCode ? normalized : null;
}

function buildParsePrompt(transcript: string): string {
  return `
You are extracting structured travel data from a booking confirmation email.

Extract only facts present in the email. Do not guess. If a field is not explicit, return null.

Email:
${transcript}

Return strict JSON with this exact shape:
{
  "destinationName": "string",
  "destinationAddress": "string or null",
  "tripWindow": {
    "arrivalDate": "YYYY-MM-DD or null",
    "departureDate": "YYYY-MM-DD or null",
    "arrivalTime": "HH:MM or null",
    "departureTime": "HH:MM or null",
    "timezone": "string or null"
  },
  "arrivalMethod": "flight | train | drive | bus | other | null",
  "flightSegments": [
    {
      "airline": "string or null",
      "flightNumber": "string or null",
      "confirmationCode": "string or null",
      "departurePlace": "string or null",
      "arrivalPlace": "string or null",
      "departureDate": "YYYY-MM-DD or null",
      "departureTime": "HH:MM or null",
      "arrivalDate": "YYYY-MM-DD or null",
      "arrivalTime": "HH:MM or null",
      "notes": "string or null"
    }
  ],
  "stay": {
    "name": "string or null",
    "confirmationCode": "string or null",
    "address": "string or null",
    "checkInDate": "YYYY-MM-DD or null",
    "checkOutDate": "YYYY-MM-DD or null",
    "notes": "string or null"
  },
  "transportLegs": [
    {
      "kind": "string",
      "provider": "string or null",
      "confirmationCode": "string or null",
      "from": "string or null",
      "to": "string or null",
      "date": "YYYY-MM-DD or null",
      "time": "HH:MM or null",
      "notes": "string or null"
    }
  ],
  "reservations": [
    {
      "kind": "string",
      "vendor": "string or null",
      "confirmationCode": "string or null",
      "date": "YYYY-MM-DD or null",
      "time": "HH:MM or null",
      "notes": "string or null"
    }
  ],
  "summary": "string",
  "confidence": "low | medium | high"
}

Guidance:
- destinationName should be the real trip destination city or region, not the airline, hotel brand, or vendor name.
- Use flight_segments for itineraries and transportLegs for shuttle, train, taxi, or transfer details.
- Keep summary to two concise sentences.
`.trim();
}

export async function parseBookingConfirmationEmail(
  input: BookingConfirmationInput
): Promise<BookingConfirmationExtraction> {
  const transcript = composeTranscript(input);

  if (!transcript.trim()) {
    throw new Error('A booking confirmation email body is required');
  }

  const parsed = await generateJson<BookingConfirmationParsePayload>(buildParsePrompt(limitLength(transcript)), {
    maxTokens: 3500,
    repairMaxTokens: 2000,
  });

  const destinationName = normalizeString(parsed.destinationName);

  if (!destinationName) {
    throw new Error('Could not identify a trip destination from the confirmation email');
  }

  return {
    destinationName,
    destinationAddress: normalizeNullableString(parsed.destinationAddress),
    tripWindow: {
      arrivalDate: normalizeNullableString(parsed.tripWindow?.arrivalDate),
      departureDate: normalizeNullableString(parsed.tripWindow?.departureDate),
      arrivalTime: normalizeNullableString(parsed.tripWindow?.arrivalTime),
      departureTime: normalizeNullableString(parsed.tripWindow?.departureTime),
      timezone: normalizeNullableString(parsed.tripWindow?.timezone),
    },
    arrivalMethod:
      parsed.arrivalMethod === 'flight' ||
      parsed.arrivalMethod === 'train' ||
      parsed.arrivalMethod === 'drive' ||
      parsed.arrivalMethod === 'bus' ||
      parsed.arrivalMethod === 'other'
        ? parsed.arrivalMethod
        : null,
    flightSegments: normalizeFlightSegments(parsed.flightSegments),
    stay: normalizeStay(parsed.stay),
    transportLegs: normalizeTransportLegs(parsed.transportLegs),
    reservations: normalizeReservations(parsed.reservations),
    summary: normalizeString(parsed.summary),
    confidence:
      parsed.confidence === 'low' || parsed.confidence === 'medium' || parsed.confidence === 'high'
        ? parsed.confidence
        : 'medium',
    source: {
      subject: normalizeNullableString(input.subject),
      from: normalizeNullableString(input.from),
      medium: input.medium ?? 'email',
      receivedAt: normalizeNullableString(input.receivedAt),
    },
  };
}

export function normalizeImportedBookingConfirmation(value: unknown): BookingConfirmationExtraction | null {
  if (!value || typeof value !== 'object') {
    return null;
  }

  const raw = value as Partial<BookingConfirmationExtraction>;
  const destinationName = normalizeString(raw.destinationName);

  if (!destinationName) {
    return null;
  }

  return {
    destinationName,
    destinationAddress: normalizeNullableString(raw.destinationAddress),
    tripWindow: {
      arrivalDate: normalizeNullableString(raw.tripWindow?.arrivalDate),
      departureDate: normalizeNullableString(raw.tripWindow?.departureDate),
      arrivalTime: normalizeNullableString(raw.tripWindow?.arrivalTime),
      departureTime: normalizeNullableString(raw.tripWindow?.departureTime),
      timezone: normalizeNullableString(raw.tripWindow?.timezone),
    },
    arrivalMethod:
      raw.arrivalMethod === 'flight' ||
      raw.arrivalMethod === 'train' ||
      raw.arrivalMethod === 'drive' ||
      raw.arrivalMethod === 'bus' ||
      raw.arrivalMethod === 'other'
        ? raw.arrivalMethod
        : null,
    flightSegments: normalizeFlightSegments(raw.flightSegments),
    stay: normalizeStay(raw.stay ?? null),
    transportLegs: normalizeTransportLegs(raw.transportLegs),
    reservations: normalizeReservations(raw.reservations),
    summary: normalizeString(raw.summary),
    confidence:
      raw.confidence === 'low' || raw.confidence === 'medium' || raw.confidence === 'high'
        ? raw.confidence
        : 'medium',
    source: {
      subject: normalizeNullableString(raw.source?.subject),
      from: normalizeNullableString(raw.source?.from),
      medium: raw.source?.medium === 'manual' || raw.source?.medium === 'webhook' ? raw.source.medium : 'email',
      receivedAt: normalizeNullableString(raw.source?.receivedAt),
    },
  };
}
