import { useEffect, useState } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'
import {
  fetchListingById,
  updateListing,
  deleteListing,
  deleteListingPhotos,
  uploadListingPhotos,
} from '../lib/listings'

const MAX_PHOTOS = 5

function EditListing() {
  const { id } = useParams()
  const { user } = useAuth()
  const navigate = useNavigate()

  const [form, setForm] = useState(null)
  const [existingPhotos, setExistingPhotos] = useState([])
  const [newPhotos, setNewPhotos] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [submitting, setSubmitting] = useState(false)
  const [deleting, setDeleting] = useState(false)

  useEffect(() => {
    let isMounted = true

    async function load() {
      try {
        const listing = await fetchListingById(id)

        if (listing.owner_id !== user?.id) {
          // RLS would block the update anyway, but failing fast with a
          // clear message is better UX than a silent/confusing error later.
          if (isMounted) {
            setError('You do not have permission to edit this listing.')
            setLoading(false)
          }
          return
        }

        if (isMounted) {
          setForm({
            title: listing.title,
            description: listing.description,
            area: listing.area,
            city: listing.city,
            monthly_rent: String(listing.monthly_rent),
            vacancies: String(listing.vacancies),
            gender_preference: listing.gender_preference,
            contact_number: listing.contact_number,
            is_active: listing.is_active,
          })
          setExistingPhotos(listing.photo_urls || [])
          setLoading(false)
        }
      } catch (err) {
        if (isMounted) {
          setError(err.message || 'Failed to load listing.')
          setLoading(false)
        }
      }
    }

    load()
    return () => {
      isMounted = false
    }
  }, [id, user])

  function handleChange(e) {
    const { name, value } = e.target
    setForm((prev) => ({ ...prev, [name]: value }))
  }

  function handleRemoveExistingPhoto(url) {
    setExistingPhotos((prev) => prev.filter((p) => p !== url))
  }

  function handleNewPhotoChange(e) {
    const files = Array.from(e.target.files || [])
    const totalAfterUpload = existingPhotos.length + files.length

    if (totalAfterUpload > MAX_PHOTOS) {
      setError(
        `You can have a maximum of ${MAX_PHOTOS} photos total. Remove some existing ones first.`
      )
      return
    }

    setError('')
    setNewPhotos(files)
  }

  function validate() {
    if (form.title.trim().length < 3) return 'Title must be at least 3 characters.'
    if (form.description.trim().length < 10)
      return 'Description must be at least 10 characters.'
    if (!form.area.trim() || !form.city.trim())
      return 'Area and city are required.'
    if (!Number(form.monthly_rent) || Number(form.monthly_rent) <= 0)
      return 'Monthly rent must be a positive number.'
    if (!Number(form.vacancies) || Number(form.vacancies) <= 0)
      return 'Number of vacancies must be at least 1.'
    if (!/^[0-9]{10,15}$/.test(form.contact_number.trim()))
      return 'Contact number must be 10–15 digits, no spaces or symbols.'
    return ''
  }

  async function handleSubmit(e) {
    e.preventDefault()

    const validationError = validate()
    if (validationError) {
      setError(validationError)
      return
    }

    setError('')
    setSubmitting(true)

    try {
      let photoUrls = [...existingPhotos]

      if (newPhotos.length > 0) {
        const uploaded = await uploadListingPhotos(user.id, newPhotos)
        photoUrls = [...photoUrls, ...uploaded]
      }

      await updateListing(id, {
        title: form.title.trim(),
        description: form.description.trim(),
        area: form.area.trim(),
        city: form.city.trim(),
        monthly_rent: Number(form.monthly_rent),
        vacancies: Number(form.vacancies),
        gender_preference: form.gender_preference,
        contact_number: form.contact_number.trim(),
        photo_urls: photoUrls,
        is_active: form.is_active,
      })

      navigate(`/listings/${id}`)
    } catch (err) {
      setError(err.message || 'Failed to update listing. Please try again.')
    } finally {
      setSubmitting(false)
    }
  }

  async function handleDelete() {
    const confirmed = window.confirm(
      'Delete this listing permanently? This cannot be undone.'
    )
    if (!confirmed) return

    setDeleting(true)
    setError('')

    try {
      await deleteListing(id)
      await deleteListingPhotos(existingPhotos)
      navigate('/dashboard')
    } catch (err) {
      setError(err.message || 'Failed to delete listing.')
      setDeleting(false)
    }
  }

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <p className="text-sm text-gray-500">Loading...</p>
      </div>
    )
  }

  if (!form) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50 px-4">
        <div className="text-center">
          <p className="text-sm text-red-700">{error}</p>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gray-50 px-4 py-6">
      <div className="max-w-xl mx-auto bg-white rounded-xl border border-gray-200 p-6">
        <h1 className="text-2xl font-semibold text-gray-900 mb-1">
          Edit listing
        </h1>
        <p className="text-sm text-gray-500 mb-6">
          Update your room details below.
        </p>

        {error && (
          <div className="mb-4 rounded-lg bg-red-50 border border-red-200 px-3 py-2 text-sm text-red-700">
            {error}
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Title
            </label>
            <input
              name="title"
              type="text"
              required
              value={form.title}
              onChange={handleChange}
              className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Description
            </label>
            <textarea
              name="description"
              required
              rows={4}
              value={form.description}
              onChange={handleChange}
              className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
            />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Area
              </label>
              <input
                name="area"
                type="text"
                required
                value={form.area}
                onChange={handleChange}
                className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                City
              </label>
              <input
                name="city"
                type="text"
                required
                value={form.city}
                onChange={handleChange}
                className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Monthly Rent (₹)
              </label>
              <input
                name="monthly_rent"
                type="number"
                min="1"
                required
                value={form.monthly_rent}
                onChange={handleChange}
                className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Vacancies
              </label>
              <input
                name="vacancies"
                type="number"
                min="1"
                required
                value={form.vacancies}
                onChange={handleChange}
                className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
              />
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Gender Preference
            </label>
            <select
              name="gender_preference"
              value={form.gender_preference}
              onChange={handleChange}
              className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
            >
              <option value="any">Any</option>
              <option value="male">Male only</option>
              <option value="female">Female only</option>
            </select>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Contact Number
            </label>
            <input
              name="contact_number"
              type="tel"
              required
              value={form.contact_number}
              onChange={handleChange}
              className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
            />
          </div>

          <div className="flex items-center gap-2">
            <input
              id="is_active"
              type="checkbox"
              checked={form.is_active}
              onChange={(e) =>
                setForm((prev) => ({ ...prev, is_active: e.target.checked }))
              }
              className="rounded border-gray-300"
            />
            <label htmlFor="is_active" className="text-sm text-gray-700">
              Listing is active (visible to others)
            </label>
          </div>

          {existingPhotos.length > 0 && (
            <div>
              <p className="block text-sm font-medium text-gray-700 mb-2">
                Current photos
              </p>
              <div className="grid grid-cols-3 gap-2">
                {existingPhotos.map((url) => (
                  <div key={url} className="relative group">
                    <img
                      src={url}
                      alt="Listing photo"
                      className="w-full h-20 object-cover rounded-lg"
                    />
                    <button
                      type="button"
                      onClick={() => handleRemoveExistingPhoto(url)}
                      className="absolute top-1 right-1 bg-black/60 text-white rounded-full w-5 h-5 text-xs flex items-center justify-center"
                      aria-label="Remove photo"
                    >
                      ×
                    </button>
                  </div>
                ))}
              </div>
            </div>
          )}

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Add more photos (max {MAX_PHOTOS} total)
            </label>
            <input
              type="file"
              accept="image/*"
              multiple
              onChange={handleNewPhotoChange}
              className="w-full text-sm text-gray-600"
            />
          </div>

          <button
            type="submit"
            disabled={submitting}
            className="w-full rounded-lg bg-indigo-600 text-white font-medium py-2.5 text-sm hover:bg-indigo-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
          >
            {submitting ? 'Saving...' : 'Save Changes'}
          </button>
        </form>

        <button
          type="button"
          onClick={handleDelete}
          disabled={deleting}
          className="w-full mt-3 rounded-lg border border-red-300 text-red-600 font-medium py-2.5 text-sm hover:bg-red-50 disabled:opacity-50 transition-colors"
        >
          {deleting ? 'Deleting...' : 'Delete Listing'}
        </button>
      </div>
    </div>
  )
}

export default EditListing