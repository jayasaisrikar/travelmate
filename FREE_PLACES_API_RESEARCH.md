# Free Google Places API Alternatives - Research Report

## Executive Summary

Google removed $200/month free credit in Feb 2025. Here are **12 free/cheap alternatives** for TravelMate.

---

## Tier 1: Completely Free

### 1. OpenStreetMap + Nominatim ⭐⭐⭐⭐⭐
- **Cost:** FREE (self-hosted or public API)
- **Rate Limit:** 1 req/sec
- **Features:** Geocoding, reverse geocoding, POI search, 53M+ POIs
- **Best For:** Budget-conscious startups

```javascript
const response = await fetch(
  'https://nominatim.openstreetmap.org/search?q=restaurants+Paris&format=json'
);
```

### 2. Overture Maps Foundation ⭐⭐⭐⭐
- **Cost:** FREE (bulk downloads)
- **Features:** 53M+ POIs, open data, no rate limits
- **Best For:** Data-heavy projects, offline maps

---

## Tier 2: Generous Free Tier (100K+/month)

### 3. Mapbox ⭐⭐⭐⭐⭐
- **Free Tier:** 100K requests/month
- **Paid From:** Pay-as-you-go
- **Features:** Search API, custom maps, navigation
- **Best For:** Professional apps

### 4. LocationIQ ⭐⭐⭐⭐
- **Free Tier:** 5K req/day (150K/month)
- **Paid From:** $49/month
- **Features:** Geocoding, batch operations

### 5. MapTiler ⭐⭐⭐⭐
- **Free Tier:** 100K requests/month
- **Paid From:** $25/month
- **Features:** Vector tiles, offline maps

### 6. Geoapify ⭐⭐⭐⭐⭐ (RECOMMENDED FOR TRAVELMATE)
- **Free Tier:** 3K req/day (90K/month)
- **Paid From:** $59/month
- **Features:** Places search, routing, geocoding
- **Best For:** Travel apps (complete feature set)

```javascript
const response = await fetch(
  `https://api.geoapify.com/v2/places?categories=catering.restaurant&filter=circle:${lon},${lat},5000&apiKey=${API_KEY}`
);
```

### 7. Radar
- **Free Tier:** 100K requests/month
- **Specialty:** Geofencing + places search

### 8. Geocodio
- **Free Tier:** 2.5K req/day (US/Canada only)
- **Specialty:** Highly accurate US address geocoding

### 9. TomTom
- **Free Tier:** 50K transactions/day
- **Specialty:** Search + traffic + EV routing

### 10. HERE Maps
- **Free Tier:** 250K transactions/month
- **Best For:** Enterprise, logistics

### 11. Azure Maps (Microsoft)
- **Free Tier:** Limited (S0 tier)
- **Best For:** Azure ecosystem

### 12. Foursquare Places API
- **Free Tier:** Limited
- **Specialty:** 100M+ POIs, venue data

---

## Comparison Table

| Provider | Free/month | Best Feature | Difficulty |
|----------|-----------|--------------|-----------|
| Nominatim | ∞ | Basic POI | Easy |
| Mapbox | 100K | Custom maps | Medium |
| Geoapify | 90K | Full-stack | Easy |
| LocationIQ | 150K | Batch ops | Easy |
| MapTiler | 100K | Offline | Medium |

---

## MY RECOMMENDATION: Geoapify + Nominatim

### Why This Combo?
- **Geoapify:** 90K free requests/month, places search, routing
- **Nominatim:** Unlimited free, geocoding, no key needed
- **Total Cost:** $0 forever (MVP), $59/month at scale
- **Setup Time:** 30 minutes

### Implementation
```typescript
// app/api/places/route.ts
async function searchPlaces(query, lat, lon, radius) {
  // Use Geoapify for places
  const response = await fetch(
    `https://api.geoapify.com/v2/places?categories=catering.restaurant&filter=circle:${lon},${lat},${radius}&apiKey=${process.env.GEOAPIFY_API_KEY}`
  );
  return response.json();
}

async function geocodeAddress(address) {
  // Use Nominatim for geocoding (free!)
  const response = await fetch(
    `https://nominatim.openstreetmap.org/search?q=${address}&format=json`
  );
  return response.json();
}
```

### Setup Steps
1. Get Geoapify key: https://www.geoapify.com/register
2. No signup needed for Nominatim (just use the URL)
3. Add to .env.local: `GEOAPIFY_API_KEY=your_key`
4. Done!

---

## Cost Breakdown

### MVP Phase
- Geoapify: 90K/month (FREE)
- Nominatim: unlimited (FREE)
- **Total: $0/month**

### Growth Phase
- Geoapify: $59/month (500K+ requests)
- Mapbox: $25/month (100K+ requests)
- **Total: $84/month**

### Enterprise Phase
- Usage-based: $100-500/month

