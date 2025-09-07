import bcrypt from 'bcryptjs'
import jwt from 'jsonwebtoken'
import { prisma } from '@/utils/database'
import { CreateAdminData, AdminUser, JWTPayload } from '@/types/auth'

export class AdminAuthService {
  private static readonly JWT_SECRET = process.env.ADMIN_JWT_SECRET || 'fallback-secret'
  private static readonly JWT_EXPIRES_IN = process.env.JWT_EXPIRES_IN || '8h'
  private static readonly BCRYPT_ROUNDS = parseInt(process.env.BCRYPT_ROUNDS || '12')

  /**
   * Create a new platform admin user
   */
  static async createAdmin(data: CreateAdminData): Promise<AdminUser> {
    const passwordHash = await bcrypt.hash(data.password, this.BCRYPT_ROUNDS)
    
    const admin = await prisma.platformAdmin.create({
      data: {
        email: data.email,
        passwordHash,
        firstName: data.firstName,
        lastName: data.lastName,
        role: data.role || 'ADMIN',
      },
    })

    const { passwordHash: _, ...adminUser } = admin
    return adminUser as AdminUser
  }

  /**
   * Validate admin credentials and return user if valid
   */
  static async validateAdmin(email: string, password: string): Promise<AdminUser | null> {
    const admin = await prisma.platformAdmin.findUnique({
      where: { email, isActive: true },
    })

    if (!admin || !await bcrypt.compare(password, admin.passwordHash)) {
      return null
    }

    // Update last login timestamp
    await prisma.platformAdmin.update({
      where: { id: admin.id },
      data: { lastLoginAt: new Date() },
    })

    const { passwordHash: _, ...adminUser } = admin
    return adminUser as AdminUser
  }

  /**
   * Generate JWT token for admin user
   */
  static generateToken(admin: AdminUser): string {
    const payload: JWTPayload = {
      adminId: admin.id,
      email: admin.email,
      role: admin.role,
      type: 'platform_admin',
    }

    return jwt.sign(payload, this.JWT_SECRET, {
      expiresIn: this.JWT_EXPIRES_IN,
    })
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
    const admin = await prisma.platformAdmin.findUnique({
      where: { id, isActive: true },
    })

    if (!admin) {
      return null
    }

    const { passwordHash: _, ...adminUser } = admin
    return adminUser as AdminUser
  }

  /**
   * Change admin password
   */
  static async changePassword(adminId: string, newPassword: string): Promise<boolean> {
    try {
      const passwordHash = await bcrypt.hash(newPassword, this.BCRYPT_ROUNDS)
      
      await prisma.platformAdmin.update({
        where: { id: adminId },
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
  static async deactivateAdmin(adminId: string): Promise<boolean> {
    try {
      await prisma.platformAdmin.update({
        where: { id: adminId },
        data: { isActive: false },
      })

      return true
    } catch (error) {
      return false
    }
  }
}