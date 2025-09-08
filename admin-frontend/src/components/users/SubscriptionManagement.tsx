import {
  CreditCardIcon,
  CalendarDaysIcon,
  ArrowUpIcon,
  ArrowDownIcon,
  XMarkIcon,
  CheckCircleIcon,
  ExclamationTriangleIcon,
  EyeIcon,
  PencilIcon
} from '@heroicons/react/24/outline'
import { useState, useEffect } from 'react'
import MetricCard from '../dashboard/MetricCard'
import { LazyDataTable } from '../ui/LazyDataTable'
import { Card, CardContent, CardHeader, CardTitle } from '../ui/card'
import { Button } from '../ui/button'
import { DonutChartComponent, BarChartComponent } from '../ui/charts'

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
    const timer = setTimeout(() => {
      setMetrics({
        totalSubscriptions: 634,
        activeSubscriptions: 587,
        trialSubscriptions: 23,
        cancelledSubscriptions: 24,
        upcomingRenewals: 156,
        averageSubscriptionValue: 127.50
      })

      setSubscriptions([
        {
          id: '1',
          customerName: 'Alice Johnson',
          customerEmail: 'alice@techcorp.com',
          planType: 'Enterprise',
          status: 'Active',
          mrr: 299,
          startDate: '2024-01-15',
          nextBilling: '2024-10-15',
          paymentMethod: 'Visa •••• 4242',
          lastPayment: '2024-09-15',
          billingCycle: 'Monthly'
        },
        {
          id: '2',
          customerName: 'Bob Smith',
          customerEmail: 'bob@startupxyz.com',
          planType: 'Pro',
          status: 'Active',
          mrr: 99,
          startDate: '2024-02-20',
          nextBilling: '2024-10-20',
          paymentMethod: 'Mastercard •••• 5555',
          lastPayment: '2024-09-20',
          billingCycle: 'Monthly'
        },
        {
          id: '3',
          customerName: 'Carol Davis',
          customerEmail: 'carol@megacorp.com',
          planType: 'Enterprise+',
          status: 'Active',
          mrr: 599,
          startDate: '2023-12-10',
          nextBilling: '2024-12-10',
          paymentMethod: 'Visa •••• 1234',
          lastPayment: '2023-12-10',
          billingCycle: 'Yearly'
        },
        {
          id: '4',
          customerName: 'David Wilson',
          customerEmail: 'david@freelance.com',
          planType: 'Basic',
          status: 'Trial',
          mrr: 0,
          startDate: '2024-08-25',
          nextBilling: '2024-09-25',
          paymentMethod: 'No payment method',
          lastPayment: 'N/A',
          billingCycle: 'Monthly'
        },
        {
          id: '5',
          customerName: 'Emma Brown',
          customerEmail: 'emma@agency.com',
          planType: 'Pro',
          status: 'Past Due',
          mrr: 99,
          startDate: '2024-01-28',
          nextBilling: '2024-09-28',
          paymentMethod: 'Visa •••• 9876',
          lastPayment: '2024-08-28',
          billingCycle: 'Monthly'
        }
      ])

      setSubsByPlan([
        { plan: 'Basic', count: 187, revenue: 5610 },
        { plan: 'Pro', count: 234, revenue: 23166 },
        { plan: 'Enterprise', count: 156, revenue: 46668 },
        { plan: 'Enterprise+', count: 57, revenue: 34143 }
      ])

      setSubsStatus([
        { status: 'Active', count: 587, percentage: 92.6 },
        { status: 'Trial', count: 23, percentage: 3.6 },
        { status: 'Past Due', count: 15, percentage: 2.4 },
        { status: 'Cancelled', count: 9, percentage: 1.4 }
      ])

      setLoading(false)
    }, 1000)

    return () => clearTimeout(timer)
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
      accessorKey: 'paymentMethod',
      header: 'Payment Method',
      cell: ({ value }: { value: string }) => (
        <span className="text-sm text-gray-600">{value}</span>
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
          {row.status === 'Active' && (
            <Button
              size="sm"
              variant="outline"
              onClick={(e) => {
                e.stopPropagation()
                console.log('Upgrade subscription:', row.id)
              }}
            >
              <ArrowUpIcon className="h-4 w-4" />
            </Button>
          )}
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
          dataKey="revenue"
          xAxisKey="plan"
          title="Revenue by Plan"
          description="Monthly recurring revenue by subscription plan"
          color="hsl(280, 70%, 50%)"
        />

        <DonutChartComponent
          data={subsStatus}
          dataKey="count"
          nameKey="status"
          title="Subscription Status Distribution"
          description="Current status of all subscriptions"
          colors={['hsl(120, 70%, 50%)', 'hsl(220, 70%, 50%)', 'hsl(0, 70%, 50%)', 'hsl(40, 70%, 50%)']}
        />
      </div>

      {/* Subscriptions Table */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle className="flex items-center gap-2">
              <CreditCardIcon className="h-5 w-5" />
              Subscription Management ({subscriptions.length} subscriptions)
            </CardTitle>
            <div className="flex gap-2">
              <Button 
                variant="outline"
                onClick={() => console.log('Export subscriptions')}
              >
                Export
              </Button>
              <Button onClick={() => console.log('Bulk actions')}>
                Bulk Actions
              </Button>
            </div>
          </div>
        </CardHeader>
        <CardContent className="p-0">
          <LazyDataTable
            data={subscriptions}
            columns={subscriptionColumns}
            searchable={true}
            pageSize={10}
            onRowClick={(subscription) => console.log('Subscription clicked:', subscription)}
          />
        </CardContent>
      </Card>
    </div>
  )
}