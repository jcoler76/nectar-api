import {
  CreditCardIcon,
  CalendarDaysIcon,
  XMarkIcon,
  CheckCircleIcon,
  ExclamationTriangleIcon,
  EyeIcon,
  PencilIcon
} from '@heroicons/react/24/outline'
import { useState, useEffect } from 'react'
import { LazyDataTable } from '../ui/LazyDataTable'
import { Card, CardContent, CardHeader, CardTitle } from '../ui/card'
import { Button } from '../ui/button'
import { DonutChartComponent, BarChartComponent } from '../ui/charts'
import { graphqlRequest } from '../../services/graphql'

interface SubscriptionMetrics {
  totalSubscriptions: number
  activeSubscriptions: number
  trialSubscriptions: number
  cancelledSubscriptions: number
  upcomingRenewals: number
  averageSubscriptionValue: number
}

interface Subscription {
  id: string
  customerName: string
  customerEmail: string
  planType: string
  status: 'Active' | 'Trial' | 'Cancelled' | 'Past Due' | 'Paused'
  mrr: number
  startDate: string
  nextBilling: string
  paymentMethod: string
  lastPayment: string
  billingCycle: 'Monthly' | 'Yearly'
}

interface SubscriptionByPlan {
  plan: string
  count: number
  revenue: number
}

interface SubscriptionStatus {
  status: string
  count: number
  percentage: number
}

