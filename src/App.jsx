import { Routes, Route, Link } from 'react-router-dom'
import Login from './pages/Login'
import Signup from './pages/Signup'
import Browse from './pages/Browse'
import CreateListing from './pages/CreateListing'
import EditListing from './pages/EditListing'
import ListingDetail from './pages/ListingDetail'
import Dashboard from './pages/Dashboard'
import Profile from './pages/Profile'
import EditProfile from './pages/EditProfile'
import ProtectedRoute from './components/ProtectedRoute'

function Home() {
  return (
    <div className="min-h-screen flex flex-col items-center justify-center bg-gray-50 px-4 text-center">
      <h1 className="text-3xl font-semibold text-gray-900 mb-2">
        Welcome to Roomiee
      </h1>
      <p className="text-gray-500 mb-6">
        Find a room or list one in your city.
      </p>
      <div className="flex gap-3">
        <Link
          to="/browse"
          className="rounded-lg bg-indigo-600 text-white font-medium px-5 py-2.5 text-sm hover:bg-indigo-700 transition-colors"
        >
          Browse Rooms
        </Link>
        <Link
          to="/listings/new"
          className="rounded-lg border border-gray-300 text-gray-700 font-medium px-5 py-2.5 text-sm hover:bg-gray-100 transition-colors"
        >
          Post a Room
        </Link>
      </div>
    </div>
  )
}

function App() {
  return (
    <Routes>
      <Route path="/" element={<Home />} />
      <Route path="/login" element={<Login />} />
      <Route path="/signup" element={<Signup />} />
      <Route path="/browse" element={<Browse />} />
      <Route path="/listings/:id" element={<ListingDetail />} />
      <Route
        path="/listings/new"
        element={
          <ProtectedRoute>
            <CreateListing />
          </ProtectedRoute>
        }
      />
      <Route
        path="/listings/:id/edit"
        element={
          <ProtectedRoute>
            <EditListing />
          </ProtectedRoute>
        }
      />
      <Route
        path="/dashboard"
        element={
          <ProtectedRoute>
            <Dashboard />
          </ProtectedRoute>
        }
      />
      <Route
        path="/profile"
        element={
          <ProtectedRoute>
            <Profile />
          </ProtectedRoute>
        }
      />
      <Route
        path="/profile/edit"
        element={
          <ProtectedRoute>
            <EditProfile />
          </ProtectedRoute>
        }
      />
    </Routes>
  )
}

export default App