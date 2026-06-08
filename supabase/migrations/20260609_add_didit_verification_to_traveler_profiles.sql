-- ============================================================
-- Wayflo Social Network — Didit verification fields
-- ============================================================

alter table traveler_profiles
  add column if not exists verification_provider text,
  add column if not exists verification_level text not null default 'unverified',
  add column if not exists verification_status text not null default 'not_started',
  add column if not exists verification_session_id text,
  add column if not exists verification_requested_at timestamptz,
  add column if not exists verified_at timestamptz;

do $$
begin
  if not exists (
    select 1
    from pg_constraint
    where conname = 'traveler_profiles_verification_level_check'
  ) then
    alter table traveler_profiles
      add constraint traveler_profiles_verification_level_check
      check (verification_level in ('unverified', 'basic', 'trusted', 'high_trust'));
  end if;

  if not exists (
    select 1
    from pg_constraint
    where conname = 'traveler_profiles_verification_status_check'
  ) then
    alter table traveler_profiles
      add constraint traveler_profiles_verification_status_check
      check (
        verification_status in (
          'not_started',
          'pending',
          'approved',
          'declined',
          'in_review',
          'expired',
          'abandoned',
          'resubmitted'
        )
      );
  end if;
end
$$;

create index if not exists idx_traveler_profiles_verification
  on traveler_profiles (verification_status, verification_level, verified);
