create extension if not exists pgcrypto;

create table if not exists public.trip_shares (
  id uuid primary key default gen_random_uuid(),
  trip_id text not null unique references public.trips(id) on delete cascade,
  owner_user_id uuid not null references auth.users(id) on delete cascade,
  token text not null unique,
  share_title text,
  share_description text,
  share_image_url text,
  revoked_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.trip_suggestions (
  id uuid primary key default gen_random_uuid(),
  share_id uuid not null references public.trip_shares(id) on delete cascade,
  trip_id text not null references public.trips(id) on delete cascade,
  owner_user_id uuid not null references auth.users(id) on delete cascade,
  guest_name text,
  guest_email text,
  message text not null check (length(btrim(message)) > 0),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists trip_shares_owner_user_id_idx
  on public.trip_shares (owner_user_id);

create index if not exists trip_shares_token_idx
  on public.trip_shares (token);

create index if not exists trip_suggestions_trip_id_idx
  on public.trip_suggestions (trip_id, created_at desc);

create index if not exists trip_suggestions_owner_user_id_idx
  on public.trip_suggestions (owner_user_id, created_at desc);

create index if not exists trip_suggestions_share_id_idx
  on public.trip_suggestions (share_id, created_at desc);

drop trigger if exists set_trip_shares_updated_at on public.trip_shares;

create trigger set_trip_shares_updated_at
before update on public.trip_shares
for each row
execute function public.set_updated_at();

drop trigger if exists set_trip_suggestions_updated_at on public.trip_suggestions;

create trigger set_trip_suggestions_updated_at
before update on public.trip_suggestions
for each row
execute function public.set_updated_at();

alter table public.trip_shares enable row level security;
alter table public.trip_suggestions enable row level security;

do $$
begin
  if not exists (
    select 1 from pg_policies
    where schemaname = 'public'
      and tablename = 'trip_shares'
      and policyname = 'Owners can manage their trip shares'
  ) then
    create policy "Owners can manage their trip shares"
      on public.trip_shares
      for all
      using (auth.uid() = owner_user_id)
      with check (auth.uid() = owner_user_id);
  end if;

  if not exists (
    select 1 from pg_policies
    where schemaname = 'public'
      and tablename = 'trip_suggestions'
      and policyname = 'Owners can read suggestions for their trips'
  ) then
    create policy "Owners can read suggestions for their trips"
      on public.trip_suggestions
      for select
      using (auth.uid() = owner_user_id);
  end if;
end
$$;
