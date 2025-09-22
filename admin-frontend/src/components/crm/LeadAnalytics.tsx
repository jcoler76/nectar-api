import { useCallback, useEffect, useState } from 'react'
import { TrendingUp, Users, Target, Award, Filter, Calendar, BarChart3 } from 'lucide-react'
import ActivityChart from '../dashboard/ActivityChart'

interface AnalyticsData {
  totalContacts: number
  conversionFunnel: Array<{ status: string; count: number }>
  sourceAttribution: Array<{ source: string; count: number }>
  leadsByDay: Record<string, number>
  averageLeadScore: number
}

const API_BASE: string = (
  (import.meta as unknown as { env?: { VITE_ADMIN_API_URL?: string } }).env?.VITE_ADMIN_API_URL ||
  'http://localhost:4001'
)

const STATUS_COLORS = {
  NEW: '#3B82F6',
  QUALIFIED: '#10B981',
  NEGOTIATING: '#F59E0B',
  CONVERTED: '#059669',
  LOST: '#EF4444',
}

const STATUS_LABELS = {
  NEW: 'New Leads',
  QUALIFIED: 'Qualified',
  NEGOTIATING: 'Negotiating',
  CONVERTED: 'Converted',
  LOST: 'Lost',
}

export default function LeadAnalytics() {
  const [analytics, setAnalytics] = useState<AnalyticsData | null>(null)
  const [loading, setLoading] = useState(true)
  const [dateRange, setDateRange] = useState<'7d' | '30d' | '90d'>('30d')

  const token = localStorage.getItem('admin_token')

  const loadAnalytics = useCallback(async () => {
    setLoading(true)
    try {
      const res = await fetch(`${API_BASE}/api/crm/analytics`, {
        headers: { 'Authorization': `Bearer ${token}` },
      })
      const data = await res.json()
      if (data?.data) {
        setAnalytics(data.data)
      }
    } catch (error) {
      console.error('Failed to load analytics:', error)
    } finally {
      setLoading(false)
    }
  }, [token])

  useEffect(() => {
    void loadAnalytics()
  }, [loadAnalytics])

  const getConversionRate = () => {
    if (!analytics?.conversionFunnel) return 0
    const total = analytics.conversionFunnel.reduce((sum, stage) => sum + stage.count, 0)
    const converted = analytics.conversionFunnel.find(stage => stage.status === 'CONVERTED')?.count || 0
    return total > 0 ? Math.round((converted / total) * 100) : 0
  }

  const getQualificationRate = () => {
    if (!analytics?.conversionFunnel) return 0
    const newLeads = analytics.conversionFunnel.find(stage => stage.status === 'NEW')?.count || 0
    const qualified = analytics.conversionFunnel.find(stage => stage.status === 'QUALIFIED')?.count || 0
    const negotiating = analytics.conversionFunnel.find(stage => stage.status === 'NEGOTIATING')?.count || 0
    const converted = analytics.conversionFunnel.find(stage => stage.status === 'CONVERTED')?.count || 0

    const qualifiedTotal = qualified + negotiating + converted
    return newLeads > 0 ? Math.round((qualifiedTotal / (newLeads + qualifiedTotal)) * 100) : 0
  }

  // Transform daily leads data for the chart
  const chartData = analytics?.leadsByDay
    ? Object.entries(analytics.leadsByDay)
        .sort(([a], [b]) => new Date(a).getTime() - new Date(b).getTime())
        .map(([date, count]) => ({
          time: date,
          leads: count
        }))
    : []

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
        <span className="ml-3 text-gray-600">Loading analytics...</span>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="bg-white rounded-lg shadow border border-gray-200 p-6">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-2xl font-bold text-gray-900">Lead Analytics</h2>
            <p className="text-gray-600">Insights into your lead generation and conversion performance</p>
          </div>
          <div className="flex items-center gap-2">
            <select
              value={dateRange}
              onChange={e => setDateRange(e.target.value as '7d' | '30d' | '90d')}
              className="px-3 py-2 border rounded-md text-sm"
            >
              <option value="7d">Last 7 days</option>
              <option value="30d">Last 30 days</option>
              <option value="90d">Last 90 days</option>
            </select>
          </div>
        </div>
      </div>

      {/* Key Metrics */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <div className="bg-white rounded-lg shadow border border-gray-200 p-6">
          <div className="flex items-center">
            <div className="p-3 rounded-lg bg-blue-100">
              <Users className="h-6 w-6 text-blue-600" />
            </div>
            <div className="ml-4">
              <p className="text-sm font-medium text-gray-600">Total Leads</p>
              <p className="text-2xl font-semibold text-gray-900">{analytics?.totalContacts || 0}</p>
            </div>
          </div>
        </div>

        <div className="bg-white rounded-lg shadow border border-gray-200 p-6">
          <div className="flex items-center">
            <div className="p-3 rounded-lg bg-green-100">
              <Target className="h-6 w-6 text-green-600" />
            </div>
            <div className="ml-4">
              <p className="text-sm font-medium text-gray-600">Conversion Rate</p>
              <p className="text-2xl font-semibold text-gray-900">{getConversionRate()}%</p>
            </div>
          </div>
        </div>

        <div className="bg-white rounded-lg shadow border border-gray-200 p-6">
          <div className="flex items-center">
            <div className="p-3 rounded-lg bg-yellow-100">
              <TrendingUp className="h-6 w-6 text-yellow-600" />
            </div>
            <div className="ml-4">
              <p className="text-sm font-medium text-gray-600">Qualification Rate</p>
              <p className="text-2xl font-semibold text-gray-900">{getQualificationRate()}%</p>
            </div>
          </div>
        </div>

        <div className="bg-white rounded-lg shadow border border-gray-200 p-6">
          <div className="flex items-center">
            <div className="p-3 rounded-lg bg-purple-100">
              <Award className="h-6 w-6 text-purple-600" />
            </div>
            <div className="ml-4">
              <p className="text-sm font-medium text-gray-600">Avg Lead Score</p>
              <p className="text-2xl font-semibold text-gray-900">{analytics?.averageLeadScore || 0}</p>
            </div>
          </div>
        </div>
      </div>

      {/* Lead Generation Trend */}
      <div className="bg-white rounded-lg shadow border border-gray-200 p-6">
        <div className="flex items-center justify-between mb-6">
          <h3 className="text-lg font-semibold text-gray-900">Lead Generation Trend</h3>
          <div className="flex items-center gap-2 text-sm text-gray-500">
            <Calendar className="h-4 w-4" />
            Last 30 days
          </div>
        </div>
        {chartData.length > 0 ? (
          <ActivityChart
            data={chartData}
            xKey="time"
            yKey="leads"
            height={300}
            showAverage={true}
          />
        ) : (
          <div className="flex items-center justify-center h-64 text-gray-500">
            <div className="text-center">
              <Calendar className="h-12 w-12 mx-auto mb-2 text-gray-400" />
              <p>No lead data available for the selected period</p>
            </div>
          </div>
        )}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Conversion Funnel */}
        <div className="bg-white rounded-lg shadow border border-gray-200 p-6">
          <h3 className="text-lg font-semibold text-gray-900 mb-6">Conversion Funnel</h3>
          <div className="space-y-4">
            {analytics?.conversionFunnel && analytics.conversionFunnel.length > 0 ?
              analytics.conversionFunnel.map((stage, index) => {
                const total = analytics.conversionFunnel.reduce((sum, s) => sum + s.count, 0)
                const percentage = total > 0 ? Math.round((stage.count / total) * 100) : 0

                return (
                  <div key={stage.status} className="relative">
                    <div className="flex items-center justify-between mb-2">
                      <span className="text-sm font-medium text-gray-700">
                        {STATUS_LABELS[stage.status as keyof typeof STATUS_LABELS] || stage.status}
                      </span>
                      <div className="flex items-center gap-2">
                        <span className="text-sm text-gray-500">{stage.count}</span>
                        <span className="text-xs text-gray-400">({percentage}%)</span>
                      </div>
                    </div>
                    <div className="w-full bg-gray-200 rounded-full h-3">
                      <div
                        className="h-3 rounded-full transition-all duration-300"
                        style={{
                          width: `${percentage}%`,
                          backgroundColor: STATUS_COLORS[stage.status as keyof typeof STATUS_COLORS] || '#6B7280'
                        }}
                      ></div>
                    </div>
                  </div>
                )
              })
            : (
              <p className="text-gray-500 text-center py-8">No funnel data available</p>
            )}
          </div>
        </div>

        {/* Source Attribution */}
        <div className="bg-white rounded-lg shadow border border-gray-200 p-6">
          <h3 className="text-lg font-semibold text-gray-900 mb-6">Lead Sources</h3>
          <div className="space-y-4">
            {analytics?.sourceAttribution && analytics.sourceAttribution.length > 0 ?
              analytics.sourceAttribution.slice(0, 6).map((source, index) => {
                const total = analytics.sourceAttribution.reduce((sum, s) => sum + s.count, 0)
                const percentage = total > 0 ? Math.round((source.count / total) * 100) : 0
                const colors = ['#3B82F6', '#10B981', '#F59E0B', '#EF4444', '#8B5CF6', '#06B6D4']

                return (
                  <div key={source.source} className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <div
                        className="w-3 h-3 rounded-full"
                        style={{ backgroundColor: colors[index % colors.length] }}
                      ></div>
                      <span className="text-sm font-medium text-gray-700 capitalize">
                        {source.source}
                      </span>
                    </div>
                    <div className="flex items-center gap-2">
                      <span className="text-sm text-gray-900">{source.count}</span>
                      <span className="text-xs text-gray-400">({percentage}%)</span>
                    </div>
                  </div>
                )
              })
            : (
              <p className="text-gray-500 text-center py-8">No source data available</p>
            )}
          </div>
        </div>
      </div>

      {/* Performance Summary */}
      <div className="bg-white rounded-lg shadow border border-gray-200 p-6">
        <h3 className="text-lg font-semibold text-gray-900 mb-4">Performance Summary</h3>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <div className="bg-blue-50 rounded-lg p-4">
            <h4 className="font-medium text-blue-900 mb-2">Lead Volume</h4>
            <p className="text-sm text-blue-700">
              You have {analytics?.totalContacts || 0} total leads in your pipeline.
              {analytics?.conversionFunnel && analytics.conversionFunnel.find(s => s.status === 'NEW')?.count
                ? ` ${analytics.conversionFunnel.find(s => s.status === 'NEW')?.count} are new and need attention.`
                : ' Keep generating more leads to fill your pipeline.'
              }
            </p>
          </div>

          <div className="bg-green-50 rounded-lg p-4">
            <h4 className="font-medium text-green-900 mb-2">Conversion Health</h4>
            <p className="text-sm text-green-700">
              Your conversion rate is {getConversionRate()}%.
              {getConversionRate() >= 20 ? ' This is excellent!' :
               getConversionRate() >= 10 ? ' This is good, but there\'s room for improvement.' :
               ' Consider improving your qualification process.'
              }
            </p>
          </div>

          <div className="bg-yellow-50 rounded-lg p-4">
            <h4 className="font-medium text-yellow-900 mb-2">Lead Quality</h4>
            <p className="text-sm text-yellow-700">
              Your average lead score is {analytics?.averageLeadScore || 0}.
              {(analytics?.averageLeadScore || 0) >= 60 ? ' Your leads are high quality!' :
               (analytics?.averageLeadScore || 0) >= 40 ? ' Lead quality is moderate.' :
               ' Focus on attracting higher quality leads.'
              }
            </p>
          </div>
        </div>
      </div>
    </div>
  )
}