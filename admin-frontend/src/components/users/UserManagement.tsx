import {
  UserIcon,
  MagnifyingGlassIcon,
  EyeIcon,
  PencilIcon,
  UserPlusIcon
} from '@heroicons/react/24/outline'
import { useState, useEffect } from 'react'
import MetricCard from '../dashboard/MetricCard'
import { LazyDataTable } from '../ui/LazyDataTable'
import { Card, CardContent, CardHeader, CardTitle } from '../ui/card'
import { Button } from '../ui/button'

interface UserMetrics {
  totalUsers: number
  activeUsers: number
  newUsersToday: number
  churnedUsers: number
}

interface User {
  id: string
  name: string
  email: string
  company?: string
  plan: string
  status: 'Active' | 'Inactive' | 'Suspended'
  joinDate: string
  lastLogin?: string
  mrr: number
}

export default function UserManagement() {
  const [metrics, setMetrics] = useState<UserMetrics | null>(null)
  const [users, setUsers] = useState<User[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    // Simulate API call
    const timer = setTimeout(() => {
      setMetrics({
        totalUsers: 1247,
        activeUsers: 892,
        newUsersToday: 23,
        churnedUsers: 8
      })
      
      setUsers([
        {
          id: '1',
          name: 'Alice Johnson',
          email: 'alice@techcorp.com',
          company: 'TechCorp Inc',
          plan: 'Enterprise',
          status: 'Active',
          joinDate: '2024-01-15',
          lastLogin: '2024-09-07',
          mrr: 299
        },
        {
          id: '2',
          name: 'Bob Smith',
          email: 'bob@startupxyz.com',
          company: 'StartupXYZ',
          plan: 'Pro',
          status: 'Active',
          joinDate: '2024-02-20',
          lastLogin: '2024-09-06',
          mrr: 99
        },
        {
          id: '3',
          name: 'Carol Davis',
          email: 'carol@megacorp.com',
          company: 'MegaCorp Ltd',
          plan: 'Enterprise+',
          status: 'Inactive',
          joinDate: '2023-12-10',
          lastLogin: '2024-08-15',
          mrr: 0
        },
        {
          id: '4',
          name: 'David Wilson',
          email: 'david@freelance.com',
          plan: 'Basic',
          status: 'Active',
          joinDate: '2024-03-05',
          lastLogin: '2024-09-08',
          mrr: 29
        },
        {
          id: '5',
          name: 'Emma Brown',
          email: 'emma@agency.com',
          company: 'Creative Agency',
          plan: 'Pro',
          status: 'Suspended',
          joinDate: '2024-01-28',
          lastLogin: '2024-07-20',
          mrr: 0
        }
      ])
      
      setLoading(false)
    }, 1000)

    return () => clearTimeout(timer)
  }, [])

  const userColumns = [
    {
      accessorKey: 'name',
      header: 'User',
      sortable: true,
      cell: ({ row }: { row: User }) => (
        <div>
          <div className="font-medium">{row.name}</div>
          <div className="text-sm text-gray-500">{row.email}</div>
          {row.company && (
            <div className="text-xs text-gray-400">{row.company}</div>
          )}
        </div>
      )
    },
    {
      accessorKey: 'plan',
      header: 'Plan',
      sortable: true,
      cell: ({ value }: { value: string }) => (
        <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${
          value === 'Enterprise' || value === 'Enterprise+' 
            ? 'bg-purple-100 text-purple-800' 
            : value === 'Pro' 
            ? 'bg-blue-100 text-blue-800'
            : 'bg-gray-100 text-gray-800'
        }`}>
          {value}
        </span>
      )
    },
    {
      accessorKey: 'status',
      header: 'Status',
      sortable: true,
      cell: ({ value }: { value: string }) => (
        <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${
          value === 'Active' 
            ? 'bg-green-100 text-green-800' 
            : value === 'Inactive'
            ? 'bg-yellow-100 text-yellow-800'
            : 'bg-red-100 text-red-800'
        }`}>
          {value}
        </span>
      )
    },
    {
      accessorKey: 'mrr',
      header: 'MRR',
      sortable: true,
      cell: ({ value }: { value: number }) => (
        <span className="font-medium">${value}</span>
      )
    },
    {
      accessorKey: 'joinDate',
      header: 'Joined',
      sortable: true,
      cell: ({ value }: { value: string }) => (
        new Date(value).toLocaleDateString()
      )
    },
    {
      accessorKey: 'actions',
      header: 'Actions',
      cell: ({ row }: { row: User }) => (
        <div className="flex items-center gap-2">
          <Button
            size="sm"
            variant="outline"
            onClick={(e) => {
              e.stopPropagation()
              console.log('View user:', row.id)
            }}
          >
            <EyeIcon className="h-4 w-4" />
          </Button>
          <Button
            size="sm"
            variant="outline"
            onClick={(e) => {
              e.stopPropagation()
              console.log('Edit user:', row.id)
            }}
          >
            <PencilIcon className="h-4 w-4" />
          </Button>
        </div>
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
        <div className="h-96 bg-gray-200 rounded-lg animate-pulse" />
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {/* User Metrics */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <MetricCard
          title="Total Users"
          value={metrics?.totalUsers.toLocaleString()}
          icon="applications"
          onClick={() => console.log('Total users clicked')}
        />
        <MetricCard
          title="Active Users"
          value={metrics?.activeUsers.toLocaleString()}
          icon="services"
          onClick={() => console.log('Active users clicked')}
        />
        <MetricCard
          title="New Today"
          value={metrics?.newUsersToday.toLocaleString()}
          icon="api"
          onClick={() => console.log('New users clicked')}
        />
        <MetricCard
          title="Churned"
          value={metrics?.churnedUsers.toLocaleString()}
          icon="roles"
          onClick={() => console.log('Churned users clicked')}
        />
      </div>

      {/* User Management Table */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle className="flex items-center gap-2">
              <UserIcon className="h-5 w-5" />
              User Management ({users.length} users)
            </CardTitle>
            <Button 
              onClick={() => console.log('Add new user')}
              className="flex items-center gap-2"
            >
              <UserPlusIcon className="h-4 w-4" />
              Add User
            </Button>
          </div>
        </CardHeader>
        <CardContent className="p-0">
          <LazyDataTable
            data={users}
            columns={userColumns}
            searchable={true}
            pageSize={10}
            onRowClick={(user) => console.log('User clicked:', user)}
          />
        </CardContent>
      </Card>
    </div>
  )
}