export const BUDGET_LEVELS = ['budget', 'mid', 'luxury'] as const;
export const DURATION_OPTIONS = [1, 2, 3, 5, 7, 10, 14] as const;
export const INTERESTS = [
  'culture',
  'food',
  'adventure',
  'nature',
  'nightlife',
  'shopping',
  'history',
  'art',
  'wellness',
  'beach',
] as const;

export const NOMINATIM_HEADERS = {
  'Accept-Language': 'en',
  'From': 'support@travelmate.app',
  'User-Agent': 'TravelMate/1.0 (support@travelmate.app)',
} as const;

export const OPEN_METEO_WEATHER_CODES: Record<number, { description: string; icon: string }> = {
  0: { description: 'Clear sky', icon: '01d' },
  1: { description: 'Mainly clear', icon: '02d' },
  2: { description: 'Partly cloudy', icon: '03d' },
  3: { description: 'Overcast', icon: '04d' },
  45: { description: 'Fog', icon: '50d' },
  48: { description: 'Depositing rime fog', icon: '50d' },
  51: { description: 'Light drizzle', icon: '09d' },
  53: { description: 'Moderate drizzle', icon: '09d' },
  55: { description: 'Dense drizzle', icon: '09d' },
  56: { description: 'Light freezing drizzle', icon: '13d' },
  57: { description: 'Dense freezing drizzle', icon: '13d' },
  61: { description: 'Slight rain', icon: '10d' },
  63: { description: 'Moderate rain', icon: '10d' },
  65: { description: 'Heavy rain', icon: '10d' },
  66: { description: 'Light freezing rain', icon: '13d' },
  67: { description: 'Heavy freezing rain', icon: '13d' },
  71: { description: 'Slight snow fall', icon: '13d' },
  73: { description: 'Moderate snow fall', icon: '13d' },
  75: { description: 'Heavy snow fall', icon: '13d' },
  77: { description: 'Snow grains', icon: '13d' },
  80: { description: 'Slight rain showers', icon: '09d' },
  81: { description: 'Moderate rain showers', icon: '09d' },
  82: { description: 'Violent rain showers', icon: '09d' },
  85: { description: 'Slight snow showers', icon: '13d' },
  86: { description: 'Heavy snow showers', icon: '13d' },
  95: { description: 'Thunderstorm', icon: '11d' },
  96: { description: 'Thunderstorm with slight hail', icon: '11d' },
  99: { description: 'Thunderstorm with heavy hail', icon: '11d' },
};

export const INTEREST_TO_POI_TYPES: Record<string, string[]> = {
  culture: ['museum', 'gallery', 'attraction', 'viewpoint'],
  food: ['restaurant', 'cafe', 'market'],
  adventure: ['attraction', 'viewpoint', 'park'],
  nature: ['park', 'viewpoint', 'beach'],
  nightlife: ['bar', 'restaurant'],
  shopping: ['market'],
  history: ['museum', 'attraction', 'place_of_worship'],
  art: ['museum', 'gallery'],
  wellness: ['park', 'spa'],
  beach: ['beach', 'viewpoint'],
};

export const POI_TYPE_ALIASES: Record<string, string[]> = {
  restaurant: ['amenity=restaurant', 'amenity=fast_food'],
  cafe: ['amenity=cafe'],
  market: ['amenity=marketplace'],
  hotel: ['tourism=hotel', 'tourism=guest_house', 'tourism=hostel'],
  museum: ['tourism=museum'],
  gallery: ['tourism=gallery'],
  park: ['leisure=park', 'leisure=garden'],
  beach: ['natural=beach'],
  viewpoint: ['tourism=viewpoint'],
  attraction: ['tourism=attraction'],
  bar: ['amenity=bar', 'amenity=pub'],
  place_of_worship: ['amenity=place_of_worship'],
  spa: ['leisure=spa'],
};
