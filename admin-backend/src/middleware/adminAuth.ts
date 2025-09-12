import { Request, Response, NextFunction } from 'express'
import { AdminAuthService } from '@/services/adminAuth'
import { AdminAuditLogger } from '@/services/auditService'
import { AuthRequest } from '@/types/auth'

declare global {
  namespace Express {
    interface Request {
      admin?: any
    }
  }
}

/**
 * Middleware to authenticate admin users
 */
export const authenticateAdmin = async (
  req: AuthRequest,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const authHeader = req.header('Authorization')
    const token = authHeader?.replace('Bearer ', '')
    
    if (!token) {
      res.status(401).json({ 
        error: 'Access token required',
        code: 'NO_TOKEN'
      })
      return
    }

    const decoded = AdminAuthService.verifyToken(token)
    
    if (!decoded) {
      res.status(401).json({ 
        error: 'Invalid or expired token',
        code: 'INVALID_TOKEN'
      })
      return
    }

    const admin = await AdminAuthService.getAdminById(decoded.userId)
    
    if (!admin) {
      res.status(401).json({ 
        error: 'Admin user not found or inactive',
        code: 'ADMIN_NOT_FOUND'
      })
      return
    }

    req.admin = admin
    next()
  } catch (error) {
    // Log error internally without exposing details
    res.status(401).json({ 
      error: 'Authentication failed',
      code: 'AUTH_ERROR'
    })
  }
}

/**
 * Middleware to require super admin role
 */
export const requireSuperAdmin = (
  req: AuthRequest,
  res: Response,
  next: NextFunction
): void => {
  if (req.admin?.role !== 'SUPER_ADMIN') {
    res.status(403).json({ 
      error: 'Super admin access required',
      code: 'INSUFFICIENT_PERMISSIONS'
    })
    return
  }
  next()
}

/**
 * Middleware to require admin or super admin role
 */
export const requireAdmin = (
  req: AuthRequest,
  res: Response,
  next: NextFunction
): void => {
  const allowedRoles = ['ADMIN', 'SUPER_ADMIN']
  if (!req.admin?.role || !allowedRoles.includes(req.admin.role)) {
    res.status(403).json({ 
      error: 'Admin access required',
      code: 'INSUFFICIENT_PERMISSIONS'
    })
    return
  }
  next()
}

/**
 * Middleware to require specific roles
 */
export const requireRole = (...roles: string[]) => {
  return (req: AuthRequest, res: Response, next: NextFunction): void => {
    if (!req.admin?.role || !roles.includes(req.admin.role)) {
      res.status(403).json({ 
        error: `Required roles: ${roles.join(', ')}`,
        code: 'INSUFFICIENT_PERMISSIONS'
      })
      return
    }
    next()
  }
}

/**
 * Middleware to log admin actions
 */
export const auditAction = (action: string, resourceType?: string) => {
  return async (req: AuthRequest, res: Response, next: NextFunction): Promise<void> => {
    // Log the action
    await AdminAuditLogger.log({
      userId: req.admin?.id,
      action,
      resource: req.params.id || req.body?.id,
      resourceType,
      details: {
        method: req.method,
        path: req.path,
        body: req.method !== 'GET' ? req.body : undefined,
        query: Object.keys(req.query).length > 0 ? req.query : undefined,
      },
      ipAddress: req.ip || req.socket.remoteAddress || 'unknown',
      userAgent: req.get('User-Agent'),
    })

    next()
  }
}

// Export alias for backwards compatibility
export const adminAuth = authenticateAdmin