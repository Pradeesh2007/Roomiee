-- ============================================================
-- Roomiee: Add short bio to profiles
-- Purely additive — adds one nullable column with a generous
-- safety-cap constraint. No existing data is touched.
-- Run this in Supabase SQL Editor.
-- ============================================================

-- 1. Add the column. IF NOT EXISTS makes this safe to re-run.
alter table public.profiles
  add column if not exists bio text;

-- 2. Safety-cap constraint (hard backstop, not the UX limit).
-- The UI enforces a 500-character limit with a live counter;
-- this 1000-char DB constraint exists only to stop a bug, a
-- direct API call, or future client from writing something
-- absurdly large into this row. Drop+recreate so this migration
-- is idempotent on re-run.
do $$
begin
  alter table public.profiles drop constraint if exists profiles_bio_check;
  alter table public.profiles add constraint profiles_bio_check
    check (bio is null or char_length(bio) <= 1000);
end $$;
