import {
  CreditCardIcon,
  BanknotesIcon,
  ExclamationTriangleIcon,
  CheckCircleIcon,
  ClockIcon,
  ArrowPathIcon,
  DocumentMagnifyingGlassIcon,
  FunnelIcon
} from '@heroicons/react/24/outline'
import { useState, useEffect } from 'react'
import { LazyDataTable } from '../ui/LazyDataTable'
import { Card, CardContent, CardHeader, CardTitle } from '../ui/card'
import { LineChartComponent, BarChartComponent, DonutChartComponent } from '../ui/charts'

interface TransactionMetrics {
  totalTransactions: number
  totalVolume: number
  successfulTransactions: number
  failedTransactions: number
  pendingTransactions: number
  refundedTransactions: number
  averageTransactionValue: number
  todayTransactions: number
}

interface Transaction {
  id: string
  customerId: string
  customerName: string
  customerEmail: string
  amount: number
  currency: string
  status: 'Success' | 'Failed' | 'Pending' | 'Refunded' | 'Disputed'
  paymentMethod: string
  transactionDate: string
  description: string
  stripeChargeId?: string
  failureReason?: string
}

interface TransactionVolumeData {
  date: string
  volume: number
  count: number
  successfulVolume: number
  failedVolume: number
}

interface PaymentMethodData {
  method: string
  count: number
  volume: number
  successRate: number
}

interface StatusDistribution {
  status: string
  count: number
  volume: number
}

