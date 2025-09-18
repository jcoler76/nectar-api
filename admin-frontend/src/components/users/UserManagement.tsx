import {
  UserIcon,
  EyeIcon,
  UserPlusIcon,
  XMarkIcon
} from '@heroicons/react/24/outline'
import { useState, useEffect, useCallback } from 'react'
import { adminApi, type User } from '../../services/adminApi'
import MetricCard from '../dashboard/MetricCard'
import { LazyDataTable } from '../ui/LazyDataTable'
import { Card, CardContent, CardHeader, CardTitle } from '../ui/card'
import { Button } from '../ui/button'
import { Input } from '../ui/input'
import { Modal } from '../ui/modal'

interface UserMetrics {
  totalUsers: number
  activeUsers: number
  newUsersToday: number
  churnedUsers: number
}

// Use the User interface from adminApi
// interface User is imported from adminApi

export default function UserManagement() {
  const [metrics, setMetrics] = useState<UserMetrics | null>(null)
  const [users, setUsers] = useState<User[]>([])
  const [totalUsers, setTotalUsers] = useState<number>(0)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [search, setSearch] = useState('')
  const [status, setStatus] = useState<'all' | 'active' | 'inactive'>('all')
  const [page, setPage] = useState(1)
  const [pageSize, setPageSize] = useState(20)
  const [totalCount, setTotalCount] = useState(0)

  // Modal states
  const [viewModalOpen, setViewModalOpen] = useState(false)
  const [addModalOpen, setAddModalOpen] = useState(false)
  const [selectedUser, setSelectedUser] = useState<User | null>(null)

  // Form states
  const [newUser, setNewUser] = useState({
    email: '',
    firstName: '',
    lastName: ''
  })

  const fetchUsers = useCallback(async () => {
    try {
      setLoading(true)
      setError(null)

      const data = await adminApi.getUsers(page, pageSize)
      setUsers(data.users)
      setTotalUsers(data.pagination.total)
      setTotalCount(data.pagination.total)
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : 'Failed to fetch users'
      console.error('Error fetching users:', err)
      setError(message)
    } finally {
      setLoading(false)
    }
  }, [page, pageSize])

  useEffect(() => {
    fetchUsers()
  }, [page, pageSize, fetchUsers])

  useEffect(() => {
    if (users.length > 0) {
      const activeUsers = users.filter((user: User) => user.isActive).length;
      const today = new Date();
      today.setHours(0, 0, 0, 0);
      const newUsersToday = users.filter((user: User) => 
        new Date(user.createdAt) >= today
      ).length;
      
      setMetrics({
        totalUsers: users.length,
        activeUsers,
        newUsersToday,
        churnedUsers: users.length - activeUsers
      });
    }
  }, [users]);

  const userColumns = [
    {
      accessorKey: 'name',
      header: 'User',
      sortable: true,
      cell: ({ row }: { row: User }) => (
        <div>
          <div className="font-medium">{row.fullName}</div>
          <div className="text-sm text-gray-500">{row.email}</div>
          {row.organization && (
            <div className="text-xs text-gray-400">{row.organization.name}</div>
          )}
        </div>
      )
    },
    {
      accessorKey: 'roles',
      header: 'Roles',
      sortable: false,
      cell: ({ row }: { row: User }) => (
        <div className="flex flex-wrap gap-1">
          {row.isAdmin && (
            <span className="inline-flex px-2 py-1 text-xs font-semibold rounded-full bg-red-100 text-red-800">
              Admin
            </span>
          )}
          {row.roles.map((role) => (
            <span key={role.id} className="inline-flex px-2 py-1 text-xs font-semibold rounded-full bg-blue-100 text-blue-800">
              {role.name}
            </span>
          ))}
        </div>
      )
    },
    {
      accessorKey: 'isActive',
      header: 'Status',
      sortable: true,
      cell: ({ row }: { row: User }) => (
        <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${
          row.isActive 
            ? 'bg-green-100 text-green-800' 
            : 'bg-red-100 text-red-800'
        }`}>
          {row.isActive ? 'Active' : 'Inactive'}
        </span>
      )
    },
    {
      accessorKey: 'lastLogin',
      header: 'Last Login',
      sortable: true,
      cell: ({ row }: { row: User }) => (
        <span className="text-sm">
          {row.lastLogin ? new Date(row.lastLogin).toLocaleDateString() : 'Never'}
        </span>
      )
    },
    {
      accessorKey: 'createdAt',
      header: 'Joined',
      sortable: true,
      cell: ({ row }: { row: User }) => (
        new Date(row.createdAt).toLocaleDateString()
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
              handleViewUser(row)
            }}
            title="View user details"
          >
            <EyeIcon className="h-4 w-4" />
          </Button>

          {/* Toggle Switch for Active Status */}
          <button
            onClick={async (e) => {
              e.stopPropagation()
              await handleToggleUser(row.id, !row.isActive)
            }}
            className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 ${
              row.isActive ? 'bg-green-600' : 'bg-gray-200'
            }`}
            title={`${row.isActive ? 'Disable' : 'Enable'} user`}
          >
            <span
              className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${
                row.isActive ? 'translate-x-6' : 'translate-x-1'
              }`}
            />
          </button>

          <Button
            size="sm"
            variant="outline"
            onClick={async (e) => {
              e.stopPropagation()
              await handleDeleteUser(row.id)
            }}
            title="Delete user"
            className="text-red-600 hover:text-red-700 hover:bg-red-50"
          >
            <XMarkIcon className="h-4 w-4" />
          </Button>
        </div>
      )
    }
  ]

  const handleViewUser = (user: User) => {
    setSelectedUser(user)
    setViewModalOpen(true)
  }

  const handleToggleUser = async (userId: string, newStatus: boolean) => {
    try {
      await adminApi.updateUser(userId, { isActive: newStatus })
      await fetchUsers()
    } catch (e) {
      console.error('Update user failed', e)
      setError('Failed to update user')
    }
  }

  const handleDeleteUser = async (userId: string) => {
    const user = users.find(u => u.id === userId)
    if (!user) return

    if (window.confirm(`Are you sure you want to permanently delete ${user.fullName}?`)) {
      try {
        await adminApi.deleteUser(userId)
        await fetchUsers()
      } catch (e) {
        console.error('Delete user failed', e)
        setError('Failed to delete user')
      }
    }
  }

  const handleAddUser = () => {
    setNewUser({ email: '', firstName: '', lastName: '' })
    setAddModalOpen(true)
  }

  const handleSubmitNewUser = async () => {
    if (!newUser.email.trim()) {
      setError('Email is required')
      return
    }

    try {
      await adminApi.createUser({
        email: newUser.email.trim(),
        firstName: newUser.firstName.trim(),
        lastName: newUser.lastName.trim(),
        isActive: true
      })
      await fetchUsers()
      setAddModalOpen(false)
      setNewUser({ email: '', firstName: '', lastName: '' })
    } catch (e) {
      console.error('Create user failed', e)
      setError('Failed to create user')
    }
  }

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

  if (error) {
    return (
      <div className="space-y-6">
        <div className="bg-red-50 border border-red-200 text-red-600 px-4 py-3 rounded-md">
          <p className="font-medium">Error loading users</p>
          <p className="text-sm mt-1">{error}</p>
          <button 
            onClick={fetchUsers}
            className="mt-2 bg-red-600 text-white px-3 py-1 text-sm rounded hover:bg-red-700"
          >
            Retry
          </button>
        </div>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {/* Filters */}
      <div className="flex flex-wrap items-center gap-2">
        <Input value={search} onChange={e => setSearch(e.target.value)} placeholder="Search name or email" />
        <select
          className="border rounded px-3 py-2"
          value={status}
          onChange={e => setStatus(e.target.value as 'all' | 'active' | 'inactive')}
        >
          <option value="all">All</option>
          <option value="active">Active</option>
          <option value="inactive">Inactive</option>
        </select>
        <Button onClick={() => { setPage(1); void fetchUsers() }}>Apply</Button>
      </div>
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
              onClick={handleAddUser}
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
            pageSize={pageSize}
            onRowClick={(user) => handleViewUser(user)}
          />
          <div className="flex items-center justify-between p-3">
            <div className="text-sm text-gray-600">Page {page} / {Math.max(1, Math.ceil(totalCount / pageSize))}</div>
            <div className="flex items-center gap-2">
              <select className="border rounded px-2 py-1" value={pageSize} onChange={e => { setPageSize(parseInt(e.target.value)); setPage(1) }}>
                {[10, 20, 50].map(n => <option key={n} value={n}>{n}/page</option>)}
              </select>
              <Button variant="outline" onClick={() => setPage(p => Math.max(1, p - 1))} disabled={page === 1}>Prev</Button>
              <Button variant="outline" onClick={() => setPage(p => p + 1)} disabled={page * pageSize >= totalCount}>Next</Button>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* User Details Modal */}
      <Modal
        open={viewModalOpen}
        onClose={() => setViewModalOpen(false)}
        title="User Details"
        size="md"
      >
        {selectedUser && (
          <div className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700">Full Name</label>
                <p className="text-sm text-gray-900">{selectedUser.fullName}</p>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700">Email</label>
                <p className="text-sm text-gray-900">{selectedUser.email}</p>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700">Status</label>
                <p className={`text-sm font-medium ${selectedUser.isActive ? 'text-green-600' : 'text-red-600'}`}>
                  {selectedUser.isActive ? 'Active' : 'Inactive'}
                </p>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700">Admin</label>
                <p className="text-sm text-gray-900">{selectedUser.isAdmin ? 'Yes' : 'No'}</p>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700">Joined</label>
                <p className="text-sm text-gray-900">{new Date(selectedUser.createdAt).toLocaleDateString()}</p>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700">Last Login</label>
                <p className="text-sm text-gray-900">
                  {selectedUser.lastLogin ? new Date(selectedUser.lastLogin).toLocaleDateString() : 'Never'}
                </p>
              </div>
            </div>
            {selectedUser.organization && (
              <div>
                <label className="block text-sm font-medium text-gray-700">Organization</label>
                <p className="text-sm text-gray-900">{selectedUser.organization.name}</p>
              </div>
            )}
            {selectedUser.roles.length > 0 && (
              <div>
                <label className="block text-sm font-medium text-gray-700">Roles</label>
                <div className="flex flex-wrap gap-1 mt-1">
                  {selectedUser.roles.map((role) => (
                    <span key={role.id} className="inline-flex px-2 py-1 text-xs font-semibold rounded-full bg-blue-100 text-blue-800">
                      {role.name}
                    </span>
                  ))}
                </div>
              </div>
            )}
          </div>
        )}
      </Modal>

      {/* Add User Modal */}
      <Modal
        open={addModalOpen}
        onClose={() => setAddModalOpen(false)}
        title="Add New User"
        size="md"
        footer={
          <div className="flex gap-2">
            <Button variant="outline" onClick={() => setAddModalOpen(false)}>
              Cancel
            </Button>
            <Button onClick={handleSubmitNewUser}>
              Create User
            </Button>
          </div>
        }
      >
        <div className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Email <span className="text-red-500">*</span>
            </label>
            <Input
              type="email"
              value={newUser.email}
              onChange={(e) => setNewUser(prev => ({ ...prev, email: e.target.value }))}
              placeholder="user@example.com"
              required
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">First Name</label>
            <Input
              type="text"
              value={newUser.firstName}
              onChange={(e) => setNewUser(prev => ({ ...prev, firstName: e.target.value }))}
              placeholder="John"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Last Name</label>
            <Input
              type="text"
              value={newUser.lastName}
              onChange={(e) => setNewUser(prev => ({ ...prev, lastName: e.target.value }))}
              placeholder="Doe"
            />
          </div>
          <p className="text-sm text-gray-500">
            The new user will be created with active status and will receive an email to set up their password.
          </p>
        </div>
      </Modal>
    </div>
  )
}
