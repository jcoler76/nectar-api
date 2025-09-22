import { useState, useEffect, useCallback } from 'react'
import { useGraphQL } from './useGraphQL'
import type {
  Organization,
  OrganizationMetrics,
  OrgByPlan,
  OrgSizeDistribution,
  CreateOrganizationRequest,
  UpdateOrganizationRequest
} from '../types/organization'

export interface UseOrganizationsReturn {
  organizations: Organization[]
  metrics: OrganizationMetrics | null
  orgByPlan: OrgByPlan[]
  orgSizeData: OrgSizeDistribution[]
  loading: boolean
  error: string | null
  
  // Actions
  fetchOrganizations: () => Promise<void>
  fetchMetrics: () => Promise<void>
  fetchChartData: () => Promise<void>
  createOrganization: (data: CreateOrganizationRequest) => Promise<Organization>
  updateOrganization: (id: string, data: UpdateOrganizationRequest) => Promise<Organization>
  deleteOrganization: (id: string) => Promise<void>
  addMember: (organizationId: string, userId: string, role?: string) => Promise<void>
  removeMember: (organizationId: string, userId: string) => Promise<void>
  updateMemberRole: (organizationId: string, userId: string, role: string) => Promise<void>
  refreshData: () => Promise<void>
}

export function useOrganizations(): UseOrganizationsReturn {
  const [organizations, setOrganizations] = useState<Organization[]>([])
  const [metrics, setMetrics] = useState<OrganizationMetrics | null>(null)
  const [orgByPlan, setOrgByPlan] = useState<OrgByPlan[]>([])
  const [orgSizeData, setOrgSizeData] = useState<OrgSizeDistribution[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const { graphqlRequest } = useGraphQL()

  const handleError = useCallback((err: unknown) => {
    console.error('Organization API Error:', err)
    const message = err instanceof Error ? err.message : typeof err === 'string' ? err : 'An unexpected error occurred'
    setError(message)
  }, [])

  const fetchOrganizations = useCallback(async () => {
    try {
      setError(null)
      const data = await graphqlRequest<{
        organizations: {
          pageInfo: { totalCount: number }
          edges: { node: {
            id: string; name: string; slug: string; domain?: string; website?: string; createdAt: string; updatedAt: string;
            membershipCount?: number;
            subscription?: { plan: string; status: string; monthlyRevenue?: number; trialEnd?: string; currentPeriodEnd?: string }
          } }[]
        }
      }>(
        `query Orgs($limit: Int!, $offset: Int!) {
          organizations(pagination: { limit: $limit, offset: $offset, sortBy: "createdAt", sortOrder: DESC }) {
            pageInfo { totalCount }
            edges {
              node {
                id name slug domain website createdAt updatedAt
                membershipCount
                subscription { plan status monthlyRevenue trialEnd currentPeriodEnd }
              }
            }
          }
        }`,
        { limit: 500, offset: 0 }
      )

      const orgs = data.organizations.edges.map(e => ({
        ...e.node,
        _count: { memberships: e.node.membershipCount ?? 0 },
      }))
      setOrganizations(orgs)
    } catch (err) {
      handleError(err)
    }
  }, [handleError])

  const fetchMetrics = useCallback(async () => {
    try {
      setError(null)
      // Get current organizations from state
      const orgs = organizations
      const totalOrganizations = orgs.length
      const activeOrganizations = orgs.filter(org =>
        org.subscription?.status === 'ACTIVE' || org.subscription?.status === 'TRIALING'
      ).length
      const oneMonthAgo = new Date();
      oneMonthAgo.setMonth(oneMonthAgo.getMonth() - 1)
      const newOrganizations = orgs.filter(org => new Date(org.createdAt) >= oneMonthAgo).length
      const totalMembers = orgs.reduce((sum, org) => sum + (org._count?.memberships || 0), 0)
      const averageMembersPerOrg = totalOrganizations > 0 ? Math.round(totalMembers / totalOrganizations) : 0
      const planRevenue: Record<string, number> = { FREE: 0, STARTER: 29, PROFESSIONAL: 99, BUSINESS: 199, ENTERPRISE: 499 }
      const totalOrgRevenue = orgs.reduce((sum, org) => sum + (planRevenue[org.subscription?.plan || 'FREE'] || 0), 0)
      setMetrics({ totalOrganizations, activeOrganizations, newOrganizations, averageMembersPerOrg, totalMembers, totalOrgRevenue })
    } catch (err) {
      handleError(err)
    }
  }, [handleError, organizations])

  const fetchChartData = useCallback(async () => {
    try {
      setError(null)
      const orgs = organizations
      // By plan
      const planCounts: Record<string, { count: number; revenue: number }> = {}
      const planRevenue: Record<string, number> = { FREE: 0, STARTER: 29, PROFESSIONAL: 99, BUSINESS: 199, ENTERPRISE: 499 }
      orgs.forEach(org => {
        const plan = org.subscription?.plan || 'FREE'
        if (!planCounts[plan]) planCounts[plan] = { count: 0, revenue: 0 }
        planCounts[plan].count++
        planCounts[plan].revenue += planRevenue[plan] || 0
      })
      setOrgByPlan(Object.entries(planCounts).map(([plan, d]) => ({ plan, count: d.count, revenue: d.revenue })))

      // Size distribution
      const sizeRanges = [
        { size: '1-5 members', min: 1, max: 5 },
        { size: '6-15 members', min: 6, max: 15 },
        { size: '16-30 members', min: 16, max: 30 },
        { size: '31-50 members', min: 31, max: 50 },
        { size: '50+ members', min: 51, max: Infinity },
      ]
      const sizeData = sizeRanges.map(range => ({
        size: range.size,
        count: orgs.filter(org => {
          const c = org._count?.memberships || 0
          return c >= range.min && c <= range.max
        }).length,
      }))
      setOrgSizeData(sizeData)
    } catch (err) {
      handleError(err)
    }
  }, [handleError, organizations])

  const refreshData = useCallback(async () => {
    setLoading(true)
    try {
      // First fetch organizations, then compute metrics and charts from the data
      await fetchOrganizations()
    } finally {
      setLoading(false)
    }
  }, [fetchOrganizations])

  const createOrganization = useCallback(async (data: CreateOrganizationRequest): Promise<Organization> => {
    const res = await graphqlRequest<{ createOrganization: Organization }>(
      `mutation CreateOrg($input: CreateOrganizationInput!) { createOrganization(input: $input) { id name slug domain website createdAt updatedAt subscription { plan status } } }`,
      { input: data }
    )
    await refreshData()
    return res.createOrganization
  }, [refreshData])

  const updateOrganization = useCallback(async (id: string, data: UpdateOrganizationRequest): Promise<Organization> => {
    const res = await graphqlRequest<{ updateOrganization: Organization }>(
      `mutation UpdateOrg($id: ID!, $input: UpdateOrganizationInput!) { updateOrganization(id: $id, input: $input) { id name slug domain website updatedAt subscription { plan status } } }`,
      { id, input: data }
    )
    // Update local
    setOrganizations(prev => prev.map(org => (org.id === id ? res.updateOrganization : org)))
    return res.updateOrganization
  }, [])

  const deleteOrganization = useCallback(async (id: string): Promise<void> => {
    await graphqlRequest<{ deleteOrganization: boolean }>(
      `mutation DeleteOrg($id: ID!) { deleteOrganization(id: $id) }`,
      { id }
    )
    setOrganizations(prev => prev.filter(org => org.id !== id))
    await fetchMetrics()
    await fetchChartData()
  }, [fetchMetrics, fetchChartData])

  // Compute metrics and chart data when organizations change
  useEffect(() => {
    if (organizations.length > 0) {
      fetchMetrics()
      fetchChartData()
    }
  }, [organizations.length, fetchMetrics, fetchChartData])

  // Initial data load
  useEffect(() => {
    refreshData()
  }, [refreshData])

  return {
    organizations,
    metrics,
    orgByPlan,
    orgSizeData,
    loading,
    error,
    
    // Actions
    fetchOrganizations,
    fetchMetrics,
    fetchChartData,
    createOrganization,
    updateOrganization,
    deleteOrganization,
    addMember: async (organizationId: string, userId: string, role: string = 'MEMBER') => {
      await graphqlRequest<{ addOrganizationMember: { id: string } }>(
        `mutation AddMember($organizationId: ID!, $userId: ID!, $role: String) {
          addOrganizationMember(organizationId: $organizationId, userId: $userId, role: $role) { id }
        }`,
        { organizationId, userId, role }
      )
      await fetchOrganizations()
      await fetchMetrics()
    },
    removeMember: async (organizationId: string, userId: string) => {
      await graphqlRequest<{ removeOrganizationMember: boolean }>(
        `mutation RemoveMember($organizationId: ID!, $userId: ID!) {
          removeOrganizationMember(organizationId: $organizationId, userId: $userId)
        }`,
        { organizationId, userId }
      )
      await fetchOrganizations()
      await fetchMetrics()
    },
    updateMemberRole: async (organizationId: string, userId: string, role: string) => {
      await graphqlRequest<{ updateOrganizationMemberRole: boolean }>(
        `mutation UpdateMemberRole($organizationId: ID!, $userId: ID!, $role: String!) {
          updateOrganizationMemberRole(organizationId: $organizationId, userId: $userId, role: $role)
        }`,
        { organizationId, userId, role }
      )
    },
    refreshData
  }
}
