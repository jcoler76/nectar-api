import { Request, Response, NextFunction } from 'express'
import crypto from 'crypto'

declare global {
  namespace Express {
    interface Request {
      service?: {
        name: string
        permissions: string[]
      }
    }
  }
}

/**
 * Service API keys for internal communication
 * Environment variables are required - no fallback keys for security
 */
const getServiceApiKeys = () => {
  const marketingKey = process.env.MARKETING_SERVICE_API_KEY

  if (!marketingKey) {
    throw new Error('MARKETING_SERVICE_API_KEY environment variable is required')
  }

  return {
    'marketing-backend': {
      key: marketingKey,
      permissions: ['crm:read', 'crm:write', 'contacts:create', 'contacts:update', 'notes:create', 'notes:read', 'notes:delete']
    }
  }
}

/**
 * Middleware to authenticate service-to-service requests using API keys
 */
export const authenticateService = (requiredPermissions: string[] = []) => {
  return async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      // Check for service API key in X-Service-Key header
      const serviceKey = req.header('X-Service-Key')

      if (!serviceKey) {
        res.status(401).json({
          error: 'Service API key required',
          code: 'NO_SERVICE_KEY'
        })
        return
      }

      // Get service API keys (will throw if env vars missing)
      const SERVICE_API_KEYS = getServiceApiKeys()

      // Find matching service
      let matchedService: string | null = null
      for (const [serviceName, config] of Object.entries(SERVICE_API_KEYS)) {
        if (config.key === serviceKey) {
          matchedService = serviceName
          break
        }
      }

      if (!matchedService) {
        res.status(401).json({
          error: 'Invalid service API key',
          code: 'INVALID_SERVICE_KEY'
        })
        return
      }

      const serviceConfig = SERVICE_API_KEYS[matchedService as keyof typeof SERVICE_API_KEYS]

      // Check permissions
      if (requiredPermissions.length > 0) {
        const hasAllPermissions = requiredPermissions.every(permission =>
          serviceConfig.permissions.includes(permission)
        )

        if (!hasAllPermissions) {
          res.status(403).json({
            error: 'Insufficient service permissions',
            code: 'INSUFFICIENT_SERVICE_PERMISSIONS',
            required: requiredPermissions,
            available: serviceConfig.permissions
          })
          return
        }
      }

      // Attach service info to request
      req.service = {
        name: matchedService,
        permissions: serviceConfig.permissions
      }

      next()
    } catch (error) {
      console.error('Service authentication error:', error)
      res.status(401).json({
        error: 'Service authentication failed',
        code: 'SERVICE_AUTH_ERROR'
      })
    }
  }
}

/**
 * Combined middleware that allows both admin user authentication and service authentication
 */
export const authenticateAdminOrService = (servicePermissions: string[] = []) => {
  return async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    // Check if it's a service request first
    const serviceKey = req.header('X-Service-Key')

    if (serviceKey) {
      // Use service authentication
      return authenticateService(servicePermissions)(req, res, next)
    } else {
      // Use regular admin authentication
      const { authenticateAdmin } = await import('./adminAuth')
      return authenticateAdmin(req, res, next)
    }
  }
}