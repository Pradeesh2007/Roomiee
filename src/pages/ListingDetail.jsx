import { useEffect, useState } from 'react'
import { useParams, Link } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'
import { fetchListingById } from '../lib/listings'

function formatRent(amount) {
  return new Intl.NumberFormat('en-IN', {
    style: 'currency',
    currency: 'INR',
    maximumFractionDigits: 0,
  }).format(amount)
}

function buildWhatsAppLink(contactNumber, listingTitle) {
  // Default to India country code if the number doesn't already include one.
  // This is a pragmatic MVP assumption — see note below in the explanation.
  const digitsOnly = contactNumber.replace(/\D/g, '')
  const withCountryCode =
    digitsOnly.length === 10 ? `91${digitsOnly}` : digitsOnly

  const message = encodeURIComponent(
    `Hi, I'm interested in your listing "${listingTitle}" on Roomiee.`
  )

  return `https://wa.me/${withCountryCode}?text=${message}`
}

function ListingDetail() {
  const { id } = useParams()
  const { user } = useAuth()

  const [listing, setListing] = useState(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')

  useEffect(() => {
    let isMounted = true

    fetchListingById(id)
      .then((data) => {
        if (isMounted) setListing(data)
      })
      .catch((err) => {
        if (isMounted) setError(err.message || 'Listing not found.')
      })
      .finally(() => {
        if (isMounted) setLoading(false)
      })

    return () => {
      isMounted = false
    }
  }, [id])

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <p className="text-sm text-gray-500">Loading...</p>
      </div>
    )
  }

  if (error || !listing) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50 px-4">
        <p className="text-sm text-red-700">{error || 'Listing not found.'}</p>
      </div>
    )
  }

  const isOwner = user?.id === listing.owner_id

  return (
    <div className="min-h-screen bg-gray-50 px-4 py-6">
      <div className="max-w-2xl mx-auto bg-white rounded-xl border border-gray-200 overflow-hidden">
        {listing.photo_urls?.length > 0 && (
          <div className="aspect-[16/9] bg-gray-100">
            <img
              src={listing.photo_urls[0]}
              alt={listing.title}
              className="w-full h-full object-cover"
            />
          </div>
        )}

        {listing.photo_urls?.length > 1 && (
          <div className="flex gap-2 p-3 overflow-x-auto">
            {listing.photo_urls.slice(1).map((url) => (
              <img
                key={url}
                src={url}
                alt="Listing photo"
                className="w-20 h-20 rounded-lg object-cover flex-shrink-0"
              />
            ))}
          </div>
        )}

        <div className="p-6">
          <div className="flex items-start justify-between gap-3">
            <h1 className="text-2xl font-semibold text-gray-900">
              {listing.title}
            </h1>
            {isOwner && (
              <Link
                to={`/listings/${listing.id}/edit`}
                className="text-sm text-indigo-600 font-medium hover:underline whitespace-nowrap"
              >
                Edit
              </Link>
            )}
          </div>

          <p className="text-sm text-gray-500 mt-1">
            {listing.area}, {listing.city}
          </p>

          <div className="mt-4 flex flex-wrap gap-2">
            <span className="text-lg font-semibold text-indigo-600">
              {formatRent(listing.monthly_rent)}/mo
            </span>
            <span className="text-sm px-2 py-1 rounded-full bg-gray-100 text-gray-600">
              {listing.vacancies} vacanc
              {listing.vacancies === 1 ? 'y' : 'ies'}
            </span>
            {listing.gender_preference !== 'any' && (
              <span className="text-sm px-2 py-1 rounded-full bg-gray-100 text-gray-600 capitalize">
                {listing.gender_preference} only
              </span>
            )}
          </div>

          <p className="mt-4 text-gray-700 whitespace-pre-wrap">
            {listing.description}
          </p>

          <a
            href={buildWhatsAppLink(listing.contact_number, listing.title)}
            target="_blank"
            rel="noopener noreferrer"
            className="mt-6 inline-flex items-center justify-center w-full rounded-lg bg-green-600 text-white font-medium py-2.5 text-sm hover:bg-green-700 transition-colors"
          >
            Contact on WhatsApp
          </a>
        </div>
      </div>
    </div>
  )
}

export default ListingDetail