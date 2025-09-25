import { PrismaClient } from '@/types/prisma'

const prisma = {
  get adminUser() {
    throw new Error('Admin-backend should not use PrismaClient directly. Use API calls via mainApiClient from @/services/apiClient instead.')
  },
  get contact() {
    throw new Error('Admin-backend should not use PrismaClient directly. Use API calls via mainApiClient from @/services/apiClient instead.')
  },
  get contactConversation() {
    throw new Error('Admin-backend should not use PrismaClient directly. Use API calls via mainApiClient from @/services/apiClient instead.')
  },
  get contactNote() {
    throw new Error('Admin-backend should not use PrismaClient directly. Use API calls via mainApiClient from @/services/apiClient instead.')
  },
  get adminRoleChangeLog() {
    throw new Error('Admin-backend should not use PrismaClient directly. Use API calls via mainApiClient from @/services/apiClient instead.')
  }
}

export { prisma }
