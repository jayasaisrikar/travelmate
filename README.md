# wayflo

wayflo is a live-data travel planner that turns a real destination, trip window, budget, and interests into a saved itinerary with map context, lodging, chat assistance, and public sharing.
It also includes social travel discovery so travelers can find people headed to the same place, create trip rooms, and optionally verify their public profile with Didit.

## What It Does

- Searches real destinations instead of using a preset list.
- Builds itineraries around the traveler’s actual arrival and departure time.
- Uses live destination, POI, stay, and weather data when generating a trip.
- Saves trips to Supabase and lets users revisit them in a dashboard.
- Shows the itinerary on a map with ordered stops and stay location.
- Lets travelers refine the plan with an assistant after generation.
- Creates a public share page where guests can leave suggestions.
- Lets travelers opt into a public social profile for discovery, waves, messages, and trip rooms.
- Supports optional Didit identity verification with a visible trust ladder on traveler profiles.

## Product Flow

1. The traveler signs up or logs in.
2. They search for a destination and confirm the live result.
3. They enter their trip window, transfer context, budget, interests, and activity pace.
4. wayflo generates an itinerary from live data and saves it.
5. The trip page shows the route, stay, estimated cost, and assistant.
6. The user can share the trip publicly and collect feedback from other people.
7. If they want, they can create a social traveler profile, publish trip signals, join rooms, and verify their identity with Didit.

## Key Screens

- Landing page: positions the product around real trip timing and live data.
- Dashboard: lists saved trips and starts a new trip flow.
- Onboarding: collects destination, schedule, preferences, and review details.
- Trip details: map, stay card, ordered activities, assistant, and share modal.
- Public share page: view-only trip page with a suggestion form.
- Explore/community pages: public traveler discovery, destination pulses, waves, messages, and trip rooms.

## Tech Stack

- Next.js 15
- React 19
- TypeScript
- Supabase Auth + Postgres
- Tailwind CSS
- Framer Motion
- Leaflet + OpenStreetMap tiles
- OpenStreetMap Nominatim for destination search
- OpenStreetMap Overpass for POIs and stays
- Open-Meteo for weather
- NVIDIA Kimi API for itinerary generation and trip assistant responses
- Resend for transactional app emails
- Didit for optional traveler identity verification
- Admin-only access through the built-in dashboard

## Architecture

- `app/` contains the app router pages and API routes.
- `services/` contains live-data integrations and itinerary generation logic.
- `lib/` contains shared types, constants, and Supabase trip helpers.
- `components/` contains the landing page, dashboard, trip view, sharing UI, and map UI.
- `supabase/migrations/` contains the database schema for trips, profiles, social features, shares, and suggestions.

## Setup

### 1. Install dependencies

```bash
npm install
```

### 2. Configure environment variables

Create a `.env.local` file with the values your project needs:

```bash
NEXT_PUBLIC_SUPABASE_URL=...
NEXT_PUBLIC_SUPABASE_ANON_KEY=...
SUPABASE_URL=...
SUPABASE_SERVICE_ROLE_KEY=...
NVIDIA_API_KEY=...
# or
NVIDIA_KIMI_API_KEY=...
NEXT_PUBLIC_APP_URL=https://wayflo.jayasaisrikar.xyz
ADMIN_EMAIL=admin@wayflo.app
ADMIN_PASSWORD=...
RESEND_API_KEY=...
EMAIL_FROM="wayflo <your-approved-sender>"
# Optional if you have a real inbox for replies.
EMAIL_REPLY_TO=
# Optional social identity verification with Didit.
DIDIT_API_KEY=...
DIDIT_KYC_WORKFLOW_ID=...
DIDIT_WORKFLOW_ID=
DIDIT_WEBHOOK_SECRET=...
```

Notes:

- `NEXT_PUBLIC_SUPABASE_URL` and `NEXT_PUBLIC_SUPABASE_ANON_KEY` are used by the browser client.
- `SUPABASE_URL` and `SUPABASE_SERVICE_ROLE_KEY` are used by server-side Supabase access.
- `NVIDIA_API_KEY` or `NVIDIA_KIMI_API_KEY` is required for itinerary generation and the trip assistant.
- `NEXT_PUBLIC_APP_URL` is required in production for auth links and helps generated share links resolve correctly outside local development.
- `ADMIN_EMAIL` identifies the account that opens the admin dashboard.
- `ADMIN_PASSWORD` is the password for that admin account.
- `RESEND_API_KEY` authenticates server-side email sending with Resend.
- Set `EMAIL_FROM` to a sender that is verified in Resend, for example a verified `no-reply@...` alias on a domain you added to Resend.
- `DIDIT_API_KEY` enables optional traveler identity verification.
- `DIDIT_KYC_WORKFLOW_ID` is the preferred workflow id for the social verification flow.
- `DIDIT_WORKFLOW_ID` is a fallback for older environments that already use that variable name.
- `DIDIT_WEBHOOK_SECRET` is required to verify Didit webhook payloads.
- Regular users can sign up and log in normally.
- If the admin account logs in on `/login`, it lands on `/dashboard`.

### 3. Apply the Supabase migrations

Run the SQL in `supabase/migrations/` against your Supabase project:

- `20260411_create_trips.sql`
- `20260412_add_auth_tables.sql`
- `20260413_add_trip_shares.sql`
- `20260601_add_social_tables.sql`
- `20260609_add_didit_verification_to_traveler_profiles.sql`

### 4. Start the app

```bash
npm run dev
```

## Scripts

- `npm run dev` - start the development server
- `npm run build` - build for production
- `npm run start` - run the production build
- `npm run lint` - run ESLint

## Live Data Sources

- Destination search: OpenStreetMap Nominatim
- Points of interest and lodging candidates: OpenStreetMap Overpass
- Weather: Open-Meteo
- Itinerary generation: NVIDIA-hosted Kimi model

## Data Model

- `trips` stores the saved itinerary and user-owned trip metadata.
- `trip_shares` stores public share tokens and metadata.
- `trip_suggestions` stores guest feedback submitted from public share pages.
- `profiles` stores auth-linked user profile data.
- `traveler_profiles`, `traveler_trip_signals`, `trip_rooms`, `trip_room_members`, `traveler_connections`, and `traveler_messages` power the social travel experience.

## Notes

- wayflo is designed around real trip windows, not generic “full day” plans.
- The itinerary JSON includes a stay, transfers, daily plans, budget breakdown, and tips.
- The public share flow is meant to create a feedback loop, not just a read-only trip page.
- Email notifications are currently used for trip share suggestions and can be extended to other transactional flows.
- The social layer is privacy-aware by default: travelers must opt into a public profile before they appear in discovery.
- Didit verification is optional and intended to add trust signals, not block the core travel planning flow.
