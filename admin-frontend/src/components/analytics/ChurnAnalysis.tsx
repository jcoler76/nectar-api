import {
  ExclamationTriangleIcon,
  UserMinusIcon,
  CurrencyDollarIcon,
  ArrowTrendingDownIcon,
  ChartBarIcon,
  ShieldExclamationIcon
} from '@heroicons/react/24/outline'
import { useState, useEffect } from 'react'
import { LazyDataTable } from '../ui/LazyDataTable'
import { Card, CardContent, CardHeader, CardTitle } from '../ui/card'
import { Button } from '../ui/button'
import { LineChartComponent, BarChartComponent, DonutChartComponent } from '../ui/charts'
import { graphqlRequest } from '../../services/graphql'

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
    let mounted = true
    const load = async () => {
      try {
        const subs = await graphqlRequest<{ subscriptionMetrics: { totalSubscriptions: number; cancelledSubscriptions: number } }>(`query { subscriptionMetrics { totalSubscriptions cancelledSubscriptions } }`)
        if (!mounted) return
        const total = subs.subscriptionMetrics.totalSubscriptions || 1
        const cancelled = subs.subscriptionMetrics.cancelledSubscriptions || 0
        const monthlyChurnRate = Math.round((cancelled / total) * 1000) / 10
        setMetrics({ monthlyChurnRate, revenueChurn: 0, churnedUsers: cancelled, atRiskUsers: 0, averageLifetimeValue: 0, churnCost: 0 })
        setChurnTrends([])
        setChurnByPlan([])
        setAtRiskUsers([])
        setChurnReasons([])
      } catch (e) {
        console.error('Failed to load churn analytics', e)
      } finally {
        if (mounted) setLoading(false)
      }
    }
    void load()
    return () => clearTimeout((mounted = false as unknown as number))
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
                <ArrowTrendingDownIcon className="h-6 w-6 text-red-600" />
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
      </div>

      {/* Financial Impact Metrics */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
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
        <LineChartComponent
          data={churnTrends}
          dataKey="churnRate"
          xAxisKey="month"
          title="Churn Rate Trend"
          description="Monthly churn rate over time"
          color="hsl(0, 70%, 50%)"
        />

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
        <BarChartComponent
          data={churnTrends}
          dataKey="revenueImpact"
          xAxisKey="month"
          title="Revenue Impact"
          description="Monthly revenue lost due to churn"
          color="hsl(340, 70%, 50%)"
        />

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

