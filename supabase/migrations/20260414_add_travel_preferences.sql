alter table public.profiles
  add column if not exists travel_preferences jsonb not null default '{}'::jsonb;

create index if not exists profiles_travel_preferences_idx
  on public.profiles using gin (travel_preferences);