export default function SubscriptionManagement() {
  const [metrics, setMetrics] = useState<SubscriptionMetrics | null>(null)
  const [subscriptions, setSubscriptions] = useState<Subscription[]>([])
  const [subsByPlan, setSubsByPlan] = useState<SubscriptionByPlan[]>([])
  const [subsStatus, setSubsStatus] = useState<SubscriptionStatus[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    let mounted = true
    const load = async () => {
      try {
        const [metricsRes, subsRes] = await Promise.all([
          graphqlRequest<{ subscriptionMetrics: {
            totalSubscriptions: number
            activeSubscriptions: number
            trialSubscriptions: number
            cancelledSubscriptions: number
            upcomingRenewals: number
            averageSubscriptionValue: number
            totalMonthlyRevenue: number
          }}>(`query { subscriptionMetrics { totalSubscriptions activeSubscriptions trialSubscriptions cancelledSubscriptions upcomingRenewals averageSubscriptionValue totalMonthlyRevenue } }`),
          graphqlRequest<{ subscriptions: { edges: { node: { id: string; plan: string; status: string; monthlyRevenue?: number; createdAt: string; currentPeriodEnd: string; organization?: { name?: string; billingEmail?: string } } }[] } }>(
            `query Subs($limit: Int!, $offset: Int!) { subscriptions(pagination: { limit: $limit, offset: $offset, sortBy: "createdAt", sortOrder: DESC }) { edges { node { id plan status monthlyRevenue createdAt currentPeriodEnd organization { name billingEmail } } } } }`,
            { limit: 200, offset: 0 }
          ),
        ])

        if (!mounted) return

        setMetrics({
          totalSubscriptions: metricsRes.subscriptionMetrics.totalSubscriptions,
          activeSubscriptions: metricsRes.subscriptionMetrics.activeSubscriptions,
          trialSubscriptions: metricsRes.subscriptionMetrics.trialSubscriptions,
          cancelledSubscriptions: metricsRes.subscriptionMetrics.cancelledSubscriptions,
          upcomingRenewals: metricsRes.subscriptionMetrics.upcomingRenewals,
          averageSubscriptionValue: metricsRes.subscriptionMetrics.averageSubscriptionValue,
        })

        const mapped = subsRes.subscriptions.edges.map(({ node }) => ({
          id: node.id,
          customerName: node.organization?.name || 'Unknown',
          customerEmail: node.organization?.billingEmail || '',
          planType: node.plan,
          status: node.status,
          mrr: Number(node.monthlyRevenue || 0),
          startDate: node.createdAt,
          nextBilling: node.currentPeriodEnd,
          paymentMethod: '',
          lastPayment: '',
          billingCycle: 'Monthly' as const,
        }))
        setSubscriptions(mapped)

        // Simple by-plan/status breakdown from subscriptions list
        const byPlan: Record<string, { count: number; revenue: number }> = {}
        const byStatus: Record<string, number> = {}
        mapped.forEach(s => {
          byPlan[s.planType] = byPlan[s.planType] || { count: 0, revenue: 0 }
          byPlan[s.planType].count++
          byPlan[s.planType].revenue += s.mrr
          byStatus[s.status] = (byStatus[s.status] || 0) + 1
        })
        setSubsByPlan(Object.entries(byPlan).map(([plan, v]) => ({ plan, count: v.count, revenue: v.revenue })))
        const total = mapped.length || 1
        setSubsStatus(Object.entries(byStatus).map(([status, count]) => ({ status, count, percentage: Math.round((count / total) * 1000) / 10 })))
      } catch (e) {
        console.error('Failed to load subscriptions', e)
      } finally {
        if (mounted) setLoading(false)
      }
    }
    void load()
    return () => { mounted = false }
  }, [])

  const subscriptionColumns = [
    {
      accessorKey: 'customerName',
      header: 'Customer',
      sortable: true,
      cell: ({ row }: { row: Subscription }) => (
        <div>
          <div className="font-medium">{row.customerName}</div>
          <div className="text-sm text-gray-500">{row.customerEmail}</div>
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
            : value === 'Past Due'
            ? 'bg-red-100 text-red-800'
            : value === 'Paused'
            ? 'bg-yellow-100 text-yellow-800'
            : 'bg-gray-100 text-gray-800'
        }`}>
          {value}
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
      accessorKey: 'billingCycle',
      header: 'Billing',
      sortable: true,
      cell: ({ value }: { value: string }) => (
        <span className="text-sm">{value}</span>
      )
    },
    {
      accessorKey: 'nextBilling',
      header: 'Next Billing',
      sortable: true,
      cell: ({ value }: { value: string }) => (
        new Date(value).toLocaleDateString()
      )
    },
    {
      accessorKey: 'actions',
      header: 'Actions',
      cell: ({ row }: { row: Subscription }) => (
        <div className="flex items-center gap-1">
          <Button
            size="sm"
            variant="outline"
            onClick={(e) => {
              e.stopPropagation()
              console.log('View subscription:', row.id)
            }}
          >
            <EyeIcon className="h-4 w-4" />
          </Button>
          <Button
            size="sm"
            variant="outline"
            onClick={(e) => {
              e.stopPropagation()
              console.log('Edit subscription:', row.id)
            }}
          >
            <PencilIcon className="h-4 w-4" />
          </Button>
        </div>
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
      {/* Subscription Metrics */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        <Card>
          <CardContent className="p-6">
            <div className="flex items-center">
              <div className="p-3 rounded-lg bg-blue-100">
                <CreditCardIcon className="h-6 w-6 text-blue-600" />
              </div>
              <div className="ml-4 flex-1">
                <p className="text-sm font-medium text-gray-600">Total Subscriptions</p>
                <p className="text-2xl font-semibold text-gray-900">
                  {metrics?.totalSubscriptions.toLocaleString()}
                </p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-6">
            <div className="flex items-center">
              <div className="p-3 rounded-lg bg-green-100">
                <CheckCircleIcon className="h-6 w-6 text-green-600" />
              </div>
              <div className="ml-4 flex-1">
                <p className="text-sm font-medium text-gray-600">Active Subscriptions</p>
                <p className="text-2xl font-semibold text-gray-900">
                  {metrics?.activeSubscriptions.toLocaleString()}
                </p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-6">
            <div className="flex items-center">
              <div className="p-3 rounded-lg bg-purple-100">
                <CalendarDaysIcon className="h-6 w-6 text-purple-600" />
              </div>
              <div className="ml-4 flex-1">
                <p className="text-sm font-medium text-gray-600">Trial Subscriptions</p>
                <p className="text-2xl font-semibold text-gray-900">
                  {metrics?.trialSubscriptions.toLocaleString()}
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Additional Metrics */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <Card>
          <CardContent className="p-6">
            <div className="flex items-center">
              <div className="p-3 rounded-lg bg-red-100">
                <XMarkIcon className="h-6 w-6 text-red-600" />
              </div>
              <div className="ml-4 flex-1">
                <p className="text-sm font-medium text-gray-600">Cancelled This Month</p>
                <p className="text-2xl font-semibold text-gray-900">
                  {metrics?.cancelledSubscriptions}
                </p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-6">
            <div className="flex items-center">
              <div className="p-3 rounded-lg bg-orange-100">
                <ExclamationTriangleIcon className="h-6 w-6 text-orange-600" />
              </div>
              <div className="ml-4 flex-1">
                <p className="text-sm font-medium text-gray-600">Upcoming Renewals</p>
                <p className="text-2xl font-semibold text-gray-900">
                  {metrics?.upcomingRenewals}
                </p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-6">
            <div className="flex items-center">
              <div className="p-3 rounded-lg bg-teal-100">
                <CreditCardIcon className="h-6 w-6 text-teal-600" />
              </div>
              <div className="ml-4 flex-1">
                <p className="text-sm font-medium text-gray-600">Avg. Subscription Value</p>
                <p className="text-2xl font-semibold text-gray-900">
                  ${metrics?.averageSubscriptionValue.toFixed(2)}
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Charts */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <BarChartComponent
          data={subsByPlan}
          dataKey="count"
          xAxisKey="plan"
          title="Subscriptions by Plan"
          description="Count and revenue by plan"
          color="hsl(220, 70%, 50%)"
        />

        <DonutChartComponent
          data={subsStatus}
          dataKey="count"
          nameKey="status"
          title="Subscription Status"
          description="Status distribution"
          colors={['hsl(160, 70%, 50%)', 'hsl(220, 70%, 50%)', 'hsl(340, 70%, 50%)', 'hsl(30, 70%, 50%)']}
        />
      </div>

      {/* Table */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle className="flex items-center gap-2">
              <CreditCardIcon className="h-5 w-5" />
              Subscriptions ({subscriptions.length})
            </CardTitle>
          </div>
        </CardHeader>
        <CardContent className="p-0">
          <LazyDataTable
            data={subscriptions}
            columns={subscriptionColumns}
            searchable={true}
            pageSize={10}
            onRowClick={(sub) => console.log('Subscription clicked:', sub)}
          />
        </CardContent>
      </Card>
    </div>
  )
}
