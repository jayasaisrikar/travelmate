# 🌍 Wayflo Social — Feature Design

## The Core Insight
This isn't a dating app for travelers, and it's not just a forum. It's a **destination-anchored companion layer** — you discover people through *shared intent* (same destination, similar dates, compatible travel style), not just geography. Think **Strava meets Bumble BFF meets Couchsurfing Hangouts**, but built around your actual trip plans.

---

## 1. Product Architecture — The Three Layers

### Layer 1: Traveler Presence
Who's going where, and when.

```
User Profile (public opt-in)
├── Display name + avatar
├── "Currently planning" destination (public)
├── Travel style: solo | couple | group | flexible
├── Budget tone: budget | mid-range | luxury
├── Interests: matches existing onboarding interests
├── Short bio (140 chars)
├── Trip count + joined date (trust signals)
└── Upcoming window: "Going in June 2026" (no exact dates for privacy)
```

### Layer 2: Explore Page (`/explore`)
The social discovery hub — **three views**:

**a) Globe/Map View**
- Animated world map with glowing destination clusters
- Each cluster shows avatar stack + "12 travelers going"
- Click a destination → destination detail page

**b) Card Feed View**
- Traveler cards sorted by: "Going soon · Same destination as you · New to wayflo"
- Each card: avatar, name, destination badge, travel window, interests chips, travel style, mutual trip count
- Actions: **Wave** (anonymous interest) → mutual wave → can message

**c) Destination Room View**
- `/explore/[destination-slug]` e.g. `/explore/bali`
- Shows all travelers going to Bali, filterable by date range
- "Create a group trip here" CTA

### Layer 3: Trip Rooms (Collaborative Planning)
- Any user can start a **Trip Room** for a destination + rough dates
- Others can "Join" → shared itinerary builder, group map, chat thread
- The room generates a shared wayflo trip that all members can view/suggest edits to

---

## 2. Privacy & Trust Model (Non-Negotiable)

| Signal | Visible to | Default |
|---|---|---|
| Full name | Matched connections only | Hidden |
| Destination | Public (if opted in) | Hidden |
| Exact dates | Never public | Hidden |
| Travel window (month) | Public (if opted in) | Hidden |
| Trip history count | Public | Visible |
| Online status | Connections only | Hidden |

- **Hard opt-in**: nothing is social until user explicitly enables "Traveler Profile"
- **Wave system**: like LinkedIn's "follow" — interest is anonymous until mutual
- **Report + block** on every profile surface
- **Verified badge**: email verified + at least 1 completed trip

---

## 3. Integration Points Across the Existing App

### A. Onboarding — new final step
> After budget/interests: *"Want to connect with other travelers going to [destination]? 3 wayflo users are planning [destination] this month."*
> Toggle: Make my profile visible → skip

### B. Dashboard — Community Widget
```
┌─────────────────────────────────────────┐
│  👥  3 travelers are also planning Bali  │
│  ── ── ──  (avatar stack)               │
│  [See who's going]                      │
└─────────────────────────────────────────┘
```

### C. Trip Detail Page — Social Section
```
┌─────────────────────────────────────────┐
│  🌍  Travelers going to Bali            │
│  Find a companion or join a trip room   │
│  ── ── ── ──  (4 avatar cards)          │
│  [Explore companions]  [Start a room]   │
└─────────────────────────────────────────┘
```

### D. Homepage — Social Proof Section
Replace the existing generic "product moments" section with a live social proof strip: *"42 wayflo travelers visited Kyoto last month"* → links to `/explore/kyoto`

### E. Navbar — "Explore" Link
Add `Explore` nav link (with a dot indicator when there are new travelers going to your planned destinations)

---

## 4. Database Schema (Supabase Migrations)

