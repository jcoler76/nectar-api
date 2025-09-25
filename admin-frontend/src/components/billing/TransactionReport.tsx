import {
  CreditCardIcon,
  BanknotesIcon,
  CheckCircleIcon,
  DocumentMagnifyingGlassIcon
} from '@heroicons/react/24/outline'
import { useState, useEffect } from 'react'
import { LazyDataTable } from '../ui/LazyDataTable'
import { Card, CardContent, CardHeader, CardTitle } from '../ui/card'
import { LineChartComponent, BarChartComponent } from '../ui/charts'
// GraphQL replaced with REST API calls

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
  customerId?: string
  customerName: string
  customerEmail?: string
  amount: number
  currency?: string
  status: 'Success' | 'Failed' | 'Pending' | 'Refunded' | 'Disputed'
  paymentMethod?: string
  transactionDate: string
  description: string
}

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

interface RevenueDataPoint {
  date: string
  revenue: number
  transactions: number
}

interface TransactionVolumeData {
  date: string
  volume: number
  count: number
  successfulVolume: number
  failedVolume: number
}

export default function TransactionReport() {
  const [metrics, setMetrics] = useState<TransactionMetrics | null>(null)
  const [transactions, setTransactions] = useState<Transaction[]>([])
  const [volumeData, setVolumeData] = useState<TransactionVolumeData[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    let mounted = true
    const load = async () => {
      try {
        const token = localStorage.getItem('admin_token') || localStorage.getItem('nectar_admin_token')
        const baseURL = (import.meta.env?.VITE_ADMIN_API_URL || 'http://localhost:4001').replace(/\s+/g, '').replace(/\/$/, '')

        // Fetch billing metrics
        const metricsResponse = await fetch(`${baseURL}/api/billing/metrics`, {
          headers: {
            'Authorization': `Bearer ${token}`,
            'Content-Type': 'application/json'
          }
        })

        if (!metricsResponse.ok) {
          throw new Error(`Failed to fetch metrics: ${metricsResponse.status}`)
        }

        const metricsData = await metricsResponse.json()

        if (!mounted) return

        // Extract metrics from response
        const billingMetrics: BillingMetrics = metricsData.data.metrics
        const revenueData: RevenueDataPoint[] = metricsData.data.revenueData || []
        const failedPaymentsList = metricsData.data.failedPayments || []

        // Create mock transactions from revenue data and failed payments
        const successfulTransactions: Transaction[] = revenueData.flatMap(day =>
          Array.from({ length: day.transactions }, (_, i) => ({
            id: `success-${day.date}-${i}`,
            customerName: 'Organization',
            amount: day.transactions > 0 ? day.revenue / day.transactions : 0,
            status: 'Success' as const,
            transactionDate: `${day.date}T12:00:00Z`,
            description: 'Payment processed successfully'
          }))
        )

        const failedTransactions: Transaction[] = failedPaymentsList.map((payment: any) => ({
          id: payment.id || `failed-${Date.now()}`,
          customerName: payment.customerName || 'Unknown',
          customerEmail: payment.customerEmail,
          amount: payment.amount || 0,
          status: 'Failed' as const,
          transactionDate: payment.attemptDate || new Date().toISOString(),
          description: payment.reason || 'Payment failed'
        }))

        const allTransactions = [...successfulTransactions, ...failedTransactions]
        setTransactions(allTransactions)

        // Calculate derived metrics
        const totalVolume = billingMetrics.monthlyRevenue || 0
        const todayStr = new Date().toISOString().slice(0, 10)
        const todayTransactions = allTransactions.filter(t =>
          t.transactionDate.slice(0, 10) === todayStr
        ).length

        setMetrics({
          totalTransactions: allTransactions.length,
          totalVolume,
          successfulTransactions: successfulTransactions.length,
          failedTransactions: billingMetrics.failedPayments || 0,
          pendingTransactions: 0,
          refundedTransactions: 0,
          averageTransactionValue: billingMetrics.averageTransactionValue || 0,
          todayTransactions,
        })

        // Transform revenue data for charts
        const volumeData = revenueData.map(day => ({
          date: day.date,
          volume: day.revenue,
          count: day.transactions,
          successfulVolume: day.revenue,
          failedVolume: 0
        }))
        setVolumeData(volumeData)

      } catch (e) {
        console.error('Failed to load transactions', e)
      } finally {
        if (mounted) setLoading(false)
      }
    }
    void load()
    return () => { mounted = false }
  }, [])

  const columns = [
    { accessorKey: 'id', header: 'ID' },
    { accessorKey: 'customerName', header: 'Customer' },
    { accessorKey: 'amount', header: 'Amount', sortable: true, cell: ({ value }: { value: number }) => <span className="font-medium">${value.toFixed(2)}</span> },
    { accessorKey: 'transactionDate', header: 'Date', sortable: true, cell: ({ value }: { value: string }) => new Date(value).toLocaleString() },
    { accessorKey: 'description', header: 'Description' },
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
      {/* Metrics */}
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

      {/* Charts */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <BarChartComponent
          data={volumeData}
          dataKey="volume"
          xAxisKey="date"
          title="Daily Volume"
          description="Volume by day"
          color="hsl(220, 70%, 50%)"
        />
        <LineChartComponent
          data={volumeData}
          dataKey="count"
          xAxisKey="date"
          title="Transaction Count"
          description="Transactions per day"
          color="hsl(160, 70%, 50%)"
        />
      </div>

      {/* Table */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <CreditCardIcon className="h-5 w-5" />
            Recent Transactions
          </CardTitle>
        </CardHeader>
        <CardContent className="p-0">
          <LazyDataTable
            data={transactions}
            columns={columns}
            searchable={true}
            pageSize={10}
            onRowClick={(t) => console.log('Transaction clicked:', t)}
          />
        </CardContent>
      </Card>
    </div>
  )
}
