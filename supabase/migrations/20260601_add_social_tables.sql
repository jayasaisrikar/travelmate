-- ============================================================
-- Wayflo Social Network — Sprint 1 schema
-- ============================================================

-- ── 1. traveler_profiles ────────────────────────────────────
-- One row per user; created lazily on first opt-in.
create table if not exists traveler_profiles (
  id             uuid primary key references auth.users(id) on delete cascade,
  display_name   text,
  avatar_url     text,
  bio            text check (char_length(bio) <= 140),
  travel_style   text check (travel_style in ('solo', 'couple', 'group', 'flexible')),
  is_public      boolean not null default false,
  verified       boolean not null default false,
  wave_quota     int     not null default 10,       -- resets daily via cron
  last_seen_at   timestamptz,
  created_at     timestamptz not null default now(),
  updated_at     timestamptz not null default now()
);

-- Only expose public, recently-active profiles to everyone else
create index if not exists idx_traveler_profiles_public
  on traveler_profiles (is_public, last_seen_at desc)
  where is_public = true;

-- ── 2. traveler_trip_signals ─────────────────────────────────
-- "I'm going to X around month Y" — never stores exact dates.
create table if not exists traveler_trip_signals (
  id               uuid primary key default gen_random_uuid(),
  user_id          uuid not null references auth.users(id) on delete cascade,
  trip_id          text references trips(id) on delete cascade,
  destination      text not null,
  destination_slug text not null,           -- normalised, e.g. "bali"
  travel_month     text,                    -- "June 2026"
  is_public        boolean not null default false,
  created_at       timestamptz not null default now(),
  unique (user_id, trip_id)
);

create index if not exists idx_trip_signals_slug
  on traveler_trip_signals (destination_slug, is_public)
  where is_public = true;

create index if not exists idx_trip_signals_user
  on traveler_trip_signals (user_id);

create unique index if not exists idx_trip_signals_user_trip
  on traveler_trip_signals (user_id, trip_id);

-- ── 3. traveler_connections ──────────────────────────────────
-- wave  → one-sided interest (anonymous to recipient)
-- connected → mutual wave accepted
-- blocked → hard block
create table if not exists traveler_connections (
  id          uuid primary key default gen_random_uuid(),
  from_user   uuid not null references auth.users(id) on delete cascade,
  to_user     uuid not null references auth.users(id) on delete cascade,
  status      text not null check (status in ('wave', 'connected', 'blocked')),
  created_at  timestamptz not null default now(),
  updated_at  timestamptz not null default now(),
  constraint  no_self_connect check (from_user <> to_user),
  unique (from_user, to_user)
);

create index if not exists idx_connections_to_user
  on traveler_connections (to_user, status);

create index if not exists idx_connections_from_user
  on traveler_connections (from_user, status);

-- ── 4. trip_rooms ────────────────────────────────────────────
-- Collaborative planning spaces; max 6 members.
create table if not exists trip_rooms (
  id               uuid primary key default gen_random_uuid(),
  created_by       uuid not null references auth.users(id) on delete cascade,
  destination      text not null,
  destination_slug text not null,
  title            text,
  travel_month     text,
  max_members      int  not null default 6,
  is_open          boolean not null default true,
  created_at       timestamptz not null default now(),
  updated_at       timestamptz not null default now()
);

create index if not exists idx_trip_rooms_slug
  on trip_rooms (destination_slug, is_open)
  where is_open = true;

-- ── 5. trip_room_members ─────────────────────────────────────
create table if not exists trip_room_members (
  room_id    uuid not null references trip_rooms(id) on delete cascade,
  user_id    uuid not null references auth.users(id) on delete cascade,
  role       text not null check (role in ('host', 'member')),
  joined_at  timestamptz not null default now(),
  primary key (room_id, user_id)
);

create index if not exists idx_room_members_user
  on trip_room_members (user_id);

-- ── 6. Row-Level Security ────────────────────────────────────
alter table traveler_profiles      enable row level security;
alter table traveler_trip_signals  enable row level security;
alter table traveler_connections   enable row level security;
alter table trip_rooms             enable row level security;
alter table trip_room_members      enable row level security;

-- traveler_profiles
create policy "public profiles are viewable by all"
  on traveler_profiles for select
  using (is_public = true);

create policy "users manage own profile"
  on traveler_profiles for all
  using (auth.uid() = id);

-- traveler_trip_signals
create policy "public signals are viewable by all"
  on traveler_trip_signals for select
  using (is_public = true);

create policy "users manage own signals"
  on traveler_trip_signals for all
  using (auth.uid() = user_id);

-- traveler_connections
create policy "users see own connections"
  on traveler_connections for select
  using (auth.uid() = from_user or auth.uid() = to_user);

create policy "users manage own outgoing connections"
  on traveler_connections for insert
  with check (auth.uid() = from_user);

create policy "users update own connections"
  on traveler_connections for update
  using (auth.uid() = from_user or auth.uid() = to_user);

-- trip_rooms
create policy "open rooms are viewable by all authenticated users"
  on trip_rooms for select
  to authenticated
  using (is_open = true);

create policy "users manage rooms they created"
  on trip_rooms for all
  using (auth.uid() = created_by);

-- trip_room_members
create policy "members see their rooms"
  on trip_room_members for select
  to authenticated
  using (auth.uid() = user_id);

create policy "hosts and members can view room participants"
  on trip_room_members for select
  to authenticated
  using (
    exists (
      select 1 from trip_room_members m
      where m.room_id = trip_room_members.room_id
        and m.user_id = auth.uid()
    )
  );

create policy "users join open rooms"
  on trip_room_members for insert
  to authenticated
  with check (
    auth.uid() = user_id
    and exists (
      select 1 from trip_rooms r
      where r.id = room_id
        and r.is_open = true
        and (select count(*) from trip_room_members where room_id = r.id) < r.max_members
    )
  );

-- ── 7. Helper functions ──────────────────────────────────────

-- Normalise a destination string to a slug
create or replace function slugify(input text)
returns text
language plpgsql immutable
as $$
begin
  return lower(regexp_replace(trim(input), '[^a-z0-9]+', '-', 'g'));
end;
$$;

-- Count public travelers for a destination slug
create or replace function traveler_count_for_destination(slug text)
returns bigint
language sql stable
as $$
  select count(distinct s.user_id)
  from   traveler_trip_signals s
  join   traveler_profiles p on p.id = s.user_id
  where  s.destination_slug = slug
    and  s.is_public = true
    and  p.is_public = true
    and  p.last_seen_at > now() - interval '90 days';
$$;

-- Auto-update updated_at on traveler_profiles
create or replace function set_updated_at()
returns trigger language plpgsql as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

create trigger trg_traveler_profiles_updated_at
  before update on traveler_profiles
  for each row execute function set_updated_at();

create trigger trg_trip_rooms_updated_at
  before update on trip_rooms
  for each row execute function set_updated_at();

create trigger trg_connections_updated_at
  before update on traveler_connections
  for each row execute function set_updated_at();
