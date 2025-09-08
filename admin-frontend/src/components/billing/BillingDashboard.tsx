import {
  CreditCardIcon,
  BanknotesIcon,
  ExclamationTriangleIcon,
  ArrowPathIcon,
  CheckCircleIcon,
  ClockIcon
} from '@heroicons/react/24/outline'
import { useState, useEffect } from 'react'
import MetricCard from '../dashboard/MetricCard'
import { LazyDataTable } from '../ui/LazyDataTable'
import { Card, CardContent, CardHeader, CardTitle } from '../ui/card'
import { LineChartComponent, BarChartComponent, DonutChartComponent } from '../ui/charts'

interface BillingMetrics {
  dailyRevenue: number
  monthlyRevenue: number
  yearlyRevenue: number
  paymentSuccessRate: number
  failedPayments: number
  totalRefunds: number
  averageTransactionValue: number
  pendingPayments: number
}

interface RevenueData {
  date: string
  revenue: number
  transactions: number
}

interface PaymentMethod {
  method: string
  count: number
  revenue: number
}

interface FailedPayment {
  id: string
  customerName: string
  customerEmail: string
  amount: number
  reason: string
  attemptDate: string
  nextRetry: string
  status: 'Retrying' | 'Failed' | 'Resolved'
}

interface GeographicRevenue {
  country: string
  revenue: number
  transactions: number
}

