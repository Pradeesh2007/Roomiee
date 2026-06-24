import { useEffect, useState, useCallback } from 'react'
import { Link } from 'react-router-dom'
import { fetchListings } from '../lib/listings'

function formatRent(amount) {
  return new Intl.NumberFormat('en-IN', {
    style: 'currency',
    currency: 'INR',
    maximumFractionDigits: 0,
  }).format(amount)
}

function ListingCard({ listing }) {
  const thumbnail = listing.photo_urls?.[0]

  return (
    <Link
      to={`/listings/${listing.id}`}
      className="block bg-white rounded-xl border border-gray-200 overflow-hidden hover:shadow-md transition-shadow"
    >
      <div className="aspect-[4/3] bg-gray-100">
        {thumbnail ? (
          <img
            src={thumbnail}
            alt={listing.title}
            className="w-full h-full object-cover"
          />
        ) : (
          <div className="w-full h-full flex items-center justify-center text-gray-400 text-sm">
            No photo
          </div>
        )}
      </div>
      <div className="p-3">
        <h3 className="font-semibold text-gray-900 truncate">
          {listing.title}
        </h3>
        <p className="text-sm text-gray-500 truncate">
          {listing.area}, {listing.city}
        </p>
        <div className="mt-2 flex items-center justify-between">
          <span className="font-semibold text-indigo-600">
            {formatRent(listing.monthly_rent)}/mo
          </span>
          <span className="text-xs text-gray-500">
            {listing.vacancies} vacanc{listing.vacancies === 1 ? 'y' : 'ies'}
          </span>
        </div>
        {listing.gender_preference !== 'any' && (
          <span className="inline-block mt-2 text-xs px-2 py-0.5 rounded-full bg-gray-100 text-gray-600 capitalize">
            {listing.gender_preference} only
          </span>
        )}
      </div>
    </Link>
  )
}

function Browse() {
  const [listings, setListings] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')

  const [city, setCity] = useState('')
  const [search, setSearch] = useState('')

  const loadListings = useCallback(async (filters) => {
    setLoading(true)
    setError('')
    try {
      const data = await fetchListings(filters)
      setListings(data)
    } catch (err) {
      setError(err.message || 'Failed to load listings.')
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    loadListings({})
  }, [loadListings])

  function handleSearchSubmit(e) {
    e.preventDefault()
    loadListings({
      city: city.trim() || undefined,
      search: search.trim() || undefined,
    })
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="max-w-5xl mx-auto px-4 py-6">
        <h1 className="text-2xl font-semibold text-gray-900 mb-4">
          Find a room
        </h1>

        <form
          onSubmit={handleSearchSubmit}
          className="flex flex-col sm:flex-row gap-3 mb-6"
        >
          <input
            type="text"
            value={city}
            onChange={(e) => setCity(e.target.value)}
            placeholder="City (e.g. Chennai)"
            className="flex-1 rounded-lg border border-gray-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
          />
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search by area, title, or keyword"
            className="flex-1 rounded-lg border border-gray-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
          />
          <button
            type="submit"
            className="rounded-lg bg-indigo-600 text-white font-medium px-5 py-2 text-sm hover:bg-indigo-700 transition-colors"
          >
            Search
          </button>
        </form>

        {error && (
          <div className="mb-4 rounded-lg bg-red-50 border border-red-200 px-3 py-2 text-sm text-red-700">
            {error}
          </div>
        )}

        {loading ? (
          <p className="text-sm text-gray-500">Loading listings...</p>
        ) : listings.length === 0 ? (
          <p className="text-sm text-gray-500">
            No listings found. Try a different city or search term.
          </p>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {listings.map((listing) => (
              <ListingCard key={listing.id} listing={listing} />
            ))}
          </div>
        )}
      </div>
    </div>
  )
}

export default Browse