create table if not exists public.signup_verification_tokens (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  email text not null,
  token_hash text not null unique,
  expires_at timestamptz not null,
  consumed_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists signup_verification_tokens_user_id_idx
  on public.signup_verification_tokens (user_id);

create index if not exists signup_verification_tokens_expires_at_idx
  on public.signup_verification_tokens (expires_at);

alter table public.signup_verification_tokens enable row level security;

drop trigger if exists set_signup_verification_tokens_updated_at on public.signup_verification_tokens;

create trigger set_signup_verification_tokens_updated_at
before update on public.signup_verification_tokens
for each row
execute function public.set_updated_at();
