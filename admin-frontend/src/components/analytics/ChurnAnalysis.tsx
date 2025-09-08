import {
  ExclamationTriangleIcon,
  UserMinusIcon,
  CurrencyDollarIcon,
  ArrowTrendingDownIcon,
  ChartBarIcon,
  ShieldExclamationIcon
} from '@heroicons/react/24/outline'
import { useState, useEffect } from 'react'
import MetricCard from '../dashboard/MetricCard'
import { LazyDataTable } from '../ui/LazyDataTable'
import { Card, CardContent, CardHeader, CardTitle } from '../ui/card'
import { Button } from '../ui/button'
import { LineChartComponent, BarChartComponent, DonutChartComponent } from '../ui/charts'

interface ChurnMetrics {
  monthlyChurnRate: number
  revenueChurn: number
  churnedUsers: number
  atRiskUsers: number
  averageLifetimeValue: number
  churnCost: number
}

interface ChurnTrendData {
  month: string
  churnRate: number
  churnedUsers: number
  revenueImpact: number
}

interface ChurnByPlan {
  plan: string
  churnRate: number
  users: number
  revenue: number
}

interface AtRiskUser {
  id: string
  name: string
  email: string
  company?: string
  plan: string
  riskScore: number
  lastLogin: string
  mrr: number
  joinDate: string
  actions: string
}

interface ChurnReason {
  reason: string
  count: number
  percentage: number
}

