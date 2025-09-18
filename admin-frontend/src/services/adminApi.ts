// Admin Backend REST API Service
const ADMIN_API_BASE_URL = (import.meta.env.VITE_ADMIN_API_URL || 'http://localhost:4001').trim()

export interface User {
  id: string
  email: string
  firstName: string
  lastName: string
  fullName: string
  isActive: boolean
  isAdmin: boolean
  createdAt: string
  lastLogin?: string
  organization?: {
    id: string
    name: string
  }
  roles: { id: string; name: string }[]
  memberships: { role: string; joinedAt: string; organization: { id: string; name: string } }[]
}

export interface UsersResponse {
  users: User[]
  pagination: {
    total: number
    page: number
    limit: number
    totalPages: number
    hasNext: boolean
    hasPrev: boolean
  }
}

export interface AdminMetrics {
  totalUsers: number
  activeUsers: number
  totalSubscriptions: number
  monthlyRevenue: number
}

class AdminApiService {
  private async request<T>(endpoint: string, options: RequestInit = {}): Promise<T> {
    const url = `${ADMIN_API_BASE_URL}${endpoint}`

    const response = await fetch(url, {
      ...options,
      credentials: 'include', // Include httpOnly cookies
      headers: {
        'Content-Type': 'application/json',
        ...options.headers,
      },
    })

    if (!response.ok) {
      const errorText = await response.text()
      throw new Error(`API Error ${response.status}: ${errorText}`)
    }

    return response.json()
  }

  async getUsers(page = 1, limit = 100): Promise<UsersResponse> {
    return this.request<UsersResponse>(`/api/users?page=${page}&limit=${limit}`)
  }

  async getAdminMetrics(): Promise<AdminMetrics> {
    return this.request<AdminMetrics>('/api/admin/metrics')
  }

  async createUser(userData: {
    email: string
    firstName?: string
    lastName?: string
    isActive?: boolean
    organizationId?: string
  }) {
    return this.request('/api/users', {
      method: 'POST',
      body: JSON.stringify(userData),
    })
  }

  async updateUser(id: string, userData: {
    firstName?: string
    lastName?: string
    email?: string
    isActive?: boolean
  }) {
    return this.request(`/api/users/${id}`, {
      method: 'PUT',
      body: JSON.stringify(userData),
    })
  }

  async deleteUser(id: string) {
    return this.request(`/api/users/${id}`, {
      method: 'DELETE',
    })
  }
}

export const adminApi = new AdminApiService()