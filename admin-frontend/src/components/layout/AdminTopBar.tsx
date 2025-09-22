import {
  Bell,
  ChevronRight,
  Menu,
  Moon,
  Search,
  Settings,
  Sun,
  User
} from 'lucide-react'
import { useState } from 'react'

interface TopBarProps {
  sidebarCollapsed: boolean
  onSidebarToggle: () => void
  currentPage?: string
  breadcrumbs?: Array<{ title: string; url?: string }>
  onLogout?: () => void
  onNavigate?: (url: string) => void
}

export default function AdminTopBar({
  sidebarCollapsed,
  onSidebarToggle,
  currentPage = 'Dashboard',
  breadcrumbs = [],
  onLogout,
  onNavigate
}: TopBarProps) {
  const [darkMode, setDarkMode] = useState(false)
  const [showNotifications, setShowNotifications] = useState(false)
  const [showUserMenu, setShowUserMenu] = useState(false)
  const [showMobileSearch, setShowMobileSearch] = useState(false)

  // Map URLs to user-friendly names
  const urlToNameMap: Record<string, string> = {
    '/dashboard': 'Dashboard',
    '/crm': 'CRM',
    '/crm/leads': 'Leads',
    '/crm/conversations': 'Conversations',
    '/analytics': 'Analytics',
    '/analytics/revenue': 'Revenue Dashboard',
    '/analytics/users': 'User Analytics',
    '/analytics/churn': 'Churn Analysis',
    '/users': 'User Management',
    '/users/all': 'All Users',
    '/users/organizations': 'Organizations',
    '/users/subscriptions': 'Subscriptions',
    '/billing': 'Billing',
    '/billing/overview': 'Billing Overview',
    '/billing/transactions': 'Transactions',
    '/billing/stripe': 'Stripe Configuration',
    '/licensing': 'Licensing',
    '/licensing/overview': 'License Overview',
    '/licensing/licenses': 'All Licenses',
    '/licensing/customers': 'Customer Licenses',
    '/licensing/usage': 'Usage Analytics',
    '/licensing/analytics': 'Advanced Analytics',
    '/licensing/lifecycle': 'License Lifecycle',
    '/licensing/health': 'System Health',
    '/system': 'System',
    '/system/config': 'Configuration',
    '/system/audit': 'Audit Logs',
    '/system/announcements': 'Announcements',
    '/system/security': 'Security Settings',
    '/system/app-keys': 'Application Keys'
  }

  const getFriendlyName = (url: string): string => {
    return urlToNameMap[url] || url.replace(/^\//, '').replace(/-/g, ' ').replace(/\b\w/g, l => l.toUpperCase())
  }

  const notifications = [
    { id: 1, title: 'New user registration', time: '2 minutes ago', unread: true },
    { id: 2, title: 'Payment received', time: '1 hour ago', unread: true },
    { id: 3, title: 'System backup completed', time: '3 hours ago', unread: false }
  ]

  const unreadCount = notifications.filter(n => n.unread).length

  return (
    <header
      className="fixed top-0 z-30 bg-white border-b border-gray-200 shadow-sm transition-all duration-300"
      style={{
        left: sidebarCollapsed ? '4rem' : '18rem',
        width: sidebarCollapsed ? 'calc(100% - 4rem)' : 'calc(100% - 18rem)',
      }}
    >
      <div className="px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-16">
          
          {/* Left side */}
          <div className="flex items-center space-x-4">

            {/* Breadcrumbs - Desktop */}
            <nav className="hidden sm:flex items-center space-x-2 text-sm">
              <span className="text-gray-500">Admin</span>
              {breadcrumbs.length > 0 && (
                <>
                  <ChevronRight className="h-4 w-4 text-gray-400" />
                  {breadcrumbs.map((crumb, index) => (
                    <div key={index} className="flex items-center space-x-2">
                      {crumb.url ? (
                        <button className="text-gray-500 hover:text-gray-700">
                          {getFriendlyName(crumb.title)}
                        </button>
                      ) : (
                        <span className="text-gray-900 font-medium">{getFriendlyName(crumb.title)}</span>
                      )}
                      {index < breadcrumbs.length - 1 && (
                        <ChevronRight className="h-4 w-4 text-gray-400" />
                      )}
                    </div>
                  ))}
                </>
              )}
              {breadcrumbs.length === 0 && (
                <>
                  <ChevronRight className="h-4 w-4 text-gray-400" />
                  <span className="text-gray-900 font-medium">{getFriendlyName(currentPage)}</span>
                </>
              )}
            </nav>

            {/* Page title - Mobile */}
            <h1 className="sm:hidden text-lg font-semibold text-gray-900">
              {getFriendlyName(currentPage)}
            </h1>
          </div>

          {/* Right side */}
          <div className="flex items-center space-x-3">
            
            {/* Search - Desktop */}
            <div className="hidden md:block relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
              <input
                type="text"
                placeholder="Search admin panel..."
                className="w-64 pl-10 pr-4 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              />
            </div>

            {/* Search - Mobile */}
            <button
              onClick={() => setShowMobileSearch(true)}
              className="md:hidden p-2 rounded-md text-gray-600 hover:text-gray-900 hover:bg-gray-100"
            >
              <Search className="h-5 w-5" />
            </button>

            {/* Theme toggle */}
            <button
              onClick={() => setDarkMode(!darkMode)}
              className="p-2 rounded-md text-gray-600 hover:text-gray-900 hover:bg-gray-100 transition-colors"
            >
              {darkMode ? (
                <Sun className="h-5 w-5" />
              ) : (
                <Moon className="h-5 w-5" />
              )}
            </button>

            {/* Notifications */}
            <div className="relative">
              <button
                onClick={() => setShowNotifications(!showNotifications)}
                className="p-2 rounded-md text-gray-600 hover:text-gray-900 hover:bg-gray-100 transition-colors"
              >
                <Bell className="h-5 w-5" />
                {unreadCount > 0 && (
                  <span className="absolute -top-1 -right-1 h-5 w-5 bg-red-500 rounded-full flex items-center justify-center text-xs text-white font-medium">
                    {unreadCount}
                  </span>
                )}
              </button>

              {/* Notifications dropdown */}
              {showNotifications && (
                <div className="absolute right-0 mt-2 w-80 bg-white rounded-lg shadow-lg border border-gray-200 py-2 z-50">
                  <div className="px-4 py-2 border-b border-gray-100">
                    <h3 className="text-sm font-semibold text-gray-900">Notifications</h3>
                  </div>
                  <div className="max-h-64 overflow-y-auto">
                    {notifications.map((notification) => (
                      <div
                        key={notification.id}
                        className={`px-4 py-3 hover:bg-gray-50 border-l-2 ${
                          notification.unread ? 'border-blue-500 bg-blue-50/30' : 'border-transparent'
                        }`}
                      >
                        <p className="text-sm text-gray-900">{notification.title}</p>
                        <p className="text-xs text-gray-500 mt-1">{notification.time}</p>
                      </div>
                    ))}
                  </div>
                  <div className="px-4 py-2 border-t border-gray-100">
                    <button className="text-sm text-blue-600 hover:text-blue-700">
                      View all notifications
                    </button>
                  </div>
                </div>
              )}
            </div>

            {/* Settings */}
            <button className="p-2 rounded-md text-gray-600 hover:text-gray-900 hover:bg-gray-100 transition-colors">
              <Settings className="h-5 w-5" />
            </button>

            {/* User menu */}
            <div className="relative">
              <button
                onClick={() => setShowUserMenu(!showUserMenu)}
                className="flex items-center space-x-3 p-2 rounded-md hover:bg-gray-100 transition-colors"
              >
                <div className="w-8 h-8 bg-blue-600 rounded-full flex items-center justify-center">
                  <User className="h-4 w-4 text-white" />
                </div>
                <div className="hidden lg:block text-left">
                  <p className="text-sm font-medium text-gray-900">Administrator</p>
                  <p className="text-xs text-gray-500">System Admin</p>
                </div>
              </button>

              {/* User dropdown */}
              {showUserMenu && (
                <div className="absolute right-0 mt-2 w-48 bg-white rounded-lg shadow-lg border border-gray-200 py-2 z-50">
                  <button 
                    onClick={() => {
                      setShowUserMenu(false)
                      onNavigate?.('/admin/profile')
                    }}
                    className="w-full px-4 py-2 text-left text-sm text-gray-700 hover:bg-gray-100"
                  >
                    Profile Settings
                  </button>
                  <button
                    onClick={() => {
                      setShowUserMenu(false)
                      onNavigate?.('/admin/account')
                    }}
                    className="w-full px-4 py-2 text-left text-sm text-gray-700 hover:bg-gray-100"
                  >
                    Account
                  </button>
                  <button
                    onClick={() => {
                      setShowUserMenu(false)
                      onNavigate?.('/admin-users')
                    }}
                    className="w-full px-4 py-2 text-left text-sm text-gray-700 hover:bg-gray-100"
                  >
                    Admin Users
                  </button>
                  <hr className="my-1" />
                  <button
                    onClick={onLogout}
                    className="w-full px-4 py-2 text-left text-sm text-gray-700 hover:bg-gray-100"
                  >
                    Sign Out
                  </button>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Mobile search modal */}
      {showMobileSearch && (
        <div className="fixed inset-0 z-50 md:hidden">
          <div className="fixed inset-0 bg-gray-600 bg-opacity-75" onClick={() => setShowMobileSearch(false)} />
          <div className="fixed inset-x-0 top-0 bg-white p-4">
            <div className="flex items-center space-x-3">
              <Search className="h-5 w-5 text-gray-400" />
              <input
                type="text"
                placeholder="Search admin panel..."
                autoFocus
                className="flex-1 border-none outline-none text-gray-900 placeholder-gray-500"
              />
              <button
                onClick={() => setShowMobileSearch(false)}
                className="text-gray-500 hover:text-gray-700"
              >
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Click outside handlers */}
      {(showNotifications || showUserMenu) && (
        <div 
          className="fixed inset-0 z-20" 
          onClick={() => {
            setShowNotifications(false)
            setShowUserMenu(false)
          }} 
        />
      )}
    </header>
  )
}