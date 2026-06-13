import { DEFAULT_POI_TYPES, INTEREST_TO_POI_TYPES, NOMINATIM_HEADERS, POI_TYPE_ALIASES } from '@/lib/constants';
import type { DestinationSearchResult, PointOfInterest } from '@/lib/travel-types';

const DESTINATION_SEARCH_CACHE_TTL_MS = 5 * 60 * 1000;
const destinationSearchCache = new Map<string, { expiresAt: number; results: DestinationSearchResult[] }>();
const poiCache = new Map<string, { expiresAt: number; results: PointOfInterest[] }>();
const reverseDestinationCache = new Map<string, { expiresAt: number; result: DestinationSearchResult }>();
const CACHE_TTL_MS = 5 * 60 * 1000;
const DEFAULT_OVERPASS_ENDPOINTS = [
  'https://overpass-api.de/api/interpreter',
  'https://overpass.kumi.systems/api/interpreter',
  'https://maps.mail.ru/osm/tools/overpass/api/interpreter',
] as const;

function getOverpassEndpoints() {
  const configured = (process.env.OVERPASS_API_URL || '')
    .split(',')
    .map(endpoint => endpoint.trim())
    .filter(Boolean);

  return Array.from(new Set([...configured, ...DEFAULT_OVERPASS_ENDPOINTS]));
}

async function fetchWithTimeout(input: RequestInfo | URL, init: RequestInit = {}, timeoutMs = 8000) {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), timeoutMs);

  try {
    return await fetch(input, {
      ...init,
      signal: controller.signal,
    });
  } finally {
    clearTimeout(timeout);
  }
}

function extractCountryCode(address: unknown): string | undefined {
  if (address && typeof address === 'object') {
    const code = (address as Record<string, unknown>).country_code;
    if (typeof code === 'string' && code.trim()) {
      return code.trim().toLowerCase();
    }
  }
  return undefined;
}

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

export function scorePoiNotability(poi: PointOfInterest): number {
  const tags = poi.tags ?? {};
  let score = 0;

  if (tags.wikidata) score += 6;
  if (tags.wikipedia) score += 5;
  if (tags.wikimedia_commons) score += 2;
  if (tags.website || tags['contact:website']) score += 1;
  if (tags.opening_hours) score += 1;

  const tourism = (tags.tourism ?? '').toLowerCase();
  if (['attraction', 'museum', 'gallery', 'viewpoint'].includes(tourism)) score += 2;
  if (tags.historic) score += 2;
  if (poi.address) score += 1;

  return score;
}

function chunkTypes(types: string[], size: number): string[][] {
  const chunks: string[][] = [];

  for (let index = 0; index < types.length; index += size) {
    chunks.push(types.slice(index, index + size));
  }

  return chunks;
}

