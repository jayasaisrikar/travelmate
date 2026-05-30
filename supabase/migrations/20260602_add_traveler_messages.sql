-- ============================================================
-- Wayflo Social Network - direct traveler messages
-- ============================================================

create table if not exists traveler_messages (
  id          uuid primary key default gen_random_uuid(),
  from_user   uuid not null references auth.users(id) on delete cascade,
  to_user     uuid not null references auth.users(id) on delete cascade,
  body        text not null check (char_length(trim(body)) between 1 and 500),
  read_at     timestamptz,
  created_at  timestamptz not null default now(),
  constraint no_self_message check (from_user <> to_user)
);

create index if not exists idx_traveler_messages_to_user
  on traveler_messages (to_user, created_at desc);

create index if not exists idx_traveler_messages_from_user
  on traveler_messages (from_user, created_at desc);

alter table traveler_messages enable row level security;

create policy "users see their traveler messages"
  on traveler_messages for select
  using (auth.uid() = from_user or auth.uid() = to_user);

create policy "users send traveler messages"
  on traveler_messages for insert
  with check (auth.uid() = from_user);

create policy "recipients mark traveler messages read"
  on traveler_messages for update
  using (auth.uid() = to_user);
