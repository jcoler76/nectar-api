import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react'

interface User {
  id: string
  email: string
  firstName: string
  lastName: string
  role: string
  lastLoginAt: string
}

interface AuthContextType {
  user: User | null
  apiToken: string | null
  isAuthenticated: boolean
  isLoading: boolean
  login: (email: string, password: string) => Promise<void>
  logout: () => Promise<void>
  refreshAuth: () => Promise<void>
}

const AuthContext = createContext<AuthContextType | undefined>(undefined)

export const useAuth = () => {
  const context = useContext(AuthContext)
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider')
  }
  return context
}

interface AuthProviderProps {
  children: ReactNode
}

export const AuthProvider: React.FC<AuthProviderProps> = ({ children }) => {
  const [user, setUser] = useState<User | null>(null)
  const [apiToken, setApiToken] = useState<string | null>(null)
  const [isLoading, setIsLoading] = useState(true)

  const API_BASE_URL = (import.meta.env.VITE_ADMIN_API_URL || 'http://localhost:4001').trim()

  // Initialize auth state on mount
  useEffect(() => {
    initializeAuth()
  }, [])

  const initializeAuth = async () => {
    try {
      // Check for existing token
      const storedToken = localStorage.getItem('admin_token')
      if (storedToken) {
        setApiToken(storedToken)
      }

      // Check authentication status with backend
      const response = await fetch(`${API_BASE_URL}/api/auth/profile`, {
        method: 'GET',
        credentials: 'include', // Include httpOnly cookies
      })

      if (response.ok) {
        const data = await response.json()
        if (data.success && data.admin) {
          setUser(data.admin)

          // Store/update API token if provided
          if (data.apiToken) {
            setApiToken(data.apiToken)
            localStorage.setItem('admin_token', data.apiToken)
          }
        }
      } else {
        // Clear invalid auth state
        clearAuthState()
      }
    } catch (error) {
      console.error('Auth initialization error:', error)
      clearAuthState()
    } finally {
      setIsLoading(false)
    }
  }

  const login = async (email: string, password: string): Promise<void> => {
    setIsLoading(true)
    try {
      const response = await fetch(`${API_BASE_URL}/api/auth/login`, {
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

      if (data.success && data.admin) {
        setUser(data.admin)

        // Store API token for GraphQL requests
        if (data.apiToken) {
          setApiToken(data.apiToken)
          localStorage.setItem('admin_token', data.apiToken)
        }
      } else {
        throw new Error('Invalid response format')
      }
    } finally {
      setIsLoading(false)
    }
  }

  const logout = async (): Promise<void> => {
    try {
      await fetch(`${API_BASE_URL}/api/auth/logout`, {
        method: 'POST',
        credentials: 'include', // Include httpOnly cookies
      })
    } catch (error) {
      console.error('Logout request failed:', error)
    } finally {
      clearAuthState()
    }
  }

  const refreshAuth = async (): Promise<void> => {
    await initializeAuth()
  }

  const clearAuthState = () => {
    setUser(null)
    setApiToken(null)
    localStorage.removeItem('admin_token')
  }

  const isAuthenticated = !!user && !!apiToken

  const value: AuthContextType = {
    user,
    apiToken,
    isAuthenticated,
    isLoading,
    login,
    logout,
    refreshAuth,
  }

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>
}