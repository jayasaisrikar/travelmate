-- Trip dates + destination coordinates
alter table public.trips add column if not exists trip_start_date date;
alter table public.trips add column if not exists trip_end_date date;
alter table public.trips add column if not exists dest_lat double precision;
alter table public.trips add column if not exists dest_lng double precision;

-- Location consent on traveler profiles
alter table public.traveler_profiles add column if not exists location_consent_at timestamptz;
alter table public.traveler_profiles add column if not exists location_consent_revoked_at timestamptz;

-- Presence checks: one successful proof per (trip, user)
create table if not exists public.trip_presence_checks (
  id uuid primary key default gen_random_uuid(),
  trip_id text not null references public.trips(id) on delete cascade,
  user_id uuid not null,
  verified_at timestamptz not null default now(),
  lat double precision not null,
  lng double precision not null,
  distance_km double precision not null,
  unique (trip_id, user_id)
);
create index if not exists trip_presence_checks_user on public.trip_presence_checks(user_id);

-- Ratings: one per (trip, user), editable
create table if not exists public.trip_ratings (
  id uuid primary key default gen_random_uuid(),
  trip_id text not null references public.trips(id) on delete cascade,
  user_id uuid not null,
  stars int not null check (stars between 1 and 5),
  review text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (trip_id, user_id)
);
create index if not exists trip_ratings_trip on public.trip_ratings(trip_id);
