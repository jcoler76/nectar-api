import {
  UserIcon,
  EyeIcon,
  UserPlusIcon,
  XMarkIcon,
  ShieldCheckIcon,
  KeyIcon
} from '@heroicons/react/24/outline'
import { useState, useEffect, useCallback } from 'react'
import {
  adminUsersApi,
  type AdminUser,
  type AdminRole,
  ADMIN_ROLE_LABELS,
  ADMIN_ROLE_DESCRIPTIONS,
  ADMIN_ROLE_HIERARCHY,
  validatePassword
} from '../../services/adminUsersApi'
import MetricCard from '../dashboard/MetricCard'
import { LazyDataTable } from '../ui/LazyDataTable'
import { Card, CardContent, CardHeader, CardTitle } from '../ui/card'
import { Button } from '../ui/button'
import { Input } from '../ui/input'
import { Modal } from '../ui/modal'

interface AdminUserMetrics {
  totalAdmins: number
  activeAdmins: number
  superAdmins: number
  recentLogins: number
}

export default function AdminUsers() {
  const [metrics, setMetrics] = useState<AdminUserMetrics | null>(null)
  const [adminUsers, setAdminUsers] = useState<AdminUser[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [search, setSearch] = useState('')
  const [roleFilter, setRoleFilter] = useState<AdminRole | 'all'>('all')
  const [statusFilter, setStatusFilter] = useState<'all' | 'active' | 'inactive'>('all')
  const [page, setPage] = useState(1)
  const [pageSize, setPageSize] = useState(20)
  const [totalCount, setTotalCount] = useState(0)

  // Modal states
  const [viewModalOpen, setViewModalOpen] = useState(false)
  const [addModalOpen, setAddModalOpen] = useState(false)
  const [editModalOpen, setEditModalOpen] = useState(false)
  const [roleModalOpen, setRoleModalOpen] = useState(false)
  const [selectedUser, setSelectedUser] = useState<AdminUser | null>(null)

  // Form states
  const [newUser, setNewUser] = useState({
    email: '',
    firstName: '',
    lastName: '',
    role: 'SUPPORT_AGENT' as AdminRole,
    password: '',
    confirmPassword: '',
    notes: ''
  })

  const [editUser, setEditUser] = useState({
    firstName: '',
    lastName: '',
    notes: '',
    isActive: true
  })

  const [roleChange, setRoleChange] = useState({
    newRole: 'SUPPORT_AGENT' as AdminRole
  })

  const fetchAdminUsers = useCallback(async () => {
    try {
      setLoading(true)
      setError(null)

      const isActiveFilter = statusFilter === 'all' ? undefined : statusFilter === 'active'
      const roleFilterValue = roleFilter === 'all' ? undefined : roleFilter

      const data = await adminUsersApi.getAdminUsers(
        page,
        pageSize,
        search || undefined,
        roleFilterValue,
        isActiveFilter
      )

      setAdminUsers(data.users)
      setTotalCount(data.pagination.total)
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : 'Failed to fetch admin users'
      console.error('Error fetching admin users:', err)
      setError(message)
    } finally {
      setLoading(false)
    }
  }, [page, pageSize, search, roleFilter, statusFilter])

  useEffect(() => {
    fetchAdminUsers()
  }, [fetchAdminUsers])

  useEffect(() => {
    if (adminUsers.length > 0) {
      const activeAdmins = adminUsers.filter(user => user.isActive).length
      const superAdmins = adminUsers.filter(user => user.role === 'SUPER_ADMIN').length
      const today = new Date()
      today.setHours(0, 0, 0, 0)
      const recentLogins = adminUsers.filter(user =>
        user.lastLoginAt && new Date(user.lastLoginAt) >= today
      ).length

      setMetrics({
        totalAdmins: adminUsers.length,
        activeAdmins,
        superAdmins,
        recentLogins
      })
    }
  }, [adminUsers])

  const adminUserColumns = [
    {
      accessorKey: 'name',
      header: 'Admin User',
      sortable: true,
      cell: ({ row }: { row: AdminUser }) => (
        <div>
          <div className="font-medium">{row.firstName} {row.lastName}</div>
          <div className="text-sm text-gray-500">{row.email}</div>
        </div>
      )
    },
    {
      accessorKey: 'role',
      header: 'Role',
      sortable: true,
      cell: ({ row }: { row: AdminUser }) => (
        <div className="flex items-center gap-2">
          <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${
            row.role === 'SUPER_ADMIN' ? 'bg-red-100 text-red-800' :
            row.role === 'ADMIN' ? 'bg-purple-100 text-purple-800' :
            row.role === 'BILLING_ADMIN' ? 'bg-blue-100 text-blue-800' :
            row.role === 'SUPPORT_AGENT' ? 'bg-green-100 text-green-800' :
            'bg-gray-100 text-gray-800'
          }`}>
            {ADMIN_ROLE_LABELS[row.role]}
          </span>
        </div>
      )
    },
    {
      accessorKey: 'isActive',
      header: 'Status',
      sortable: true,
      cell: ({ row }: { row: AdminUser }) => (
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
      accessorKey: 'lastLoginAt',
      header: 'Last Login',
      sortable: true,
      cell: ({ row }: { row: AdminUser }) => (
        <span className="text-sm">
          {row.lastLoginAt ? new Date(row.lastLoginAt).toLocaleDateString() : 'Never'}
        </span>
      )
    },
    {
      accessorKey: 'createdAt',
      header: 'Created',
      sortable: true,
      cell: ({ row }: { row: AdminUser }) => (
        new Date(row.createdAt).toLocaleDateString()
      )
    },
    {
      accessorKey: 'actions',
      header: 'Actions',
      cell: ({ row }: { row: AdminUser }) => (
        <div className="flex items-center gap-2">
          <Button
            size="sm"
            variant="outline"
            onClick={(e) => {
              e.stopPropagation()
              handleViewUser(row)
            }}
            title="View admin user details"
          >
            <EyeIcon className="h-4 w-4" />
          </Button>

          <Button
            size="sm"
            variant="outline"
            onClick={(e) => {
              e.stopPropagation()
              handleEditUser(row)
            }}
            title="Edit admin user"
            className="text-blue-600 hover:text-blue-700 hover:bg-blue-50"
          >
            <KeyIcon className="h-4 w-4" />
          </Button>

          <Button
            size="sm"
            variant="outline"
            onClick={(e) => {
              e.stopPropagation()
              handleChangeRole(row)
            }}
            title="Change role"
            className="text-purple-600 hover:text-purple-700 hover:bg-purple-50"
          >
            <ShieldCheckIcon className="h-4 w-4" />
          </Button>

          <Button
            size="sm"
            variant="outline"
            onClick={async (e) => {
              e.stopPropagation()
              await handleDeactivateUser(row.id)
            }}
            title="Deactivate admin user"
            className="text-red-600 hover:text-red-700 hover:bg-red-50"
          >
            <XMarkIcon className="h-4 w-4" />
          </Button>
        </div>
      )
    }
  ]

  const handleViewUser = (user: AdminUser) => {
    setSelectedUser(user)
    setViewModalOpen(true)
  }

  const handleEditUser = (user: AdminUser) => {
    setSelectedUser(user)
    setEditUser({
      firstName: user.firstName,
      lastName: user.lastName,
      notes: user.notes || '',
      isActive: user.isActive
    })
    setEditModalOpen(true)
  }

  const handleChangeRole = (user: AdminUser) => {
    setSelectedUser(user)
    setRoleChange({ newRole: user.role })
    setRoleModalOpen(true)
  }

  const handleDeactivateUser = async (userId: string) => {
    const user = adminUsers.find(u => u.id === userId)
    if (!user) return

    if (window.confirm(`Are you sure you want to deactivate ${user.firstName} ${user.lastName}?`)) {
      try {
        await adminUsersApi.deactivateAdminUser(userId)
        await fetchAdminUsers()
      } catch (e) {
        console.error('Deactivate admin user failed', e)
        setError('Failed to deactivate admin user')
      }
    }
  }

  const handleAddUser = () => {
    setNewUser({
      email: '',
      firstName: '',
      lastName: '',
      role: 'SUPPORT_AGENT',
      password: '',
      confirmPassword: '',
      notes: ''
    })
    setAddModalOpen(true)
  }

  const handleSubmitNewUser = async () => {
    if (!newUser.email.trim() || !newUser.firstName.trim() || !newUser.lastName.trim() || !newUser.password) {
      setError('Email, first name, last name, and password are required')
      return
    }

    if (newUser.password !== newUser.confirmPassword) {
      setError('Passwords do not match')
      return
    }

    const passwordValidation = validatePassword(newUser.password)
    if (!passwordValidation.isValid) {
      setError('Password requirements: ' + passwordValidation.errors.join(', '))
      return
    }

    try {
      await adminUsersApi.createAdminUser({
        email: newUser.email.trim(),
        firstName: newUser.firstName.trim(),
        lastName: newUser.lastName.trim(),
        role: newUser.role,
        password: newUser.password,
        notes: newUser.notes.trim() || undefined
      })
      await fetchAdminUsers()
      setAddModalOpen(false)
      setError(null)
    } catch (e) {
      console.error('Create admin user failed', e)
      setError('Failed to create admin user')
    }
  }

  const handleSubmitEditUser = async () => {
    if (!selectedUser) return

    try {
      await adminUsersApi.updateAdminUser(selectedUser.id, {
        firstName: editUser.firstName.trim(),
        lastName: editUser.lastName.trim(),
        notes: editUser.notes.trim() || undefined,
        isActive: editUser.isActive
      })
      await fetchAdminUsers()
      setEditModalOpen(false)
      setError(null)
    } catch (e) {
      console.error('Update admin user failed', e)
      setError('Failed to update admin user')
    }
  }

  const handleSubmitRoleChange = async () => {
    if (!selectedUser) return

    try {
      await adminUsersApi.updateAdminUserRole(selectedUser.id, roleChange.newRole)
      await fetchAdminUsers()
      setRoleModalOpen(false)
      setError(null)
    } catch (e) {
      console.error('Update admin user role failed', e)
      setError('Failed to update admin user role')
    }
  }

  const handleSearch = () => {
    setPage(1)
    fetchAdminUsers()
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
          <p className="font-medium">Error loading admin users</p>
          <p className="text-sm mt-1">{error}</p>
          <button
            onClick={fetchAdminUsers}
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
        <Input
          value={search}
          onChange={e => setSearch(e.target.value)}
          placeholder="Search name or email"
          className="w-64"
        />
        <select
          className="border rounded px-3 py-2"
          value={roleFilter}
          onChange={e => setRoleFilter(e.target.value as AdminRole | 'all')}
        >
          <option value="all">All Roles</option>
          {ADMIN_ROLE_HIERARCHY.reverse().map(role => (
            <option key={role} value={role}>{ADMIN_ROLE_LABELS[role]}</option>
          ))}
        </select>
        <select
          className="border rounded px-3 py-2"
          value={statusFilter}
          onChange={e => setStatusFilter(e.target.value as 'all' | 'active' | 'inactive')}
        >
          <option value="all">All Status</option>
          <option value="active">Active</option>
          <option value="inactive">Inactive</option>
        </select>
        <Button onClick={handleSearch}>Apply</Button>
      </div>

      {/* Admin User Metrics */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <MetricCard
          title="Total Admins"
          value={metrics?.totalAdmins.toLocaleString()}
          icon="applications"
          onClick={() => console.log('Total admins clicked')}
        />
        <MetricCard
          title="Active Admins"
          value={metrics?.activeAdmins.toLocaleString()}
          icon="services"
          onClick={() => console.log('Active admins clicked')}
        />
        <MetricCard
          title="Super Admins"
          value={metrics?.superAdmins.toLocaleString()}
          icon="roles"
          onClick={() => console.log('Super admins clicked')}
        />
        <MetricCard
          title="Recent Logins"
          value={metrics?.recentLogins.toLocaleString()}
          icon="api"
          onClick={() => console.log('Recent logins clicked')}
        />
      </div>

      {/* Admin User Management Table */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle className="flex items-center gap-2">
              <UserIcon className="h-5 w-5" />
              Admin Portal Users ({adminUsers.length} users)
            </CardTitle>
            <Button
              onClick={handleAddUser}
              className="flex items-center gap-2"
            >
              <UserPlusIcon className="h-4 w-4" />
              Add Admin User
            </Button>
          </div>
        </CardHeader>
        <CardContent className="p-0">
          <LazyDataTable
            data={adminUsers}
            columns={adminUserColumns}
            searchable={true}
            pageSize={pageSize}
            onRowClick={(user) => handleViewUser(user)}
          />
          <div className="flex items-center justify-between p-3">
            <div className="text-sm text-gray-600">Page {page} / {Math.max(1, Math.ceil(totalCount / pageSize))}</div>
            <div className="flex items-center gap-2">
              <select
                className="border rounded px-2 py-1"
                value={pageSize}
                onChange={e => { setPageSize(parseInt(e.target.value)); setPage(1) }}
              >
                {[10, 20, 50].map(n => <option key={n} value={n}>{n}/page</option>)}
              </select>
              <Button variant="outline" onClick={() => setPage(p => Math.max(1, p - 1))} disabled={page === 1}>
                Prev
              </Button>
              <Button variant="outline" onClick={() => setPage(p => p + 1)} disabled={page * pageSize >= totalCount}>
                Next
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* View Admin User Modal */}
      <Modal
        open={viewModalOpen}
        onClose={() => setViewModalOpen(false)}
        title="Admin User Details"
        size="md"
      >
        {selectedUser && (
          <div className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700">Name</label>
                <p className="text-sm text-gray-900">{selectedUser.firstName} {selectedUser.lastName}</p>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700">Email</label>
                <p className="text-sm text-gray-900">{selectedUser.email}</p>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700">Role</label>
                <p className="text-sm text-gray-900">{ADMIN_ROLE_LABELS[selectedUser.role]}</p>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700">Status</label>
                <p className={`text-sm font-medium ${selectedUser.isActive ? 'text-green-600' : 'text-red-600'}`}>
                  {selectedUser.isActive ? 'Active' : 'Inactive'}
                </p>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700">Created</label>
                <p className="text-sm text-gray-900">{new Date(selectedUser.createdAt).toLocaleDateString()}</p>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700">Last Login</label>
                <p className="text-sm text-gray-900">
                  {selectedUser.lastLoginAt ? new Date(selectedUser.lastLoginAt).toLocaleDateString() : 'Never'}
                </p>
              </div>
            </div>
            {selectedUser.notes && (
              <div>
                <label className="block text-sm font-medium text-gray-700">Notes</label>
                <p className="text-sm text-gray-900 whitespace-pre-wrap">{selectedUser.notes}</p>
              </div>
            )}
            <div>
              <label className="block text-sm font-medium text-gray-700">Role Description</label>
              <p className="text-sm text-gray-600">{ADMIN_ROLE_DESCRIPTIONS[selectedUser.role]}</p>
            </div>
          </div>
        )}
      </Modal>

      {/* Add Admin User Modal */}
      <Modal
        open={addModalOpen}
        onClose={() => setAddModalOpen(false)}
        title="Add New Admin User"
        size="lg"
        footer={
          <div className="flex gap-2">
            <Button variant="outline" onClick={() => setAddModalOpen(false)}>
              Cancel
            </Button>
            <Button onClick={handleSubmitNewUser}>
              Create Admin User
            </Button>
          </div>
        }
      >
        <div className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                First Name <span className="text-red-500">*</span>
              </label>
              <Input
                type="text"
                value={newUser.firstName}
                onChange={(e) => setNewUser(prev => ({ ...prev, firstName: e.target.value }))}
                placeholder="John"
                required
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Last Name <span className="text-red-500">*</span>
              </label>
              <Input
                type="text"
                value={newUser.lastName}
                onChange={(e) => setNewUser(prev => ({ ...prev, lastName: e.target.value }))}
                placeholder="Doe"
                required
              />
            </div>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Email <span className="text-red-500">*</span>
            </label>
            <Input
              type="email"
              value={newUser.email}
              onChange={(e) => setNewUser(prev => ({ ...prev, email: e.target.value }))}
              placeholder="admin@example.com"
              required
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Role <span className="text-red-500">*</span>
            </label>
            <select
              className="w-full border rounded px-3 py-2"
              value={newUser.role}
              onChange={(e) => setNewUser(prev => ({ ...prev, role: e.target.value as AdminRole }))}
            >
              {ADMIN_ROLE_HIERARCHY.map(role => (
                <option key={role} value={role}>{ADMIN_ROLE_LABELS[role]}</option>
              ))}
            </select>
            <p className="text-xs text-gray-500 mt-1">{ADMIN_ROLE_DESCRIPTIONS[newUser.role]}</p>
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Password <span className="text-red-500">*</span>
              </label>
              <Input
                type="password"
                value={newUser.password}
                onChange={(e) => setNewUser(prev => ({ ...prev, password: e.target.value }))}
                placeholder="••••••••"
                required
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Confirm Password <span className="text-red-500">*</span>
              </label>
              <Input
                type="password"
                value={newUser.confirmPassword}
                onChange={(e) => setNewUser(prev => ({ ...prev, confirmPassword: e.target.value }))}
                placeholder="••••••••"
                required
              />
            </div>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Notes</label>
            <textarea
              className="w-full border rounded px-3 py-2"
              rows={3}
              value={newUser.notes}
              onChange={(e) => setNewUser(prev => ({ ...prev, notes: e.target.value }))}
              placeholder="Optional notes about this admin user..."
            />
          </div>
          <div className="bg-blue-50 border border-blue-200 rounded-lg p-3">
            <p className="text-blue-700 text-sm font-medium">Password Requirements:</p>
            <ul className="text-blue-600 text-xs mt-1 list-disc list-inside">
              <li>At least 8 characters long</li>
              <li>Contains uppercase and lowercase letters</li>
              <li>Contains at least one number</li>
              <li>Contains at least one special character</li>
            </ul>
          </div>
        </div>
      </Modal>

      {/* Edit Admin User Modal */}
      <Modal
        open={editModalOpen}
        onClose={() => setEditModalOpen(false)}
        title="Edit Admin User"
        size="md"
        footer={
          <div className="flex gap-2">
            <Button variant="outline" onClick={() => setEditModalOpen(false)}>
              Cancel
            </Button>
            <Button onClick={handleSubmitEditUser}>
              Update User
            </Button>
          </div>
        }
      >
        <div className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">First Name</label>
              <Input
                type="text"
                value={editUser.firstName}
                onChange={(e) => setEditUser(prev => ({ ...prev, firstName: e.target.value }))}
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Last Name</label>
              <Input
                type="text"
                value={editUser.lastName}
                onChange={(e) => setEditUser(prev => ({ ...prev, lastName: e.target.value }))}
              />
            </div>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Status</label>
            <select
              className="w-full border rounded px-3 py-2"
              value={editUser.isActive.toString()}
              onChange={(e) => setEditUser(prev => ({ ...prev, isActive: e.target.value === 'true' }))}
            >
              <option value="true">Active</option>
              <option value="false">Inactive</option>
            </select>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Notes</label>
            <textarea
              className="w-full border rounded px-3 py-2"
              rows={3}
              value={editUser.notes}
              onChange={(e) => setEditUser(prev => ({ ...prev, notes: e.target.value }))}
              placeholder="Optional notes about this admin user..."
            />
          </div>
        </div>
      </Modal>

      {/* Change Role Modal */}
      <Modal
        open={roleModalOpen}
        onClose={() => setRoleModalOpen(false)}
        title="Change Admin Role"
        size="md"
        footer={
          <div className="flex gap-2">
            <Button variant="outline" onClick={() => setRoleModalOpen(false)}>
              Cancel
            </Button>
            <Button onClick={handleSubmitRoleChange}>
              Update Role
            </Button>
          </div>
        }
      >
        {selectedUser && (
          <div className="space-y-4">
            <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-3">
              <p className="text-yellow-700 text-sm font-medium">
                Changing role for: {selectedUser.firstName} {selectedUser.lastName}
              </p>
              <p className="text-yellow-600 text-xs mt-1">
                Current role: {ADMIN_ROLE_LABELS[selectedUser.role]}
              </p>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                New Role <span className="text-red-500">*</span>
              </label>
              <select
                className="w-full border rounded px-3 py-2"
                value={roleChange.newRole}
                onChange={(e) => setRoleChange(prev => ({ ...prev, newRole: e.target.value as AdminRole }))}
              >
                {ADMIN_ROLE_HIERARCHY.map(role => (
                  <option key={role} value={role}>{ADMIN_ROLE_LABELS[role]}</option>
                ))}
              </select>
              <p className="text-xs text-gray-500 mt-1">{ADMIN_ROLE_DESCRIPTIONS[roleChange.newRole]}</p>
            </div>
          </div>
        )}
      </Modal>
    </div>
  )
}