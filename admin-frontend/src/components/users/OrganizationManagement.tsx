import {
  BuildingOfficeIcon,
  UsersIcon,
  CurrencyDollarIcon,
  ChartBarIcon,
  EyeIcon,
  PencilIcon,
  PlusIcon,
  UserPlusIcon
} from '@heroicons/react/24/outline'
import { useState, useEffect } from 'react'
import MetricCard from '../dashboard/MetricCard'
import { LazyDataTable } from '../ui/LazyDataTable'
import { Card, CardContent, CardHeader, CardTitle } from '../ui/card'
import { Button } from '../ui/button'
import { DonutChartComponent, BarChartComponent } from '../ui/charts'

interface OrganizationMetrics {
  totalOrganizations: number
  activeOrganizations: number
  newOrganizations: number
  averageMembersPerOrg: number
  totalMembers: number
  totalOrgRevenue: number
}

interface Organization {
  id: string
  name: string
  domain: string
  memberCount: number
  planType: string
  status: 'Active' | 'Inactive' | 'Trial'
  mrr: number
  createdDate: string
  lastActivity: string
  healthScore: number
  contactName: string
  contactEmail: string
}

interface OrgByPlan {
  plan: string
  count: number
  revenue: number
}

interface OrgSizeDistribution {
  size: string
  count: number
}

