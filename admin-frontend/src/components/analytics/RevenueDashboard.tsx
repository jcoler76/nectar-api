import {
  ArrowUpIcon,
  ArrowDownIcon,
  CurrencyDollarIcon,
  UsersIcon,
  ChartBarIcon,
  ArrowTrendingUpIcon
} from '@heroicons/react/24/outline'
import { useState, useEffect } from 'react'
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
    // Simulate API call
    const timer = setTimeout(() => {
      setMetrics({
        mrr: 45230,
        arr: 542760,
        mrrGrowth: 12.5,
        newRevenue: 8540,
        expansionRevenue: 3120,
        churnedRevenue: -2100,
        arpu: 127.50
      })
      
      setTopCustomers([
        {
          id: '1',
          name: 'Alice Johnson',
          company: 'TechCorp Inc',
          mrr: 2500,
          plan: 'Enterprise',
          status: 'Active'
        },
        {
          id: '2',
          name: 'Bob Smith',
          company: 'StartupXYZ',
          mrr: 1200,
          plan: 'Pro',
          status: 'Active'
        },
        {
          id: '3',
          name: 'Carol Davis',
          company: 'MegaCorp Ltd',
          mrr: 3200,
          plan: 'Enterprise+',
          status: 'Active'
        }
      ])
      
      setLoading(false)
    }, 1000)

    return () => clearTimeout(timer)
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
