import {
    Activity,
    BarChart3,
    Database,
    Server,
    Settings,
    Users
} from 'lucide-react'
import { useEffect, useState } from 'react'
import AdminLayout from './layout/AdminLayout'
import RevenueDashboard from './analytics/RevenueDashboard'
import UserAnalytics from './analytics/UserAnalytics'
import ChurnAnalysis from './analytics/ChurnAnalysis'
import UserManagement from './users/UserManagement'
import OrganizationManagement from './users/OrganizationManagement'
import SubscriptionManagement from './users/SubscriptionManagement'
import BillingDashboard from './billing/BillingDashboard'
import StripeConfiguration from './billing/StripeConfiguration'
import TransactionReport from './billing/TransactionReport'

interface DashboardStats {
  totalUsers: number
  activeUsers: number
  totalSubscriptions: number
  monthlyRevenue: number
}

interface AdminDashboardProps {
  onLogout: () => void
}

export default function AdminDashboard({ onLogout }: AdminDashboardProps) {
  const [stats, setStats] = useState<DashboardStats | null>(null)
  const [loading, setLoading] = useState(true)
  const [currentPage, setCurrentPage] = useState('/dashboard')

  useEffect(() => {
    // Simulate loading dashboard data
    const timer = setTimeout(() => {
      setStats({
        totalUsers: 1247,
        activeUsers: 892,
        totalSubscriptions: 634,
        monthlyRevenue: 45230
      })
      setLoading(false)
    }, 1500)

    return () => clearTimeout(timer)
  }, [])

  const handleNavigation = (url: string) => {
    setCurrentPage(url)
    // For now, just update the current page
    // In a real app, you'd use React Router or similar
    console.log('Navigating to:', url)
  }

  const StatCard = ({ icon: Icon, title, value, subtitle, color = "blue" }: any) => (
    <div className="bg-white rounded-lg shadow p-6 border border-gray-200">
      <div className="flex items-center">
        <div className={`p-3 rounded-lg bg-${color}-100`}>
          <Icon className={`h-6 w-6 text-${color}-600`} />
        </div>
        <div className="ml-4 flex-1">
          <p className="text-sm font-medium text-gray-600">{title}</p>
          <div className="flex items-baseline">
            <p className="text-2xl font-semibold text-gray-900">{value}</p>
            {subtitle && (
              <p className="ml-2 text-sm text-gray-500">{subtitle}</p>
            )}
          </div>
        </div>
      </div>
    </div>
  )

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto"></div>
          <p className="mt-4 text-gray-600">Loading admin dashboard...</p>
        </div>
      </div>
    )
  }

  const getPageTitle = () => {
    switch (currentPage) {
      case '/dashboard': return 'Dashboard'
      case '/analytics': return 'Analytics'
      case '/analytics/revenue': return 'Revenue Analytics'
      case '/analytics/users': return 'User Analytics'
      case '/analytics/churn': return 'Churn Analysis'
      case '/users': return 'User Management'
      case '/users/all': return 'All Users'
      case '/users/organizations': return 'Organizations'
      case '/users/subscriptions': return 'Subscriptions'
      case '/billing': return 'Billing'
      case '/billing/overview': return 'Billing Overview'
      case '/billing/transactions': return 'Transactions'
      case '/billing/stripe': return 'Stripe Configuration'
      case '/system': return 'System'
      case '/system/config': return 'System Configuration'
      case '/system/audit': return 'Audit Logs'
      case '/system/announcements': return 'Announcements'
      default: return 'Dashboard'
    }
  }

  return (
    <AdminLayout 
      onLogout={onLogout} 
      currentPage={currentPage}
      onNavigate={handleNavigation}
    >
      <div className="max-w-7xl mx-auto">
        {/* Page Title */}
        <div className="mb-6">
          <h1 className="text-2xl font-bold text-gray-900">{getPageTitle()}</h1>
          <p className="text-gray-600">
            {currentPage === '/dashboard' ? 'Overview of system metrics and activity' :
             currentPage.startsWith('/analytics') ? 'Revenue and usage analytics' :
             currentPage.startsWith('/users') ? 'User and organization management' :
             currentPage.startsWith('/billing') ? 'Billing and subscription management' :
             currentPage.startsWith('/system') ? 'System configuration and maintenance' :
             'Admin portal navigation'}
          </p>
        </div>

        {/* Conditional Content */}
        {currentPage === '/dashboard' && (
          <>
            {/* Stats Grid */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
          <StatCard
            icon={Users}
            title="Total Users"
            value={stats?.totalUsers.toLocaleString()}
            subtitle="registered"
            color="blue"
          />
          <StatCard
            icon={Activity}
            title="Active Users"
            value={stats?.activeUsers.toLocaleString()}
            subtitle="this month"
            color="green"
          />
          <StatCard
            icon={Server}
            title="Subscriptions"
            value={stats?.totalSubscriptions.toLocaleString()}
            subtitle="active"
            color="purple"
          />
          <StatCard
            icon={BarChart3}
            title="Monthly Revenue"
            value={`$${stats?.monthlyRevenue.toLocaleString()}`}
            subtitle="MRR"
            color="orange"
          />
        </div>

        {/* Quick Actions */}
        <div className="bg-white rounded-lg shadow mb-8">
          <div className="px-6 py-4 border-b border-gray-200">
            <h2 className="text-lg font-semibold text-gray-900">Quick Actions</h2>
          </div>
          <div className="p-6">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <button className="flex items-center p-4 border border-gray-200 rounded-lg hover:bg-gray-50 transition-colors">
                <Users className="h-5 w-5 text-gray-500 mr-3" />
                <span className="text-sm font-medium text-gray-700">Manage Users</span>
              </button>
              <button className="flex items-center p-4 border border-gray-200 rounded-lg hover:bg-gray-50 transition-colors">
                <Database className="h-5 w-5 text-gray-500 mr-3" />
                <span className="text-sm font-medium text-gray-700">View Reports</span>
              </button>
              <button className="flex items-center p-4 border border-gray-200 rounded-lg hover:bg-gray-50 transition-colors">
                <Settings className="h-5 w-5 text-gray-500 mr-3" />
                <span className="text-sm font-medium text-gray-700">System Settings</span>
              </button>
            </div>
          </div>
        </div>

        {/* System Status */}
        <div className="bg-white rounded-lg shadow">
          <div className="px-6 py-4 border-b border-gray-200">
            <h2 className="text-lg font-semibold text-gray-900">System Status</h2>
          </div>
          <div className="p-6">
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <div className="flex items-center">
                  <div className="h-2 w-2 bg-green-400 rounded-full mr-3"></div>
                  <span className="text-sm text-gray-700">API Services</span>
                </div>
                <span className="text-sm text-green-600 font-medium">Operational</span>
              </div>
              <div className="flex items-center justify-between">
                <div className="flex items-center">
                  <div className="h-2 w-2 bg-green-400 rounded-full mr-3"></div>
                  <span className="text-sm text-gray-700">Database</span>
                </div>
                <span className="text-sm text-green-600 font-medium">Healthy</span>
              </div>
              <div className="flex items-center justify-between">
                <div className="flex items-center">
                  <div className="h-2 w-2 bg-yellow-400 rounded-full mr-3"></div>
                  <span className="text-sm text-gray-700">Background Jobs</span>
                </div>
                <span className="text-sm text-yellow-600 font-medium">Delayed</span>
              </div>
            </div>
          </div>
        </div>
          </>
        )}

        {/* Analytics Pages */}
        {currentPage === '/analytics/revenue' && <RevenueDashboard />}
        {currentPage === '/analytics/users' && <UserAnalytics />}
        {currentPage === '/analytics/churn' && <ChurnAnalysis />}
        
        {/* User Management Pages */}
        {currentPage === '/users/all' && <UserManagement />}
        {currentPage === '/users/organizations' && <OrganizationManagement />}
        {currentPage === '/users/subscriptions' && <SubscriptionManagement />}
        
        {/* Billing Pages */}
        {currentPage === '/billing/overview' && <BillingDashboard />}
        {currentPage === '/billing/transactions' && <TransactionReport />}
        {currentPage === '/billing/stripe' && <StripeConfiguration />}
        
        {/* Other Pages */}
        {currentPage !== '/dashboard' && 
         currentPage !== '/analytics/revenue' &&
         currentPage !== '/analytics/users' &&
         currentPage !== '/analytics/churn' &&
         currentPage !== '/users/all' &&
         currentPage !== '/users/organizations' &&
         currentPage !== '/users/subscriptions' &&
         currentPage !== '/billing/overview' &&
         currentPage !== '/billing/transactions' &&
         currentPage !== '/billing/stripe' && (
          <div className="bg-white rounded-lg shadow p-8">
            <div className="text-center">
              <h2 className="text-xl font-semibold text-gray-900 mb-4">{getPageTitle()}</h2>
              <p className="text-gray-600 mb-6">
                This page is under development. The navigation system is working - you can see the active page updating in the sidebar and title.
              </p>
              <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                <p className="text-blue-700 font-medium">Current Route: {currentPage}</p>
                <p className="text-blue-600 text-sm mt-1">
                  Multiple sections are now available: Analytics (Revenue, Users, Churn), User Management (Users, Organizations, Subscriptions), and Billing Overview!
                </p>
              </div>
            </div>
          </div>
        )}
      </div>
    </AdminLayout>
  )
}