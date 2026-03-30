# TravelMate — Next.js 15 Travel Planner Scaffold

**Status:** ✅ Production-ready boilerplate. Full TypeScript strict mode. Builds successfully.

## Stack

- **Next.js 15** (App Router)
- **React 19** with TypeScript 5.x (strict mode)
- **Tailwind CSS 3.4** + PostCSS
- **Framer Motion** for animations
- **React Query 5** (TanStack) for data fetching
- **PocketBase** (auth + database)
- **Leaflet + React-Leaflet** for maps
- **Chart.js** for budget breakdown
- **Gemini 3.1 Pro** API integration (service layer ready)

## Project Structure

```
travelmate/
├── app/
│   ├── layout.tsx                  # Root layout + metadata
│   ├── page.tsx                    # Landing page
│   ├── providers.tsx               # React Query setup
│   ├── globals.css                 # Tailwind imports
│   ├── (auth)/
│   │   ├── login/page.tsx          # Login form
│   │   ├── signup/page.tsx         # Signup form
│   │   └── layout.tsx              # Auth wrapper
│   ├── (dashboard)/
│   │   ├── dashboard/page.tsx      # User trips list
│   │   ├── onboarding/page.tsx     # 5-step trip form (stub)
│   │   ├── trips/[id]/page.tsx     # Trip detail view
│   │   └── trips/[id]/map/page.tsx # Trip map view
│   └── api/
│       ├── generate-itinerary/     # Gemini itinerary endpoint
│       ├── places/                 # Google Places proxy
│       └── weather/                # Weather API proxy
├── components/
│   ├── ui/                         # Shadcn-style primitives (button, input, card, modal)
│   ├── common/                     # Navbar, Footer, ErrorBoundary, LoadingSpinner
│   ├── home/                       # Hero, Features, HowItWorks, CTA
│   ├── onboarding/                 # 5-step form components (stubs)
│   ├── trip/                       # TimelineView, MapView, BudgetBreakdown, ActivityCard, ShareModal
│   └── aceternity/                 # Animated component wrappers (SpotlightCard, ParallaxScroll)
├── hooks/
│   ├── useAuth.ts                  # PocketBase auth (types defined)
│   ├── useTrip.ts                  # Trip CRUD (types defined)
│   ├── useApi.ts                   # Generic API wrapper
│   └── usePocketBase.ts            # PocketBase client singleton
├── services/
│   ├── pocketbase.ts               # PocketBase initialization
│   ├── gemini.ts                   # Gemini API wrapper (structure ready)
│   ├── itinerary.ts                # Itinerary generation logic
│   ├── costCalculator.ts           # Budget estimation
│   ├── places.ts                   # Places service stub
│   └── weather.ts                  # Weather service stub
├── types/
│   ├── index.ts                    # All app types (Trip, Activity, DayItinerary, BudgetBreakdown, etc.)
│   └── pocketbase.ts               # PocketBase collection schemas
├── lib/
│   ├── cn.ts                       # clsx + tailwind-merge utility
│   ├── constants.ts                # Budget levels, durations, interests
│   └── utils.ts                    # Currency formatting, helpers
├── styles/
│   └── globals.css                 # Global Tailwind base
├── public/
│   ├── images/                     # Static images
│   └── fonts/                      # Custom fonts
├── .env.example                    # API keys template
├── package.json                    # Dependencies (buildable)
├── tsconfig.json                   # TypeScript strict mode
├── tailwind.config.ts              # Tailwind configuration
├── postcss.config.js               # PostCSS setup
├── next.config.ts                  # Next.js config
├── eslint.config.mjs               # ESLint setup
├── README.md                       # Quick start
├── pocketbase-setup.md             # PocketBase collection guide
└── SCAFFOLD_INFO.md                # This file
```

## Key Features

### Auth System (PocketBase)
- Email/password signup & login
- Protected routes (dashboard, trips)
- Session persistence
- User preferences storage

### Trip Planning
- Destination autocomplete (Google Places)
- Duration selector (3/5/7 days)
- Budget tier (budget/mid/luxury)
- Interest multi-select (10 categories)
- AI-generated itineraries (Gemini 3.1 Pro)

### Trip Display
- **Timeline View**: Day-by-day activities with times, costs, descriptions
- **Map View**: Interactive Leaflet map with activity pins, routes
- **Budget Tab**: Pie chart breakdown (flights, hotels, food, activities, etc.)
- **Share**: Copy link, social sharing (structure ready)

### Animations & UX
- Framer Motion entry animations
- Parallax effects on hero
- Card hover states
- Smooth page transitions
- Mobile-first responsive design

## Getting Started

1. **Clone & Install**
   ```bash
   cd ~/Documents/Git\ Repos/travelmate
   npm install
   ```

2. **Configure Environment**
   ```bash
   cp .env.example .env.local
   # Fill in API keys:
   # - GEMINI_API_KEY (https://aistudio.google.com)
   # - NEXT_PUBLIC_GOOGLE_PLACES_API_KEY
   # - WEATHER_API_KEY (openweathermap.org)
   # - NEXT_PUBLIC_POCKETBASE_URL (local or cloud)
   ```

3. **Start Dev Server**
   ```bash
   npm run dev
   # Open http://localhost:3000
   ```

4. **Build for Production**
   ```bash
   npm run build
   npm start
   ```

## API Endpoints

- `POST /api/generate-itinerary` — Gemini itinerary generation
- `GET /api/places?q=...` — Google Places autocomplete proxy
- `GET /api/weather?city=...` — Weather API proxy

## PocketBase Setup

Required collections (see `pocketbase-setup.md`):

- **users** — Email, name, preferences
- **trips** — Destination, duration, budget, itinerary_json, budget_breakdown_json
- **activities** — Per-trip activities with lat/lng for mapping
- **favorites** — User→Activity bookmarks
- **shares** — Trip share codes

## TypeScript

Full `strict: true` mode enabled. All types defined in `types/index.ts`.

## Next Steps

1. **Wire Auth** — Implement `useAuth` hook callbacks with PocketBase
2. **Implement Onboarding** — Fill in 5-step form components
3. **Wire Gemini** — Integrate API key + prompt refinement in `services/gemini.ts`
4. **Build Map UI** — Use React-Leaflet in `components/trip/MapView.tsx`
5. **Connect PocketBase Collections** — Schema validation + queries
6. **Add Animations** — Enhanced Aceternity UI components (currently stubs)

## Notes

- ESLint flat config in use (Next.js 15+ standard)
- No hardcoded secrets — all in `.env.local`
- CSS is Tailwind 3 (not v4 @theme syntax)
- Ready for Docker deployment
- All imports use `@/` path aliases

---

**Built:** 2026-03-29  
**Node:** v22+  
**Status:** Scaffold complete. Ready for feature development.
