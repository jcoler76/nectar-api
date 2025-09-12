import {
  UserPlusIcon,
  ArrowTrendingUpIcon,
  ClockIcon,
  CalendarDaysIcon
} from '@heroicons/react/24/outline'
import { useState, useEffect } from 'react'
import { graphqlRequest } from '../../services/graphql'
import MetricCard from '../dashboard/MetricCard'
import { LazyDataTable } from '../ui/LazyDataTable'
import { Card, CardContent, CardHeader, CardTitle } from '../ui/card'
import { LineChartComponent, BarChartComponent, DonutChartComponent } from '../ui/charts'

interface UserGrowthMetrics {
  totalUsers: number
  activeUsers: number
  newUsersToday: number
  newUsersThisWeek: number
  newUsersThisMonth: number
  averageSessionDuration: number
  dailyActiveUsers: number
  monthlyActiveUsers: number
  userRetentionRate: number
}

interface UserGrowthData {
  date: string
  newUsers: number
  totalUsers: number
  activeUsers: number
}

interface EngagementData {
  feature: string
  usage: number
  users: number
}

interface AcquisitionChannel {
  channel: string
  users: number
  conversion: number
}

export default function UserAnalytics() {
  const [metrics, setMetrics] = useState<UserGrowthMetrics | null>(null)
  const [growthData, setGrowthData] = useState<UserGrowthData[]>([])
  const [engagementData, setEngagementData] = useState<EngagementData[]>([])
  const [acquisitionData, setAcquisitionData] = useState<AcquisitionChannel[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    let mounted = true
    const load = async () => {
      try {
        const [totals, actives, recent] = await Promise.all([
          graphqlRequest<{ users: { pageInfo: { totalCount: number } } }>(`query { users(pagination: { limit: 1, offset: 0 }) { pageInfo { totalCount } } }`),
          graphqlRequest<{ users: { pageInfo: { totalCount: number } } }>(`query { users(filters: { isActive: true }, pagination: { limit: 1, offset: 0 }) { pageInfo { totalCount } } }`),
          graphqlRequest<{ users: { edges: { node: { createdAt: string } }[] } }>(`query { users(pagination: { limit: 1000, offset: 0, sortBy: "createdAt", sortOrder: DESC }) { edges { node { createdAt } } } }`),
        ])
        if (!mounted) return
        const totalUsers = totals.users.pageInfo.totalCount
        const activeUsers = actives.users.pageInfo.totalCount
        const today = new Date().toISOString().slice(0,10)
        const createdDates = recent.users.edges.map(e => e.node.createdAt.slice(0,10))
        const newUsersToday = createdDates.filter(d => d === today).length
        const oneWeekAgo = new Date(Date.now() - 7*24*60*60*1000).toISOString().slice(0,10)
        const newUsersThisWeek = createdDates.filter(d => d >= oneWeekAgo).length
        const oneMonthAgo = new Date(new Date().getFullYear(), new Date().getMonth(), 1).toISOString().slice(0,10)
        const newUsersThisMonth = createdDates.filter(d => d >= oneMonthAgo).length

        setMetrics({
          totalUsers,
          activeUsers,
          newUsersToday,
          newUsersThisWeek,
          newUsersThisMonth,
          averageSessionDuration: 0,
          dailyActiveUsers: 0,
          monthlyActiveUsers: activeUsers,
          userRetentionRate: 0,
        })

        // Build growthData: last 6 months buckets
        const growth: { date: string; newUsers: number; totalUsers: number; activeUsers: number }[] = []
        const now = new Date()
        const byMonth: Record<string, number> = {}
        createdDates.forEach(d => {
          const month = d.slice(0,7) + '-01'
          byMonth[month] = (byMonth[month] || 0) + 1
        })
        let runningTotal = 0
        for (let i = 5; i >= 0; i--) {
          const dt = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth() - i, 1))
          const key = dt.toISOString().slice(0,10)
          const newUsers = byMonth[key] || 0
          runningTotal += newUsers
          growth.push({ date: key, newUsers, totalUsers: runningTotal, activeUsers })
        }
        setGrowthData(growth)
        setEngagementData([])
        setAcquisitionData([])
      } catch (e) {
        console.error('Failed to load user analytics', e)
      } finally {
        if (mounted) setLoading(false)
      }
    }
    void load()
    return () => { mounted = false }
  }, [])

  const acquisitionColumns = [
    {
      accessorKey: 'channel',
      header: 'Acquisition Channel',
      sortable: true,
      cell: ({ value }: { value: string }) => (
        <span className="font-medium">{value}</span>
      )
    },
    {
      accessorKey: 'users',
      header: 'Users',
      sortable: true,
      cell: ({ value }: { value: number }) => (
        <span className="font-medium">{value.toLocaleString()}</span>
      )
    },
    {
      accessorKey: 'conversion',
      header: 'Conversion Rate',
      sortable: true,
      cell: ({ value }: { value: number }) => (
        <span className="font-medium">{value}%</span>
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
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <MetricCard
          title="Total Users"
          value={metrics?.totalUsers.toLocaleString()}
          icon="applications"
          onClick={() => console.log('Total users clicked')}
        />
        <MetricCard
          title="Active Users (MAU)"
          value={metrics?.monthlyActiveUsers.toLocaleString()}
          icon="services"
          onClick={() => console.log('Active users clicked')}
        />
        <MetricCard
          title="Daily Active Users"
          value={metrics?.dailyActiveUsers.toLocaleString()}
          icon="api"
          onClick={() => console.log('Daily active users clicked')}
        />
        <MetricCard
          title="Retention Rate"
          value={`${metrics?.userRetentionRate}%`}
          icon="roles"
          onClick={() => console.log('Retention rate clicked')}
        />
      </div>

      {/* Secondary Metrics */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <Card>
          <CardContent className="p-6">
            <div className="flex items-center">
              <div className="p-3 rounded-lg bg-green-100">
                <UserPlusIcon className="h-6 w-6 text-green-600" />
              </div>
              <div className="ml-4 flex-1">
                <p className="text-sm font-medium text-gray-600">New Today</p>
                <p className="text-2xl font-semibold text-gray-900">
                  {metrics?.newUsersToday}
                </p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-6">
            <div className="flex items-center">
              <div className="p-3 rounded-lg bg-blue-100">
                <CalendarDaysIcon className="h-6 w-6 text-blue-600" />
              </div>
              <div className="ml-4 flex-1">
                <p className="text-sm font-medium text-gray-600">New This Week</p>
                <p className="text-2xl font-semibold text-gray-900">
                  {metrics?.newUsersThisWeek}
                </p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-6">
            <div className="flex items-center">
              <div className="p-3 rounded-lg bg-purple-100">
                <ArrowTrendingUpIcon className="h-6 w-6 text-purple-600" />
              </div>
              <div className="ml-4 flex-1">
                <p className="text-sm font-medium text-gray-600">New This Month</p>
                <p className="text-2xl font-semibold text-gray-900">
                  {metrics?.newUsersThisMonth}
                </p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-6">
            <div className="flex items-center">
              <div className="p-3 rounded-lg bg-orange-100">
                <ClockIcon className="h-6 w-6 text-orange-600" />
              </div>
              <div className="ml-4 flex-1">
                <p className="text-sm font-medium text-gray-600">Avg Session</p>
                <p className="text-2xl font-semibold text-gray-900">
                  {metrics?.averageSessionDuration}m
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Charts Row */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* User Growth Trend */}
        <LineChartComponent
          data={growthData}
          dataKey="newUsers"
          xAxisKey="date"
          title="User Growth Trend"
          description="New user registrations over time"
          color="hsl(220, 70%, 50%)"
        />

        {/* Feature Usage */}
        <BarChartComponent
          data={engagementData}
          dataKey="usage"
          xAxisKey="feature"
          title="Feature Usage"
          description="Feature usage percentage by active users"
          color="hsl(280, 70%, 50%)"
        />
      </div>

      {/* Second Charts Row */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Total Users Growth */}
        <LineChartComponent
          data={growthData}
          dataKey="totalUsers"
          xAxisKey="date"
          title="Total Users Growth"
          description="Cumulative user growth over time"
          color="hsl(160, 70%, 50%)"
        />

        {/* Acquisition Channels */}
        <DonutChartComponent
          data={acquisitionData}
          dataKey="users"
          nameKey="channel"
          title="User Acquisition Channels"
          description="Distribution of users by acquisition channel"
          colors={['hsl(220, 70%, 50%)', 'hsl(280, 70%, 50%)', 'hsl(160, 70%, 50%)', 'hsl(30, 70%, 50%)', 'hsl(340, 70%, 50%)', 'hsl(200, 70%, 50%)']}
        />
      </div>

      {/* Acquisition Details Table */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <ArrowTrendingUpIcon className="h-5 w-5" />
            User Acquisition Details
          </CardTitle>
        </CardHeader>
        <CardContent className="p-0">
          <LazyDataTable
            data={acquisitionData}
            columns={acquisitionColumns}
            searchable={false}
            pageSize={10}
            onRowClick={(channel) => console.log('Channel clicked:', channel)}
          />
        </CardContent>
      </Card>
    </div>
  )
}
