import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'
import { fetchProfile } from '../lib/profiles'

function InfoRow({ label, value }) {
  return (
    <div className="flex justify-between py-2 border-b border-gray-100 last:border-0">
      <span className="text-sm text-gray-500">{label}</span>
      <span className="text-sm text-gray-900 font-medium text-right">
        {value || '—'}
      </span>
    </div>
  )
}

function Profile() {
  const { user } = useAuth()

  const [profile, setProfile] = useState(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')

  useEffect(() => {
    let isMounted = true

    if (!user) return

    fetchProfile(user.id)
      .then((data) => {
        if (isMounted) setProfile(data)
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

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <p className="text-sm text-gray-500">Loading your profile...</p>
      </div>
    )
  }

  if (error) {
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

  return (
    <div className="min-h-screen bg-gray-50 px-4 py-6">
      <div className="max-w-2xl mx-auto">
        <div className="flex items-start justify-between mb-6">
          <h1 className="text-2xl font-semibold text-gray-900">My Profile</h1>
          <Link
            to="/profile/edit"
            className="rounded-lg bg-indigo-600 text-white font-medium px-4 py-2 text-sm hover:bg-indigo-700 transition-colors whitespace-nowrap"
          >
            Edit Profile
          </Link>
        </div>

        <div className="bg-white border border-gray-200 rounded-lg p-6">
          <div className="flex items-center gap-4 mb-6">
            <div className="w-20 h-20 rounded-full bg-gray-100 flex-shrink-0 overflow-hidden">
              {profile?.avatar_url ? (
                <img
                  src={profile.avatar_url}
                  alt={profile.full_name || 'Profile photo'}
                  className="w-full h-full object-cover"
                />
              ) : (
                <div className="w-full h-full flex items-center justify-center text-gray-400 text-xs">
                  No photo
                </div>
              )}
            </div>
            <div>
              <p className="text-lg font-semibold text-gray-900">
                {profile?.full_name || 'Add your name'}
              </p>
              {(profile?.occupation || profile?.company_or_college) && (
                <p className="text-sm text-gray-600">
                  {[profile?.occupation, profile?.company_or_college]
                    .filter(Boolean)
                    .join(' at ')}
                </p>
              )}
              <p className="text-sm text-gray-500">{user?.email}</p>
            </div>
          </div>

          {profile?.bio && (
            <p className="text-sm text-gray-700 mb-6 whitespace-pre-wrap">
              {profile.bio}
            </p>
          )}

          <InfoRow label="Age" value={profile?.age} />
          <InfoRow label="Gender" value={profile?.gender} />
          <InfoRow label="Occupation" value={profile?.occupation} />
          <InfoRow
            label="Company / College"
            value={profile?.company_or_college}
          />
          <InfoRow label="WhatsApp" value={profile?.whatsapp} />
          <InfoRow label="Current City" value={profile?.current_city} />
          <InfoRow label="Preferred City" value={profile?.preferred_city} />
        </div>
      </div>
    </div>
  )
}

export default Profile