export default function OrganizationManagement() {
  const [metrics, setMetrics] = useState<OrganizationMetrics | null>(null)
  const [organizations, setOrganizations] = useState<Organization[]>([])
  const [orgByPlan, setOrgByPlan] = useState<OrgByPlan[]>([])
  const [orgSizeData, setOrgSizeData] = useState<OrgSizeDistribution[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    const timer = setTimeout(() => {
      setMetrics({
        totalOrganizations: 147,
        activeOrganizations: 132,
        newOrganizations: 8,
        averageMembersPerOrg: 12,
        totalMembers: 1764,
        totalOrgRevenue: 65400
      })

      setOrganizations([
        {
          id: '1',
          name: 'TechCorp Inc',
          domain: 'techcorp.com',
          memberCount: 45,
          planType: 'Enterprise',
          status: 'Active',
          mrr: 2500,
          createdDate: '2023-08-15',
          lastActivity: '2024-09-07',
          healthScore: 92,
          contactName: 'Alice Johnson',
          contactEmail: 'alice@techcorp.com'
        },
        {
          id: '2',
          name: 'StartupXYZ',
          domain: 'startupxyz.com',
          memberCount: 12,
          planType: 'Pro',
          status: 'Active',
          mrr: 1200,
          createdDate: '2024-02-20',
          lastActivity: '2024-09-06',
          healthScore: 88,
          contactName: 'Bob Smith',
          contactEmail: 'bob@startupxyz.com'
        },
        {
          id: '3',
          name: 'MegaCorp Ltd',
          domain: 'megacorp.com',
          memberCount: 78,
          planType: 'Enterprise+',
          status: 'Active',
          mrr: 4800,
          createdDate: '2023-05-10',
          lastActivity: '2024-09-08',
          healthScore: 95,
          contactName: 'Carol Davis',
          contactEmail: 'carol@megacorp.com'
        },
        {
          id: '4',
          name: 'Creative Agency',
          domain: 'creativeagency.com',
          memberCount: 8,
          planType: 'Pro',
          status: 'Trial',
          mrr: 0,
          createdDate: '2024-08-25',
          lastActivity: '2024-09-01',
          healthScore: 65,
          contactName: 'David Wilson',
          contactEmail: 'david@creativeagency.com'
        },
        {
          id: '5',
          name: 'InnovateLabs',
          domain: 'innovatelabs.io',
          memberCount: 23,
          planType: 'Enterprise',
          status: 'Inactive',
          mrr: 0,
          createdDate: '2023-11-12',
          lastActivity: '2024-07-15',
          healthScore: 34,
          contactName: 'Emma Brown',
          contactEmail: 'emma@innovatelabs.io'
        }
      ])

      setOrgByPlan([
        { plan: 'Basic', count: 42, revenue: 1260 },
        { plan: 'Pro', count: 58, revenue: 17400 },
        { plan: 'Enterprise', count: 35, revenue: 31500 },
        { plan: 'Enterprise+', count: 12, revenue: 15240 }
      ])

      setOrgSizeData([
        { size: '1-5 members', count: 45 },
        { size: '6-15 members', count: 38 },
        { size: '16-30 members', count: 32 },
        { size: '31-50 members', count: 21 },
        { size: '50+ members', count: 11 }
      ])

      setLoading(false)
    }, 1000)

    return () => clearTimeout(timer)
  }, [])

  const organizationColumns = [
    {
      accessorKey: 'name',
      header: 'Organization',
      sortable: true,
      cell: ({ row }: { row: Organization }) => (
        <div>
          <div className="font-medium">{row.name}</div>
          <div className="text-sm text-gray-500">{row.domain}</div>
          <div className="text-xs text-gray-400">
            Contact: {row.contactName}
          </div>
        </div>
      )
    },
    {
      accessorKey: 'memberCount',
      header: 'Members',
      sortable: true,
      cell: ({ value }: { value: number }) => (
        <div className="flex items-center gap-1">
          <UsersIcon className="h-4 w-4 text-gray-400" />
          <span className="font-medium">{value}</span>
        </div>
      )
    },
    {
      accessorKey: 'planType',
      header: 'Plan',
      sortable: true,
      cell: ({ value }: { value: string }) => (
        <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${
          value === 'Enterprise' || value === 'Enterprise+' 
            ? 'bg-purple-100 text-purple-800' 
            : value === 'Pro' 
            ? 'bg-blue-100 text-blue-800'
            : 'bg-gray-100 text-gray-800'
        }`}>
          {value}
        </span>
      )
    },
    {
      accessorKey: 'status',
      header: 'Status',
      sortable: true,
      cell: ({ value }: { value: string }) => (
        <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${
          value === 'Active' 
            ? 'bg-green-100 text-green-800' 
            : value === 'Trial'
            ? 'bg-blue-100 text-blue-800'
            : 'bg-red-100 text-red-800'
        }`}>
          {value}
        </span>
      )
    },
    {
      accessorKey: 'healthScore',
      header: 'Health Score',
      sortable: true,
      cell: ({ value }: { value: number }) => (
        <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${
          value >= 80 ? 'bg-green-100 text-green-800' :
          value >= 60 ? 'bg-yellow-100 text-yellow-800' :
          'bg-red-100 text-red-800'
        }`}>
          {value}%
        </span>
      )
    },
    {
      accessorKey: 'mrr',
      header: 'MRR',
      sortable: true,
      cell: ({ value }: { value: number }) => (
        <span className="font-medium">${value.toLocaleString()}</span>
      )
    },
    {
      accessorKey: 'lastActivity',
      header: 'Last Activity',
      sortable: true,
      cell: ({ value }: { value: string }) => (
        new Date(value).toLocaleDateString()
      )
    },
    {
      accessorKey: 'actions',
      header: 'Actions',
      cell: ({ row }: { row: Organization }) => (
        <div className="flex items-center gap-2">
          <Button
            size="sm"
            variant="outline"
            onClick={(e) => {
              e.stopPropagation()
              console.log('View organization:', row.id)
            }}
          >
            <EyeIcon className="h-4 w-4" />
          </Button>
          <Button
            size="sm"
            variant="outline"
            onClick={(e) => {
              e.stopPropagation()
              console.log('Edit organization:', row.id)
            }}
          >
            <PencilIcon className="h-4 w-4" />
          </Button>
          <Button
            size="sm"
            variant="outline"
            onClick={(e) => {
              e.stopPropagation()
              console.log('Add member to:', row.id)
            }}
          >
            <UserPlusIcon className="h-4 w-4" />
          </Button>
        </div>
      )
    }
  ]

  if (loading) {
    return (
      <div className="space-y-6">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          {[...Array(4)].map((_, i) => (
            <div key={i} className="h-32 bg-gray-200 rounded-lg animate-pulse" />
          ))}
        </div>
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {[...Array(2)].map((_, i) => (
            <div key={i} className="h-64 bg-gray-200 rounded-lg animate-pulse" />
          ))}
        </div>
        <div className="h-96 bg-gray-200 rounded-lg animate-pulse" />
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {/* Organization Metrics */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <MetricCard
          title="Total Organizations"
          value={metrics?.totalOrganizations.toLocaleString()}
          icon="applications"
          onClick={() => console.log('Total organizations clicked')}
        />
        <MetricCard
          title="Active Organizations"
          value={metrics?.activeOrganizations.toLocaleString()}
          icon="services"
          onClick={() => console.log('Active organizations clicked')}
        />
        <MetricCard
          title="New This Month"
          value={metrics?.newOrganizations.toLocaleString()}
          icon="api"
          onClick={() => console.log('New organizations clicked')}
        />
        <MetricCard
          title="Avg Members/Org"
          value={metrics?.averageMembersPerOrg.toLocaleString()}
          icon="roles"
          onClick={() => console.log('Average members clicked')}
        />
      </div>

      {/* Additional Metrics */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <Card>
          <CardContent className="p-6">
            <div className="flex items-center">
              <div className="p-3 rounded-lg bg-blue-100">
                <UsersIcon className="h-6 w-6 text-blue-600" />
              </div>
              <div className="ml-4 flex-1">
                <p className="text-sm font-medium text-gray-600">Total Organization Members</p>
                <p className="text-2xl font-semibold text-gray-900">
                  {metrics?.totalMembers.toLocaleString()}
                </p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-6">
            <div className="flex items-center">
              <div className="p-3 rounded-lg bg-green-100">
                <CurrencyDollarIcon className="h-6 w-6 text-green-600" />
              </div>
              <div className="ml-4 flex-1">
                <p className="text-sm font-medium text-gray-600">Total Org Revenue</p>
                <p className="text-2xl font-semibold text-gray-900">
                  ${metrics?.totalOrgRevenue.toLocaleString()}
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Charts */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <BarChartComponent
          data={orgByPlan}
          dataKey="count"
          xAxisKey="plan"
          title="Organizations by Plan"
          description="Distribution of organizations across different plans"
          color="hsl(220, 70%, 50%)"
        />

        <DonutChartComponent
          data={orgSizeData}
          dataKey="count"
          nameKey="size"
          title="Organization Size Distribution"
          description="Organizations grouped by member count"
          colors={['hsl(220, 70%, 50%)', 'hsl(280, 70%, 50%)', 'hsl(160, 70%, 50%)', 'hsl(30, 70%, 50%)', 'hsl(340, 70%, 50%)']}
        />
      </div>

      {/* Organizations Table */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle className="flex items-center gap-2">
              <BuildingOfficeIcon className="h-5 w-5" />
              Organization Management ({organizations.length} organizations)
            </CardTitle>
            <Button 
              onClick={() => console.log('Add new organization')}
              className="flex items-center gap-2"
            >
              <PlusIcon className="h-4 w-4" />
              Add Organization
            </Button>
          </div>
        </CardHeader>
        <CardContent className="p-0">
          <LazyDataTable
            data={organizations}
            columns={organizationColumns}
            searchable={true}
            pageSize={10}
            onRowClick={(org) => console.log('Organization clicked:', org)}
          />
        </CardContent>
      </Card>
    </div>
  )
}