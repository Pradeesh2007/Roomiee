import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'
import { createListing, uploadListingPhotos } from '../lib/listings'

const MAX_PHOTOS = 5

const initialForm = {
  title: '',
  description: '',
  area: '',
  city: '',
  monthly_rent: '',
  vacancies: '1',
  gender_preference: 'any',
  contact_number: '',
}

function CreateListing() {
  const { user } = useAuth()
  const navigate = useNavigate()

  const [form, setForm] = useState(initialForm)
  const [photos, setPhotos] = useState([])
  const [error, setError] = useState('')
  const [submitting, setSubmitting] = useState(false)

  function handleChange(e) {
    const { name, value } = e.target
    setForm((prev) => ({ ...prev, [name]: value }))
  }

  function handlePhotoChange(e) {
    const files = Array.from(e.target.files || [])

    if (files.length > MAX_PHOTOS) {
      setError(`You can upload a maximum of ${MAX_PHOTOS} photos.`)
      return
    }

    const oversized = files.find((f) => f.size > 5 * 1024 * 1024)
    if (oversized) {
      setError(`"${oversized.name}" is larger than 5MB. Please choose a smaller file.`)
      return
    }

    setError('')
    setPhotos(files)
  }

  function validate() {
    if (form.title.trim().length < 3) {
      return 'Title must be at least 3 characters.'
    }
    if (form.description.trim().length < 10) {
      return 'Description must be at least 10 characters.'
    }
    if (!form.area.trim() || !form.city.trim()) {
      return 'Area and city are required.'
    }
    const rent = Number(form.monthly_rent)
    if (!rent || rent <= 0) {
      return 'Monthly rent must be a positive number.'
    }
    const vacancies = Number(form.vacancies)
    if (!vacancies || vacancies <= 0) {
      return 'Number of vacancies must be at least 1.'
    }
    if (!/^[0-9]{10,15}$/.test(form.contact_number.trim())) {
      return 'Contact number must be 10–15 digits, no spaces or symbols.'
    }
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
      let photoUrls = []
      if (photos.length > 0) {
        photoUrls = await uploadListingPhotos(user.id, photos)
      }

      const listing = await createListing({
        owner_id: user.id,
        title: form.title.trim(),
        description: form.description.trim(),
        area: form.area.trim(),
        city: form.city.trim(),
        monthly_rent: Number(form.monthly_rent),
        vacancies: Number(form.vacancies),
        gender_preference: form.gender_preference,
        contact_number: form.contact_number.trim(),
        photo_urls: photoUrls,
      })

      navigate(`/listings/${listing.id}`)
    } catch (err) {
      setError(err.message || 'Failed to create listing. Please try again.')
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <div className="min-h-screen bg-gray-50 px-4 py-6">
      <div className="max-w-xl mx-auto bg-white rounded-xl border border-gray-200 p-6">
        <h1 className="text-2xl font-semibold text-gray-900 mb-1">
          Post a room
        </h1>
        <p className="text-sm text-gray-500 mb-6">
          Fill in the details below. Your listing goes live immediately.
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
              placeholder="e.g. Spacious 1BHK near IT Park"
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
              placeholder="Describe the room, amenities, nearby landmarks..."
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
                placeholder="e.g. Velachery"
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
                placeholder="e.g. Chennai"
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
                placeholder="e.g. 12000"
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
              placeholder="WhatsApp-enabled number, e.g. 9876543210"
              className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
            />
            <p className="mt-1 text-xs text-gray-400">
              Digits only, no spaces or symbols. This is what people will
              WhatsApp you on.
            </p>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Photos (up to {MAX_PHOTOS}, max 5MB each)
            </label>
            <input
              type="file"
              accept="image/*"
              multiple
              onChange={handlePhotoChange}
              className="w-full text-sm text-gray-600"
            />
          </div>

          <button
            type="submit"
            disabled={submitting}
            className="w-full rounded-lg bg-indigo-600 text-white font-medium py-2.5 text-sm hover:bg-indigo-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
          >
            {submitting ? 'Publishing...' : 'Publish Listing'}
          </button>
        </form>
      </div>
    </div>
  )
}

export default CreateListing