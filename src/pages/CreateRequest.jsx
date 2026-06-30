import { useState, useEffect } from 'react'
import { useNavigate, Link } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'
import { createRequest, fetchActiveRequest } from '../lib/requests'

const GENDER_OPTIONS = ['any', 'male', 'female']

function SectionHeader({ children }) {
  return (
    <h2 className="text-xs font-semibold text-gray-400 uppercase tracking-wide pt-2 first:pt-0">
      {children}
    </h2>
  )
}

function CreateRequest() {
  const { user } = useAuth()
  const navigate = useNavigate()

  const [activeRequest, setActiveRequest] = useState(undefined) // undefined = loading
  const [form, setForm] = useState({
    title: '',
    description: '',
    city: '',
    area: '',
    budget: '',
    move_in_date: '',
    gender_preference: 'any',
    looking_for_count: '1',
  })

  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')

  // Check upfront whether the user already has an active request.
  // We block the form here rather than letting the DB unique index
  // surface a raw Postgres error after the user fills the whole form.
  useEffect(() => {
    let isMounted = true
    if (!user) return

    fetchActiveRequest(user.id)
      .then((existing) => {
        if (isMounted) setActiveRequest(existing) // null = clear to proceed
      })
      .catch(() => {
        if (isMounted) setActiveRequest(null) // on error, allow attempt — DB is the backstop
      })

    return () => { isMounted = false }
  }, [user])

  function handleChange(field, value) {
    setForm((prev) => ({ ...prev, [field]: value }))
  }

  async function handleSubmit(e) {
    e.preventDefault()
    setError('')

    // Client-side validation
    if (form.title.trim().length < 5) {
      setError('Title must be at least 5 characters.')
      return
    }
    if (form.description.trim().length < 10) {
      setError('Description must be at least 10 characters.')
      return
    }
    if (!form.city.trim()) {
      setError('City is required.')
      return
    }
    if (!form.budget || Number(form.budget) <= 0) {
      setError('Please enter a valid budget.')
      return
    }

    setSaving(true)

    try {
      const newRequest = await createRequest({
        user_id: user.id,
        title: form.title.trim(),
        description: form.description.trim(),
        city: form.city.trim(),
        area: form.area.trim() || null,
        budget: Number(form.budget),
        move_in_date: form.move_in_date || null,
        gender_preference: form.gender_preference,
        looking_for_count: Number(form.looking_for_count),
      })

      navigate(`/requests/${newRequest.id}`)
    } catch (err) {
      setError(err.message || 'Failed to post your request. Please try again.')
      setSaving(false)
    }
  }

  // Still checking for an existing active request
  if (activeRequest === undefined) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <p className="text-sm text-gray-500">Loading...</p>
      </div>
    )
  }

  // User already has an active request — block the form entirely
  if (activeRequest !== null) {
    return (
      <div className="min-h-screen bg-gray-50 px-4 py-6">
        <div className="max-w-2xl mx-auto">
          <h1 className="text-2xl font-semibold text-gray-900 mb-6">
            Find Roommates
          </h1>
          <div className="bg-white border border-amber-200 rounded-lg p-6">
            <p className="font-medium text-gray-900 mb-1">
              You already have an active request
            </p>
            <p className="text-sm text-gray-500 mb-4">
              "{activeRequest.title}"
            </p>
            <p className="text-sm text-gray-600 mb-5">
              You can only have one active roommate request at a time. Close
              your current request first if your plans have changed, then post
              a new one.
            </p>
            <div className="flex gap-3">
              <Link
                to={`/requests/${activeRequest.id}`}
                className="rounded-lg bg-indigo-600 text-white font-medium px-4 py-2 text-sm hover:bg-indigo-700 transition-colors"
              >
                View My Request
              </Link>
              <Link
                to="/requests/my"
                className="rounded-lg border border-gray-300 text-gray-700 font-medium px-4 py-2 text-sm hover:bg-gray-100 transition-colors"
              >
                My Requests
              </Link>
            </div>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gray-50 px-4 py-6">
      <div className="max-w-2xl mx-auto">
        <h1 className="text-2xl font-semibold text-gray-900 mb-6">
          Find Roommates
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
          <SectionHeader>Your Request</SectionHeader>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Title
            </label>
            <input
              type="text"
              placeholder="e.g. Looking for 2 roommates near OMR, Chennai"
              value={form.title}
              onChange={(e) => handleChange('title', e.target.value)}
              maxLength={100}
              className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Description
            </label>
            <textarea
              rows={4}
              placeholder="Tell potential roommates about yourself, your lifestyle, and what you're looking for..."
              value={form.description}
              onChange={(e) => handleChange('description', e.target.value)}
              maxLength={1000}
              className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 resize-none"
            />
            <p className="text-xs text-gray-400 mt-1 text-right">
              {form.description.length}/1000
            </p>
          </div>

          <SectionHeader>Location</SectionHeader>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                City <span className="text-red-500">*</span>
              </label>
              <input
                type="text"
                placeholder="e.g. Chennai"
                value={form.city}
                onChange={(e) => handleChange('city', e.target.value)}
                className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Area / Locality
              </label>
              <input
                type="text"
                placeholder="e.g. OMR, Adyar"
                value={form.area}
                onChange={(e) => handleChange('area', e.target.value)}
                className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
              />
            </div>
          </div>

          <SectionHeader>Budget & Timing</SectionHeader>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Budget (₹/month) <span className="text-red-500">*</span>
              </label>
              <input
                type="number"
                min={1}
                placeholder="e.g. 8000"
                value={form.budget}
                onChange={(e) => handleChange('budget', e.target.value)}
                className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Move-in Date
              </label>
              <input
                type="date"
                value={form.move_in_date}
                onChange={(e) => handleChange('move_in_date', e.target.value)}
                className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
              />
            </div>
          </div>

          <SectionHeader>Preferences</SectionHeader>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Looking for (roommates)
              </label>
              <select
                value={form.looking_for_count}
                onChange={(e) =>
                  handleChange('looking_for_count', e.target.value)
                }
                className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
              >
                {[1, 2, 3, 4, 5].map((n) => (
                  <option key={n} value={n}>
                    {n} {n === 1 ? 'roommate' : 'roommates'}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Gender preference
              </label>
              <select
                value={form.gender_preference}
                onChange={(e) =>
                  handleChange('gender_preference', e.target.value)
                }
                className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
              >
                {GENDER_OPTIONS.map((g) => (
                  <option key={g} value={g}>
                    {g.charAt(0).toUpperCase() + g.slice(1)}
                  </option>
                ))}
              </select>
            </div>
          </div>

          <div className="flex gap-3 pt-2">
            <button
              type="submit"
              disabled={saving}
              className="rounded-lg bg-indigo-600 text-white font-medium px-5 py-2.5 text-sm hover:bg-indigo-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {saving ? 'Posting...' : 'Post Request'}
            </button>
            <button
              type="button"
              onClick={() => navigate('/requests')}
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

export default CreateRequest