```sql
-- traveler_profiles: public social layer
create table traveler_profiles (
  id uuid primary key references auth.users(id),
  display_name text,
  avatar_url text,
  bio text check (char_length(bio) <= 140),
  travel_style text check (travel_style in ('solo','couple','group','flexible')),
  is_public boolean default false,
  verified boolean default false,
  created_at timestamptz default now()
);

-- traveler_trips_public: "I'm going to X in Y month"
create table traveler_trip_signals (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references auth.users(id),
  trip_id uuid references trips(id) on delete cascade,
  destination text not null,
  destination_slug text not null,
  travel_month text,   -- "June 2026" — no exact dates
  is_public boolean default false,
  created_at timestamptz default now()
);

-- connections: wave → mutual → connected
create table traveler_connections (
  id uuid primary key default gen_random_uuid(),
  from_user uuid references auth.users(id),
  to_user uuid references auth.users(id),
  status text check (status in ('wave','connected','blocked')),
  created_at timestamptz default now(),
  unique(from_user, to_user)
);

-- trip_rooms: collaborative planning spaces
create table trip_rooms (
  id uuid primary key default gen_random_uuid(),
  created_by uuid references auth.users(id),
  destination text not null,
  destination_slug text not null,
  title text,
  travel_month text,
  max_members int default 6,
  is_open boolean default true,
  created_at timestamptz default now()
);

create table trip_room_members (
  room_id uuid references trip_rooms(id) on delete cascade,
  user_id uuid references auth.users(id),
  role text check (role in ('host','member')),
  joined_at timestamptz default now(),
  primary key (room_id, user_id)
);
```

---

## 5. Page & Component Map

```
app/
  explore/
    page.tsx               ← Main social discovery page
    [destination]/
      page.tsx             ← Destination-specific traveler list
  profile/
    [username]/
      page.tsx             ← Public traveler profile
  rooms/
    page.tsx               ← My trip rooms
    [id]/
      page.tsx             ← Trip room detail + chat + shared map

components/
  social/
    TravelerCard.tsx        ← Avatar, name, destination, wave button
    TravelerMap.tsx         ← Globe/cluster map view
    DestinationRoomCard.tsx ← Trip room card
    WaveButton.tsx          ← Animated wave CTA
    CompanionStrip.tsx      ← Inline teaser for trip/dashboard page
    TravelerProfileSheet.tsx ← Slide-over profile drawer

services/
  social.ts                ← Wave, connect, fetch profiles, rooms

supabase/migrations/
  20260601_add_social_tables.sql
```

---

## 6. Build Sequence (Shippable Milestones)

| Sprint | Deliverable | Why first |
|---|---|---|
| 1 | DB migrations + `social.ts` service + profile opt-in settings page | Foundation — nothing works without this |
| 2 | `/explore` page — card feed + destination filter | The core social page |
| 3 | `CompanionStrip` embedded in dashboard + trip page | Drives discoverability without separate visit |
| 4 | `/explore/[destination]` destination room page | Depth layer |
| 5 | Wave + connection system | Engagement loop |
| 6 | Trip Rooms (create + join + shared map) | The flagship group planning feature |
| 7 | Realtime chat in rooms (Supabase Realtime) | The stickiness layer |

---

## 7. The "Tier-1" Details That Separate This

1. **No ghost profiles** — only show travelers who opted in AND have activity in last 90 days. Stale profiles kill social features.
2. **Destination slugs normalize globally** — "Bali", "bali", "Bali, Indonesia" all resolve to `bali`. Use a lookup table.
3. **Wave count throttle** — max 10 waves/day per user. Prevents spam, increases signal quality.
4. **Room size cap** — 6 people max per trip room. Forces quality over quantity.
5. **Realtime presence** — Supabase Realtime channels show "2 people viewing this destination" live.
6. **Social proof everywhere** — every destination page shows `N wayflo travelers explored this` with real numbers.
7. **Privacy toggle is one click away** from every social surface — builds trust, increases opt-in rate.

---

## Build Order

**Step 1 →** DB migration + opt-in profile settings
**Step 2 →** `/explore` discovery page
**Step 3 →** `CompanionStrip` embedded in dashboard & trip pages
