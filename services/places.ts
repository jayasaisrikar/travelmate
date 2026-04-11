import { INTEREST_TO_POI_TYPES, NOMINATIM_HEADERS, POI_TYPE_ALIASES } from '@/lib/constants';
import type { DestinationSearchResult, PointOfInterest } from '@/lib/travel-types';

const DESTINATION_SEARCH_CACHE_TTL_MS = 5 * 60 * 1000;
const destinationSearchCache = new Map<string, { expiresAt: number; results: DestinationSearchResult[] }>();

function toNumber(value: string | number | null | undefined): number | null {
  if (value === null || value === undefined) {
    return null;
  }

  const numericValue = typeof value === 'number' ? value : Number.parseFloat(value);
  return Number.isFinite(numericValue) ? numericValue : null;
}

function buildOverpassClause(type: string, latitude: number, longitude: number, radius: number): string[] {
  const aliases = POI_TYPE_ALIASES[type] ?? [`name~"${type}",i`];

  return aliases.map((alias) => {
    const selector = alias.includes('=') ? `[${alias}]` : `[${alias}]`;
    return `
      node${selector}(around:${radius},${latitude},${longitude});
      way${selector}(around:${radius},${latitude},${longitude});
      relation${selector}(around:${radius},${latitude},${longitude});
    `;
  });
}

export async function searchDestinations(query: string): Promise<DestinationSearchResult[]> {
  const cacheKey = query.trim().toLowerCase();
  const cached = destinationSearchCache.get(cacheKey);

  if (cached && cached.expiresAt > Date.now()) {
    return cached.results;
  }

  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 8000);

  try {
    const response = await fetch(
      `https://nominatim.openstreetmap.org/search?format=jsonv2&addressdetails=1&limit=8&q=${encodeURIComponent(query)}`,
      {
        headers: NOMINATIM_HEADERS,
        signal: controller.signal,
        next: { revalidate: 300 },
      }
    );

    if (!response.ok) {
      throw new Error(`Destination search failed with status ${response.status}`);
    }

    const results = (await response.json()) as Array<Record<string, unknown>>;

    const normalizedResults: DestinationSearchResult[] = [];

    for (const result of results) {
      const latitude = toNumber(result.lat as string | number | null | undefined);
      const longitude = toNumber(result.lon as string | number | null | undefined);

      if (latitude === null || longitude === null) {
        continue;
      }

      const normalizedResult: DestinationSearchResult = {
        name:
          String(
            result.name ??
              (typeof result.display_name === 'string'
                ? result.display_name.split(',')[0]
                : result.display_name ?? '')
          ).trim(),
        latitude,
        longitude,
        type: String(result.type ?? 'destination'),
        address: typeof result.display_name === 'string' ? result.display_name : undefined,
        boundingBox: Array.isArray(result.boundingbox)
          ? result.boundingbox.map((item) => String(item))
          : undefined,
        importance: toNumber(result.importance as string | number | null | undefined) ?? undefined,
      };

      if (normalizedResult.name) {
        normalizedResults.push(normalizedResult);
      }
    }

    destinationSearchCache.set(cacheKey, {
      expiresAt: Date.now() + DESTINATION_SEARCH_CACHE_TTL_MS,
      results: normalizedResults,
    });

    return normalizedResults;
  } finally {
    clearTimeout(timeout);
  }
}

function destinationToPoi(result: DestinationSearchResult): PointOfInterest {
  return {
    id: `stay-${result.type}-${result.latitude}-${result.longitude}-${result.name}`,
    name: result.name,
    type: result.type,
    latitude: result.latitude,
    longitude: result.longitude,
    address: result.address ?? undefined,
    tags: {},
  };
}

function isStayType(type: string): boolean {
  const normalized = type.toLowerCase();

  return (
    normalized.includes('hotel') ||
    normalized.includes('guest_house') ||
    normalized.includes('guest house') ||
    normalized.includes('hostel') ||
    normalized.includes('motel') ||
    normalized.includes('apartment')
  );
}

function isLodgingPoi(candidate: PointOfInterest): boolean {
  const type = candidate.type.toLowerCase();
  const name = candidate.name.toLowerCase();
  const tags = candidate.tags ?? {};
  const tourism = String(tags.tourism ?? '').toLowerCase();
  const amenity = String(tags.amenity ?? '').toLowerCase();

  return (
    isStayType(type) ||
    isStayType(tourism) ||
    isStayType(amenity) ||
    name.includes('hotel') ||
    name.includes('hostel') ||
    name.includes('guest house') ||
    name.includes('guesthouse') ||
    name.includes('motel') ||
    name.includes('apartment')
  );
}

