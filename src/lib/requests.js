import { supabase } from './supabaseClient'

/**
 * Fetch active roommate requests, optionally filtered by city and/or a
 * free-text search term. Public — no auth required.
 */
export async function fetchRequests({ city, search } = {}) {
  let query = supabase
    .from('roommate_requests')
    .select(`
      *,
      profiles (
        full_name,
        avatar_url,
        occupation,
        company_or_college
      )
    `)
    .eq('is_active', true)
    .order('created_at', { ascending: false })

  if (city && city.trim().length > 0) {
    query = query.ilike('city', city.trim())
  }

  if (search && search.trim().length > 0) {
    query = query.textSearch('search_vector', search.trim(), {
      type: 'websearch',
      config: 'english',
    })
  }

  const { data, error } = await query
  if (error) throw error
  return data
}

/**
 * Fetch a single request by id, with the poster's profile joined.
 * Used by the Request Detail page.
 */
export async function fetchRequestById(id) {
  const { data, error } = await supabase
    .from('roommate_requests')
    .select(`
      *,
      profiles (
        full_name,
        avatar_url,
        occupation,
        company_or_college,
        whatsapp,
        bio
      )
    `)
    .eq('id', id)
    .single()

  if (error) throw error
  return data
}

/**
 * Fetch all requests by the current user (active + inactive).
 * Used on the My Requests page.
 */
export async function fetchMyRequests(userId) {
  const { data, error } = await supabase
    .from('roommate_requests')
    .select('*')
    .eq('user_id', userId)
    .order('created_at', { ascending: false })

  if (error) throw error
  return data
}

/**
 * Check whether the current user already has an active request.
 * Used by CreateRequest to block a second active post before it
 * hits the DB unique index (which would give a raw Postgres error).
 * Returns the active request row if one exists, null otherwise.
 */
export async function fetchActiveRequest(userId) {
  const { data, error } = await supabase
    .from('roommate_requests')
    .select('id, title')
    .eq('user_id', userId)
    .eq('is_active', true)
    .maybeSingle()

  if (error) throw error
  return data // null if no active request exists
}

/**
 * Create a new roommate request. The caller must be authenticated;
 * RLS enforces that user_id matches auth.uid().
 */
export async function createRequest(request) {
  const { data, error } = await supabase
    .from('roommate_requests')
    .insert([request])
    .select()
    .single()

  if (error) throw error
  return data
}

/**
 * Update an existing request. RLS enforces owner-only access.
 */
export async function updateRequest(id, updates) {
  const { data, error } = await supabase
    .from('roommate_requests')
    .update(updates)
    .eq('id', id)
    .select()
    .single()

  if (error) throw error
  return data
}

/**
 * Soft-delete: marks the request inactive instead of destroying it.
 * Keeps the data for the owner on "My Requests" and avoids breaking
 * any interest rows that reference it.
 */
export async function deactivateRequest(id) {
  const { error } = await supabase
    .from('roommate_requests')
    .update({ is_active: false })
    .eq('id', id)

  if (error) throw error
}

/**
 * Hard delete a request. ON DELETE CASCADE in the schema ensures
 * all interest rows for this request are removed automatically.
 * Use only when the user explicitly asks to delete (not just close).
 */
export async function deleteRequest(id) {
  const { error } = await supabase
    .from('roommate_requests')
    .delete()
    .eq('id', id)

  if (error) throw error
}

// ============================================================
// Interest functions
// ============================================================

/**
 * Express interest in a request. Returns the new interest row.
 * Throws if the user has already expressed interest (unique constraint
 * violation) — callers should catch this and show "already interested".
 */
export async function expressInterest(requestId, userId) {
  const { data, error } = await supabase
    .from('request_interests')
    .insert([{ request_id: requestId, user_id: userId }])
    .select()
    .single()

  if (error) throw error
  return data
}

/**
 * Withdraw interest in a request.
 */
export async function withdrawInterest(requestId, userId) {
  const { error } = await supabase
    .from('request_interests')
    .delete()
    .eq('request_id', requestId)
    .eq('user_id', userId)

  if (error) throw error
}

/**
 * Check whether the current user has already expressed interest
 * in a given request. Returns true/false.
 * Called on the Detail page to set initial button state.
 */
export async function hasExpressedInterest(requestId, userId) {
  const { data, error } = await supabase
    .from('request_interests')
    .select('id')
    .eq('request_id', requestId)
    .eq('user_id', userId)
    .maybeSingle()

  if (error) throw error
  return data !== null
}

/**
 * Fetch the interest count for a request. Used on cards and detail views
 * to show social proof ("12 people interested").
 */
export async function fetchInterestCount(requestId) {
  const { count, error } = await supabase
    .from('request_interests')
    .select('id', { count: 'exact', head: true })
    .eq('request_id', requestId)

  if (error) throw error
  return count ?? 0
}

/**
 * Fetch all interest counts for requests owned by the current user.
 * Returns a map: { [requestId]: count }
 *
 * Implementation note: uses two queries instead of a nested PostgREST
 * filter join. The nested filter (.eq('roommate_requests.user_id', id))
 * is unreliable across Supabase/PostgREST versions — it can silently
 * return unfiltered results or error depending on the schema cache state.
 * Two explicit queries are marginally more network overhead but are
 * correct by construction and easy to reason about.
 *
 * CTO sign-off: "Correctness over cleverness." — Sprint 3 review.
 */
export async function fetchInterestCountsForOwner(userId) {
  // Query 1: get all request IDs owned by this user
  const { data: requests, error: reqError } = await supabase
    .from('roommate_requests')
    .select('id')
    .eq('user_id', userId)

  if (reqError) throw reqError
  if (!requests || requests.length === 0) return {}

  const requestIds = requests.map((r) => r.id)

  // Query 2: get all interests for those request IDs
  const { data: interests, error: intError } = await supabase
    .from('request_interests')
    .select('request_id')
    .in('request_id', requestIds)

  if (intError) throw intError

  // Aggregate into a map client-side
  const counts = {}
  for (const row of interests ?? []) {
    counts[row.request_id] = (counts[row.request_id] ?? 0) + 1
  }
  return counts
}
