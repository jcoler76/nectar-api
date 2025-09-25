// Type definitions from main Prisma schema (server/prisma/schema.prisma)
// Admin-backend uses these types for API responses, NOT for direct DB access

export enum AdminRole {
  SUPER_ADMIN = 'SUPER_ADMIN',
  ADMIN = 'ADMIN',
  VIEWER = 'VIEWER'
}

export enum ContactStatus {
  ACTIVE = 'ACTIVE',
  INACTIVE = 'INACTIVE',
  ARCHIVED = 'ARCHIVED'
}

export enum ConversationStatus {
  OPEN = 'OPEN',
  IN_PROGRESS = 'IN_PROGRESS',
  CLOSED = 'CLOSED',
  ARCHIVED = 'ARCHIVED'
}

// Stub PrismaClient for type compatibility
// NOTE: Admin-backend should NOT use Prisma directly - use API calls instead
export class PrismaClient {
  constructor() {
    throw new Error('Admin-backend should not use PrismaClient directly. Use API calls to main server instead.')
  }
}