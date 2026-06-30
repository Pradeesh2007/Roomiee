-- ============================================================
-- Roomiee: Rename profile_photo_url -> avatar_url
--
-- Aligns with the industry-standard column name used by
-- GitHub, Slack, Discord, and most Supabase reference apps,
-- making onboarding easier for future engineers.
--
-- This uses RENAME COLUMN, not drop+recreate, so existing
-- photo URLs already saved by users are preserved automatically.
-- Safe to run even if rows already have data in this column.
-- ============================================================

do $$
begin
  if exists (
    select 1 from information_schema.columns
    where table_name = 'profiles' and column_name = 'profile_photo_url'
  ) then
    alter table public.profiles rename column profile_photo_url to avatar_url;
  end if;
end $$;
