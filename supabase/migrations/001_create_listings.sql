-- ============================================================
-- Roomiee: Room Listings table + Row Level Security
-- Run this in Supabase SQL Editor (or via supabase CLI migrations)
-- ============================================================

-- 1. Table
create table if not exists public.listings (
  id              uuid primary key default gen_random_uuid(),
  owner_id        uuid not null references auth.users(id) on delete cascade,

  title           text not null check (char_length(title) between 3 and 100),
  description     text not null check (char_length(description) between 10 and 2000),

  area            text not null,
  city            text not null,

  monthly_rent    integer not null check (monthly_rent > 0),
  vacancies       integer not null default 1 check (vacancies > 0),

  gender_preference text not null default 'any'
                    check (gender_preference in ('male', 'female', 'any')),

  contact_number  text not null check (contact_number ~ '^[0-9]{10,15}$'),

  photo_urls      text[] not null default '{}',

  is_active       boolean not null default true,

  created_at      timestamptz not null default now(),
  updated_at      timestamptz not null default now()
);

-- 2. Indexes for the queries we'll actually run (browse + search)
create index if not exists listings_city_idx on public.listings (city);
create index if not exists listings_area_idx on public.listings (area);
create index if not exists listings_owner_id_idx on public.listings (owner_id);
create index if not exists listings_created_at_idx on public.listings (created_at desc);
create index if not exists listings_active_idx on public.listings (is_active);

-- Full text search across title + description + area + city
alter table public.listings
  add column if not exists search_vector tsvector
  generated always as (
    to_tsvector('english',
      coalesce(title, '') || ' ' ||
      coalesce(description, '') || ' ' ||
      coalesce(area, '') || ' ' ||
      coalesce(city, '')
    )
  ) stored;

create index if not exists listings_search_idx
  on public.listings using gin (search_vector);

-- 3. Auto-update updated_at on every row change
create or replace function public.set_updated_at()
returns trigger as $$
begin
  new.updated_at = now();
  return new;
end;
$$ language plpgsql;

drop trigger if exists trg_listings_updated_at on public.listings;
create trigger trg_listings_updated_at
  before update on public.listings
  for each row
  execute function public.set_updated_at();

-- 4. Row Level Security
alter table public.listings enable row level security;

-- Anyone (logged in or anonymous) can read active listings.
-- Owners can also read their own inactive/draft listings if you add that later.
drop policy if exists "Public can view active listings" on public.listings;
create policy "Public can view active listings"
  on public.listings
  for select
  using (is_active = true);

-- Logged-in users can view their OWN listings even if inactive.
drop policy if exists "Owners can view their own listings" on public.listings;
create policy "Owners can view their own listings"
  on public.listings
  for select
  using (auth.uid() = owner_id);

-- Only authenticated users can create a listing, and only as themselves.
drop policy if exists "Users can insert their own listings" on public.listings;
create policy "Users can insert their own listings"
  on public.listings
  for insert
  with check (auth.uid() = owner_id);

-- Only the owner can update their own listing.
drop policy if exists "Owners can update their own listings" on public.listings;
create policy "Owners can update their own listings"
  on public.listings
  for update
  using (auth.uid() = owner_id)
  with check (auth.uid() = owner_id);

-- Only the owner can delete their own listing.
drop policy if exists "Owners can delete their own listings" on public.listings;
create policy "Owners can delete their own listings"
  on public.listings
  for delete
  using (auth.uid() = owner_id);

-- 5. Storage bucket for listing photos
insert into storage.buckets (id, name, public)
values ('listing-photos', 'listing-photos', true)
on conflict (id) do nothing;

-- Anyone can view photos (bucket is public)
drop policy if exists "Public can view listing photos" on storage.objects;
create policy "Public can view listing photos"
  on storage.objects
  for select
  using (bucket_id = 'listing-photos');

-- Only authenticated users can upload, and only into a folder named
-- after their own user id (e.g. <user_id>/photo1.jpg) — enforced below.
drop policy if exists "Users can upload their own listing photos" on storage.objects;
create policy "Users can upload their own listing photos"
  on storage.objects
  for insert
  with check (
    bucket_id = 'listing-photos'
    and auth.uid()::text = (storage.foldername(name))[1]
  );

-- Only the uploader can delete their own photos.
drop policy if exists "Users can delete their own listing photos" on storage.objects;
create policy "Users can delete their own listing photos"
  on storage.objects
  for delete
  using (
    bucket_id = 'listing-photos'
    and auth.uid()::text = (storage.foldername(name))[1]
  );