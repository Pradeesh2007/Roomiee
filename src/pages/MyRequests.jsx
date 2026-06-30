import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'
import { fetchMyRequests, fetchInterestCountsForOwner, deactivateRequest, deleteRequest } from '../lib/requests'

const INR = new Intl.NumberFormat('en-IN', {
  style: 'currency',
  currency: 'INR',
  maximumFractionDigits: 0,
})

function MyRequestRow({ request, interestCount, onDeactivate, onDelete }) {
  const [confirming, setConfirming] = useState(false)

  return (
    <div className="bg-white border border-gray-200 rounded-lg p-4">
      <div className="flex items-start justify-between gap-2">
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 mb-1 flex-wrap">
            <p className="font-medium text-gray-900 truncate">
              {request.title}
            </p>
            {!request.is_active && (
              <span className="text-xs px-2 py-0.5 rounded-full bg-gray-100 text-gray-500 flex-shrink-0">
                Closed
              </span>
            )}
          </div>
          <p className="text-sm text-gray-500">
            {request.city}
            {request.area ? `, ${request.area}` : ''} ·{' '}
            {INR.format(request.budget)}/mo
          </p>
          <p className="text-sm text-gray-500 mt-1">
            {interestCount === 0
              ? 'No interest yet'
              : `${interestCount} ${interestCount === 1 ? 'person' : 'people'} interested`}
          </p>
        </div>

        <div className="flex gap-2 flex-shrink-0">
          <Link
            to={`/requests/${request.id}`}
            className="text-sm text-gray-600 font-medium hover:underline"
          >
            View
          </Link>
          {request.is_active && (
            <button
              onClick={() => onDeactivate(request.id)}
              className="text-sm text-amber-600 font-medium hover:underline"
            >
              Close
            </button>
          )}
          {confirming ? (
            <span className="flex gap-1 items-center">
              <button
                onClick={() => {
                  onDelete(request.id)
                  setConfirming(false)
                }}
                className="text-sm text-red-600 font-medium hover:underline"
              >
                Confirm
              </button>
              <span className="text-gray-300">|</span>
              <button
                onClick={() => setConfirming(false)}
                className="text-sm text-gray-500 font-medium hover:underline"
              >
                Cancel
              </button>
            </span>
          ) : (
            <button
              onClick={() => setConfirming(true)}
              className="text-sm text-red-500 font-medium hover:underline"
            >
              Delete
            </button>
          )}
        </div>
      </div>
    </div>
  )
}

function MyRequests() {
  const { user } = useAuth()
  const [requests, setRequests] = useState([])
  const [interestCounts, setInterestCounts] = useState({})
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')

  useEffect(() => {
    let isMounted = true
    if (!user) return

    async function load() {
      try {
        const [reqs, counts] = await Promise.all([
          fetchMyRequests(user.id),
          fetchInterestCountsForOwner(user.id),
        ])
        if (isMounted) {
          setRequests(reqs)
          setInterestCounts(counts)
        }
      } catch (err) {
        if (isMounted)
          setError(err.message || 'Failed to load your requests.')
      } finally {
        if (isMounted) setLoading(false)
      }
    }

    load()
    return () => { isMounted = false }
  }, [user])

  async function handleDeactivate(id) {
    try {
      await deactivateRequest(id)
      setRequests((prev) =>
        prev.map((r) => (r.id === id ? { ...r, is_active: false } : r))
      )
    } catch (err) {
      setError(err.message || 'Failed to close request.')
    }
  }

  async function handleDelete(id) {
    try {
      await deleteRequest(id)
      setRequests((prev) => prev.filter((r) => r.id !== id))
    } catch (err) {
      setError(err.message || 'Failed to delete request.')
    }
  }

  return (
    <div className="min-h-screen bg-gray-50 px-4 py-6">
      <div className="max-w-2xl mx-auto">
        <div className="flex items-start justify-between mb-6">
          <h1 className="text-2xl font-semibold text-gray-900">My Requests</h1>
          <Link
            to="/requests/new"
            className="rounded-lg bg-indigo-600 text-white font-medium px-4 py-2 text-sm hover:bg-indigo-700 transition-colors whitespace-nowrap"
          >
            + New Request
          </Link>
        </div>

        {error && (
          <div className="mb-4 rounded-lg bg-red-50 border border-red-200 px-3 py-2 text-sm text-red-700">
            {error}
          </div>
        )}

        {loading ? (
          <p className="text-sm text-gray-500">Loading your requests...</p>
        ) : requests.length === 0 ? (
          <div className="bg-white border border-gray-200 rounded-lg p-6 text-center">
            <p className="text-sm text-gray-500 mb-3">
              You haven't posted any roommate requests yet.
            </p>
            <Link
              to="/requests/new"
              className="text-sm text-indigo-600 font-medium hover:underline"
            >
              Post your first request →
            </Link>
          </div>
        ) : (
          <div className="space-y-3">
            {requests.map((req) => (
              <MyRequestRow
                key={req.id}
                request={req}
                interestCount={interestCounts[req.id] ?? 0}
                onDeactivate={handleDeactivate}
                onDelete={handleDelete}
              />
            ))}
          </div>
        )}
      </div>
    </div>
  )
}

export default MyRequests
