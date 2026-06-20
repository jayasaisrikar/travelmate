alter table public.trips add column if not exists is_published boolean not null default false;
alter table public.trips add column if not exists published_at timestamptz;
alter table public.trips add column if not exists destination_slug text;

create index if not exists trips_published_dest_idx
  on public.trips (destination_slug)
  where is_published;
