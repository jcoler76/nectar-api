import {
  UserIcon,
  EyeIcon,
  PencilIcon,
  UserPlusIcon
} from '@heroicons/react/24/outline'
import { useState, useEffect } from 'react'
import { graphqlRequest } from '../../services/graphql'
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
  firstName: string
  lastName: string
  fullName: string
  email: string
  isActive: boolean
  isAdmin: boolean
  createdAt: string
  lastLogin?: string
  roles: Array<{ id: string; name: string }>
  organization?: { name: string }
}

export default function UserManagement() {
  const [metrics, setMetrics] = useState<UserMetrics | null>(null)
  const [users, setUsers] = useState<User[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const fetchUsers = async () => {
    try {
      setLoading(true)
      setError(null)

      const data = await graphqlRequest<{
        users: {
          pageInfo: { totalCount: number }
          edges: { node: {
            id: string; email: string; firstName: string; lastName: string;
            fullName: string; isActive: boolean; isAdmin: boolean; createdAt: string; lastLogin?: string;
            roles: { id: string; name: string }[];
            memberships: { role: string; joinedAt: string; organization: { id: string; name: string } }[]
          } }[]
        }
      }>(
        `query Users($limit: Int!, $offset: Int!) {
          users(pagination: { limit: $limit, offset: $offset, sortBy: "createdAt", sortOrder: DESC }) {
            pageInfo { totalCount }
            edges {
              node {
                id email firstName lastName fullName isActive isAdmin createdAt lastLogin
                roles { id name }
                memberships { role joinedAt organization { id name } }
              }
            }
          }
        }`,
        { limit: 200, offset: 0 }
      )
      const mapped: User[] = data.users.edges.map(({ node }) => ({
        id: node.id,
        email: node.email,
        firstName: node.firstName,
        lastName: node.lastName,
        fullName: node.fullName,
        isActive: node.isActive,
        isAdmin: node.isAdmin,
        createdAt: node.createdAt,
        lastLogin: node.lastLogin,
        roles: node.roles || [],
        organization: node.memberships?.[0]?.organization ? { name: node.memberships[0].organization.name } : undefined,
      }))
      setUsers(mapped)
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : 'Failed to fetch users'
      console.error('Error fetching users:', err)
      setError(message)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    fetchUsers()
  }, [])

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
              handleViewUser(row.id)
            }}
            title="View user details"
          >
            <EyeIcon className="h-4 w-4" />
          </Button>
          <Button
            size="sm"
            variant="outline"
            onClick={(e) => {
              e.stopPropagation()
              handleEditUser(row.id)
            }}
            title="Edit user"
          >
          <PencilIcon className="h-4 w-4" />
          </Button>
          <Button
            size="sm"
            variant="outline"
            onClick={async (e) => {
              e.stopPropagation()
              const ok = confirm('Permanently delete this user?')
              if (!ok) return
              try {
                await graphqlRequest<{ deleteUser: boolean }>(
                  `mutation DeleteUser($id: ID!) { deleteUser(id: $id) }`,
                  { id: row.id }
                )
                await fetchUsers()
              } catch (e) {
                console.error('Delete user failed', e)
                alert('Failed to delete user')
              }
            }}
            title="Delete user"
          >
            Delete
          </Button>
        </div>
      )
    }
  ]

  const handleViewUser = (userId: string) => {
    const user = users.find((u: User) => u.id === userId);
    if (user) {
      alert(`Viewing user: ${user.fullName}\nEmail: ${user.email}\nStatus: ${user.isActive ? 'Active' : 'Inactive'}\nAdmin: ${user.isAdmin ? 'Yes' : 'No'}\nJoined: ${new Date(user.createdAt).toLocaleDateString()}`);
    }
  };

  const handleEditUser = async (userId: string) => {
    const user = users.find((u: User) => u.id === userId)
    if (!user) return
    const toggle = confirm(`Current status: ${user.isActive ? 'Active' : 'Inactive'}\n\nOK to toggle active status`)
    if (!toggle) return
    try {
      await graphqlRequest<{ updateUser: { id: string } }>(
        `mutation UpdateUser($id: ID!, $input: UpdateUserInput!) { updateUser(id: $id, input: $input) { id } }`,
        { id: userId, input: { isActive: !user.isActive } }
      )
      await fetchUsers()
    } catch (e) {
      console.error('Update user failed', e)
      alert('Failed to update user')
    }
  }

  const handleAddUser = async () => {
    const email = window.prompt('Email:')
    if (!email) return
    const firstName = window.prompt('First name:') || ''
    const lastName = window.prompt('Last name:') || ''
    try {
      await graphqlRequest<{ createUser: { id: string } }>(
        `mutation CreateUser($input: CreateUserInput!) { createUser(input: $input) { id } }`,
        { input: { email, firstName, lastName, isActive: true } }
      )
      await fetchUsers()
    } catch (e) {
      console.error('Create user failed', e)
      alert('Failed to create user')
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
            onRowClick={(user) => handleViewUser(user.id)}
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
    </div>
  )
}
