import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'
import { fetchMyListings } from '../lib/listings'

function formatRent(amount) {
  return new Intl.NumberFormat('en-IN', {
    style: 'currency',
    currency: 'INR',
    maximumFractionDigits: 0,
  }).format(amount)
}

function MyListingRow({ listing }) {
  const thumbnail = listing.photo_urls?.[0]

  return (
    <div className="flex items-center gap-3 bg-white border border-gray-200 rounded-lg p-3">
      <div className="w-16 h-16 rounded-lg bg-gray-100 flex-shrink-0 overflow-hidden">
        {thumbnail ? (
          <img
            src={thumbnail}
            alt={listing.title}
            className="w-full h-full object-cover"
          />
        ) : (
          <div className="w-full h-full flex items-center justify-center text-gray-400 text-xs">
            No photo
          </div>
        )}
      </div>

      <div className="flex-1 min-w-0">
        <p className="font-medium text-gray-900 truncate">{listing.title}</p>
        <p className="text-sm text-gray-500 truncate">
          {listing.area}, {listing.city} · {formatRent(listing.monthly_rent)}/mo
        </p>
        {!listing.is_active && (
          <span className="inline-block mt-1 text-xs px-2 py-0.5 rounded-full bg-gray-100 text-gray-500">
            Inactive
          </span>
        )}
      </div>

      <div className="flex gap-2 flex-shrink-0">
        <Link
          to={`/listings/${listing.id}`}
          className="text-sm text-gray-600 font-medium hover:underline"
        >
          View
        </Link>
        <Link
          to={`/listings/${listing.id}/edit`}
          className="text-sm text-indigo-600 font-medium hover:underline"
        >
          Edit
        </Link>
      </div>
    </div>
  )
}

function Dashboard() {
  const { user, signOut } = useAuth()

  const [listings, setListings] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')

  useEffect(() => {
    let isMounted = true

    if (!user) return

    fetchMyListings(user.id)
      .then((data) => {
        if (isMounted) setListings(data)
      })
      .catch((err) => {
        if (isMounted) setError(err.message || 'Failed to load your listings.')
      })
      .finally(() => {
        if (isMounted) setLoading(false)
      })

    return () => {
      isMounted = false
    }
  }, [user])

  return (
    <div className="min-h-screen bg-gray-50 px-4 py-6">
      <div className="max-w-2xl mx-auto">
        <div className="flex items-start justify-between mb-6">
          <div>
            <h1 className="text-2xl font-semibold text-gray-900 mb-1">
              Dashboard
            </h1>
            <p className="text-sm text-gray-500">
              Logged in as: {user?.email}
            </p>
          </div>
          <button
            onClick={signOut}
            className="rounded-lg border border-gray-300 text-gray-700 font-medium px-4 py-2 text-sm hover:bg-gray-100 transition-colors whitespace-nowrap"
          >
            Log Out
          </button>
        </div>

        <div className="flex gap-3 mb-6">
          <Link
            to="/listings/new"
            className="rounded-lg bg-indigo-600 text-white font-medium px-4 py-2 text-sm hover:bg-indigo-700 transition-colors"
          >
            + Post a Room
          </Link>
          <Link
            to="/browse"
            className="rounded-lg border border-gray-300 text-gray-700 font-medium px-4 py-2 text-sm hover:bg-gray-100 transition-colors"
          >
            Browse Rooms
          </Link>
          <Link
            to="/profile"
            className="rounded-lg border border-gray-300 text-gray-700 font-medium px-4 py-2 text-sm hover:bg-gray-100 transition-colors"
          >
            My Profile
          </Link>
        </div>

        <h2 className="text-lg font-semibold text-gray-900 mb-3">
          My Listings
        </h2>

        {error && (
          <div className="mb-4 rounded-lg bg-red-50 border border-red-200 px-3 py-2 text-sm text-red-700">
            {error}
          </div>
        )}

        {loading ? (
          <p className="text-sm text-gray-500">Loading your listings...</p>
        ) : listings.length === 0 ? (
          <div className="bg-white border border-gray-200 rounded-lg p-6 text-center">
            <p className="text-sm text-gray-500 mb-3">
              You haven't posted any rooms yet.
            </p>
            <Link
              to="/listings/new"
              className="text-sm text-indigo-600 font-medium hover:underline"
            >
              Post your first room →
            </Link>
          </div>
        ) : (
          <div className="space-y-2">
            {listings.map((listing) => (
              <MyListingRow key={listing.id} listing={listing} />
            ))}
          </div>
        )}
      </div>
    </div>
  )
}

export default Dashboard