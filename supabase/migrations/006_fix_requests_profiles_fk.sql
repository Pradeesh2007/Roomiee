-- ============================================================
-- Roomiee: Fix profiles join on roommate_requests
--
-- Problem:
--   roommate_requests.user_id references auth.users(id).
--   PostgREST builds its relationship graph from FK definitions
--   in the public schema only. It cannot traverse the auth schema,
--   so .select('*, profiles(*)') fails with "could not find a
--   relationship between roommate_requests and profiles".
--
-- Fix:
--   Add a second FK from roommate_requests.user_id to
--   public.profiles(id). PostgREST can now discover the path
--   roommate_requests → profiles and resolve the join correctly.
--
--   public.profiles.id is itself references auth.users(id)
--   (from migration 002), so this is a consistent, non-redundant
--   constraint — it just gives PostgREST the traversal path it
--   needs through the public schema.
--
-- Safety:
--   Uses IF NOT EXISTS guard so this is safe to re-run.
--   The existing auth.users FK is not removed — both can coexist.
--   No data is modified. No existing queries break.
-- ============================================================

do $$
begin
  if not exists (
    select 1
    from information_schema.table_constraints tc
    join information_schema.constraint_column_usage ccu
      on tc.constraint_name = ccu.constraint_name
    where tc.table_name     = 'roommate_requests'
      and tc.constraint_type = 'FOREIGN KEY'
      and ccu.table_name    = 'profiles'
      and ccu.column_name   = 'id'
  ) then
    alter table public.roommate_requests
      add constraint roommate_requests_user_id_profiles_fk
      foreign key (user_id)
      references public.profiles(id)
      on delete cascade;
  end if;
end $$;
