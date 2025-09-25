import bcrypt from 'bcryptjs'
import jwt, { SignOptions } from 'jsonwebtoken'
import { mainApiClient } from '@/services/apiClient'
import { CreateAdminData, AdminUser, JWTPayload } from '@/types/auth'

export class AdminAuthService {
  private static readonly JWT_SECRET = (() => {
    const secret = process.env.ADMIN_JWT_SECRET
    if (!secret || secret.length < 32) {
      throw new Error('ADMIN_JWT_SECRET must be set and at least 32 characters long for security')
    }
    return secret
  })()
  private static readonly JWT_EXPIRES_IN: string = process.env.JWT_EXPIRES_IN || '8h'
  private static readonly BCRYPT_ROUNDS = parseInt(process.env.BCRYPT_ROUNDS || '12')

  static async createAdmin(data: CreateAdminData): Promise<AdminUser> {
    throw new Error('Creating admin users should be done via the main server admin user creation endpoint')
  }

  static async validateAdmin(email: string, password: string): Promise<AdminUser | null> {
    try {
      const response = await mainApiClient.post<{ success: boolean; user: AdminUser }>('/api/admin-backend/auth/login', {
        email,
        password
      })

      if (response.success && response.user) {
        return response.user
      }

      return null
    } catch (error) {
      console.error('Admin validation failed:', error)
      return null
    }
  }

  static generateToken(admin: AdminUser): string {
    const payload: JWTPayload = {
      userId: admin.id,
      email: admin.email,
      role: admin.role,
      type: 'platform_admin',
    }

    return jwt.sign(payload, this.JWT_SECRET, {
      expiresIn: this.JWT_EXPIRES_IN,
    } as SignOptions)
  }

  static generateApiToken(admin: AdminUser): string {
    const payload: JWTPayload = {
      userId: admin.id,
      email: admin.email,
      role: admin.role,
      type: 'platform_admin',
    }

    return jwt.sign(payload, this.JWT_SECRET, {
      expiresIn: '24h',
    } as SignOptions)
  }

  static verifyToken(token: string): JWTPayload | null {
    try {
      const decoded = jwt.verify(token, this.JWT_SECRET) as JWTPayload

      if (decoded.type !== 'platform_admin') {
        return null
      }

      return decoded
    } catch (error) {
      return null
    }
  }

  static async getAdminById(id: string): Promise<AdminUser | null> {
    try {
      const user = await mainApiClient.get<AdminUser>(`/api/admin-backend/auth/user/${id}`)
      return user
    } catch (error) {
      console.error('Failed to get admin by ID:', error)
      return null
    }
  }

  static async changePassword(userId: string, newPassword: string): Promise<boolean> {
    try {
      await mainApiClient.put(`/api/admin-backend/auth/user/${userId}/password`, {
        password: newPassword
      })
      return true
    } catch (error) {
      console.error('Failed to change password:', error)
      return false
    }
  }

  static async deactivateAdmin(userId: string): Promise<boolean> {
    try {
      await mainApiClient.put(`/api/admin-backend/auth/user/${userId}/deactivate`)
      return true
    } catch (error) {
      console.error('Failed to deactivate admin:', error)
      return false
    }
  }
}