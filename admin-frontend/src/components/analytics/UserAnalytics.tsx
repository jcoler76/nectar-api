import {
  UserPlusIcon,
  ArrowTrendingUpIcon,
  ClockIcon,
  CalendarDaysIcon
} from '@heroicons/react/24/outline'
import { useState, useEffect } from 'react'
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
    const timer = setTimeout(() => {
      setMetrics({
        totalUsers: 1247,
        activeUsers: 892,
        newUsersToday: 23,
        newUsersThisWeek: 156,
        newUsersThisMonth: 634,
        averageSessionDuration: 18.5,
        dailyActiveUsers: 325,
        monthlyActiveUsers: 892,
        userRetentionRate: 78.2
      })

      setGrowthData([
        { date: '2024-01-01', newUsers: 45, totalUsers: 1150, activeUsers: 820 },
        { date: '2024-02-01', newUsers: 52, totalUsers: 1202, activeUsers: 845 },
        { date: '2024-03-01', newUsers: 38, totalUsers: 1240, activeUsers: 870 },
        { date: '2024-04-01', newUsers: 47, totalUsers: 1287, activeUsers: 892 },
        { date: '2024-05-01', newUsers: 61, totalUsers: 1348, activeUsers: 915 },
        { date: '2024-06-01', newUsers: 43, totalUsers: 1391, activeUsers: 925 }
      ])

      setEngagementData([
        { feature: 'Dashboard', usage: 95, users: 847 },
        { feature: 'Reports', usage: 78, users: 695 },
        { feature: 'Settings', usage: 45, users: 401 },
        { feature: 'API Access', usage: 32, users: 285 },
        { feature: 'Integrations', usage: 28, users: 249 },
        { feature: 'Analytics', usage: 67, users: 598 }
      ])

      setAcquisitionData([
        { channel: 'Organic Search', users: 425, conversion: 3.2 },
        { channel: 'Direct', users: 312, conversion: 8.5 },
        { channel: 'Social Media', users: 187, conversion: 2.1 },
        { channel: 'Email Campaign', users: 156, conversion: 12.3 },
        { channel: 'Referral', users: 134, conversion: 6.8 },
        { channel: 'Paid Ads', users: 89, conversion: 4.7 }
      ])

      setLoading(false)
    }, 1000)

    return () => clearTimeout(timer)
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
