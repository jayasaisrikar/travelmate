create table if not exists public.trips (
  id text primary key,
  destination text not null,
  duration integer not null check (duration > 0),
  budget text not null default '',
  interests text[] not null default '{}'::text[],
  itinerary jsonb not null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists trips_created_at_idx
  on public.trips (created_at desc);

create index if not exists trips_destination_idx
  on public.trips (destination);

create or replace function public.set_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

drop trigger if exists set_trips_updated_at on public.trips;

create trigger set_trips_updated_at
before update on public.trips
for each row
execute function public.set_updated_at();