export async function searchStayCandidates(query: string): Promise<PointOfInterest[]> {
  const destination = await resolveDestination(query).catch(() => null);
  const overpassCandidates = destination
    ? await fetchPointsOfInterest({
        latitude: destination.latitude,
        longitude: destination.longitude,
        radius: 8_000,
        types: ['hotel', 'guest_house', 'hostel', 'motel', 'apartment'],
        limit: 12,
      }).catch(() => [])
    : [];

  const lodgingCandidates = overpassCandidates.filter(isLodgingPoi).slice(0, 12);

  if (lodgingCandidates.length > 0) {
    return lodgingCandidates;
  }

  const stayQueries = [
    `${query} hotel`,
    `${query} guest house`,
    `${query} hostel`,
    `${query} motel`,
    `${query} apartment`,
  ];

  const results = await Promise.allSettled(
    stayQueries.map(async (stayQuery) => {
      const matches = await searchDestinations(stayQuery);
      return matches
        .filter((result) => isLodgingPoi(destinationToPoi(result)))
        .slice(0, 3)
        .map(destinationToPoi);
    })
  );

  const unique = new Map<string, PointOfInterest>();

  for (const result of results) {
    if (result.status !== 'fulfilled') {
      continue;
    }

    for (const stay of result.value) {
      const key = `${stay.name.toLowerCase()}-${stay.latitude.toFixed(4)}-${stay.longitude.toFixed(4)}`;
      if (!unique.has(key)) {
        unique.set(key, stay);
      }
    }
  }

  return Array.from(unique.values()).slice(0, 12);
}

export async function resolveDestination(
  destination: string,
  coordinates?: { latitude?: number | null; longitude?: number | null }
): Promise<DestinationSearchResult> {
  if (coordinates?.latitude !== null && coordinates?.latitude !== undefined &&
      coordinates?.longitude !== null && coordinates?.longitude !== undefined) {
    const reverseResponse = await fetch(
      `https://nominatim.openstreetmap.org/reverse?format=jsonv2&lat=${coordinates.latitude}&lon=${coordinates.longitude}`,
      {
        headers: NOMINATIM_HEADERS,
        next: { revalidate: 300 },
      }
    );

    if (reverseResponse.ok) {
      const reverseData = (await reverseResponse.json()) as Record<string, unknown>;
      const displayName = String(reverseData.display_name ?? destination).trim();

      return {
        name: displayName.split(',')[0] ?? destination,
        latitude: coordinates.latitude,
        longitude: coordinates.longitude,
        type: String(reverseData.type ?? 'destination'),
        address: displayName,
      };
    }
  }

  const results = await searchDestinations(destination);
  const topResult = results[0];

  if (!topResult) {
    throw new Error(`No destination found for "${destination}"`);
  }

  return topResult;
}

export function derivePoiTypes(interests: string[]): string[] {
  const derived = new Set<string>();

  for (const rawInterest of interests) {
    const interest = rawInterest.toLowerCase();
    const mappedTypes = INTEREST_TO_POI_TYPES[interest] ?? [];

    for (const mappedType of mappedTypes) {
      derived.add(mappedType);
    }
  }

  derived.add('attraction');
  derived.add('restaurant');

  return Array.from(derived);
}

export async function fetchPointsOfInterest(options: {
  latitude: number;
  longitude: number;
  radius: number;
  types: string[];
  limit?: number;
}): Promise<PointOfInterest[]> {
  const queryGroups = options.types.flatMap((type) =>
    buildOverpassClause(type, options.latitude, options.longitude, options.radius)
  );

  const query = `
    [out:json][timeout:25];
    (
      ${queryGroups.join('\n')}
    );
    out body center;
  `;

  const response = await fetch('https://overpass-api.de/api/interpreter', {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams({ data: query }),
    next: { revalidate: 300 },
  });

  if (!response.ok) {
    throw new Error(`POI fetch failed with status ${response.status}`);
  }

  const data = (await response.json()) as { elements?: Array<Record<string, unknown>> };
  const unique = new Map<string, PointOfInterest>();

  for (const element of data.elements ?? []) {
    const tags = (element.tags as Record<string, string> | undefined) ?? {};
    const name = tags.name?.trim();
    const latitude = toNumber((element.lat as number | string | undefined) ?? (element.center as { lat?: number } | undefined)?.lat);
    const longitude = toNumber((element.lon as number | string | undefined) ?? (element.center as { lon?: number } | undefined)?.lon);

    if (!name || latitude === null || longitude === null) {
      continue;
    }

    const id = `${element.type ?? 'element'}-${element.id ?? name}`;
    const type = tags.tourism ?? tags.amenity ?? tags.leisure ?? tags.natural ?? 'place';
    const address = [
      tags['addr:housenumber'],
      tags['addr:street'],
      tags['addr:city'],
      tags['addr:state'],
      tags['addr:country'],
    ]
      .filter(Boolean)
      .join(', ');

    unique.set(id, {
      id,
      name,
      type,
      latitude,
      longitude,
      address: address || undefined,
      tags,
    });
  }

  return Array.from(unique.values())
    .sort((left, right) => left.name.localeCompare(right.name))
    .slice(0, options.limit ?? 48);
}
