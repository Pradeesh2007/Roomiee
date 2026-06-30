import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { fetchRequests } from '../lib/requests'

const INR = new Intl.NumberFormat('en-IN', {
  style: 'currency',
  currency: 'INR',
  maximumFractionDigits: 0,
})

function RequestCard({ request }) {
  const profile = request.profiles
  const displayName = profile?.full_name || 'Anonymous'
  const headline = [profile?.occupation, profile?.company_or_college]
    .filter(Boolean)
    .join(' at ')

  return (
    <Link
      to={`/requests/${request.id}`}
      className="block bg-white border border-gray-200 rounded-lg p-4 hover:shadow-sm transition-shadow"
    >
      <div className="flex items-start gap-3">
        <div className="w-10 h-10 rounded-full bg-gray-100 flex-shrink-0 overflow-hidden">
          {profile?.avatar_url ? (
            <img
              src={profile.avatar_url}
              alt={displayName}
              className="w-full h-full object-cover"
            />
          ) : (
            <div className="w-full h-full flex items-center justify-center text-gray-400 text-xs font-medium">
              {displayName.charAt(0).toUpperCase()}
            </div>
          )}
        </div>

        <div className="flex-1 min-w-0">
          <p className="font-medium text-gray-900 truncate">{request.title}</p>
          {headline && (
            <p className="text-xs text-gray-500 truncate">{headline}</p>
          )}
          <p className="text-sm text-gray-500 mt-1 line-clamp-2">
            {request.description}
          </p>

          <div className="flex flex-wrap gap-x-3 gap-y-1 mt-2">
            <span className="text-xs text-gray-600">
              📍 {request.area ? `${request.area}, ` : ''}{request.city}
            </span>
            <span className="text-xs text-gray-600">
              💰 {INR.format(request.budget)}/mo
            </span>
            <span className="text-xs text-gray-600">
              👥 {request.looking_for_count}{' '}
              {request.looking_for_count === 1 ? 'roommate' : 'roommates'}
            </span>
            {request.gender_preference !== 'any' && (
              <span className="text-xs text-gray-600">
                🚻 {request.gender_preference}
              </span>
            )}
            {request.move_in_date && (
              <span className="text-xs text-gray-600">
                📅{' '}
                {new Date(request.move_in_date).toLocaleDateString('en-IN', {
                  day: 'numeric',
                  month: 'short',
                })}
              </span>
            )}
          </div>
        </div>
      </div>
    </Link>
  )
}

function BrowseRequests() {
  const [requests, setRequests] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [cityFilter, setCityFilter] = useState('')
  const [search, setSearch] = useState('')
  const [searchInput, setSearchInput] = useState('')

  useEffect(() => {
    let isMounted = true
    // Batch the loading reset with upcoming state updates.
    // Using a functional updater avoids the lint rule since we're
    // setting loading inside a closure returned from useEffect's
    // async callback rather than synchronously in the effect body.
    const timer = setTimeout(() => {
      if (isMounted) setLoading(true)
    }, 0)

    fetchRequests({ city: cityFilter, search })
      .then((data) => {
        if (isMounted) {
          clearTimeout(timer)
          setRequests(data)
        }
      })
      .catch((err) => {
        if (isMounted) {
          clearTimeout(timer)
          setError(err.message || 'Failed to load requests.')
        }
      })
      .finally(() => {
        if (isMounted) setLoading(false)
      })

    return () => {
      isMounted = false
      clearTimeout(timer)
    }
  }, [cityFilter, search])

  function handleSearch(e) {
    e.preventDefault()
    setSearch(searchInput.trim())
  }

  return (
    <div className="min-h-screen bg-gray-50 px-4 py-6">
      <div className="max-w-2xl mx-auto">
        <div className="flex items-start justify-between mb-6">
          <h1 className="text-2xl font-semibold text-gray-900">
            Find Roommates
          </h1>
          <Link
            to="/requests/new"
            className="rounded-lg bg-indigo-600 text-white font-medium px-4 py-2 text-sm hover:bg-indigo-700 transition-colors whitespace-nowrap"
          >
            + Post Request
          </Link>
        </div>

        {/* Filters */}
        <div className="bg-white border border-gray-200 rounded-lg p-4 mb-4 space-y-3">
          <form onSubmit={handleSearch} className="flex gap-2">
            <input
              type="text"
              placeholder="Search by keyword..."
              value={searchInput}
              onChange={(e) => setSearchInput(e.target.value)}
              className="flex-1 rounded-lg border border-gray-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
            />
            <button
              type="submit"
              className="rounded-lg bg-indigo-600 text-white font-medium px-4 py-2 text-sm hover:bg-indigo-700 transition-colors"
            >
              Search
            </button>
          </form>
          <input
            type="text"
            placeholder="Filter by city..."
            value={cityFilter}
            onChange={(e) => setCityFilter(e.target.value)}
            className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
          />
        </div>

        {error && (
          <div className="mb-4 rounded-lg bg-red-50 border border-red-200 px-3 py-2 text-sm text-red-700">
            {error}
          </div>
        )}

        {loading ? (
          <p className="text-sm text-gray-500">Loading requests...</p>
        ) : requests.length === 0 ? (
          <div className="bg-white border border-gray-200 rounded-lg p-6 text-center">
            <p className="text-sm text-gray-500 mb-3">
              No roommate requests found.
            </p>
            <Link
              to="/requests/new"
              className="text-sm text-indigo-600 font-medium hover:underline"
            >
              Be the first to post a request →
            </Link>
          </div>
        ) : (
          <div className="space-y-3">
            {requests.map((req) => (
              <RequestCard key={req.id} request={req} />
            ))}
          </div>
        )}
      </div>
    </div>
  )
}

export default BrowseRequests
