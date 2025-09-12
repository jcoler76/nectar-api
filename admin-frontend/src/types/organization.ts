export interface Organization {
  id: string
  name: string
  slug: string
  domain?: string
  logo?: string
  website?: string
  createdAt: string
  updatedAt: string
  
  // Relations
  subscription?: {
    plan: string
    status: string
    trialEndsAt?: string
    maxDatabaseConnections: number
    maxApiCallsPerMonth: number
    maxUsersPerOrg: number
    maxWorkflows: number
  }
  
  memberships?: {
    id: string
    role: string
    joinedAt: string
    user: {
      id: string
      email: string
      firstName: string
      lastName: string
      avatarUrl?: string
    }
  }[]
  
  _count?: {
    databaseConnections: number
    workflows: number
    apiKeys: number
    memberships: number
    usageMetrics: number
  }
  
  // Admin interface specific fields
  userRole?: string
  joinedAt?: string
}

export interface OrganizationMetrics {
  totalOrganizations: number
  activeOrganizations: number
  newOrganizations: number
  averageMembersPerOrg: number
  totalMembers: number
  totalOrgRevenue: number
}

export interface OrgByPlan {
  plan: string
  count: number
  revenue: number
}

export interface OrgSizeDistribution {
  size: string
  count: number
}

export interface OrganizationsResponse {
  organizations: Organization[]
}

export interface CreateOrganizationRequest {
  name: string
  domain?: string
  website?: string
}

export interface UpdateOrganizationRequest {
  name?: string
  domain?: string
  website?: string
  logo?: string
}