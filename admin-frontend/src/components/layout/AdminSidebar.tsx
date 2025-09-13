import {
  BarChart3,
  ChevronDown,
  ChevronRight,
  Database,
  DollarSign,
  LogOut,
  Search,
  Settings,
  Shield,
  Key as KeyIcon,
  Users,
  X
} from 'lucide-react'
import { useState, useMemo } from 'react'

interface SidebarProps {
  collapsed: boolean
  onToggle: () => void
  onLogout: () => void
  currentPage?: string
  onNavigate?: (url: string) => void
}

interface MenuItem {
  title: string
  icon: React.ComponentType<{ className?: string }>
  url: string
  active?: boolean
  children?: MenuItem[]
}

export default function AdminSidebar({ collapsed, onToggle, onLogout, currentPage = '/dashboard', onNavigate }: SidebarProps) {
  const [searchTerm, setSearchTerm] = useState('')
  const [expandedSections, setExpandedSections] = useState<Set<string>>(new Set(['analytics']))

  const menuItems: MenuItem[] = useMemo(() => ([
    {
      title: 'Dashboard',
      icon: BarChart3,
      url: '/dashboard',
      active: currentPage === '/dashboard'
    },
    {
      title: 'CRM',
      icon: Users,
      url: '/crm',
      children: [
        { title: 'Leads', icon: Users, url: '/crm/leads' },
        { title: 'Conversations', icon: Database, url: '/crm/conversations' }
      ]
    },
    {
      title: 'Analytics',
      icon: BarChart3,
      url: '/analytics',
      children: [
        { title: 'Revenue Dashboard', icon: DollarSign, url: '/analytics/revenue' },
        { title: 'User Analytics', icon: Users, url: '/analytics/users' },
        { title: 'Churn Analysis', icon: BarChart3, url: '/analytics/churn' }
      ]
    },
    {
      title: 'User Management',
      icon: Users,
      url: '/users',
      children: [
        { title: 'All Users', icon: Users, url: '/users/all' },
        { title: 'Organizations', icon: Database, url: '/users/organizations' },
        { title: 'Subscriptions', icon: DollarSign, url: '/users/subscriptions' }
      ]
    },
    {
      title: 'Billing',
      icon: DollarSign,
      url: '/billing',
      children: [
        { title: 'Overview', icon: BarChart3, url: '/billing/overview' },
        { title: 'Transactions', icon: DollarSign, url: '/billing/transactions' },
        { title: 'Stripe Config', icon: Settings, url: '/billing/stripe' }
      ]
    },
    {
      title: 'System',
      icon: Settings,
      url: '/system',
      children: [
        { title: 'Configuration', icon: Settings, url: '/system/config' },
        { title: 'Audit Logs', icon: Database, url: '/system/audit' },
        { title: 'Announcements', icon: Database, url: '/system/announcements' },
        { title: 'Security Settings', icon: Shield, url: '/system/security' },
        { title: 'Application Keys', icon: KeyIcon, url: '/system/app-keys' }
      ]
    }
  ]), [currentPage])

  const filteredMenuItems = useMemo(() => {
    if (!searchTerm) return menuItems
    
    return menuItems.filter(item => {
      const titleMatch = item.title.toLowerCase().includes(searchTerm.toLowerCase())
      const childrenMatch = item.children?.some(child => 
        child.title.toLowerCase().includes(searchTerm.toLowerCase())
      )
      return titleMatch || childrenMatch
    })
  }, [searchTerm, menuItems])

  const toggleSection = (title: string) => {
    const newExpanded = new Set(expandedSections)
    if (newExpanded.has(title)) {
      newExpanded.delete(title)
    } else {
      newExpanded.add(title)
    }
    setExpandedSections(newExpanded)
  }

  const MenuItem = ({ item }: { item: MenuItem }) => {
    const hasChildren = item.children && item.children.length > 0
    const isExpanded = expandedSections.has(item.title)
    const Icon = item.icon

    return (
      <div className="mb-1">
        <button
          onClick={() => {
            if (hasChildren) {
              toggleSection(item.title)
            } else if (onNavigate) {
              onNavigate(item.url)
            }
          }}
          className={`w-full flex items-center px-3 py-2.5 text-sm font-medium rounded-lg transition-colors duration-200 group ${
            item.active 
              ? 'bg-white/20 text-white shadow-lg' 
              : 'text-blue-100 hover:bg-white/10 hover:text-white'
          }`}
        >
          <Icon className="h-5 w-5 flex-shrink-0" />
          {!collapsed && (
            <>
              <span className="ml-3 flex-1 text-left">{item.title}</span>
              {hasChildren && (
                isExpanded ? 
                  <ChevronDown className="h-4 w-4" /> : 
                  <ChevronRight className="h-4 w-4" />
              )}
            </>
          )}
        </button>

        {hasChildren && isExpanded && !collapsed && (
          <div className="ml-6 mt-1 space-y-1">
            {item.children?.map((child) => (
              <button
                key={child.url}
                onClick={() => onNavigate && onNavigate(child.url)}
                className="w-full flex items-center px-3 py-2 text-sm text-blue-100 hover:bg-white/10 hover:text-white rounded-lg transition-colors duration-200"
              >
                <child.icon className="h-4 w-4 flex-shrink-0" />
                <span className="ml-3">{child.title}</span>
              </button>
            ))}
          </div>
        )}
      </div>
    )
  }

  return (
    <>
      {/* Mobile backdrop */}
      {!collapsed && (
        <div className="fixed inset-0 z-40 bg-gray-600 bg-opacity-75 lg:hidden" onClick={onToggle} />
      )}

      {/* Sidebar */}
      <div className={`fixed inset-y-0 left-0 z-50 flex flex-col transition-all duration-300 ease-in-out shadow-xl ${
        collapsed ? 'w-16 lg:w-18' : 'w-72'
      }`} style={{ background: 'linear-gradient(135deg, #0c4a6e 0%, #38bdf8 100%)' }}>
        
        {/* Header */}
        <div className="flex items-center justify-between p-4 border-b border-blue-400/30">
          {!collapsed ? (
            <>
              <div className="flex items-center">
                <div className="w-8 h-8 bg-blue-600 rounded-lg flex items-center justify-center">
                  <Shield className="h-5 w-5 text-white" />
                </div>
                <div className="ml-3">
                  <h1 className="text-white font-semibold text-lg">Admin Portal</h1>
                  <p className="text-blue-200 text-xs">NectarStudio.ai</p>
                </div>
              </div>
              <button 
                onClick={onToggle}
                className="p-1 rounded-md text-blue-200 hover:text-white hover:bg-white/10 transition-colors lg:hidden"
              >
                <X className="h-5 w-5" />
              </button>
            </>
          ) : (
            <div className="w-8 h-8 bg-blue-600 rounded-lg flex items-center justify-center mx-auto">
              <Shield className="h-5 w-5 text-white" />
            </div>
          )}
        </div>

        {/* Search */}
        {!collapsed && (
          <div className="p-4 border-b border-blue-400/30">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-blue-300" />
              <input
                type="text"
                placeholder="Search admin..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full pl-10 pr-4 py-2 bg-blue-800/30 border border-blue-400/40 rounded-lg text-white placeholder-blue-200 focus:outline-none focus:ring-2 focus:ring-blue-400 focus:border-transparent"
              />
            </div>
          </div>
        )}

        {/* Navigation */}
        <nav className="flex-1 overflow-y-auto p-4 space-y-1">
          {filteredMenuItems.map((item) => (
            <MenuItem key={item.url} item={item} />
          ))}
        </nav>

        {/* User section */}
        <div className="border-t border-blue-400/30 p-4">
          <div className="flex items-center space-x-3">
            <div className="w-8 h-8 bg-blue-600 rounded-full flex items-center justify-center">
              <Users className="h-4 w-4 text-white" />
            </div>
            {!collapsed && (
              <div className="flex-1">
                <p className="text-white text-sm font-medium">Administrator</p>
                <p className="text-blue-200 text-xs">System Admin</p>
              </div>
            )}
          </div>
          
          {!collapsed && (
            <button
              onClick={onLogout}
              className="w-full mt-3 flex items-center px-3 py-2 text-sm text-blue-100 hover:bg-white/10 hover:text-white rounded-lg transition-colors duration-200"
            >
              <LogOut className="h-4 w-4" />
              <span className="ml-3">Sign Out</span>
            </button>
          )}
        </div>
      </div>
    </>
  )
}
