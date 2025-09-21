// Admin Users API Service
const ADMIN_API_BASE_URL = (import.meta.env.VITE_ADMIN_API_URL || 'http://localhost:4001').trim()

export interface AdminUser {
  id: string
  email: string
  firstName: string
  lastName: string
  role: AdminRole
  isActive: boolean
  lastLoginAt?: string
  createdAt: string
  updatedAt: string
  createdBy?: string
  notes?: string
}

export type AdminRole = 'SUPER_ADMIN' | 'ADMIN' | 'BILLING_ADMIN' | 'SUPPORT_AGENT' | 'ANALYST'

export interface AdminUsersResponse {
  users: AdminUser[]
  pagination: {
    total: number
    page: number
    limit: number
    totalPages: number
    hasNext: boolean
    hasPrev: boolean
  }
}

export interface CreateAdminUserRequest {
  email: string
  firstName: string
  lastName: string
  role?: AdminRole
  password: string
  notes?: string
}

export interface UpdateAdminUserRequest {
  firstName?: string
  lastName?: string
  isActive?: boolean
  notes?: string
}

class AdminUsersApiService {
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

  async getAdminUsers(page = 1, limit = 50, search?: string, role?: AdminRole, isActive?: boolean): Promise<AdminUsersResponse> {
    const params = new URLSearchParams({
      page: page.toString(),
      limit: limit.toString(),
    })

    if (search) params.append('search', search)
    if (role) params.append('role', role)
    if (isActive !== undefined) params.append('isActive', isActive.toString())

    return this.request<AdminUsersResponse>(`/api/admin/users?${params}`)
  }

  async getAdminUser(id: string): Promise<AdminUser> {
    return this.request<AdminUser>(`/api/admin/users/${id}`)
  }

  async createAdminUser(userData: CreateAdminUserRequest): Promise<{ success: boolean; user: AdminUser }> {
    return this.request('/api/admin/users', {
      method: 'POST',
      body: JSON.stringify(userData),
    })
  }

  async updateAdminUser(id: string, userData: UpdateAdminUserRequest): Promise<{ message: string; user: AdminUser }> {
    return this.request(`/api/admin/users/${id}`, {
      method: 'PUT',
      body: JSON.stringify(userData),
    })
  }

  async updateAdminUserRole(id: string, role: AdminRole): Promise<{ message: string; user: AdminUser }> {
    return this.request(`/api/admin/users/${id}/role`, {
      method: 'PUT',
      body: JSON.stringify({ role }),
    })
  }

  async deactivateAdminUser(id: string): Promise<{ success: boolean; message: string }> {
    return this.request(`/api/admin/users/${id}/deactivate`, {
      method: 'PUT',
    })
  }
}

export const adminUsersApi = new AdminUsersApiService()

export const ADMIN_ROLE_LABELS: Record<AdminRole, string> = {
  SUPER_ADMIN: 'Super Admin',
  ADMIN: 'Admin',
  BILLING_ADMIN: 'Billing Admin',
  SUPPORT_AGENT: 'Support Agent',
  ANALYST: 'Analyst'
}

export const ADMIN_ROLE_DESCRIPTIONS: Record<AdminRole, string> = {
  SUPER_ADMIN: 'Full system access, can manage all users and organizations',
  ADMIN: 'General admin access, can view and update users and organizations',
  BILLING_ADMIN: 'Focused on billing and subscription management',
  SUPPORT_AGENT: 'Read-only access for customer support',
  ANALYST: 'Read-only access with audit log permissions for reporting'
}

export const ADMIN_ROLE_HIERARCHY: AdminRole[] = ['ANALYST', 'SUPPORT_AGENT', 'BILLING_ADMIN', 'ADMIN', 'SUPER_ADMIN']

export function validatePassword(password: string): { isValid: boolean; errors: string[] } {
  const errors: string[] = []

  if (!password) {
    errors.push('Password is required')
    return { isValid: false, errors }
  }

  if (password.length < 8) {
    errors.push('Password must be at least 8 characters long')
  }

  if (!/[A-Z]/.test(password)) {
    errors.push('Password must contain at least one uppercase letter')
  }

  if (!/[a-z]/.test(password)) {
    errors.push('Password must contain at least one lowercase letter')
  }

  if (!/[0-9]/.test(password)) {
    errors.push('Password must contain at least one number')
  }

  if (!/[!@#$%^&*(),.?":{}|<>]/.test(password)) {
    errors.push('Password must contain at least one special character')
  }

  return { isValid: errors.length === 0, errors }
}