export default function TransactionReport() {
  const [metrics, setMetrics] = useState<TransactionMetrics | null>(null)
  const [transactions, setTransactions] = useState<Transaction[]>([])
  const [volumeData, setVolumeData] = useState<TransactionVolumeData[]>([])
  const [paymentMethods, setPaymentMethods] = useState<PaymentMethodData[]>([])
  const [statusDistribution, setStatusDistribution] = useState<StatusDistribution[]>([])
  const [loading, setLoading] = useState(true)
  const [filter, setFilter] = useState({
    status: 'all',
    paymentMethod: 'all',
    dateRange: '7d'
  })

  useEffect(() => {
    const timer = setTimeout(() => {
      // Simulate API data
      setMetrics({
        totalTransactions: 2847,
        totalVolume: 342650,
        successfulTransactions: 2698,
        failedTransactions: 124,
        pendingTransactions: 18,
        refundedTransactions: 7,
        averageTransactionValue: 120.35,
        todayTransactions: 156
      })

      setVolumeData([
        { date: '2024-09-01', volume: 45200, count: 380, successfulVolume: 42800, failedVolume: 2400 },
        { date: '2024-09-02', volume: 52800, count: 420, successfulVolume: 50100, failedVolume: 2700 },
        { date: '2024-09-03', volume: 38900, count: 310, successfulVolume: 37200, failedVolume: 1700 },
        { date: '2024-09-04', volume: 49500, count: 395, successfulVolume: 47800, failedVolume: 1700 },
        { date: '2024-09-05', volume: 58200, count: 465, successfulVolume: 55900, failedVolume: 2300 },
        { date: '2024-09-06', volume: 51300, count: 410, successfulVolume: 49100, failedVolume: 2200 },
        { date: '2024-09-07', volume: 46750, count: 365, successfulVolume: 44800, failedVolume: 1950 }
      ])

      setPaymentMethods([
        { method: 'Credit Card', count: 1890, volume: 245600, successRate: 96.2 },
        { method: 'Bank Transfer', count: 456, volume: 78900, successRate: 98.7 },
        { method: 'PayPal', count: 312, volume: 42300, successRate: 94.8 },
        { method: 'Digital Wallet', count: 189, volume: 28100, successRate: 97.1 }
      ])

      setStatusDistribution([
        { status: 'Success', count: 2698, volume: 325400 },
        { status: 'Failed', count: 124, volume: 14200 },
        { status: 'Pending', count: 18, volume: 2200 },
        { status: 'Refunded', count: 7, volume: 850 }
      ])

      setTransactions([
        {
          id: 'TXN-001',
          customerId: 'CUST-123',
          customerName: 'Sarah Johnson',
          customerEmail: 'sarah@company.com',
          amount: 299.00,
          currency: 'USD',
          status: 'Success',
          paymentMethod: 'Credit Card',
          transactionDate: '2024-09-07T14:30:00Z',
          description: 'Pro Plan Subscription',
          stripeChargeId: 'ch_1ABC123'
        },
        {
          id: 'TXN-002',
          customerId: 'CUST-456',
          customerName: 'Mike Chen',
          customerEmail: 'mike@startup.com',
          amount: 99.00,
          currency: 'USD',
          status: 'Failed',
          paymentMethod: 'Credit Card',
          transactionDate: '2024-09-07T12:15:00Z',
          description: 'Basic Plan Subscription',
          failureReason: 'Card declined'
        },
        {
          id: 'TXN-003',
          customerId: 'CUST-789',
          customerName: 'Lisa Brown',
          customerEmail: 'lisa@agency.com',
          amount: 199.00,
          currency: 'USD',
          status: 'Success',
          paymentMethod: 'Bank Transfer',
          transactionDate: '2024-09-07T10:45:00Z',
          description: 'Standard Plan Subscription',
          stripeChargeId: 'ch_1DEF456'
        },
        {
          id: 'TXN-004',
          customerId: 'CUST-321',
          customerName: 'David Wilson',
          customerEmail: 'david@consulting.com',
          amount: 499.00,
          currency: 'USD',
          status: 'Pending',
          paymentMethod: 'Bank Transfer',
          transactionDate: '2024-09-07T08:20:00Z',
          description: 'Enterprise Plan Subscription'
        },
        {
          id: 'TXN-005',
          customerId: 'CUST-654',
          customerName: 'Emma Davis',
          customerEmail: 'emma@marketing.com',
          amount: 149.00,
          currency: 'USD',
          status: 'Refunded',
          paymentMethod: 'PayPal',
          transactionDate: '2024-09-06T16:10:00Z',
          description: 'Standard Plan Subscription - Refunded'
        }
      ])

      setLoading(false)
    }, 1000)

    return () => clearTimeout(timer)
  }, [])

  const transactionColumns = [
    {
      accessorKey: 'id',
      header: 'Transaction ID',
      sortable: true,
      cell: ({ value }: { value: string }) => (
        <span className="font-mono text-sm font-medium">{value}</span>
      )
    },
    {
      accessorKey: 'customerName',
      header: 'Customer',
      sortable: true,
      cell: ({ row }: { row: Transaction }) => (
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
      cell: ({ row }: { row: Transaction }) => (
        <span className="font-medium">
          {row.currency === 'USD' ? '$' : ''}{row.amount.toFixed(2)}
        </span>
      )
    },
    {
      accessorKey: 'status',
      header: 'Status',
      sortable: true,
      cell: ({ value }: { value: string }) => (
        <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${
          value === 'Success' 
            ? 'bg-green-100 text-green-800' 
            : value === 'Failed'
            ? 'bg-red-100 text-red-800'
            : value === 'Pending'
            ? 'bg-yellow-100 text-yellow-800'
            : value === 'Refunded'
            ? 'bg-orange-100 text-orange-800'
            : 'bg-purple-100 text-purple-800'
        }`}>
          {value}
        </span>
      )
    },
    {
      accessorKey: 'paymentMethod',
      header: 'Payment Method',
      sortable: true,
      cell: ({ value }: { value: string }) => (
        <span className="text-sm">{value}</span>
      )
    },
    {
      accessorKey: 'transactionDate',
      header: 'Date',
      sortable: true,
      cell: ({ value }: { value: string }) => (
        <div className="text-sm">
          <div>{new Date(value).toLocaleDateString()}</div>
          <div className="text-gray-500">{new Date(value).toLocaleTimeString()}</div>
        </div>
      )
    },
    {
      accessorKey: 'description',
      header: 'Description',
      cell: ({ value }: { value: string }) => (
        <span className="text-sm text-gray-600">{value}</span>
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
        <div className="h-96 bg-gray-200 rounded-lg animate-pulse" />
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {/* Transaction Metrics Row 1 */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <Card>
          <CardContent className="p-6">
            <div className="flex items-center">
              <div className="p-3 rounded-lg bg-blue-100">
                <DocumentMagnifyingGlassIcon className="h-6 w-6 text-blue-600" />
              </div>
              <div className="ml-4 flex-1">
                <p className="text-sm font-medium text-gray-600">Total Transactions</p>
                <p className="text-2xl font-semibold text-gray-900">
                  {metrics?.totalTransactions.toLocaleString()}
                </p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-6">
            <div className="flex items-center">
              <div className="p-3 rounded-lg bg-green-100">
                <BanknotesIcon className="h-6 w-6 text-green-600" />
              </div>
              <div className="ml-4 flex-1">
                <p className="text-sm font-medium text-gray-600">Total Volume</p>
                <p className="text-2xl font-semibold text-gray-900">
                  ${metrics?.totalVolume.toLocaleString()}
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
                <p className="text-sm font-medium text-gray-600">Successful</p>
                <p className="text-2xl font-semibold text-gray-900">
                  {metrics?.successfulTransactions.toLocaleString()}
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
      </div>

      {/* Transaction Metrics Row 2 */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <Card>
          <CardContent className="p-6">
            <div className="flex items-center">
              <div className="p-3 rounded-lg bg-red-100">
                <ExclamationTriangleIcon className="h-6 w-6 text-red-600" />
              </div>
              <div className="ml-4 flex-1">
                <p className="text-sm font-medium text-gray-600">Failed</p>
                <p className="text-2xl font-semibold text-gray-900">
                  {metrics?.failedTransactions}
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
                <p className="text-sm font-medium text-gray-600">Pending</p>
                <p className="text-2xl font-semibold text-gray-900">
                  {metrics?.pendingTransactions}
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
                <p className="text-sm font-medium text-gray-600">Refunded</p>
                <p className="text-2xl font-semibold text-gray-900">
                  {metrics?.refundedTransactions}
                </p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-6">
            <div className="flex items-center">
              <div className="p-3 rounded-lg bg-purple-100">
                <CreditCardIcon className="h-6 w-6 text-purple-600" />
              </div>
              <div className="ml-4 flex-1">
                <p className="text-sm font-medium text-gray-600">Today</p>
                <p className="text-2xl font-semibold text-gray-900">
                  {metrics?.todayTransactions}
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Charts Row 1 */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Transaction Volume Trend */}
        <LineChartComponent
          data={volumeData}
          dataKey="volume"
          xAxisKey="date"
          title="Transaction Volume Trend"
          description="Total transaction volume over time"
          color="hsl(220, 70%, 50%)"
        />

        {/* Transaction Count Trend */}
        <BarChartComponent
          data={volumeData}
          dataKey="count"
          xAxisKey="date"
          title="Transaction Count"
          description="Number of transactions processed daily"
          color="hsl(160, 70%, 50%)"
        />
      </div>

      {/* Charts Row 2 */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Payment Method Distribution */}
        <DonutChartComponent
          data={paymentMethods}
          dataKey="count"
          nameKey="method"
          title="Payment Method Distribution"
          description="Transactions by payment method"
          colors={['hsl(220, 70%, 50%)', 'hsl(280, 70%, 50%)', 'hsl(160, 70%, 50%)', 'hsl(30, 70%, 50%)']}
        />

        {/* Status Distribution */}
        <DonutChartComponent
          data={statusDistribution}
          dataKey="count"
          nameKey="status"
          title="Transaction Status Distribution"
          description="Breakdown of transaction statuses"
          colors={['hsl(120, 70%, 50%)', 'hsl(0, 70%, 50%)', 'hsl(45, 70%, 50%)', 'hsl(30, 70%, 50%)']}
        />
      </div>

      {/* Filters and Search */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <FunnelIcon className="h-5 w-5" />
            Transaction Filters
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Status</label>
              <select
                value={filter.status}
                onChange={(e) => setFilter({ ...filter, status: e.target.value })}
                className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                <option value="all">All Statuses</option>
                <option value="success">Success</option>
                <option value="failed">Failed</option>
                <option value="pending">Pending</option>
                <option value="refunded">Refunded</option>
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Payment Method</label>
              <select
                value={filter.paymentMethod}
                onChange={(e) => setFilter({ ...filter, paymentMethod: e.target.value })}
                className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                <option value="all">All Methods</option>
                <option value="credit-card">Credit Card</option>
                <option value="bank-transfer">Bank Transfer</option>
                <option value="paypal">PayPal</option>
                <option value="digital-wallet">Digital Wallet</option>
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Date Range</label>
              <select
                value={filter.dateRange}
                onChange={(e) => setFilter({ ...filter, dateRange: e.target.value })}
                className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                <option value="7d">Last 7 days</option>
                <option value="30d">Last 30 days</option>
                <option value="90d">Last 90 days</option>
                <option value="1y">Last year</option>
              </select>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Transaction Table */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <DocumentMagnifyingGlassIcon className="h-5 w-5" />
            Recent Transactions
          </CardTitle>
        </CardHeader>
        <CardContent className="p-0">
          <LazyDataTable
            data={transactions}
            columns={transactionColumns}
            searchable={true}
            pageSize={25}
            onRowClick={(transaction) => console.log('Transaction clicked:', transaction)}
          />
        </CardContent>
      </Card>
    </div>
  )
}