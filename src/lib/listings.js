import { supabase } from './supabaseClient'

const PHOTO_BUCKET = 'listing-photos'

/**
 * Fetch active listings, optionally filtered by city/area and a free-text
 * search term. Used by the Browse page.
 */
export async function fetchListings({ city, area, search } = {}) {
  let query = supabase
    .from('listings')
    .select('*')
    .eq('is_active', true)
    .order('created_at', { ascending: false })

  if (city) {
    query = query.ilike('city', city)
  }

  if (area) {
    query = query.ilike('area', `%${area}%`)
  }

  if (search && search.trim().length > 0) {
    // websearch_to_tsquery handles multi-word natural queries gracefully
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
 * Fetch a single listing by id. Used by the Edit page and listing detail view.
 */
export async function fetchListingById(id) {
  const { data, error } = await supabase
    .from('listings')
    .select('*')
    .eq('id', id)
    .single()

  if (error) throw error
  return data
}

/**
 * Fetch all listings owned by the current user. Used on the Dashboard
 * to show "My Listings" with edit/delete controls.
 */
export async function fetchMyListings(userId) {
  const { data, error } = await supabase
    .from('listings')
    .select('*')
    .eq('owner_id', userId)
    .order('created_at', { ascending: false })

  if (error) throw error
  return data
}

/**
 * Create a new listing. photoUrls should already be uploaded (see
 * uploadListingPhotos below) — this just writes the row.
 */
export async function createListing(listing) {
  const { data, error } = await supabase
    .from('listings')
    .insert([listing])
    .select()
    .single()

  if (error) throw error
  return data
}

/**
 * Update an existing listing. RLS guarantees this fails silently-but-safely
 * if the current user doesn't own the row — no extra ownership check needed
 * client-side, but we still scope by id for clarity.
 */
export async function updateListing(id, updates) {
  const { data, error } = await supabase
    .from('listings')
    .update(updates)
    .eq('id', id)
    .select()
    .single()

  if (error) throw error
  return data
}

/**
 * Delete a listing by id. RLS ensures only the owner's delete succeeds.
 */
export async function deleteListing(id) {
  const { error } = await supabase.from('listings').delete().eq('id', id)
  if (error) throw error
}

/**
 * Upload one or more photo files to Supabase Storage under a folder named
 * after the current user's id (required by the storage RLS policy).
 * Returns an array of public URLs.
 */
export async function uploadListingPhotos(userId, files) {
  const urls = []

  for (const file of files) {
    const fileExt = file.name.split('.').pop()
    const fileName = `${crypto.randomUUID()}.${fileExt}`
    const filePath = `${userId}/${fileName}`

    const { error: uploadError } = await supabase.storage
      .from(PHOTO_BUCKET)
      .upload(filePath, file, {
        cacheControl: '3600',
        upsert: false,
      })

    if (uploadError) throw uploadError

    const { data } = supabase.storage
      .from(PHOTO_BUCKET)
      .getPublicUrl(filePath)

    urls.push(data.publicUrl)
  }

  return urls
}

/**
 * Delete photos from storage given their public URLs. Best-effort: used
 * when a listing is deleted, to avoid orphaned files. Failure here should
 * not block the listing deletion itself.
 */
export async function deleteListingPhotos(urls) {
  if (!urls || urls.length === 0) return

  const paths = urls.map((url) => {
    const marker = `${PHOTO_BUCKET}/`
    const idx = url.indexOf(marker)
    return idx === -1 ? null : url.slice(idx + marker.length)
  }).filter(Boolean)

  if (paths.length === 0) return

  const { error } = await supabase.storage.from(PHOTO_BUCKET).remove(paths)
  if (error) {
    // Non-fatal: log and move on, don't block the caller's flow.
    console.error('Failed to delete listing photos:', error.message)
  }
}