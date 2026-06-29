-- ============================================================
-- Roomiee: User Profiles — ALTER existing table + RLS
-- The `profiles` table already exists with: id, full_name, age,
-- gender, occupation, whatsapp, created_at. This migration adds
-- every missing column without touching existing data, then adds
-- triggers, RLS, and storage policies.
-- Run this in Supabase SQL Editor.
-- ============================================================

-- 1. Add every column that's missing. IF NOT EXISTS makes this safe
-- to re-run, and existing columns/data are left completely untouched.
alter table public.profiles
  add column if not exists company_or_college  text,
  add column if not exists current_city        text,
  add column if not exists preferred_city       text,
  add column if not exists smoking              text,
  add column if not exists drinking             text,
  add column if not exists food_habit           text,
  add column if not exists languages            text[] not null default '{}',
  add column if not exists sleep_schedule        text,
  add column if not exists looking_for          text,
  add column if not exists preferred_gender     text not null default 'any',
  add column if not exists budget               integer,
  add column if not exists move_in_date         date,
  add column if not exists max_roommates        integer,
  add column if not exists profile_photo_url    text,
  add column if not exists updated_at           timestamptz not null default now();

-- 2. Add CHECK constraints separately, and only AFTER adding columns.
-- Each one validates existing data when added — if any current row
-- violates it, this statement fails loudly and tells you which rows
-- are bad, rather than silently corrupting data. That's intentional:
-- we want to know now, not discover it later as a confusing app bug.
do $$
begin
  -- age: drop+recreate so re-running this migration is safe
  alter table public.profiles drop constraint if exists profiles_age_check;
  alter table public.profiles add constraint profiles_age_check
    check (age is null or (age >= 18 and age <= 100));

  alter table public.profiles drop constraint if exists profiles_gender_check;
  alter table public.profiles add constraint profiles_gender_check
    check (gender is null or gender in ('male', 'female', 'other'));

  alter table public.profiles drop constraint if exists profiles_whatsapp_check;
  alter table public.profiles add constraint profiles_whatsapp_check
    check (whatsapp is null or whatsapp ~ '^[0-9]{10,15}$');

  alter table public.profiles drop constraint if exists profiles_smoking_check;
  alter table public.profiles add constraint profiles_smoking_check
    check (smoking is null or smoking in ('yes', 'no', 'occasionally'));

  alter table public.profiles drop constraint if exists profiles_drinking_check;
  alter table public.profiles add constraint profiles_drinking_check
    check (drinking is null or drinking in ('yes', 'no', 'occasionally'));

  alter table public.profiles drop constraint if exists profiles_food_habit_check;
  alter table public.profiles add constraint profiles_food_habit_check
    check (food_habit is null or food_habit in ('vegetarian', 'non_vegetarian', 'vegan', 'eggetarian'));

  alter table public.profiles drop constraint if exists profiles_sleep_schedule_check;
  alter table public.profiles add constraint profiles_sleep_schedule_check
    check (sleep_schedule is null or sleep_schedule in ('early_bird', 'night_owl', 'flexible'));

  alter table public.profiles drop constraint if exists profiles_looking_for_check;
  alter table public.profiles add constraint profiles_looking_for_check
    check (looking_for is null or looking_for in ('room', 'roommate', 'both'));

  alter table public.profiles drop constraint if exists profiles_preferred_gender_check;
  alter table public.profiles add constraint profiles_preferred_gender_check
    check (preferred_gender in ('male', 'female', 'any'));

  alter table public.profiles drop constraint if exists profiles_budget_check;
  alter table public.profiles add constraint profiles_budget_check
    check (budget is null or budget > 0);

  alter table public.profiles drop constraint if exists profiles_max_roommates_check;
  alter table public.profiles add constraint profiles_max_roommates_check
    check (max_roommates is null or max_roommates >= 0);
end $$;

-- NOTE: deliberately NOT adding a CHECK constraint on `occupation`.
-- That column already exists as free-text and may already contain
-- values (e.g. "Software Engineer") that wouldn't match a fixed enum
-- like 'student' | 'working_professional'. Constraining it now could
-- fail this migration or silently invalidate existing user data.
-- Decision needed from you: keep occupation as free text (recommended,
-- zero risk), or audit existing values first and migrate them to an
-- enum in a separate, deliberate step. Not doing that here.

-- 3. Auto-update updated_at on every row change
create or replace function public.set_updated_at()
returns trigger as $$
begin
  new.updated_at = now();
  return new;
end;
$$ language plpgsql;

drop trigger if exists trg_profiles_updated_at on public.profiles;
create trigger trg_profiles_updated_at
  before update on public.profiles
  for each row
  execute function public.set_updated_at();

-- 4. Auto-create a profile row for new signups (in case it doesn't
-- already exist — harmless if it does, ON CONFLICT handles that).
create or replace function public.handle_new_user()
returns trigger as $$
begin
  insert into public.profiles (id)
  values (new.id)
  on conflict (id) do nothing;
  return new;
end;
$$ language plpgsql security definer set search_path = public;

drop trigger if exists trg_on_auth_user_created on auth.users;
create trigger trg_on_auth_user_created
  after insert on auth.users
  for each row
  execute function public.handle_new_user();

-- 5. Backfill any users missing a profile row entirely
insert into public.profiles (id)
select id from auth.users
on conflict (id) do nothing;

-- 6. Indexes
create index if not exists profiles_current_city_idx on public.profiles (current_city);
create index if not exists profiles_preferred_city_idx on public.profiles (preferred_city);
create index if not exists profiles_looking_for_idx on public.profiles (looking_for);

-- 7. Row Level Security
alter table public.profiles enable row level security;

drop policy if exists "Authenticated users can view profiles" on public.profiles;
create policy "Authenticated users can view profiles"
  on public.profiles
  for select
  using (auth.role() = 'authenticated');

drop policy if exists "Users can insert their own profile" on public.profiles;
create policy "Users can insert their own profile"
  on public.profiles
  for insert
  with check (auth.uid() = id);

drop policy if exists "Users can update their own profile" on public.profiles;
create policy "Users can update their own profile"
  on public.profiles
  for update
  using (auth.uid() = id)
  with check (auth.uid() = id);

-- 8. Storage bucket for profile photos
insert into storage.buckets (id, name, public)
values ('profile-photos', 'profile-photos', true)
on conflict (id) do nothing;

drop policy if exists "Public can view profile photos" on storage.objects;
create policy "Public can view profile photos"
  on storage.objects
  for select
  using (bucket_id = 'profile-photos');

drop policy if exists "Users can upload their own profile photo" on storage.objects;
create policy "Users can upload their own profile photo"
  on storage.objects
  for insert
  with check (
    bucket_id = 'profile-photos'
    and auth.uid()::text = (storage.foldername(name))[1]
  );

drop policy if exists "Users can update their own profile photo" on storage.objects;
create policy "Users can update their own profile photo"
  on storage.objects
  for update
  using (
    bucket_id = 'profile-photos'
    and auth.uid()::text = (storage.foldername(name))[1]
  );

drop policy if exists "Users can delete their own profile photo" on storage.objects;
create policy "Users can delete their own profile photo"
  on storage.objects
  for delete
  using (
    bucket_id = 'profile-photos'
    and auth.uid()::text = (storage.foldername(name))[1]
  );