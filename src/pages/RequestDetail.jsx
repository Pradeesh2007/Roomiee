import { useEffect, useState } from 'react'
import { useParams, Link, useNavigate } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'
import {
  fetchRequestById,
  fetchInterestCount,
  hasExpressedInterest,
  expressInterest,
  withdrawInterest,
} from '../lib/requests'

const INR = new Intl.NumberFormat('en-IN', {
  style: 'currency',
  currency: 'INR',
  maximumFractionDigits: 0,
})

function DetailRow({ label, value }) {
  if (!value && value !== 0) return null
  return (
    <div className="flex justify-between py-2 border-b border-gray-100 last:border-0">
      <span className="text-sm text-gray-500">{label}</span>
      <span className="text-sm text-gray-900 font-medium text-right">
        {value}
      </span>
    </div>
  )
}

function RequestDetail() {
  const { id } = useParams()
  const { user } = useAuth()
  const navigate = useNavigate()

  const [request, setRequest] = useState(null)
  const [interestCount, setInterestCount] = useState(0)
  const [interested, setInterested] = useState(false)
  const [loading, setLoading] = useState(true)
  const [interestLoading, setInterestLoading] = useState(false)
  const [error, setError] = useState('')

  useEffect(() => {
    let isMounted = true

    async function load() {
      try {
        const [req, count] = await Promise.all([
          fetchRequestById(id),
          fetchInterestCount(id),
        ])

        if (!isMounted) return
        setRequest(req)
        setInterestCount(count)

        // Only check interest state if user is logged in and doesn't own the request
        if (user && user.id !== req.user_id) {
          const alreadyInterested = await hasExpressedInterest(id, user.id)
          if (isMounted) setInterested(alreadyInterested)
        }
      } catch (err) {
        if (isMounted) setError(err.message || 'Failed to load this request.')
      } finally {
        if (isMounted) setLoading(false)
      }
    }

    load()

    return () => {
      isMounted = false
    }
  }, [id, user])

  async function handleInterest() {
    if (!user) {
      navigate('/login')
      return
    }

    setInterestLoading(true)
    setError('')

    try {
      if (interested) {
        await withdrawInterest(id, user.id)
        setInterested(false)
        setInterestCount((c) => Math.max(0, c - 1))
      } else {
        await expressInterest(id, user.id)
        setInterested(true)
        setInterestCount((c) => c + 1)
      }
    } catch (err) {
      // Unique constraint violation = already interested (race condition).
      // Treat it as a success rather than an error.
      if (err.code === '23505') {
        setInterested(true)
      } else {
        setError(err.message || 'Something went wrong. Please try again.')
      }
    } finally {
      setInterestLoading(false)
    }
  }

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <p className="text-sm text-gray-500">Loading request...</p>
      </div>
    )
  }

  if (error && !request) {
    return (
      <div className="min-h-screen bg-gray-50 px-4 py-6">
        <div className="max-w-2xl mx-auto">
          <div className="rounded-lg bg-red-50 border border-red-200 px-3 py-2 text-sm text-red-700">
            {error}
          </div>
        </div>
      </div>
    )
  }

  const profile = request?.profiles
  const isOwner = user && user.id === request?.user_id
  const displayName = profile?.full_name || 'Anonymous'
  const headline = [profile?.occupation, profile?.company_or_college]
    .filter(Boolean)
    .join(' at ')

  return (
    <div className="min-h-screen bg-gray-50 px-4 py-6">
      <div className="max-w-2xl mx-auto">
        <Link
          to="/requests"
          className="text-sm text-indigo-600 hover:underline mb-4 inline-block"
        >
          ← Back to requests
        </Link>

        {error && (
          <div className="mb-4 rounded-lg bg-red-50 border border-red-200 px-3 py-2 text-sm text-red-700">
            {error}
          </div>
        )}

        <div className="bg-white border border-gray-200 rounded-lg p-6 mb-4">
          {/* Poster info */}
          <div className="flex items-center gap-3 mb-4">
            <div className="w-12 h-12 rounded-full bg-gray-100 flex-shrink-0 overflow-hidden">
              {profile?.avatar_url ? (
                <img
                  src={profile.avatar_url}
                  alt={displayName}
                  className="w-full h-full object-cover"
                />
              ) : (
                <div className="w-full h-full flex items-center justify-center text-gray-500 font-medium">
                  {displayName.charAt(0).toUpperCase()}
                </div>
              )}
            </div>
            <div>
              <p className="font-medium text-gray-900">{displayName}</p>
              {headline && (
                <p className="text-sm text-gray-500">{headline}</p>
              )}
            </div>
          </div>

          <h1 className="text-xl font-semibold text-gray-900 mb-2">
            {request.title}
          </h1>

          <p className="text-sm text-gray-700 whitespace-pre-wrap mb-4">
            {request.description}
          </p>

          {profile?.bio && (
            <div className="bg-gray-50 rounded-lg p-3 mb-4">
              <p className="text-xs font-semibold text-gray-400 uppercase tracking-wide mb-1">
                About {displayName.split(' ')[0]}
              </p>
              <p className="text-sm text-gray-700">{profile.bio}</p>
            </div>
          )}

          <div className="space-y-0 mb-4">
            <DetailRow
              label="Location"
              value={[request.area, request.city].filter(Boolean).join(', ')}
            />
            <DetailRow label="Budget" value={`${INR.format(request.budget)}/mo`} />
            <DetailRow
              label="Looking for"
              value={`${request.looking_for_count} ${request.looking_for_count === 1 ? 'roommate' : 'roommates'}`}
            />
            <DetailRow
              label="Gender preference"
              value={
                request.gender_preference.charAt(0).toUpperCase() +
                request.gender_preference.slice(1)
              }
            />
            {request.move_in_date && (
              <DetailRow
                label="Move-in date"
                value={new Date(request.move_in_date).toLocaleDateString(
                  'en-IN',
                  { day: 'numeric', month: 'long', year: 'numeric' }
                )}
              />
            )}
          </div>

          {/* Interest count */}
          <p className="text-sm text-gray-500 mb-4">
            {interestCount === 0
              ? 'No one has expressed interest yet.'
              : `${interestCount} ${interestCount === 1 ? 'person' : 'people'} interested`}
          </p>

          {/* Actions */}
          {isOwner ? (
            <div className="flex gap-3">
              <span className="rounded-lg bg-gray-100 text-gray-600 font-medium px-4 py-2 text-sm">
                Your Request
              </span>
              <Link
                to={`/requests/${request.id}/edit`}
                className="rounded-lg border border-gray-300 text-gray-700 font-medium px-4 py-2 text-sm hover:bg-gray-100 transition-colors"
              >
                Edit
              </Link>
            </div>
          ) : (
            <div className="flex gap-3 flex-wrap">
              <button
                onClick={handleInterest}
                disabled={interestLoading}
                className={`rounded-lg font-medium px-5 py-2.5 text-sm transition-colors disabled:opacity-50 disabled:cursor-not-allowed ${
                  interested
                    ? 'bg-green-50 border border-green-300 text-green-700 hover:bg-green-100'
                    : 'bg-indigo-600 text-white hover:bg-indigo-700'
                }`}
              >
                {interestLoading
                  ? '...'
                  : interested
                    ? '✓ Interested'
                    : "I'm Interested"}
              </button>

              {/* WhatsApp contact — only shown if owner has set their number */}
              {profile?.whatsapp && (
                <a
                  href={`https://wa.me/91${profile.whatsapp}?text=${encodeURIComponent(
                    `Hi! I saw your roommate request on Roomiee: "${request.title}". I'm interested in connecting.`
                  )}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="rounded-lg bg-green-600 text-white font-medium px-5 py-2.5 text-sm hover:bg-green-700 transition-colors"
                >
                  WhatsApp
                </a>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  )
}

export default RequestDetail
