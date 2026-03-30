# TravelMate - Free APIs Setup Guide

## Quick Start (5 Minutes)

### Step 1: Gemini API Key
```
1. Visit: https://ai.google.dev
2. Click "Get API Key"
3. Copy key → .env.local: GEMINI_API_KEY=your_key
```

### Step 2: Geoapify Key (Optional, recommended)
```
1. Visit: https://www.geoapify.com/register
2. Sign up free
3. Copy API key
4. Add to .env.local: GEOAPIFY_API_KEY=your_key
```

### Step 3: Nominatim (No signup needed!)
```
# Already enabled, uses:
# https://nominatim.openstreetmap.org
# Completely FREE, unlimited
```

### Step 4: Test It
```bash
# Geocode (using free Nominatim)
curl "http://localhost:6789/api/places?address=Paris"

# Find restaurants (using Geoapify or Nominatim fallback)
curl "http://localhost:6789/api/places?query=restaurants&lat=48.8566&lon=2.3522&radius=5000"

# Generate itinerary (needs Gemini key)
curl -X POST "http://localhost:6789/api/generate-itinerary" \
  -H "Content-Type: application/json" \
  -d '{"destination":"Tokyo","duration":3,"budget":"Mid-range","interests":["Food"]}'
```

---

## API Limits & Costs

### Geoapify (Places)
- FREE: 3,000 req/day (90K/month)
- PAID: $59/month for more

### Nominatim (Geocoding)
- FREE: Unlimited (self-hosted) | 1 req/sec (public)
- Cost: $0 forever

### Gemini (Itinerary)
- FREE: 60 req/min (free tier)
- PAID: $10+ for higher limits

---

## What's Implemented

✅ Places API (`/api/places`)
- Geocoding: Convert address → lat/lon
- Places Search: Find restaurants, hotels, attractions
- Fallback: Nominatim works without Geoapify key

✅ Itinerary API (`/api/generate-itinerary`)
- Needs Gemini key
- Returns day-by-day plans + budget

✅ Dashboard
- Onboarding form with 5 steps
- All form validation working

---

## Next Steps

1. [ ] Add GEMINI_API_KEY to .env.local
2. [ ] (Optional) Add GEOAPIFY_API_KEY
3. [ ] Test each endpoint
4. [ ] Create Supabase project for storage
5. [ ] Deploy to Vercel

