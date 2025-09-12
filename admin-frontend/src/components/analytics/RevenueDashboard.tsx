import {
  ArrowUpIcon,
  ArrowDownIcon,
  UsersIcon,
  ChartBarIcon,
  ArrowTrendingUpIcon
} from '@heroicons/react/24/outline'
import { useState, useEffect } from 'react'
import { graphqlRequest } from '../../services/graphql'
import MetricCard from '../dashboard/MetricCard'
import { LazyDataTable } from '../ui/LazyDataTable'
import { Card, CardContent, CardHeader, CardTitle } from '../ui/card'

interface RevenueMetrics {
  mrr: number
  arr: number
  mrrGrowth: number
  newRevenue: number
  expansionRevenue: number
  churnedRevenue: number
  arpu: number
}

interface TopCustomer {
  id: string
  name: string
  company: string
  mrr: number
  plan: string
  status: string
}

export default function RevenueDashboard() {
  const [metrics, setMetrics] = useState<RevenueMetrics | null>(null)
  const [topCustomers, setTopCustomers] = useState<TopCustomer[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    let mounted = true
    const load = async () => {
      try {
        const [admin, subs, top] = await Promise.all([
          graphqlRequest<{ adminMetrics: { monthlyRevenue: number } }>(`query { adminMetrics { monthlyRevenue } }`),
          graphqlRequest<{ subscriptionMetrics: { averageSubscriptionValue: number } }>(`query { subscriptionMetrics { averageSubscriptionValue } }`),
          graphqlRequest<{ topOrganizationsByMRR: { id: string; name: string; plan: string; status: string; mrr: number }[] }>(
            `query Top($limit: Int!) { topOrganizationsByMRR(limit: $limit) { id name plan status mrr } }`,
            { limit: 10 }
          ),
        ])
        if (!mounted) return
        const mrr = admin.adminMetrics.monthlyRevenue
        setMetrics({
          mrr,
          arr: mrr * 12,
          mrrGrowth: 0,
          newRevenue: mrr,
          expansionRevenue: 0,
          churnedRevenue: 0,
          arpu: subs.subscriptionMetrics.averageSubscriptionValue || 0,
        })
        setTopCustomers(
          top.topOrganizationsByMRR.map(o => ({ id: o.id, name: o.name, company: o.name, mrr: o.mrr, plan: o.plan, status: o.status }))
        )
      } catch (e) {
        console.error('Failed to load revenue dashboard', e)
        setMetrics({ mrr: 0, arr: 0, mrrGrowth: 0, newRevenue: 0, expansionRevenue: 0, churnedRevenue: 0, arpu: 0 })
        setTopCustomers([])
      } finally {
        if (mounted) setLoading(false)
      }
    }
    void load()
    return () => { mounted = false }
  }, [])

  const customerColumns = [
    {
      accessorKey: 'name',
      header: 'Customer',
      sortable: true,
      cell: ({ row }: { row: TopCustomer }) => (
        <div>
          <div className="font-medium">{row.name}</div>
          <div className="text-sm text-gray-500">{row.company}</div>
        </div>
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
      accessorKey: 'status',
      header: 'Status',
      cell: ({ value }: { value: string }) => (
        <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${
          value === 'Active' 
            ? 'bg-green-100 text-green-800' 
            : 'bg-red-100 text-red-800'
        }`}>
          {value}
        </span>
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
        <div className="h-64 bg-gray-200 rounded-lg animate-pulse" />
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {/* Revenue Metrics */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <MetricCard
          title="Monthly Recurring Revenue"
          value={`$${metrics?.mrr.toLocaleString()}`}
          icon="services"
          onClick={() => console.log('MRR clicked')}
        />
        <MetricCard
          title="Annual Recurring Revenue"
          value={`$${metrics?.arr.toLocaleString()}`}
          icon="applications"
          onClick={() => console.log('ARR clicked')}
        />
        <MetricCard
          title="MRR Growth"
          value={`${metrics?.mrrGrowth}%`}
          icon="api"
          onClick={() => console.log('Growth clicked')}
        />
        <MetricCard
          title="ARPU"
          value={`$${metrics?.arpu.toFixed(2)}`}
          icon="roles"
          onClick={() => console.log('ARPU clicked')}
        />
      </div>

      {/* Revenue Breakdown */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <ChartBarIcon className="h-5 w-5" />
            Revenue Breakdown (This Month)
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <div className="flex items-center justify-between p-4 bg-green-50 rounded-lg">
              <div>
                <p className="text-sm font-medium text-gray-600">New Revenue</p>
                <p className="text-2xl font-bold text-green-600">
                  ${metrics?.newRevenue.toLocaleString()}
                </p>
              </div>
              <ArrowUpIcon className="h-8 w-8 text-green-500" />
            </div>
            
            <div className="flex items-center justify-between p-4 bg-blue-50 rounded-lg">
              <div>
                <p className="text-sm font-medium text-gray-600">Expansion Revenue</p>
                <p className="text-2xl font-bold text-blue-600">
                  ${metrics?.expansionRevenue.toLocaleString()}
                </p>
              </div>
              <ArrowTrendingUpIcon className="h-8 w-8 text-blue-500" />
            </div>
            
            <div className="flex items-center justify-between p-4 bg-red-50 rounded-lg">
              <div>
                <p className="text-sm font-medium text-gray-600">Churned Revenue</p>
                <p className="text-2xl font-bold text-red-600">
                  ${Math.abs(metrics?.churnedRevenue || 0).toLocaleString()}
                </p>
              </div>
              <ArrowDownIcon className="h-8 w-8 text-red-500" />
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Top Revenue Customers */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <UsersIcon className="h-5 w-5" />
            Top Revenue Customers
          </CardTitle>
        </CardHeader>
        <CardContent className="p-0">
          <LazyDataTable
            data={topCustomers}
            columns={customerColumns}
            searchable={false}
            pageSize={10}
            onRowClick={(customer) => console.log('Customer clicked:', customer)}
          />
        </CardContent>
      </Card>
    </div>
  )
}
