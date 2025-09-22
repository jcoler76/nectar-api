class APIError extends Error {
  status: number
  code: string

  constructor(message: string, status: number, code: string) {
    super(message)
    this.name = 'APIError'
    this.status = status
    this.code = code
  }
}

class APIService {
  private baseUrl: string
  private token: string | null = null

  constructor(baseUrl: string) {
    this.baseUrl = baseUrl
    this.token = localStorage.getItem('admin_token') || localStorage.getItem('nectar_admin_token')
  }

  setToken(token: string) {
    this.token = token
    localStorage.setItem('admin_token', token)
    localStorage.setItem('nectar_admin_token', token)
  }

  clearToken() {
    this.token = null
    localStorage.removeItem('nectar_admin_token')
  }

  private async request<T>(
    endpoint: string,
    options: RequestInit = {}
  ): Promise<T> {
    const url = `${this.baseUrl}${endpoint}`

    const config: RequestInit = {
      headers: {
        'Content-Type': 'application/json',
        ...(this.token && { Authorization: `Bearer ${this.token}` }),
        ...options.headers,
      },
      credentials: 'include', // Include httpOnly cookies for admin auth
      ...options,
    }

    const doFetch = async () => {
      const response = await fetch(url, config)

      if (!response.ok) {
        let errorMessage = 'Request failed'
        let errorCode = 'REQUEST_FAILED'
        
        try {
          const errorData = await response.json()
          if (errorData.error) {
            errorMessage = errorData.error.message || errorData.error
            errorCode = errorData.error.code || errorCode
          }
          if (errorData.message) {
            errorMessage = errorData.message
          }
        } catch {
          // If we can't parse error response, use status text
          errorMessage = response.statusText || errorMessage
        }

        throw new APIError(errorMessage, response.status, errorCode)
      }

      const data = await response.json()
      return data as T
    }

    try {
      try {
        return await doFetch()
      } catch (err) {
        // Attempt CSRF fetch + retry on CSRF errors
        if (err instanceof APIError && (err.status === 403 || err.status === 401) && (err.message.includes('CSRF') || err.message.includes('Authentication'))) {
          // Try to fetch CSRF token if authenticated
          if (this.token) {
            await fetch(`${this.baseUrl}/csrf-token`, {
              headers: { 'Authorization': `Bearer ${this.token}` },
            })
            return await doFetch()
          }
        }
        throw err
      }
    } catch (error) {
      if (error instanceof APIError) {
        throw error
      }
      throw new APIError('Network error', 0, 'NETWORK_ERROR')
    }
  }

  async get<T>(endpoint: string): Promise<T> {
    return this.request<T>(endpoint, { method: 'GET' })
  }

  async post<T>(endpoint: string, data?: unknown): Promise<T> {
    return this.request<T>(endpoint, {
      method: 'POST',
      body: data ? JSON.stringify(data as Record<string, unknown>) : undefined,
    })
  }

  async put<T>(endpoint: string, data?: unknown): Promise<T> {
    return this.request<T>(endpoint, {
      method: 'PUT',
      body: data ? JSON.stringify(data as Record<string, unknown>) : undefined,
    })
  }

  async delete<T>(endpoint: string): Promise<T> {
    return this.request<T>(endpoint, { method: 'DELETE' })
  }
}

// Configuration
const API_BASE_URL = import.meta.env.VITE_ADMIN_API_BASE_URL || 'http://localhost:4001'

// Create and export the API service instance
export const apiService = new APIService(`${API_BASE_URL}/api`)
export { APIError }
export default apiService
