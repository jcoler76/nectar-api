import bcrypt from 'bcryptjs'
import jwt, { SignOptions } from 'jsonwebtoken'
import { prisma } from '@/utils/database'
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

  /**
   * Create a new platform admin user
   */
  static async createAdmin(data: CreateAdminData): Promise<AdminUser> {
    const passwordHash = await bcrypt.hash(data.password, this.BCRYPT_ROUNDS)
    
    const admin = await prisma.user.create({
      data: {
        email: data.email,
        passwordHash,
        firstName: data.firstName,
        lastName: data.lastName,
        isSuperAdmin: true,
        isActive: true,
        emailVerified: true
      },
    })

    const { passwordHash: _, ...userFields } = admin
    const adminUser = {
      ...userFields,
      role: 'ADMIN' as const
    }
    return adminUser as AdminUser
  }

  /**
   * Validate admin credentials and return user if valid
   */
  static async validateAdmin(email: string, password: string): Promise<AdminUser | null> {
    // Use regular users table and check if user is admin
    const user = await prisma.user.findFirst({
      where: { email, isActive: true, isSuperAdmin: true },
    })
    if (!user) {
      return null
    }

    // Verify password - critical security check
    if (!user.passwordHash || !await bcrypt.compare(password, user.passwordHash)) {
      return null
    }
    
    // Update last login timestamp
    await prisma.user.update({
      where: { id: user.id },
      data: { lastLoginAt: new Date() },
    })

    // Transform user to AdminUser format
    const adminUser = {
      id: user.id,
      email: user.email,
      firstName: user.firstName,
      lastName: user.lastName,
      role: 'ADMIN', // Since we checked isSuperAdmin: true
      isActive: user.isActive,
      lastLoginAt: user.lastLoginAt,
      createdAt: user.createdAt,
      updatedAt: user.updatedAt
    }

    return adminUser as AdminUser
  }

  /**
   * Generate JWT token for admin user (session token)
   */
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

  /**
   * Generate API JWT token for GraphQL requests (compatible with main server)
   */
  static generateApiToken(admin: AdminUser): string {
    const payload: JWTPayload = {
      userId: admin.id,
      email: admin.email,
      role: admin.role,
      type: 'platform_admin',
    }

    return jwt.sign(payload, this.JWT_SECRET, {
      expiresIn: '24h', // Longer expiry for API usage
    } as SignOptions)
  }

  /**
   * Verify and decode JWT token
   */
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

  /**
   * Get admin user by ID
   */
  static async getAdminById(id: string): Promise<AdminUser | null> {
    // Use regular users table and check if user is admin
    const user = await prisma.user.findFirst({
      where: { id, isActive: true, isSuperAdmin: true },
    })

    if (!user) {
      return null
    }

    // Transform user to AdminUser format
    const adminUser = {
      id: user.id,
      email: user.email,
      firstName: user.firstName,
      lastName: user.lastName,
      role: 'ADMIN', // Since we checked isSuperAdmin: true
      isActive: user.isActive,
      lastLoginAt: user.lastLoginAt,
      createdAt: user.createdAt,
      updatedAt: user.updatedAt
    }

    return adminUser as AdminUser
  }

  /**
   * Change admin password
   */
  static async changePassword(userId: string, newPassword: string): Promise<boolean> {
    try {
      const passwordHash = await bcrypt.hash(newPassword, this.BCRYPT_ROUNDS)
      
      await prisma.user.update({
        where: { id: userId },
        data: { passwordHash },
      })

      return true
    } catch (error) {
      return false
    }
  }

  /**
   * Deactivate admin user
   */
  static async deactivateAdmin(userId: string): Promise<boolean> {
    try {
      await prisma.user.update({
        where: { id: userId },
        data: { isActive: false },
      })

      return true
    } catch (error) {
      return false
    }
  }
}
