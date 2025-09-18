import { Eye, EyeOff, Loader2, Lock, Mail, Shield } from 'lucide-react'
import { useEffect, useState } from 'react'
import './App.css'
import AdminDashboard from './components/AdminDashboard'

function App() {
  const [isAuthenticated, setIsAuthenticated] = useState(false)
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState('')
  const [showPassword, setShowPassword] = useState(false)
  const [loading, setLoading] = useState(false)
  const [initialLoading, setInitialLoading] = useState(true)

  // Check for existing authentication on app load
  useEffect(() => {
    const checkAuthToken = async () => {
      try {
        // Check authentication status by calling the profile endpoint
        // This will use the httpOnly cookie automatically
        const apiUrl = (import.meta.env.VITE_ADMIN_API_URL || 'http://localhost:4001').trim()
        const response = await fetch(`${apiUrl}/api/auth/profile`, {
          method: 'GET',
          credentials: 'include', // Include httpOnly cookies
        })

        if (response.ok) {
          setIsAuthenticated(true)
        }
      } catch (error) {
        // User is not authenticated or network error
        setIsAuthenticated(false)
      }
      setInitialLoading(false)
    }
    checkAuthToken()
  }, [])

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError('')
    setLoading(true)
    
    try {
      const apiUrl = (import.meta.env.VITE_ADMIN_API_URL || 'http://localhost:4001').trim()
      const response = await fetch(`${apiUrl}/api/auth/login`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        credentials: 'include', // Include cookies in request
        body: JSON.stringify({ email, password }),
      })

      const data = await response.json()

      if (!response.ok) {
        throw new Error(data.error || 'Login failed')
      }

      // Authentication token is now stored in secure httpOnly cookie
      // No need to manually store anything in localStorage
      setIsAuthenticated(true)
      
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Login failed. Please check your credentials.'
      setError(msg)
    } finally {
      setLoading(false)
    }
  }

  const handleLogout = async () => {
    try {
      const apiUrl = (import.meta.env.VITE_ADMIN_API_URL || 'http://localhost:4001').trim()
      await fetch(`${apiUrl}/api/auth/logout`, {
        method: 'POST',
        credentials: 'include', // Include httpOnly cookies
      })
    } catch (error) {
      // Even if logout API fails, clear the local state
      console.error('Logout request failed:', error)
    }

    // Clear local state regardless of API response
    setIsAuthenticated(false)
    setEmail('')
    setPassword('')
    setError('')
  }

  if (initialLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto"></div>
          <p className="mt-4 text-gray-600">Loading...</p>
        </div>
      </div>
    )
  }

  if (isAuthenticated) {
    return <AdminDashboard onLogout={handleLogout} />
  }

  return (
    <div className="min-h-screen flex items-center justify-center py-12 px-4 sm:px-6 lg:px-8 relative">
      {/* Background honeycomb pattern */}
      <img
        src={import.meta.env.BASE_URL + 'hero-marketing.svg'}
        alt=""
        aria-hidden="true"
        className="absolute inset-0 w-full h-full object-cover z-0 pointer-events-none"
      />
      {/* Overlay for better readability - much lighter honeycomb effect */}
      <div className="absolute inset-0 bg-gradient-to-b from-white/90 via-white/85 to-white/90 z-0" />
      <div className="max-w-md w-full space-y-8 relative z-10">
        <div style={{
          border: '1px solid #e5e7eb',
          borderRadius: '12px',
          boxShadow: '0 10px 25px -5px rgba(0, 0, 0, 0.1), 0 10px 10px -5px rgba(0, 0, 0, 0.04)',
          backgroundColor: 'white',
          padding: '2rem',
          minHeight: '400px'
        }}>
          <div className="text-center mb-6">
            <div className="mx-auto w-12 h-12 bg-blue-600 rounded-lg flex items-center justify-center mb-4">
              <svg className="h-6 w-6 text-white" viewBox="0 0 24 24" fill="currentColor">
                <path d="M17.5 3.5L22 12l-4.5 8.5h-11L2 12l4.5-8.5h11z"/>
              </svg>
            </div>
            <h2 className="text-2xl font-bold tracking-tight text-gray-900">
              Admin Portal - NectarStudio <span className="text-blue-600">.ai</span>
            </h2>
            <p className="text-muted-foreground">
              Sign in to access the admin dashboard
            </p>
          </div>

          <form className="space-y-6" onSubmit={handleSubmit}>
          {error && (
            <div className="bg-red-50 border border-red-200 text-red-600 px-4 py-3 rounded-md text-sm">
              {error}
            </div>
          )}

          <div className="space-y-4">
            <div>
              <label htmlFor="email" className="block text-sm font-medium text-gray-700">
                Email Address
              </label>
              <div className="mt-1 relative">
                <Mail className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4" style={{ color: '#ff0000', zIndex: 10 }} />
                <input
                  id="email"
                  name="email"
                  type="email"
                  required
                  autoFocus
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="pl-10 appearance-none relative block w-full px-3 py-2 border border-gray-300 placeholder-gray-500 text-gray-900 rounded-md focus:outline-none focus:ring-blue-500 focus:border-blue-500 focus:z-10 sm:text-sm"
                  placeholder="Enter your admin email"
                />
              </div>
            </div>

            <div>
              <label htmlFor="password" className="block text-sm font-medium text-gray-700">
                Password
              </label>
              <div className="mt-1 relative">
                <Lock className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4" style={{ color: '#ff0000', zIndex: 10 }} />
                <input
                  id="password"
                  name="password"
                  type={showPassword ? 'text' : 'password'}
                  required
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="pl-10 pr-10 appearance-none relative block w-full px-3 py-2 border border-gray-300 placeholder-gray-500 text-gray-900 rounded-md focus:outline-none focus:ring-blue-500 focus:border-blue-500 focus:z-10 sm:text-sm"
                  placeholder="Enter your password"
                />
                <button
                  type="button"
                  className="absolute right-3 top-1/2 transform -translate-y-1/2"
                  onClick={() => setShowPassword(!showPassword)}
                >
                  {showPassword ? (
                    <EyeOff className="h-5 w-5 text-gray-400" />
                  ) : (
                    <Eye className="h-5 w-5 text-gray-400" />
                  )}
                </button>
              </div>
            </div>
          </div>

          <div>
            <button
              type="submit"
              disabled={loading}
              className="group relative w-full flex justify-center py-2 px-4 border border-transparent text-sm font-medium rounded-md text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {loading ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Signing In...
                </>
              ) : (
                'Sign In to Admin Portal'
              )}
            </button>
          </div>

          <div className="text-center">
            <p className="text-xs text-gray-500">
              This is the admin portal for Nectar Studio platform administrators.
            </p>
          </div>
          </form>
        </div>
      </div>
    </div>
  )
}

export default App
