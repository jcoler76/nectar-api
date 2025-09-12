import { useState } from 'react'
import AdminSidebar from './AdminSidebar'
import AdminTopBar from './AdminTopBar'

interface AdminLayoutProps {
  children: React.ReactNode
  onLogout: () => void
  currentPage?: string
  breadcrumbs?: Array<{ title: string; url?: string }>
  onNavigate?: (url: string) => void
}

export default function AdminLayout({ 
  children, 
  onLogout, 
  currentPage = 'Dashboard',
  breadcrumbs = [],
  onNavigate
}: AdminLayoutProps) {
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false)

  const handleSidebarToggle = () => {
    setSidebarCollapsed(!sidebarCollapsed)
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Sidebar */}
      <AdminSidebar 
        collapsed={sidebarCollapsed}
        onToggle={handleSidebarToggle}
        onLogout={onLogout}
        currentPage={currentPage}
        onNavigate={onNavigate}
      />

      {/* Main content area */}
      <div className={`transition-all duration-300 ${
        sidebarCollapsed ? 'lg:ml-16' : 'lg:ml-72'
      }`}>
        {/* Top bar */}
        <AdminTopBar 
          sidebarCollapsed={sidebarCollapsed}
          onSidebarToggle={handleSidebarToggle}
          currentPage={currentPage}
          breadcrumbs={breadcrumbs}
          onLogout={onLogout}
          onNavigate={onNavigate}
        />

        {/* Page content */}
        <main className="p-6">
          {children}
        </main>
      </div>
    </div>
  )
}