export default function BillingDashboard() {
  const [metrics, setMetrics] = useState<BillingMetrics | null>(null)
  const [revenueData, setRevenueData] = useState<RevenueData[]>([])
  const [paymentMethods, setPaymentMethods] = useState<PaymentMethod[]>([])
  const [failedPayments, setFailedPayments] = useState<FailedPayment[]>([])
  const [geoRevenue, setGeoRevenue] = useState<GeographicRevenue[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    const timer = setTimeout(() => {
      setMetrics({
        dailyRevenue: 1847,
        monthlyRevenue: 45230,
        yearlyRevenue: 542760,
        paymentSuccessRate: 96.8,
        failedPayments: 12,
        totalRefunds: 3450,
        averageTransactionValue: 127.50,
        pendingPayments: 8
      })

      setRevenueData([
        { date: '2024-09-01', revenue: 1520, transactions: 45 },
        { date: '2024-09-02', revenue: 1780, transactions: 52 },
        { date: '2024-09-03', revenue: 1420, transactions: 38 },
        { date: '2024-09-04', revenue: 1650, transactions: 47 },
        { date: '2024-09-05', revenue: 1890, transactions: 56 },
        { date: '2024-09-06', revenue: 1730, transactions: 49 },
        { date: '2024-09-07', revenue: 1847, transactions: 51 }
      ])

      setPaymentMethods([
        { method: 'Credit Card', count: 456, revenue: 35420 },
        { method: 'Bank Transfer', count: 123, revenue: 12800 },
        { method: 'PayPal', count: 89, revenue: 8900 },
        { method: 'Digital Wallet', count: 67, revenue: 6700 },
        { method: 'Other', count: 34, revenue: 2310 }
      ])

      setFailedPayments([
        {
          id: '1',
          customerName: 'Sarah Johnson',
          customerEmail: 'sarah@company.com',
          amount: 299,
          reason: 'Insufficient funds',
          attemptDate: '2024-09-06',
          nextRetry: '2024-09-09',
          status: 'Retrying'
        },
        {
          id: '2',
          customerName: 'Mike Chen',
          customerEmail: 'mike@startup.com',
          amount: 99,
          reason: 'Card expired',
          attemptDate: '2024-09-05',
          nextRetry: '2024-09-08',
          status: 'Failed'
        },
        {
          id: '3',
          customerName: 'Lisa Brown',
          customerEmail: 'lisa@agency.com',
          amount: 199,
          reason: 'Card declined',
          attemptDate: '2024-09-07',
          nextRetry: '2024-09-10',
          status: 'Retrying'
        }
      ])

      setGeoRevenue([
        { country: 'United States', revenue: 28450, transactions: 345 },
        { country: 'United Kingdom', revenue: 8920, transactions: 89 },
        { country: 'Canada', revenue: 5670, transactions: 67 },
        { country: 'Australia', revenue: 4230, transactions: 45 },
        { country: 'Germany', revenue: 3890, transactions: 42 }
      ])

      setLoading(false)
    }, 1000)

    return () => clearTimeout(timer)
  }, [])

  const failedPaymentColumns = [
    {
      accessorKey: 'customerName',
      header: 'Customer',
      sortable: true,
      cell: ({ row }: { row: FailedPayment }) => (
        <div>
          <div className="font-medium">{row.customerName}</div>
          <div className="text-sm text-gray-500">{row.customerEmail}</div>
        </div>
      )
    },
    {
      accessorKey: 'amount',
      header: 'Amount',
      sortable: true,
      cell: ({ value }: { value: number }) => (
        <span className="font-medium">${value}</span>
      )
    },
    {
      accessorKey: 'reason',
      header: 'Failure Reason',
      sortable: true,
      cell: ({ value }: { value: string }) => (
        <span className="text-sm">{value}</span>
      )
    },
    {
      accessorKey: 'status',
      header: 'Status',
      sortable: true,
      cell: ({ value }: { value: string }) => (
        <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${
          value === 'Retrying' 
            ? 'bg-yellow-100 text-yellow-800' 
            : value === 'Failed'
            ? 'bg-red-100 text-red-800'
            : 'bg-green-100 text-green-800'
        }`}>
          {value}
        </span>
      )
    },
    {
      accessorKey: 'attemptDate',
      header: 'Last Attempt',
      sortable: true,
      cell: ({ value }: { value: string }) => (
        new Date(value).toLocaleDateString()
      )
    },
    {
      accessorKey: 'nextRetry',
      header: 'Next Retry',
      sortable: true,
      cell: ({ value }: { value: string }) => (
        new Date(value).toLocaleDateString()
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
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          {[...Array(4)].map((_, i) => (
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
      {/* Revenue Metrics */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <Card>
          <CardContent className="p-6">
            <div className="flex items-center">
              <div className="p-3 rounded-lg bg-green-100">
                <BanknotesIcon className="h-6 w-6 text-green-600" />
              </div>
              <div className="ml-4 flex-1">
                <p className="text-sm font-medium text-gray-600">Daily Revenue</p>
                <p className="text-2xl font-semibold text-gray-900">
                  ${metrics?.dailyRevenue.toLocaleString()}
                </p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-6">
            <div className="flex items-center">
              <div className="p-3 rounded-lg bg-blue-100">
                <CreditCardIcon className="h-6 w-6 text-blue-600" />
              </div>
              <div className="ml-4 flex-1">
                <p className="text-sm font-medium text-gray-600">Monthly Revenue</p>
                <p className="text-2xl font-semibold text-gray-900">
                  ${metrics?.monthlyRevenue.toLocaleString()}
                </p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-6">
            <div className="flex items-center">
              <div className="p-3 rounded-lg bg-purple-100">
                <BanknotesIcon className="h-6 w-6 text-purple-600" />
              </div>
              <div className="ml-4 flex-1">
                <p className="text-sm font-medium text-gray-600">Yearly Revenue</p>
                <p className="text-2xl font-semibold text-gray-900">
                  ${metrics?.yearlyRevenue.toLocaleString()}
                </p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-6">
            <div className="flex items-center">
              <div className="p-3 rounded-lg bg-teal-100">
                <CheckCircleIcon className="h-6 w-6 text-teal-600" />
              </div>
              <div className="ml-4 flex-1">
                <p className="text-sm font-medium text-gray-600">Success Rate</p>
                <p className="text-2xl font-semibold text-gray-900">
                  {metrics?.paymentSuccessRate}%
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Secondary Metrics */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <Card>
          <CardContent className="p-6">
            <div className="flex items-center">
              <div className="p-3 rounded-lg bg-red-100">
                <ExclamationTriangleIcon className="h-6 w-6 text-red-600" />
              </div>
              <div className="ml-4 flex-1">
                <p className="text-sm font-medium text-gray-600">Failed Payments</p>
                <p className="text-2xl font-semibold text-gray-900">
                  {metrics?.failedPayments}
                </p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-6">
            <div className="flex items-center">
              <div className="p-3 rounded-lg bg-orange-100">
                <ArrowPathIcon className="h-6 w-6 text-orange-600" />
              </div>
              <div className="ml-4 flex-1">
                <p className="text-sm font-medium text-gray-600">Total Refunds</p>
                <p className="text-2xl font-semibold text-gray-900">
                  ${metrics?.totalRefunds.toLocaleString()}
                </p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-6">
            <div className="flex items-center">
              <div className="p-3 rounded-lg bg-indigo-100">
                <BanknotesIcon className="h-6 w-6 text-indigo-600" />
              </div>
              <div className="ml-4 flex-1">
                <p className="text-sm font-medium text-gray-600">Avg Transaction</p>
                <p className="text-2xl font-semibold text-gray-900">
                  ${metrics?.averageTransactionValue.toFixed(2)}
                </p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-6">
            <div className="flex items-center">
              <div className="p-3 rounded-lg bg-yellow-100">
                <ClockIcon className="h-6 w-6 text-yellow-600" />
              </div>
              <div className="ml-4 flex-1">
                <p className="text-sm font-medium text-gray-600">Pending Payments</p>
                <p className="text-2xl font-semibold text-gray-900">
                  {metrics?.pendingPayments}
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Charts Row 1 */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Daily Revenue Trend */}
        <LineChartComponent
          data={revenueData}
          dataKey="revenue"
          xAxisKey="date"
          title="Daily Revenue Trend"
          description="Revenue performance over the last 7 days"
          color="hsl(120, 70%, 50%)"
        />

        {/* Transaction Volume */}
        <BarChartComponent
          data={revenueData}
          dataKey="transactions"
          xAxisKey="date"
          title="Daily Transaction Volume"
          description="Number of transactions processed daily"
          color="hsl(220, 70%, 50%)"
        />
      </div>

      {/* Charts Row 2 */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Payment Methods */}
        <DonutChartComponent
          data={paymentMethods}
          dataKey="count"
          nameKey="method"
          title="Payment Method Distribution"
          description="Transactions by payment method"
          colors={['hsl(220, 70%, 50%)', 'hsl(280, 70%, 50%)', 'hsl(160, 70%, 50%)', 'hsl(30, 70%, 50%)', 'hsl(340, 70%, 50%)']}
        />

        {/* Geographic Revenue */}
        <BarChartComponent
          data={geoRevenue}
          dataKey="revenue"
          xAxisKey="country"
          title="Revenue by Country"
          description="Top performing markets by revenue"
          color="hsl(280, 70%, 50%)"
        />
      </div>

      {/* Failed Payments Table */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <ExclamationTriangleIcon className="h-5 w-5 text-red-500" />
            Failed Payments Requiring Attention
          </CardTitle>
        </CardHeader>
        <CardContent className="p-0">
          <LazyDataTable
            data={failedPayments}
            columns={failedPaymentColumns}
            searchable={true}
            pageSize={10}
            onRowClick={(payment) => console.log('Failed payment clicked:', payment)}
          />
        </CardContent>
      </Card>
    </div>
  )
}