function parsePointOfInterestElements(elements: Array<Record<string, unknown>>): PointOfInterest[] {
  const unique = new Map<string, PointOfInterest>();

  for (const element of elements) {
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

  return Array.from(unique.values());
}

async function fetchOverpassPoisForTypes(options: {
  latitude: number;
  longitude: number;
  radius: number;
  types: string[];
  timeoutMs: number;
}): Promise<PointOfInterest[]> {
  if (options.types.length === 0) {
    return [];
  }

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
  const requestBody = new URLSearchParams({ data: query }).toString();
  let lastError: Error | null = null;

  for (const endpoint of getOverpassEndpoints()) {
    try {
      const response = await fetchWithTimeout(
        endpoint,
        {
          method: 'POST',
          headers: {
            Accept: 'application/json, text/plain;q=0.9, */*;q=0.8',
            'Content-Type': 'application/x-www-form-urlencoded; charset=UTF-8',
            'User-Agent': 'wayflo/1.0 (support@wayflo.app)',
          },
          body: requestBody,
          cache: 'no-store',
        },
        options.timeoutMs
      );

      if (!response.ok) {
        const errorText = await response.text().catch(() => '');
        lastError = new Error(
          `POI fetch failed with status ${response.status} from ${endpoint}${errorText ? `: ${errorText.slice(0, 180)}` : ''}`
        );
        continue;
      }

      const contentType = response.headers.get('content-type') ?? '';
      if (!contentType.includes('application/json')) {
        const responseText = await response.text().catch(() => '');
        lastError = new Error(
          `POI fetch returned a non-JSON response from ${endpoint}${responseText ? `: ${responseText.slice(0, 180)}` : ''}`
        );
        continue;
      }

      const data = (await response.json()) as { elements?: Array<Record<string, unknown>> };
      return parsePointOfInterestElements(data.elements ?? []);
    } catch (error) {
      lastError = error instanceof Error ? error : new Error(String(error));
    }
  }

  throw lastError ?? new Error('POI fetch failed for all Overpass endpoints');
}

export async function searchDestinations(query: string): Promise<DestinationSearchResult[]> {
  const cacheKey = query.trim().toLowerCase();
  const cached = destinationSearchCache.get(cacheKey);

  if (cached && cached.expiresAt > Date.now()) {
    return cached.results;
  }

  try {
    const response = await fetchWithTimeout(
      `https://nominatim.openstreetmap.org/search?format=jsonv2&addressdetails=1&limit=8&q=${encodeURIComponent(query)}`,
      {
        headers: NOMINATIM_HEADERS,
        next: { revalidate: 300 },
      },
      8000
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
        countryCode: extractCountryCode(result.address),
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
  } catch (error) {
    throw error;
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

// Restaurants carry website/opening_hours tags far more often than temples,
// monuments, or viewpoints, so a pure notability sort buries the real sights
// under food before the limit is applied. Instead, round-robin across categories
// (sights first) so every category keeps representation in the candidate pool and
// no single category — usually food — starves the others out.
function selectDiverseByCategory(pois: PointOfInterest[], limit: number): PointOfInterest[] {
  const order: Array<ReturnType<typeof classifyPoiCategory>> = [
    'culture',
    'park',
    'shopping',
    'food',
    'other',
    'stay',
  ];
  const buckets = new Map<ReturnType<typeof classifyPoiCategory>, PointOfInterest[]>();

  for (const poi of pois) {
    const category = classifyPoiCategory(poi);
    const bucket = buckets.get(category) ?? [];
    bucket.push(poi);
    buckets.set(category, bucket);
  }

  for (const bucket of buckets.values()) {
    bucket.sort(
      (left, right) =>
        scorePoiNotability(right) - scorePoiNotability(left) || left.name.localeCompare(right.name)
    );
  }

  const selected: PointOfInterest[] = [];
  let progressed = true;

  while (selected.length < limit && progressed) {
    progressed = false;

    for (const category of order) {
      if (selected.length >= limit) {
        break;
      }

      const next = buckets.get(category)?.shift();
      if (next) {
        selected.push(next);
        progressed = true;
      }
    }
  }

  return selected;
}

function classifyPoiCategory(poi: PointOfInterest): 'food' | 'culture' | 'park' | 'shopping' | 'stay' | 'other' {
  const type = `${poi.type} ${poi.name}`.toLowerCase();

  if (
    type.includes('hotel') ||
    type.includes('hostel') ||
    type.includes('guest house') ||
    type.includes('guest_house') ||
    type.includes('motel') ||
    type.includes('apartment') ||
    type.includes('stay')
  ) {
    return 'stay';
  }

  if (
    type.includes('restaurant') ||
    type.includes('cafe') ||
    type.includes('food') ||
    type.includes('bakery') ||
    type.includes('bistro') ||
    type.includes('breakfast')
  ) {
    return 'food';
  }

  if (
    type.includes('museum') ||
    type.includes('gallery') ||
    type.includes('attraction') ||
    type.includes('historic') ||
    type.includes('monument') ||
    type.includes('temple') ||
    type.includes('church') ||
    type.includes('worship') ||
    type.includes('shrine') ||
    type.includes('mosque')
  ) {
    return 'culture';
  }

  if (type.includes('park') || type.includes('garden') || type.includes('nature')) {
    return 'park';
  }

  if (type.includes('market') || type.includes('shop') || type.includes('mall') || type.includes('store')) {
    return 'shopping';
  }

  return 'other';
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

function getFallbackSearchTerms(type: string): string[] {
  const normalized = type.toLowerCase();

  switch (normalized) {
    case 'hotel':
      return ['hotel', 'guest house', 'hostel', 'motel', 'apartment'];
    case 'restaurant':
      return ['restaurant', 'cafe', 'food'];
    case 'cafe':
      return ['cafe', 'coffee', 'restaurant'];
    case 'market':
      return ['market', 'marketplace', 'bazaar'];
    case 'museum':
      return ['museum', 'gallery', 'attraction'];
    case 'gallery':
      return ['gallery', 'museum', 'art gallery'];
    case 'park':
      return ['park', 'garden'];
    case 'beach':
      return ['beach', 'waterfront'];
    case 'viewpoint':
      return ['viewpoint', 'lookout', 'hill'];
    case 'attraction':
      return ['attraction', 'sightseeing', 'landmark'];
    case 'bar':
      return ['bar', 'pub', 'nightlife'];
    case 'place_of_worship':
      return ['place of worship', 'temple', 'church', 'mosque'];
    case 'spa':
      return ['spa', 'wellness'];
    default:
      return [normalized.replace(/_/g, ' ')];
  }
}

function getFallbackAcceptedTypes(type: string): string[] {
  const normalized = type.toLowerCase();

  switch (normalized) {
    case 'hotel':
      return ['hotel', 'guest_house', 'hostel', 'motel', 'apartment'];
    case 'restaurant':
      return ['restaurant', 'fast_food', 'cafe'];
    case 'cafe':
      return ['cafe', 'restaurant', 'fast_food'];
    case 'market':
      return ['marketplace', 'market'];
    case 'museum':
      return ['museum', 'gallery', 'attraction'];
    case 'gallery':
      return ['gallery', 'museum', 'attraction'];
    case 'park':
      return ['park', 'garden'];
    case 'beach':
      return ['beach'];
    case 'viewpoint':
      return ['viewpoint', 'attraction', 'peak'];
    case 'attraction':
      return ['attraction', 'museum', 'park', 'viewpoint'];
    case 'bar':
      return ['bar', 'pub'];
    case 'place_of_worship':
      return ['place_of_worship', 'temple', 'church', 'mosque'];
    case 'spa':
      return ['spa'];
    default:
      return [normalized];
  }
}

async function fetchFallbackPointsOfInterest(options: {
  query: string;
  types: string[];
  limit: number;
}): Promise<PointOfInterest[]> {
  const unique = new Map<string, PointOfInterest>();

  for (const type of options.types) {
    if (unique.size >= options.limit) {
      break;
    }

    const acceptedTypes = new Set(getFallbackAcceptedTypes(type));
    const searchTerms = getFallbackSearchTerms(type);

    for (const searchTerm of searchTerms) {
      if (unique.size >= options.limit) {
        break;
      }

      const queryVariants = [
        `${options.query} ${searchTerm}`,
        `${searchTerm} in ${options.query}`,
      ];

      for (const query of queryVariants) {
        if (unique.size >= options.limit) {
          break;
        }

        const results = await searchDestinations(query).catch(() => []);

        for (const result of results) {
          if (unique.size >= options.limit) {
            break;
          }

          const normalizedType = result.type.toLowerCase();
          const normalizedName = result.name.toLowerCase();
          const normalizedSearchTerm = searchTerm.toLowerCase();

          if (
            !acceptedTypes.has(normalizedType) &&
            !normalizedName.includes(normalizedSearchTerm) &&
            normalizedType !== 'attraction'
          ) {
            continue;
          }

          const poi = destinationToPoi(result);
          const key = `${poi.name.toLowerCase()}-${poi.latitude.toFixed(4)}-${poi.longitude.toFixed(4)}`;

          if (!unique.has(key)) {
            unique.set(key, {
              ...poi,
              type: normalizedType || poi.type,
            });
          }
        }
      }
    }
  }

  return Array.from(unique.values()).slice(0, options.limit);
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

export async function searchStayCandidates(
  query: string,
  options?: {
    destination?: DestinationSearchResult | null;
    lodgingCandidates?: PointOfInterest[];
  }
): Promise<PointOfInterest[]> {
  const destination = options?.destination ?? (await resolveDestination(query).catch(() => null));
  const overpassCandidates =
    options?.lodgingCandidates ??
    (destination
      ? await fetchPointsOfInterest({
          latitude: destination.latitude,
          longitude: destination.longitude,
          radius: 8_000,
          types: ['hotel', 'guest_house', 'hostel', 'motel', 'apartment'],
          limit: 12,
          fallbackQuery: query,
        }).catch(() => [])
      : []);

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
  coordinates?: { latitude?: number | null; longitude?: number | null },
  options?: {
    skipReverseGeocode?: boolean;
  }
): Promise<DestinationSearchResult> {
  const cacheKey = `${destination.trim().toLowerCase()}::${coordinates?.latitude ?? ''}::${coordinates?.longitude ?? ''}`;
  const cached = reverseDestinationCache.get(cacheKey);

  if (cached && cached.expiresAt > Date.now()) {
    return cached.result;
  }

  const hasCoordinates =
    coordinates?.latitude !== null &&
    coordinates?.latitude !== undefined &&
    coordinates?.longitude !== null &&
    coordinates?.longitude !== undefined;

  if (hasCoordinates && options?.skipReverseGeocode) {
    const result: DestinationSearchResult = {
      name: destination.trim(),
      latitude: coordinates.latitude as number,
      longitude: coordinates.longitude as number,
      type: 'destination',
      address: destination.trim(),
    };

    reverseDestinationCache.set(cacheKey, { expiresAt: Date.now() + CACHE_TTL_MS, result });
    return result;
  }

  if (hasCoordinates) {
    const latitude = coordinates.latitude as number;
    const longitude = coordinates.longitude as number;

    const reverseResponse = await fetchWithTimeout(
      `https://nominatim.openstreetmap.org/reverse?format=jsonv2&addressdetails=1&lat=${latitude}&lon=${longitude}`,
      {
        headers: NOMINATIM_HEADERS,
        next: { revalidate: 300 },
      },
      6000
    );

    if (reverseResponse.ok) {
      const reverseData = (await reverseResponse.json()) as Record<string, unknown>;
      const displayName = String(reverseData.display_name ?? destination).trim();

      const result = {
        name: displayName.split(',')[0] ?? destination,
        latitude,
        longitude,
        type: String(reverseData.type ?? 'destination'),
        address: displayName,
        countryCode: extractCountryCode(reverseData.address),
      };

      reverseDestinationCache.set(cacheKey, { expiresAt: Date.now() + CACHE_TTL_MS, result });
      return result;
    }
  }

  const results = await searchDestinations(destination);
  const topResult = results[0];

  if (!topResult) {
    throw new Error(`No destination found for "${destination}"`);
  }

  reverseDestinationCache.set(cacheKey, { expiresAt: Date.now() + CACHE_TTL_MS, result: topResult });
  return topResult;
}

// Rule-based, per-destination interest chips: sample the live POIs around a
// place and rank our known interest vocabulary by what actually exists there
// (temple towns surface culture/history, coastal cities surface beach/nature),
// then pad with sensible defaults so there are always at least a few chips.
export async function suggestInterestsForLocation(options: {
  latitude: number;
  longitude: number;
}): Promise<string[]> {
  const pois = await fetchPointsOfInterest({
    latitude: options.latitude,
    longitude: options.longitude,
    radius: 12_000,
    types: [
      'attraction', 'place_of_worship', 'museum', 'gallery', 'park',
      'viewpoint', 'market', 'restaurant', 'cafe', 'beach', 'bar',
    ],
    limit: 40,
    timeoutMs: 7_000,
  }).catch(() => [] as PointOfInterest[]);

  const score = new Map<string, number>();
  const bump = (interest: string, amount = 1) => score.set(interest, (score.get(interest) ?? 0) + amount);

  for (const poi of pois) {
    const haystack = `${poi.type} ${poi.name} ${Object.values(poi.tags ?? {}).join(' ')}`.toLowerCase();

    if (/temple|worship|shrine|mosque|church|monument|historic|mandir|gurudwara/.test(haystack)) {
      bump('culture');
      bump('history');
    }
    if (/museum|gallery|\bart\b/.test(haystack)) {
      bump('culture');
      bump('art');
    }
    if (/attraction/.test(haystack)) bump('culture');
    if (/restaurant|cafe|food|bakery|bistro|cuisine/.test(haystack)) bump('food');
    if (/\bbar\b|pub|night|club/.test(haystack)) bump('nightlife');
    if (/beach|coast|seaside/.test(haystack)) {
      bump('beach', 2);
      bump('nature');
    }
    if (/park|garden|forest|lake/.test(haystack)) bump('nature');
    if (/viewpoint|peak|hill|trail|trek/.test(haystack)) {
      bump('nature');
      bump('adventure');
    }
    if (/market|mall|shop|bazaar|store/.test(haystack)) bump('shopping');
    if (/spa|wellness|yoga/.test(haystack)) bump('wellness');
  }

  const ranked = [...score.entries()].sort((left, right) => right[1] - left[1]).map(([interest]) => interest);
  const defaults = ['food', 'culture', 'nature', 'shopping', 'history', 'nightlife'];
  const result: string[] = [];

  for (const interest of [...ranked, ...defaults]) {
    if (!result.includes(interest)) {
      result.push(interest);
    }
  }

  return result.slice(0, 6);
}

export function derivePoiTypes(interests: string[]): string[] {
  const derived = new Set<string>();
  const wantsFood = interests.some((interest) => {
    const normalized = interest.toLowerCase();
    return normalized.includes('food') || normalized.includes('nightlife');
  });

  for (const rawInterest of interests) {
    const interest = rawInterest.toLowerCase();
    const mappedTypes = INTEREST_TO_POI_TYPES[interest] ?? [];

    for (const mappedType of mappedTypes) {
      derived.add(mappedType);
    }
  }

  for (const type of DEFAULT_POI_TYPES) {
    derived.add(type);
  }

  if (wantsFood) {
    derived.add('restaurant');
    derived.add('cafe');
  }

  return Array.from(derived);
}

export async function fetchPointsOfInterest(options: {
  latitude: number;
  longitude: number;
  radius: number;
  types: string[];
  limit?: number;
  timeoutMs?: number;
  fallbackQuery?: string;
}): Promise<PointOfInterest[]> {
  const cacheKey = [
    options.latitude.toFixed(4),
    options.longitude.toFixed(4),
    options.radius,
    options.limit ?? 0,
    [...options.types].sort().join(','),
  ].join('|');
  const cached = poiCache.get(cacheKey);

  if (cached && cached.expiresAt > Date.now()) {
    return cached.results;
  }

  const unique = new Map<string, PointOfInterest>();

  const timeoutMs = options.timeoutMs ?? 12_000;
  const typeGroups = chunkTypes(options.types, 3);

  for (const typeGroup of typeGroups) {
    try {
      const batchResults = await fetchOverpassPoisForTypes({
        latitude: options.latitude,
        longitude: options.longitude,
        radius: options.radius,
        types: typeGroup,
        timeoutMs,
      });

      for (const poi of batchResults) {
        if (!unique.has(poi.id)) {
          unique.set(poi.id, poi);
        }
      }

      if (unique.size >= (options.limit ?? 48)) {
        break;
      }
    } catch (error) {
      console.warn('[places] Overpass POI batch failed', {
        types: typeGroup,
        error: error instanceof Error ? error.message : String(error),
      });
    }
  }

  if (unique.size === 0 && options.fallbackQuery) {
    const fallbackResults = await fetchFallbackPointsOfInterest({
      query: options.fallbackQuery,
      types: options.types,
      limit: options.limit ?? 48,
    });

    for (const poi of fallbackResults) {
      if (!unique.has(poi.id)) {
        unique.set(poi.id, poi);
      }
    }
  }

  const currentResults = Array.from(unique.values());
  const currentCategories = new Set(currentResults.map(classifyPoiCategory));
  if (options.fallbackQuery && (currentResults.length === 0 || currentCategories.size < 3)) {
    const fallbackResults = await fetchFallbackPointsOfInterest({
      query: options.fallbackQuery,
      types: options.types,
      limit: options.limit ?? 48,
    });

    for (const poi of fallbackResults) {
      if (!unique.has(poi.id)) {
        unique.set(poi.id, poi);
      }
    }
  }

  const results = selectDiverseByCategory(Array.from(unique.values()), options.limit ?? 48);

  poiCache.set(cacheKey, { expiresAt: Date.now() + CACHE_TTL_MS, results });
  return results;
}
