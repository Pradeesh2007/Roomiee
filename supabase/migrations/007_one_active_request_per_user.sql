-- ============================================================
-- Roomiee: Enforce one active roommate request per user
--
-- CTO Decision (Sprint 3 review):
--   A roommate request represents a user's current housing
--   mission. Multiple active requests degrade matching quality
--   and create ambiguity about the user's real intent.
--
-- Implementation:
--   Partial unique index on (user_id) WHERE is_active = true.
--   This allows unlimited CLOSED requests (is_active = false)
--   while preventing more than one ACTIVE request per user.
--
--   A partial index is the correct tool here — a full unique
--   constraint on user_id alone would prevent closing one
--   request and opening another. The partial index only
--   enforces uniqueness among the active subset.
--
-- Safety:
--   IF NOT EXISTS guard makes this safe to re-run.
--   No existing data is modified.
--   Only blocks future inserts that would violate the rule.
-- ============================================================

create unique index if not exists rr_one_active_per_user_idx
  on public.roommate_requests (user_id)
  where (is_active = true);
