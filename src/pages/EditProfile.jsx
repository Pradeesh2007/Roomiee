import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'
import {
  BIO_MAX_LENGTH,
  deleteProfilePhoto,
  fetchProfile,
  updateProfile,
  uploadProfilePhoto,
} from '../lib/profiles'

const GENDER_OPTIONS = ['male', 'female', 'other']

// Allows the file picker to skip obviously-wrong uploads before they ever
// reach the network. The real enforcement still lives in Supabase Storage
// (bucket/RLS config) — this is just a fast, friendly client-side check.
const MAX_PHOTO_BYTES = 5 * 1024 * 1024 // 5 MB

// Small section-divider used to group related fields. Pulled out as its
// own component because Sprint 3's "Roommate Request" form will likely
// need the same grouped layout (Budget/Move-in/Area, etc.) — reusing this
// avoids re-deriving the same pattern from scratch next sprint.
function SectionHeader({ children }) {
  return (
    <h2 className="text-xs font-semibold text-gray-400 uppercase tracking-wide pt-2 first:pt-0">
      {children}
    </h2>
  )
}

function EditProfile() {
  const { user } = useAuth()
  const navigate = useNavigate()

  const [form, setForm] = useState({
    full_name: '',
    age: '',
    gender: '',
    occupation: '',
    company_or_college: '',
    whatsapp: '',
    current_city: '',
    preferred_city: '',
    bio: '',
  })
  const [photoUrl, setPhotoUrl] = useState(null)
  const [photoFile, setPhotoFile] = useState(null)
  const [photoPreview, setPhotoPreview] = useState(null)

  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')

  useEffect(() => {
    let isMounted = true

    if (!user) return

    fetchProfile(user.id)
      .then((data) => {
        if (!isMounted) return
        setForm({
          full_name: data.full_name || '',
          age: data.age ?? '',
          gender: data.gender || '',
          occupation: data.occupation || '',
          company_or_college: data.company_or_college || '',
          whatsapp: data.whatsapp || '',
          current_city: data.current_city || '',
          preferred_city: data.preferred_city || '',
          bio: data.bio || '',
        })
        setPhotoUrl(data.avatar_url || null)
      })
      .catch((err) => {
        if (isMounted) setError(err.message || 'Failed to load your profile.')
      })
      .finally(() => {
        if (isMounted) setLoading(false)
      })

    return () => {
      isMounted = false
    }
  }, [user])

  // Revoke the local object URL when it's replaced or the component unmounts,
  // so we don't leak memory if someone picks several photos before saving.
  useEffect(() => {
    return () => {
      if (photoPreview) URL.revokeObjectURL(photoPreview)
    }
  }, [photoPreview])

  function handleChange(field, value) {
    setForm((prev) => ({ ...prev, [field]: value }))
  }

  function handlePhotoSelect(e) {
    const file = e.target.files?.[0]
    if (!file) return

    if (!file.type.startsWith('image/')) {
      setError('Please choose an image file.')
      return
    }

    if (file.size > MAX_PHOTO_BYTES) {
      setError('Image must be smaller than 5MB.')
      return
    }

    setError('')
    setPhotoFile(file)
    setPhotoPreview(URL.createObjectURL(file))
  }

  async function handleSubmit(e) {
    e.preventDefault()
    setError('')

    if (form.bio.length > BIO_MAX_LENGTH) {
      setError(`Bio must be ${BIO_MAX_LENGTH} characters or fewer.`)
      return
    }

    if (form.age !== '' && (Number(form.age) < 18 || Number(form.age) > 100)) {
      setError('Age must be between 18 and 100.')
      return
    }

    if (form.whatsapp && !/^[0-9]{10,15}$/.test(form.whatsapp)) {
      setError('WhatsApp number must be 10-15 digits, no symbols or spaces.')
      return
    }

    setSaving(true)

    try {
      let newPhotoUrl = photoUrl

      // Upload the new photo first. Only delete the old one after the new
      // upload succeeds — if the upload fails, the user keeps their
      // existing photo instead of ending up with none.
      if (photoFile) {
        newPhotoUrl = await uploadProfilePhoto(user.id, photoFile)
      }

      await updateProfile(user.id, {
        full_name: form.full_name || null,
        age: form.age === '' ? null : Number(form.age),
        gender: form.gender || null,
        occupation: form.occupation || null,
        company_or_college: form.company_or_college || null,
        whatsapp: form.whatsapp || null,
        current_city: form.current_city || null,
        preferred_city: form.preferred_city || null,
        bio: form.bio || null,
        avatar_url: newPhotoUrl,
      })

      if (photoFile && photoUrl) {
        await deleteProfilePhoto(photoUrl)
      }

      navigate('/profile')
    } catch (err) {
      setError(err.message || 'Failed to save your profile. Please try again.')
      setSaving(false)
    }
  }

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <p className="text-sm text-gray-500">Loading your profile...</p>
      </div>
    )
  }

  const displayPhoto = photoPreview || photoUrl

  return (
    <div className="min-h-screen bg-gray-50 px-4 py-6">
      <div className="max-w-2xl mx-auto">
        <h1 className="text-2xl font-semibold text-gray-900 mb-6">
          Edit Profile
        </h1>

        {error && (
          <div className="mb-4 rounded-lg bg-red-50 border border-red-200 px-3 py-2 text-sm text-red-700">
            {error}
          </div>
        )}

        <form
          onSubmit={handleSubmit}
          className="bg-white border border-gray-200 rounded-lg p-6 space-y-5"
        >
          <SectionHeader>Personal</SectionHeader>

          <div className="flex items-center gap-4">
            <div className="w-20 h-20 rounded-full bg-gray-100 flex-shrink-0 overflow-hidden">
              {displayPhoto ? (
                <img
                  src={displayPhoto}
                  alt="Profile preview"
                  className="w-full h-full object-cover"
                />
              ) : (
                <div className="w-full h-full flex items-center justify-center text-gray-400 text-xs">
                  No photo
                </div>
              )}
            </div>
            <label className="rounded-lg border border-gray-300 text-gray-700 font-medium px-4 py-2 text-sm hover:bg-gray-100 transition-colors cursor-pointer">
              Change Photo
              <input
                type="file"
                accept="image/*"
                onChange={handlePhotoSelect}
                className="hidden"
              />
            </label>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Full Name
            </label>
            <input
              type="text"
              value={form.full_name}
              onChange={(e) => handleChange('full_name', e.target.value)}
              className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Age
              </label>
              <input
                type="number"
                min={18}
                max={100}
                value={form.age}
                onChange={(e) => handleChange('age', e.target.value)}
                className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Gender
              </label>
              <select
                value={form.gender}
                onChange={(e) => handleChange('gender', e.target.value)}
                className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
              >
                <option value="">Select...</option>
                {GENDER_OPTIONS.map((g) => (
                  <option key={g} value={g}>
                    {g.charAt(0).toUpperCase() + g.slice(1)}
                  </option>
                ))}
              </select>
            </div>
          </div>

          <SectionHeader>Professional</SectionHeader>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Occupation
            </label>
            <input
              type="text"
              placeholder="e.g. Software Engineer, Student"
              value={form.occupation}
              onChange={(e) => handleChange('occupation', e.target.value)}
              className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Company / College
            </label>
            <input
              type="text"
              value={form.company_or_college}
              onChange={(e) =>
                handleChange('company_or_college', e.target.value)
              }
              className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
            />
          </div>

          <SectionHeader>Contact</SectionHeader>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              WhatsApp Number
            </label>
            <input
              type="tel"
              placeholder="10-15 digits, no spaces or symbols"
              value={form.whatsapp}
              onChange={(e) => handleChange('whatsapp', e.target.value)}
              className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
            />
          </div>

          <SectionHeader>Location</SectionHeader>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Current City
              </label>
              <input
                type="text"
                value={form.current_city}
                onChange={(e) => handleChange('current_city', e.target.value)}
                className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Preferred City
              </label>
              <input
                type="text"
                value={form.preferred_city}
                onChange={(e) =>
                  handleChange('preferred_city', e.target.value)
                }
                className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
              />
            </div>
          </div>

          <SectionHeader>About Me</SectionHeader>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Short Bio
            </label>
            <textarea
              rows={4}
              maxLength={BIO_MAX_LENGTH}
              value={form.bio}
              onChange={(e) => handleChange('bio', e.target.value)}
              className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 resize-none"
            />
            <p className="text-xs text-gray-400 mt-1 text-right">
              {form.bio.length}/{BIO_MAX_LENGTH}
            </p>
          </div>

          <div className="flex gap-3 pt-2">
            <button
              type="submit"
              disabled={saving}
              className="rounded-lg bg-indigo-600 text-white font-medium px-5 py-2.5 text-sm hover:bg-indigo-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {saving ? 'Saving...' : 'Save Profile'}
            </button>
            <button
              type="button"
              onClick={() => navigate('/profile')}
              className="rounded-lg border border-gray-300 text-gray-700 font-medium px-5 py-2.5 text-sm hover:bg-gray-100 transition-colors"
            >
              Cancel
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}

export default EditProfile