export default function ChurnAnalysis() {
  const [metrics, setMetrics] = useState<ChurnMetrics | null>(null)
  const [churnTrends, setChurnTrends] = useState<ChurnTrendData[]>([])
  const [churnByPlan, setChurnByPlan] = useState<ChurnByPlan[]>([])
  const [atRiskUsers, setAtRiskUsers] = useState<AtRiskUser[]>([])
  const [churnReasons, setChurnReasons] = useState<ChurnReason[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    const timer = setTimeout(() => {
      setMetrics({
        monthlyChurnRate: 4.2,
        revenueChurn: 8350,
        churnedUsers: 23,
        atRiskUsers: 47,
        averageLifetimeValue: 2840,
        churnCost: 134200
      })

      setChurnTrends([
        { month: '2024-01', churnRate: 3.8, churnedUsers: 18, revenueImpact: 6200 },
        { month: '2024-02', churnRate: 4.1, churnedUsers: 21, revenueImpact: 7800 },
        { month: '2024-03', churnRate: 3.5, churnedUsers: 17, revenueImpact: 5900 },
        { month: '2024-04', churnRate: 4.8, churnedUsers: 25, revenueImpact: 9400 },
        { month: '2024-05', churnRate: 4.2, churnedUsers: 23, revenueImpact: 8350 },
        { month: '2024-06', churnRate: 3.9, churnedUsers: 22, revenueImpact: 7650 }
      ])

      setChurnByPlan([
        { plan: 'Basic', churnRate: 6.2, users: 8, revenue: 232 },
        { plan: 'Pro', churnRate: 3.8, users: 9, revenue: 891 },
        { plan: 'Enterprise', churnRate: 2.1, users: 4, revenue: 1196 },
        { plan: 'Enterprise+', churnRate: 1.5, users: 2, revenue: 1800 }
      ])

      setAtRiskUsers([
        {
          id: '1',
          name: 'Sarah Wilson',
          email: 'sarah@techstartup.com',
          company: 'TechStartup Inc',
          plan: 'Pro',
          riskScore: 89,
          lastLogin: '2024-08-15',
          mrr: 99,
          joinDate: '2023-06-10',
          actions: 'Contact'
        },
        {
          id: '2',
          name: 'Michael Chen',
          email: 'michael@designco.com',
          company: 'DesignCo',
          plan: 'Basic',
          riskScore: 85,
          lastLogin: '2024-08-20',
          mrr: 29,
          joinDate: '2024-01-15',
          actions: 'Offer Discount'
        },
        {
          id: '3',
          name: 'Jennifer Davis',
          email: 'jen@megacorp.com',
          company: 'MegaCorp Ltd',
          plan: 'Enterprise',
          riskScore: 78,
          lastLogin: '2024-09-01',
          mrr: 299,
          joinDate: '2023-03-20',
          actions: 'Schedule Call'
        }
      ])

      setChurnReasons([
        { reason: 'Price/Cost concerns', count: 12, percentage: 34.3 },
        { reason: 'Feature limitations', count: 8, percentage: 22.9 },
        { reason: 'Poor user experience', count: 5, percentage: 14.3 },
        { reason: 'Competitor switch', count: 4, percentage: 11.4 },
        { reason: 'No longer needed', count: 3, percentage: 8.6 },
        { reason: 'Technical issues', count: 3, percentage: 8.6 }
      ])

      setLoading(false)
    }, 1000)

    return () => clearTimeout(timer)
  }, [])

  const atRiskColumns = [
    {
      accessorKey: 'name',
      header: 'User',
      sortable: true,
      cell: ({ row }: { row: AtRiskUser }) => (
        <div>
          <div className="font-medium">{row.name}</div>
          <div className="text-sm text-gray-500">{row.email}</div>
          {row.company && (
            <div className="text-xs text-gray-400">{row.company}</div>
          )}
        </div>
      )
    },
    {
      accessorKey: 'plan',
      header: 'Plan',
      sortable: true,
      cell: ({ value }: { value: string }) => (
        <span className="inline-flex px-2 py-1 text-xs font-semibold rounded-full bg-blue-100 text-blue-800">
          {value}
        </span>
      )
    },
    {
      accessorKey: 'riskScore',
      header: 'Risk Score',
      sortable: true,
      cell: ({ value }: { value: number }) => (
        <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${
          value >= 80 ? 'bg-red-100 text-red-800' :
          value >= 60 ? 'bg-yellow-100 text-yellow-800' :
          'bg-green-100 text-green-800'
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
        <span className="font-medium">${value}</span>
      )
    },
    {
      accessorKey: 'lastLogin',
      header: 'Last Login',
      sortable: true,
      cell: ({ value }: { value: string }) => (
        new Date(value).toLocaleDateString()
      )
    },
    {
      accessorKey: 'actions',
      header: 'Actions',
      cell: ({ row }: { row: AtRiskUser }) => (
        <Button
          size="sm"
          variant="outline"
          onClick={(e) => {
            e.stopPropagation()
            console.log('Take action for user:', row.id)
          }}
        >
          {row.actions}
        </Button>
      )
    }
  ]

  if (loading) {
    return (
      <div className="space-y-6">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {[...Array(6)].map((_, i) => (
            <div key={i} className="h-32 bg-gray-200 rounded-lg animate-pulse" />
          ))}
        </div>
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {[...Array(4)].map((_, i) => (
            <div key={i} className="h-80 bg-gray-200 rounded-lg animate-pulse" />
          ))}
        </div>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {/* Key Metrics */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        <Card>
          <CardContent className="p-6">
            <div className="flex items-center">
              <div className="p-3 rounded-lg bg-red-100">
                <TrendingDownIcon className="h-6 w-6 text-red-600" />
              </div>
              <div className="ml-4 flex-1">
                <p className="text-sm font-medium text-gray-600">Monthly Churn Rate</p>
                <p className="text-2xl font-semibold text-gray-900">
                  {metrics?.monthlyChurnRate}%
                </p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-6">
            <div className="flex items-center">
              <div className="p-3 rounded-lg bg-orange-100">
                <UserMinusIcon className="h-6 w-6 text-orange-600" />
              </div>
              <div className="ml-4 flex-1">
                <p className="text-sm font-medium text-gray-600">Churned Users</p>
                <p className="text-2xl font-semibold text-gray-900">
                  {metrics?.churnedUsers}
                </p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-6">
            <div className="flex items-center">
              <div className="p-3 rounded-lg bg-yellow-100">
                <ExclamationTriangleIcon className="h-6 w-6 text-yellow-600" />
              </div>
              <div className="ml-4 flex-1">
                <p className="text-sm font-medium text-gray-600">At-Risk Users</p>
                <p className="text-2xl font-semibold text-gray-900">
                  {metrics?.atRiskUsers}
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Financial Impact Metrics */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <Card>
          <CardContent className="p-6">
            <div className="flex items-center">
              <div className="p-3 rounded-lg bg-red-100">
                <CurrencyDollarIcon className="h-6 w-6 text-red-600" />
              </div>
              <div className="ml-4 flex-1">
                <p className="text-sm font-medium text-gray-600">Revenue Churn</p>
                <p className="text-2xl font-semibold text-gray-900">
                  ${metrics?.revenueChurn.toLocaleString()}
                </p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-6">
            <div className="flex items-center">
              <div className="p-3 rounded-lg bg-purple-100">
                <ChartBarIcon className="h-6 w-6 text-purple-600" />
              </div>
              <div className="ml-4 flex-1">
                <p className="text-sm font-medium text-gray-600">Avg. Lifetime Value</p>
                <p className="text-2xl font-semibold text-gray-900">
                  ${metrics?.averageLifetimeValue.toLocaleString()}
                </p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-6">
            <div className="flex items-center">
              <div className="p-3 rounded-lg bg-red-100">
                <ShieldExclamationIcon className="h-6 w-6 text-red-600" />
              </div>
              <div className="ml-4 flex-1">
                <p className="text-sm font-medium text-gray-600">Total Churn Cost</p>
                <p className="text-2xl font-semibold text-gray-900">
                  ${metrics?.churnCost.toLocaleString()}
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Charts Row */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Churn Rate Trend */}
        <LineChartComponent
          data={churnTrends}
          dataKey="churnRate"
          xAxisKey="month"
          title="Churn Rate Trend"
          description="Monthly churn rate over time"
          color="hsl(0, 70%, 50%)"
        />

        {/* Churn by Plan */}
        <BarChartComponent
          data={churnByPlan}
          dataKey="churnRate"
          xAxisKey="plan"
          title="Churn Rate by Plan"
          description="Churn rate breakdown by subscription plan"
          color="hsl(20, 70%, 50%)"
        />
      </div>

      {/* Second Charts Row */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Revenue Impact */}
        <BarChartComponent
          data={churnTrends}
          dataKey="revenueImpact"
          xAxisKey="month"
          title="Revenue Impact"
          description="Monthly revenue lost due to churn"
          color="hsl(340, 70%, 50%)"
        />

        {/* Churn Reasons */}
        <DonutChartComponent
          data={churnReasons}
          dataKey="count"
          nameKey="reason"
          title="Churn Reasons"
          description="Why customers are leaving"
          colors={['hsl(0, 70%, 50%)', 'hsl(20, 70%, 50%)', 'hsl(40, 70%, 50%)', 'hsl(280, 70%, 50%)', 'hsl(200, 70%, 50%)', 'hsl(160, 70%, 50%)']}
        />
      </div>

      {/* At-Risk Users Table */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle className="flex items-center gap-2">
              <ExclamationTriangleIcon className="h-5 w-5" />
              High-Risk Users Requiring Immediate Attention
            </CardTitle>
            <Button onClick={() => console.log('Export at-risk users')}>
              Export List
            </Button>
          </div>
        </CardHeader>
        <CardContent className="p-0">
          <LazyDataTable
            data={atRiskUsers}
            columns={atRiskColumns}
            searchable={true}
            pageSize={10}
            onRowClick={(user) => console.log('User clicked:', user)}
          />
        </CardContent>
      </Card>
    </div>
  )
}
