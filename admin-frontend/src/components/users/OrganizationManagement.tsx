import {
  BuildingOfficeIcon,
  UsersIcon,
  CurrencyDollarIcon,
  EyeIcon,
  PencilIcon,
  PlusIcon,
  ExclamationTriangleIcon
} from '@heroicons/react/24/outline'
import MetricCard from '../dashboard/MetricCard'
import { LazyDataTable } from '../ui/LazyDataTable'
import { Card, CardContent, CardHeader, CardTitle } from '../ui/card'
import { Button } from '../ui/button'
import { Input } from '../ui/input'
import Modal from '../ui/modal'
import { DonutChartComponent, BarChartComponent } from '../ui/charts'
import { useOrganizations } from '../../hooks/useOrganizations'
import { graphqlRequest } from '../../services/graphql'
import type { Organization } from '../../types/organization'

export default function OrganizationManagement() {
  const {
    organizations,
    metrics,
    orgByPlan,
    orgSizeData,
    loading,
    error,
    refreshData,
    createOrganization,
    updateOrganization,
    deleteOrganization,
    addMember,
    removeMember,
    updateMemberRole
  } = useOrganizations()

  // Modal/UI state
  const [showCreate, setShowCreate] = useState(false)
  const [showEdit, setShowEdit] = useState<Organization | null>(null)
  const [showMembers, setShowMembers] = useState<Organization | null>(null)
  const [createForm, setCreateForm] = useState({ name: '', domain: '', website: '' })
  const [editForm, setEditForm] = useState({ name: '', domain: '', website: '' })
  const [members, setMembers] = useState<{ user: { id: string; email: string; firstName: string; lastName: string }, role: string, joinedAt: string }[]>([])
  const [membersLoading, setMembersLoading] = useState(false)
  const [memberSearch, setMemberSearch] = useState('')
  const [memberResults, setMemberResults] = useState<{ id: string; email: string; fullName: string }[]>([])

  const openMembers = async (org: Organization) => {
    setShowMembers(org)
    setMembersLoading(true)
    try {
      const data = await graphqlRequest<{ organization: { memberships: { role: string; joinedAt: string; user: { id: string; email: string; firstName: string; lastName: string } }[] } }>(
        `query OrgMembers($id: ID!) { organization(id: $id) { memberships { role joinedAt user { id email firstName lastName } } } }`,
        { id: org.id }
      )
      setMembers(data.organization?.memberships || [])
    } catch (e) {
      console.error('Failed to load members', e)
      setMembers([])
    } finally {
      setMembersLoading(false)
    }
  }

  const organizationColumns = [
    {
      accessorKey: 'name',
      header: 'Organization',
      sortable: true,
      cell: ({ row }: { row: Organization }) => (
        <div>
          <div className="font-medium">{row.name}</div>
          <div className="text-sm text-gray-500">{row.domain || 'No domain'}</div>
          <div className="text-xs text-gray-400">
            Created: {new Date(row.createdAt).toLocaleDateString()}
          </div>
        </div>
      )
    },
    {
      accessorKey: '_count.memberships',
      header: 'Members',
      sortable: true,
      cell: ({ row }: { row: Organization }) => (
        <div className="flex items-center gap-1">
          <UsersIcon className="h-4 w-4 text-gray-400" />
          <span className="font-medium">{row._count?.memberships || 0}</span>
        </div>
      )
    },
    {
      accessorKey: 'subscription.plan',
      header: 'Plan',
      sortable: true,
      cell: ({ row }: { row: Organization }) => {
        const plan = row.subscription?.plan || 'FREE'
        return (
          <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${
            plan === 'ENTERPRISE' 
              ? 'bg-purple-100 text-purple-800' 
              : plan === 'BUSINESS'
              ? 'bg-blue-100 text-blue-800'
              : plan === 'PROFESSIONAL'
              ? 'bg-green-100 text-green-800'
              : plan === 'STARTER'
              ? 'bg-yellow-100 text-yellow-800'
              : 'bg-gray-100 text-gray-800'
          }`}>
            {plan}
          </span>
        )
      }
    },
    {
      accessorKey: 'subscription.status',
      header: 'Status',
      sortable: true,
      cell: ({ row }: { row: Organization }) => {
        const status = row.subscription?.status || 'UNKNOWN'
        return (
          <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${
            status === 'ACTIVE' 
              ? 'bg-green-100 text-green-800' 
              : status === 'TRIALING'
              ? 'bg-blue-100 text-blue-800'
              : status === 'PAST_DUE'
              ? 'bg-yellow-100 text-yellow-800'
              : 'bg-red-100 text-red-800'
          }`}>
            {status}
          </span>
        )
      }
    },
    {
      accessorKey: '_count.databaseConnections',
      header: 'Connections',
      sortable: true,
      cell: ({ row }: { row: Organization }) => (
        <span className="font-medium">{row._count?.databaseConnections || 0}</span>
      )
    },
    {
      accessorKey: '_count.workflows',
      header: 'Workflows',
      sortable: true,
      cell: ({ row }: { row: Organization }) => (
        <span className="font-medium">{row._count?.workflows || 0}</span>
      )
    },
    {
      accessorKey: 'updatedAt',
      header: 'Last Updated',
      sortable: true,
      cell: ({ row }: { row: Organization }) => (
        new Date(row.updatedAt).toLocaleDateString()
      )
    },
    {
      accessorKey: 'actions',
      header: 'Actions',
      cell: ({ row }: { row: Organization }) => (
        <div className="flex items-center gap-2">
          <Button
            size="sm"
            variant="outline"
            onClick={(e) => {
              e.stopPropagation()
              console.log('View organization:', row.id)
            }}
          >
            <EyeIcon className="h-4 w-4" />
          </Button>
          <Button
            size="sm"
            variant="outline"
            onClick={(e) => { e.stopPropagation(); setEditForm({ name: row.name, domain: row.domain || '', website: row.website || '' }); setShowEdit(row) }}
          >
            <PencilIcon className="h-4 w-4" />
          </Button>
          <Button
            size="sm"
            variant="outline"
            onClick={async (e) => {
              e.stopPropagation()
              if (!confirm(`Delete organization ${row.name}?`)) return
              try {
                await deleteOrganization(row.id)
              } catch (err) {
                console.error('Delete organization failed', err)
                alert('Failed to delete')
              }
            }}
          >
            Delete
          </Button>
          <Button
            size="sm"
            variant="outline"
            onClick={(e) => { e.stopPropagation(); void openMembers(row) }}
          >
            Members
          </Button>
          <Button
            size="sm"
            variant="outline"
            onClick={(e) => {
              e.stopPropagation()
              ;(async () => {
                const search = window.prompt('Enter user email or name to remove:')
                if (!search) return
                try {
                  const data = await graphqlRequest<{ users: { edges: { node: { id: string; email: string; fullName: string } }[] } }>(
                    `query SearchUsers($q: String!) { users(filters: { search: $q }, pagination: { limit: 10, offset: 0 }) { edges { node { id email fullName } } } }`,
                    { q: search }
                  )
                  const choices = data.users.edges
                  if (!choices.length) {
                    alert('No users found')
                    return
                  }
                  const selected = choices[0].node
                  await removeMember(row.id, selected.id)
                } catch (err) {
                  console.error('Remove member failed', err)
                  alert('Failed to remove member')
                }
              })()
            }}
          >
            Remove Member
          </Button>
        </div>
      )
    }
  ]

  if (error) {
    return (
      <div className="space-y-6">
        <Card>
          <CardContent className="p-8">
            <div className="flex items-center justify-center text-center">
              <div>
                <ExclamationTriangleIcon className="h-12 w-12 text-red-500 mx-auto mb-4" />
                <h3 className="text-lg font-medium text-gray-900 mb-2">Error Loading Organizations</h3>
                <p className="text-sm text-gray-500 mb-4">{error}</p>
                <Button onClick={refreshData}>Try Again</Button>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    )
  }

  if (loading) {
    return (
      <div className="space-y-6">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          {[...Array(4)].map((_, i) => (
            <div key={i} className="h-32 bg-gray-200 rounded-lg animate-pulse" />
          ))}
        </div>
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {[...Array(2)].map((_, i) => (
            <div key={i} className="h-64 bg-gray-200 rounded-lg animate-pulse" />
          ))}
        </div>
        <div className="h-96 bg-gray-200 rounded-lg animate-pulse" />
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {/* Create Organization Modal */}
      <Modal
        open={showCreate}
        onClose={() => setShowCreate(false)}
        title="Add Organization"
        footer={(
          <>
            <Button variant="outline" onClick={() => setShowCreate(false)}>Cancel</Button>
            <Button onClick={async () => {
              if (!createForm.name.trim()) return
              try {
                await createOrganization({ name: createForm.name.trim(), domain: createForm.domain || undefined, website: createForm.website || undefined })
                setShowCreate(false)
              } catch (e) {
                console.error('Create org failed', e)
                alert('Failed to create organization')
              }
            }}>Create</Button>
          </>
        )}
      >
        <div className="space-y-3">
          <div>
            <label className="text-sm text-gray-600">Name</label>
            <Input value={createForm.name} onChange={e => setCreateForm({ ...createForm, name: e.target.value })} placeholder="Organization name" />
          </div>
          <div>
            <label className="text-sm text-gray-600">Domain</label>
            <Input value={createForm.domain} onChange={e => setCreateForm({ ...createForm, domain: e.target.value })} placeholder="example.com" />
          </div>
          <div>
            <label className="text-sm text-gray-600">Website</label>
            <Input value={createForm.website} onChange={e => setCreateForm({ ...createForm, website: e.target.value })} placeholder="https://example.com" />
          </div>
        </div>
      </Modal>

      {/* Edit Organization Modal */}
      <Modal
        open={!!showEdit}
        onClose={() => setShowEdit(null)}
        title="Edit Organization"
        footer={(
          <>
            <Button variant="outline" onClick={() => setShowEdit(null)}>Cancel</Button>
            <Button onClick={async () => {
              if (!showEdit) return
              try {
                await updateOrganization(showEdit.id, { name: editForm.name, domain: editForm.domain || undefined, website: editForm.website || undefined })
                setShowEdit(null)
              } catch (e) {
                console.error('Update org failed', e)
                alert('Failed to update organization')
              }
            }}>Save</Button>
          </>
        )}
      >
        <div className="space-y-3">
          <div>
            <label className="text-sm text-gray-600">Name</label>
            <Input value={editForm.name} onChange={e => setEditForm({ ...editForm, name: e.target.value })} />
          </div>
          <div>
            <label className="text-sm text-gray-600">Domain</label>
            <Input value={editForm.domain} onChange={e => setEditForm({ ...editForm, domain: e.target.value })} />
          </div>
          <div>
            <label className="text-sm text-gray-600">Website</label>
            <Input value={editForm.website} onChange={e => setEditForm({ ...editForm, website: e.target.value })} />
          </div>
        </div>
      </Modal>

      {/* Members Modal */}
      <Modal
        open={!!showMembers}
        onClose={() => setShowMembers(null)}
        title={`Members${showMembers ? ` - ${showMembers.name}` : ''}`}
        size="lg"
        footer={<Button variant="outline" onClick={() => setShowMembers(null)}>Close</Button>}
      >
        <div className="space-y-3">
          <div className="flex gap-2">
            <Input placeholder="Search users by name or email" value={memberSearch} onChange={e => setMemberSearch(e.target.value)} />
            <Button onClick={async () => {
              if (!memberSearch.trim()) return
              const data = await graphqlRequest<{ users: { edges: { node: { id: string; email: string; fullName: string } }[] } }>(
                `query SearchUsers($q: String!) { users(filters: { search: $q }, pagination: { limit: 10, offset: 0 }) { edges { node { id email fullName } } } }`,
                { q: memberSearch.trim() }
              )
              setMemberResults(data.users.edges.map(e => e.node))
            }}>Search</Button>
          </div>
          {memberResults.length > 0 && (
            <div className="border rounded divide-y">
              {memberResults.map(u => (
                <div key={u.id} className="flex items-center justify-between px-3 py-2">
                  <div>
                    <div className="font-medium">{u.fullName}</div>
                    <div className="text-xs text-gray-500">{u.email}</div>
                  </div>
                  <div className="flex gap-2 items-center">
                    <select id={`add-role-${u.id}`} className="border rounded px-2 py-1">
                      <option>MEMBER</option>
                      <option>ADMIN</option>
                      <option>OWNER</option>
                    </select>
                    <Button onClick={async () => {
                      if (!showMembers) return
                      const role = (document.getElementById(`add-role-${u.id}`) as HTMLSelectElement)?.value || 'MEMBER'
                      await addMember(showMembers.id, u.id, role)
                      setMemberResults([])
                      setMemberSearch('')
                      await openMembers(showMembers)
                    }}>Add</Button>
                  </div>
                </div>
              ))}
            </div>
          )}
          <div className="overflow-x-auto border rounded">
            <table className="min-w-full text-sm">
              <thead>
                <tr className="bg-gray-50 text-left">
                  <th className="px-3 py-2">Name</th>
                  <th className="px-3 py-2">Email</th>
                  <th className="px-3 py-2">Role</th>
                  <th className="px-3 py-2">Joined</th>
                  <th className="px-3 py-2">Actions</th>
                </tr>
              </thead>
              <tbody>
                {members.map(m => (
                  <tr key={m.user.id} className="border-t">
                    <td className="px-3 py-2">{m.user.firstName} {m.user.lastName}</td>
                    <td className="px-3 py-2">{m.user.email}</td>
                    <td className="px-3 py-2">
                      <select
                        className="border rounded px-2 py-1"
                        value={m.role}
                        onChange={async (e) => { if (showMembers) { await updateMemberRole(showMembers.id, m.user.id, e.target.value); await openMembers(showMembers) } }}
                      >
                        {['OWNER','ADMIN','MEMBER'].map(r => <option key={r} value={r}>{r}</option>)}
                      </select>
                    </td>
                    <td className="px-3 py-2">{new Date(m.joinedAt).toLocaleDateString()}</td>
                    <td className="px-3 py-2">
                      <Button variant="outline" onClick={async () => { if (showMembers) { await removeMember(showMembers.id, m.user.id); await openMembers(showMembers) } }}>Remove</Button>
                    </td>
                  </tr>
                ))}
                {(!members || members.length === 0) && (
                  <tr><td className="px-3 py-4 text-gray-500" colSpan={5}>{membersLoading ? 'Loading...' : 'No members'}</td></tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      </Modal>
      {/* Organization Metrics */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <MetricCard
          title="Total Organizations"
          value={metrics?.totalOrganizations.toLocaleString()}
          icon="applications"
          onClick={() => console.log('Total organizations clicked')}
        />
        <MetricCard
          title="Active Organizations"
          value={metrics?.activeOrganizations.toLocaleString()}
          icon="services"
          onClick={() => console.log('Active organizations clicked')}
        />
        <MetricCard
          title="New This Month"
          value={metrics?.newOrganizations.toLocaleString()}
          icon="api"
          onClick={() => console.log('New organizations clicked')}
        />
        <MetricCard
          title="Avg Members/Org"
          value={metrics?.averageMembersPerOrg.toLocaleString()}
          icon="roles"
          onClick={() => console.log('Average members clicked')}
        />
      </div>

      {/* Additional Metrics */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <Card>
          <CardContent className="p-6">
            <div className="flex items-center">
              <div className="p-3 rounded-lg bg-blue-100">
                <UsersIcon className="h-6 w-6 text-blue-600" />
              </div>
              <div className="ml-4 flex-1">
                <p className="text-sm font-medium text-gray-600">Total Organization Members</p>
                <p className="text-2xl font-semibold text-gray-900">
                  {metrics?.totalMembers.toLocaleString()}
                </p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-6">
            <div className="flex items-center">
              <div className="p-3 rounded-lg bg-green-100">
                <CurrencyDollarIcon className="h-6 w-6 text-green-600" />
              </div>
              <div className="ml-4 flex-1">
                <p className="text-sm font-medium text-gray-600">Total Org Revenue</p>
                <p className="text-2xl font-semibold text-gray-900">
                  ${metrics?.totalOrgRevenue.toLocaleString()}
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Charts */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <BarChartComponent
          data={orgByPlan}
          dataKey="count"
          xAxisKey="plan"
          title="Organizations by Plan"
          description="Distribution of organizations across different plans"
          color="hsl(220, 70%, 50%)"
        />

        <DonutChartComponent
          data={orgSizeData}
          dataKey="count"
          nameKey="size"
          title="Organization Size Distribution"
          description="Organizations grouped by member count"
          colors={['hsl(220, 70%, 50%)', 'hsl(280, 70%, 50%)', 'hsl(160, 70%, 50%)', 'hsl(30, 70%, 50%)', 'hsl(340, 70%, 50%)']}
        />
      </div>

      {/* Organizations Table */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle className="flex items-center gap-2">
              <BuildingOfficeIcon className="h-5 w-5" />
              Organization Management ({organizations.length} organizations)
            </CardTitle>
          <Button 
            onClick={async () => {
              const name = window.prompt('Organization name:')
              if (!name) return
              const domain = window.prompt('Domain (optional):') || undefined
              const website = window.prompt('Website (optional):') || undefined
              try {
                await createOrganization({ name, domain, website })
              } catch (e) {
                console.error('Create organization failed', e)
                alert('Failed to create organization')
              }
            }}
            className="flex items-center gap-2"
          >
            <PlusIcon className="h-4 w-4" />
            Add Organization
          </Button>
          </div>
        </CardHeader>
        <CardContent className="p-0">
          <LazyDataTable
            data={organizations}
            columns={organizationColumns}
            searchable={true}
            pageSize={10}
            onRowClick={(org) => console.log('Organization clicked:', org)}
          />
        </CardContent>
      </Card>
    </div>
  )
}
