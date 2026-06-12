-- ============================================================
-- Wayflo Social — Tripmate requests + matching fields (PRD §10.5–10.7)
-- Evolves the anonymous "wave" model into structured tripmate requests
-- and adds the profile/signal fields the matching algorithm needs.
-- ============================================================

-- ── 1. Richer traveler profiles ─────────────────────────────
-- Fields consumed by Matching Algorithm v1.
alter table traveler_profiles
  add column if not exists interests         text[] not null default '{}',
  add column if not exists languages         text[] not null default '{}',
  add column if not exists budget_preference text,
  add column if not exists pace_preference   text;

do $$
begin
  if not exists (
    select 1 from pg_constraint where conname = 'traveler_profiles_budget_pref_check'
  ) then
    alter table traveler_profiles
      add constraint traveler_profiles_budget_pref_check
      check (budget_preference is null
        or budget_preference in ('budget', 'moderate', 'comfort', 'luxury'));
  end if;

  if not exists (
    select 1 from pg_constraint where conname = 'traveler_profiles_pace_pref_check'
  ) then
    alter table traveler_profiles
      add constraint traveler_profiles_pace_pref_check
      check (pace_preference is null
        or pace_preference in ('slow', 'balanced', 'fast'));
  end if;
end
$$;

-- ── 2. Trip signals carry interests + an approximate date window ──
-- Exact dates remain optional and privacy-controlled by the owner.
alter table traveler_trip_signals
  add column if not exists interests  text[] not null default '{}',
  add column if not exists date_start date,
  add column if not exists date_end   date;

-- ── 3. tripmate_requests ─────────────────────────────────────
-- A structured request must precede any contact (PRD "Trust before contact").
create table if not exists tripmate_requests (
  id            uuid primary key default gen_random_uuid(),
  from_user     uuid not null references auth.users(id) on delete cascade,
  to_user       uuid not null references auth.users(id) on delete cascade,
  from_signal   uuid references traveler_trip_signals(id) on delete set null,
  to_signal     uuid references traveler_trip_signals(id) on delete set null,
  reason        text not null check (reason in (
                  'same_destination',
                  'same_dates',
                  'collaborate_itinerary',
                  'one_activity',
                  'coffee_meetup',
                  'ask_suggestions',
                  'full_tripmate'
                )),
  message       text check (message is null or char_length(message) <= 300),
  status        text not null default 'pending' check (status in (
                  'pending', 'accepted', 'declined', 'expired', 'cancelled'
                )),
  match_score   int check (match_score is null or (match_score between 0 and 100)),
  expires_at    timestamptz not null default (now() + interval '14 days'),
  created_at    timestamptz not null default now(),
  updated_at    timestamptz not null default now(),
  constraint no_self_request check (from_user <> to_user),
  unique (from_user, to_user)
);

create index if not exists idx_tripmate_requests_to
  on tripmate_requests (to_user, status, created_at desc);

create index if not exists idx_tripmate_requests_from
  on tripmate_requests (from_user, status, created_at desc);

-- ── 4. Row-Level Security ────────────────────────────────────
alter table tripmate_requests enable row level security;

-- Either party can read the request.
create policy "parties read their requests"
  on tripmate_requests for select
  using (auth.uid() = from_user or auth.uid() = to_user);

-- Only the sender can create a request, and only as themselves.
create policy "sender creates request"
  on tripmate_requests for insert
  with check (auth.uid() = from_user);

-- Sender can cancel; recipient can accept/decline. App logic enforces
-- which status transitions are valid.
create policy "parties update their requests"
  on tripmate_requests for update
  using (auth.uid() = from_user or auth.uid() = to_user);

-- ── 5. Keep updated_at fresh ─────────────────────────────────
create trigger trg_tripmate_requests_updated_at
  before update on tripmate_requests
  for each row execute function set_updated_at();
