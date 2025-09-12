import { apiService } from './api'
import type {
  Organization,
  OrganizationsResponse,
  CreateOrganizationRequest,
  UpdateOrganizationRequest,
  OrganizationMetrics,
  OrgByPlan,
  OrgSizeDistribution
} from '../types/organization'

export class OrganizationService {
  async getAllOrganizations(): Promise<Organization[]> {
    const response = await apiService.get<OrganizationsResponse>('/organizations')
    return response.organizations
  }

  async getOrganizationById(id: string): Promise<Organization> {
    return await apiService.get<Organization>(`/organizations/${id}`)
  }

  async createOrganization(data: CreateOrganizationRequest): Promise<Organization> {
    return await apiService.post<Organization>('/organizations', data)
  }

  async updateOrganization(id: string, data: UpdateOrganizationRequest): Promise<Organization> {
    return await apiService.put<Organization>(`/organizations/${id}`, data)
  }

  async deleteOrganization(id: string): Promise<{ message: string }> {
    return await apiService.delete(`/organizations/${id}`)
  }

  async getOrganizationUsage(id: string) {
    return await apiService.get(`/organizations/${id}/usage`)
  }

  async removeMember(organizationId: string, memberId: string): Promise<{ message: string }> {
    return await apiService.delete(`/organizations/${organizationId}/members/${memberId}`)
  }

  async updateMemberRole(organizationId: string, memberId: string, role: string): Promise<unknown> {
    return await apiService.patch(`/organizations/${organizationId}/members/${memberId}`, { role })
  }

  // Admin-specific methods for aggregated data
  async getOrganizationMetrics(): Promise<OrganizationMetrics> {
    const organizations = await this.getAllOrganizations()
    
    const totalOrganizations = organizations.length
    const activeOrganizations = organizations.filter(org => 
      org.subscription?.status === 'ACTIVE' || org.subscription?.status === 'TRIALING'
    ).length
    
    const oneMonthAgo = new Date()
    oneMonthAgo.setMonth(oneMonthAgo.getMonth() - 1)
    
    const newOrganizations = organizations.filter(org => 
      new Date(org.createdAt) >= oneMonthAgo
    ).length
    
    const totalMembers = organizations.reduce((sum, org) => 
      sum + (org._count?.memberships || 0), 0
    )
    
    const averageMembersPerOrg = totalOrganizations > 0 
      ? Math.round(totalMembers / totalOrganizations)
      : 0
    
    // For revenue calculation, we'd need subscription pricing data
    // This is a simplified calculation based on plan types
    const totalOrgRevenue = organizations.reduce((sum, org) => {
      const planRevenue = {
        'FREE': 0,
        'STARTER': 29,
        'PROFESSIONAL': 99,
        'BUSINESS': 199,
        'ENTERPRISE': 499
      }
      return sum + (planRevenue[org.subscription?.plan as keyof typeof planRevenue] || 0)
    }, 0)

    return {
      totalOrganizations,
      activeOrganizations,
      newOrganizations,
      averageMembersPerOrg,
      totalMembers,
      totalOrgRevenue
    }
  }

  async getOrganizationsByPlan(): Promise<OrgByPlan[]> {
    const organizations = await this.getAllOrganizations()
    
    const planCounts: { [key: string]: { count: number, revenue: number } } = {}
    
    organizations.forEach(org => {
      const plan = org.subscription?.plan || 'FREE'
      if (!planCounts[plan]) {
        planCounts[plan] = { count: 0, revenue: 0 }
      }
      planCounts[plan].count++
      
      // Simplified revenue calculation
      const planRevenue = {
        'FREE': 0,
        'STARTER': 29,
        'PROFESSIONAL': 99,
        'BUSINESS': 199,
        'ENTERPRISE': 499
      }
      planCounts[plan].revenue += planRevenue[plan as keyof typeof planRevenue] || 0
    })

    return Object.entries(planCounts).map(([plan, data]) => ({
      plan,
      count: data.count,
      revenue: data.revenue
    }))
  }

  async getOrganizationSizeDistribution(): Promise<OrgSizeDistribution[]> {
    const organizations = await this.getAllOrganizations()
    
    const sizeRanges = [
      { size: '1-5 members', min: 1, max: 5 },
      { size: '6-15 members', min: 6, max: 15 },
      { size: '16-30 members', min: 16, max: 30 },
      { size: '31-50 members', min: 31, max: 50 },
      { size: '50+ members', min: 51, max: Infinity }
    ]

    return sizeRanges.map(range => ({
      size: range.size,
      count: organizations.filter(org => {
        const memberCount = org._count?.memberships || 0
        return memberCount >= range.min && memberCount <= range.max
      }).length
    }))
  }
}

export const organizationService = new OrganizationService()
export default organizationService
