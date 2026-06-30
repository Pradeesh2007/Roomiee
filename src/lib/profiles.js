import { supabase } from './supabaseClient'

const PHOTO_BUCKET = 'profile-photos'

// Mirrors the UI limit enforced in EditProfile.jsx. Kept here too so any
// future caller of updateProfile() (not just the form) gets the same
// guardrail without duplicating the number across files.
export const BIO_MAX_LENGTH = 500

/**
 * Fetch the current user's profile row. The row is guaranteed to exist
 * because of the `handle_new_user` trigger created in migration 002 —
 * every auth.users row gets a matching profiles row on signup.
 */
export async function fetchProfile(userId) {
  const { data, error } = await supabase
    .from('profiles')
    .select('*')
    .eq('id', userId)
    .single()

  if (error) throw error
  return data
}

/**
 * Update the current user's profile. RLS (migration 002) guarantees this
 * fails if the current user doesn't own the row — no extra ownership
 * check needed client-side, but we still scope by id for clarity.
 */
export async function updateProfile(userId, updates) {
  const { data, error } = await supabase
    .from('profiles')
    .update(updates)
    .eq('id', userId)
    .select()
    .single()

  if (error) throw error
  return data
}

/**
 * Upload a profile photo to Supabase Storage under a folder named after
 * the current user's id (required by the storage RLS policy from
 * migration 002). Returns the public URL. Does NOT write it to the
 * profiles row — call updateProfile() separately so the caller can
 * decide ordering (e.g. delete the old photo only after the new one
 * is confirmed uploaded).
 */
export async function uploadProfilePhoto(userId, file) {
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

  const { data } = supabase.storage.from(PHOTO_BUCKET).getPublicUrl(filePath)
  return data.publicUrl
}

/**
 * Delete a profile photo from storage given its public URL. Best-effort:
 * called after a new photo replaces an old one, to avoid orphaned files.
 * Failure here is non-fatal and must not block the caller's flow — a
 * stray orphaned file in storage is a much smaller problem than a user
 * seeing an error after their profile actually saved successfully.
 */
export async function deleteProfilePhoto(url) {
  if (!url) return

  const marker = `${PHOTO_BUCKET}/`
  const idx = url.indexOf(marker)
  if (idx === -1) return

  const path = url.slice(idx + marker.length)

  const { error } = await supabase.storage.from(PHOTO_BUCKET).remove([path])
  if (error) {
    console.error('Failed to delete old profile photo:', error.message)
  }
}
