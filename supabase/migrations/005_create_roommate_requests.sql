-- ============================================================
-- Roomiee: Roommate Requests + Interests
--
-- Two new tables:
--   roommate_requests  — a user's public "I'm looking for roommates" post
--   request_interests  — another user's "I'm Interested" on a request
--
-- Purely additive. No existing tables are modified.
-- Safe to re-run: all statements use IF NOT EXISTS / OR REPLACE /
-- ON CONFLICT guards.
-- ============================================================


-- ============================================================
-- 1. roommate_requests
-- ============================================================
create table if not exists public.roommate_requests (
  id                uuid primary key default gen_random_uuid(),

  -- The user posting the request
  user_id           uuid not null references auth.users(id) on delete cascade,

  -- What they're looking for (human-readable title for cards/lists)
  title             text not null
                    check (char_length(title) between 5 and 100),

  -- Longer description: lifestyle notes, what kind of roommate they want, etc.
  description       text not null
                    check (char_length(description) between 10 and 1000),

  -- Location
  city              text not null,
  area              text,                     -- optional — not every user knows the exact area yet

  -- Preferences
  budget            integer not null check (budget > 0),
  move_in_date      date,
  gender_preference text not null default 'any'
                    check (gender_preference in ('male', 'female', 'any')),
  looking_for_count integer not null default 1
                    check (looking_for_count between 1 and 10),

  -- Soft delete — owner can deactivate without losing data
  is_active         boolean not null default true,

  created_at        timestamptz not null default now(),
  updated_at        timestamptz not null default now()
);


-- ============================================================
-- 2. Indexes for roommate_requests
-- ============================================================
create index if not exists rr_city_idx
  on public.roommate_requests (city);

create index if not exists rr_user_id_idx
  on public.roommate_requests (user_id);

create index if not exists rr_created_at_idx
  on public.roommate_requests (created_at desc);

create index if not exists rr_active_idx
  on public.roommate_requests (is_active);

-- Full-text search across title + description + area + city.
-- Mirrors the search_vector pattern from listings.
alter table public.roommate_requests
  add column if not exists search_vector tsvector
  generated always as (
    to_tsvector('english',
      coalesce(title, '')       || ' ' ||
      coalesce(description, '') || ' ' ||
      coalesce(area, '')        || ' ' ||
      coalesce(city, '')
    )
  ) stored;

create index if not exists rr_search_idx
  on public.roommate_requests using gin (search_vector);


-- ============================================================
-- 3. Auto-update updated_at trigger on roommate_requests
--    Reuses the set_updated_at() function created in migration 001.
-- ============================================================
drop trigger if exists trg_rr_updated_at on public.roommate_requests;
create trigger trg_rr_updated_at
  before update on public.roommate_requests
  for each row
  execute function public.set_updated_at();


-- ============================================================
-- 4. RLS for roommate_requests
-- ============================================================
alter table public.roommate_requests enable row level security;

-- Anyone (including anonymous) can browse active requests.
drop policy if exists "Public can view active requests" on public.roommate_requests;
create policy "Public can view active requests"
  on public.roommate_requests
  for select
  using (is_active = true);

-- Owners can view their own requests even when inactive.
drop policy if exists "Owners can view their own requests" on public.roommate_requests;
create policy "Owners can view their own requests"
  on public.roommate_requests
  for select
  using (auth.uid() = user_id);

-- Only authenticated users can post a request, and only as themselves.
drop policy if exists "Users can insert their own requests" on public.roommate_requests;
create policy "Users can insert their own requests"
  on public.roommate_requests
  for insert
  with check (auth.uid() = user_id);

-- Only the owner can update their own request.
drop policy if exists "Owners can update their own requests" on public.roommate_requests;
create policy "Owners can update their own requests"
  on public.roommate_requests
  for update
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

-- Only the owner can delete their own request.
drop policy if exists "Owners can delete their own requests" on public.roommate_requests;
create policy "Owners can delete their own requests"
  on public.roommate_requests
  for delete
  using (auth.uid() = user_id);


-- ============================================================
-- 5. request_interests
--    One row = one "I'm Interested" expression by a user on a request.
-- ============================================================
create table if not exists public.request_interests (
  id          uuid primary key default gen_random_uuid(),

  request_id  uuid not null
              references public.roommate_requests(id) on delete cascade,

  user_id     uuid not null
              references auth.users(id) on delete cascade,

  created_at  timestamptz not null default now(),

  -- A user can only express interest once per request.
  -- Attempting a second insert returns a unique-constraint error,
  -- which the client uses to detect "already interested" state.
  unique (request_id, user_id)
);


-- ============================================================
-- 6. Indexes for request_interests
-- ============================================================
create index if not exists ri_request_id_idx
  on public.request_interests (request_id);

create index if not exists ri_user_id_idx
  on public.request_interests (user_id);


-- ============================================================
-- 7. RLS for request_interests
-- ============================================================
alter table public.request_interests enable row level security;

-- The request owner can see who expressed interest in their request.
-- Interested users can see their own interest rows (for "already interested" state).
drop policy if exists "Users can view relevant interests" on public.request_interests;
create policy "Users can view relevant interests"
  on public.request_interests
  for select
  using (
    auth.uid() = user_id
    or auth.uid() = (
      select user_id from public.roommate_requests
      where id = request_id
    )
  );

-- Any logged-in user can express interest, but NOT in their own request.
drop policy if exists "Users can express interest" on public.request_interests;
create policy "Users can express interest"
  on public.request_interests
  for insert
  with check (
    auth.uid() = user_id
    and auth.uid() != (
      select user_id from public.roommate_requests
      where id = request_id
    )
  );

-- Users can withdraw their own interest.
drop policy if exists "Users can withdraw their own interest" on public.request_interests;
create policy "Users can withdraw their own interest"
  on public.request_interests
  for delete
  using (auth.uid() = user_id);
