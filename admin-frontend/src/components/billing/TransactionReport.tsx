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
import { graphqlRequest } from '../../services/graphql'

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
        const now = new Date()
        const since = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000)
        const data = await graphqlRequest<{ billingEvents: { edges: { node: { id: string; createdAt: string; amount: number; description?: string; organization?: { name?: string } } }[]; pageInfo: { totalCount: number } } }>(
          `query Events($since: Date) { billingEvents(pagination: { limit: 1000, offset: 0, sortBy: "createdAt", sortOrder: DESC }, since: $since) { pageInfo { totalCount } edges { node { id createdAt amount description organization { name } } } } }`,
          { since: since.toISOString() }
        )

        if (!mounted) return

        const items: Transaction[] = data.billingEvents.edges.map(({ node }) => ({
          id: node.id,
          customerName: node.organization?.name || 'Unknown',
          amount: Number(node.amount || 0),
          status: 'Success',
          transactionDate: node.createdAt,
          description: node.description || '',
        }))
        setTransactions(items)

        const totalVolume = items.reduce((s, i) => s + i.amount, 0)
        const todayStr = new Date().toISOString().slice(0, 10)
        const todayTransactions = items.filter(i => i.transactionDate.slice(0,10) === todayStr).length
        setMetrics({
          totalTransactions: data.billingEvents.pageInfo.totalCount,
          totalVolume,
          successfulTransactions: items.length,
          failedTransactions: 0,
          pendingTransactions: 0,
          refundedTransactions: 0,
          averageTransactionValue: items.length ? totalVolume / items.length : 0,
          todayTransactions,
        })

        const byDate: Record<string, { volume: number; count: number }> = {}
        items.forEach(i => {
          const d = new Date(i.transactionDate).toISOString().slice(0,10)
          byDate[d] = byDate[d] || { volume: 0, count: 0 }
          byDate[d].volume += i.amount
          byDate[d].count += 1
        })
        const dates: string[] = []
        for (let i = 6; i >= 0; i--) {
          const d = new Date(now.getTime() - i * 24 * 60 * 60 * 1000).toISOString().slice(0,10)
          dates.push(d)
        }
        setVolumeData(dates.map(d => ({ date: d, volume: byDate[d]?.volume || 0, count: byDate[d]?.count || 0, successfulVolume: byDate[d]?.volume || 0, failedVolume: 0 })))
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
