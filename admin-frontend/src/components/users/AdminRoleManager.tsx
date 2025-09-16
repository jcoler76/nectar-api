import React, { useState, useEffect } from 'react';
import {
  UserIcon,
  ShieldCheckIcon,
  CrownIcon,
  CogIcon,
  CodeBracketIcon,
  EyeIcon,
  PlusIcon,
  TrashIcon,
  PencilIcon,
} from '@heroicons/react/24/outline';
import { Card, CardContent, CardHeader, CardTitle } from '../ui/card';
import { Button } from '../ui/button';
import { LazyDataTable } from '../ui/LazyDataTable';

interface AdminUser {
  id: string;
  email: string;
  firstName?: string;
  lastName?: string;
  role: AdminRole;
  isActive: boolean;
  createdAt: string;
  lastLogin?: string;
}

type AdminRole = 'SUPER_ADMIN' | 'ADMIN' | 'SUPPORT_AGENT' | 'BILLING_ADMIN' | 'ANALYST';

interface RoleConfig {
  label: string;
  icon: React.ComponentType<any>;
  color: string;
  bgColor: string;
  description: string;
  permissions: string[];
}

export default function AdminRoleManager() {
  const [adminUsers, setAdminUsers] = useState<AdminUser[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [showCreateModal, setShowCreateModal] = useState(false);

  const roleConfig: Record<AdminRole, RoleConfig> = {
    SUPER_ADMIN: {
      label: 'Super Admin',
      icon: CrownIcon,
      color: 'text-purple-700',
      bgColor: 'bg-purple-100',
      description: 'Full system access with all privileges',
      permissions: [
        'Full platform management',
        'Admin user management',
        'System configuration',
        'All data access',
        'Security management'
      ]
    },
    ADMIN: {
      label: 'Admin',
      icon: ShieldCheckIcon,
      color: 'text-blue-700',
      bgColor: 'bg-blue-100',
      description: 'Administrative access with user management',
      permissions: [
        'User management',
        'Organization oversight',
        'License management',
        'Basic analytics',
        'Content moderation'
      ]
    },
    BILLING_ADMIN: {
      label: 'Billing Admin',
      icon: CogIcon,
      color: 'text-green-700',
      bgColor: 'bg-green-100',
      description: 'Billing and subscription management',
      permissions: [
        'Billing management',
        'Subscription control',
        'Payment processing',
        'Financial reports',
        'Invoice management'
      ]
    },
    SUPPORT_AGENT: {
      label: 'Support Agent',
      icon: UserIcon,
      color: 'text-orange-700',
      bgColor: 'bg-orange-100',
      description: 'Customer support and basic user assistance',
      permissions: [
        'User support',
        'View user data',
        'Basic troubleshooting',
        'Ticket management',
        'Documentation access'
      ]
    },
    ANALYST: {
      label: 'Analyst',
      icon: EyeIcon,
      color: 'text-gray-700',
      bgColor: 'bg-gray-100',
      description: 'Read-only access for analysis and reporting',
      permissions: [
        'Analytics dashboard',
        'Report generation',
        'Data visualization',
        'Usage insights',
        'Performance metrics'
      ]
    }
  };

  const fetchAdminUsers = async () => {
    try {
      setLoading(true);
      const response = await fetch('/api/admin/users');
      const data = await response.json();
      setAdminUsers(data.users || []);
    } catch (err) {
      setError('Failed to load admin users');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchAdminUsers();
  }, []);

  const handleRoleChange = async (userId: string, newRole: AdminRole) => {
    try {
      const response = await fetch(`/api/admin/users/${userId}/role`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ role: newRole }),
      });

      if (!response.ok) {
        throw new Error('Failed to update role');
      }

      await fetchAdminUsers();
    } catch (err) {
      setError('Failed to update admin role');
    }
  };

  const handleCreateAdmin = async (userData: {
    email: string;
    firstName?: string;
    lastName?: string;
    role: AdminRole;
  }) => {
    try {
      const response = await fetch('/api/admin/users', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(userData),
      });

      if (!response.ok) {
        throw new Error('Failed to create admin user');
      }

      await fetchAdminUsers();
      setShowCreateModal(false);
    } catch (err) {
      setError('Failed to create admin user');
    }
  };

  const handleDeactivateAdmin = async (userId: string) => {
    if (!confirm('Are you sure you want to deactivate this admin user?')) {
      return;
    }

    try {
      const response = await fetch(`/api/admin/users/${userId}/deactivate`, {
        method: 'PUT',
      });

      if (!response.ok) {
        throw new Error('Failed to deactivate admin');
      }

      await fetchAdminUsers();
    } catch (err) {
      setError('Failed to deactivate admin user');
    }
  };

  const RoleBadge = ({ role }: { role: AdminRole }) => {
    const config = roleConfig[role];
    const IconComponent = config.icon;

    return (
      <div className={`inline-flex items-center gap-2 px-2 py-1 rounded-full text-xs font-medium ${config.bgColor} ${config.color}`}>
        <IconComponent className=\"h-3 w-3\" />
        {config.label}
      </div>
    );
  };

  const columns = [
    {
      key: 'name',
      title: 'Admin User',
      render: (user: AdminUser) => (
        <div className=\"flex items-center gap-3\">
          <div className=\"w-8 h-8 bg-gray-200 rounded-full flex items-center justify-center\">
            <span className=\"text-sm font-medium text-gray-600\">
              {user.firstName?.[0] || user.email[0].toUpperCase()}
            </span>
          </div>
          <div>
            <div className=\"font-medium text-gray-900\">
              {user.firstName && user.lastName
                ? `${user.firstName} ${user.lastName}`
                : user.email
              }
            </div>
            <div className=\"text-sm text-gray-500\">{user.email}</div>
          </div>
        </div>
      ),
    },
    {
      key: 'role',
      title: 'Role',
      render: (user: AdminUser) => <RoleBadge role={user.role} />,
    },
    {
      key: 'status',
      title: 'Status',
      render: (user: AdminUser) => (
        <span className={`inline-flex px-2 py-1 text-xs font-medium rounded-full ${
          user.isActive
            ? 'bg-green-100 text-green-800'
            : 'bg-red-100 text-red-800'
        }`}>
          {user.isActive ? 'Active' : 'Inactive'}
        </span>
      ),
    },
    {
      key: 'lastLogin',
      title: 'Last Login',
      render: (user: AdminUser) =>
        user.lastLogin ? new Date(user.lastLogin).toLocaleDateString() : 'Never',
    },
    {
      key: 'created',
      title: 'Created',
      render: (user: AdminUser) => new Date(user.createdAt).toLocaleDateString(),
    },
    {
      key: 'actions',
      title: 'Actions',
      render: (user: AdminUser) => (
        <div className=\"flex items-center gap-2\">
          <select
            value={user.role}
            onChange={(e) => handleRoleChange(user.id, e.target.value as AdminRole)}
            className=\"text-sm border border-gray-300 rounded-md px-2 py-1\"
          >
            {Object.entries(roleConfig).map(([role, config]) => (
              <option key={role} value={role}>
                {config.label}
              </option>
            ))}
          </select>
          <Button
            variant=\"outline\"
            size=\"sm\"
            onClick={() => handleDeactivateAdmin(user.id)}
            disabled={!user.isActive}
          >
            <TrashIcon className=\"h-4 w-4\" />
          </Button>
        </div>
      ),
    },
  ];

  if (loading) {
    return (
      <div className=\"flex items-center justify-center h-64\">
        <div className=\"animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600\"></div>
      </div>
    );
  }

  return (
    <div className=\"space-y-6\">
      {/* Header */}
      <div className=\"flex items-center justify-between\">
        <div>
          <h1 className=\"text-2xl font-bold text-gray-900\">Admin Role Management</h1>
          <p className=\"text-gray-600\">Manage admin user roles and permissions</p>
        </div>
        <Button onClick={() => setShowCreateModal(true)}>
          <PlusIcon className=\"h-4 w-4 mr-2\" />
          Add Admin User
        </Button>
      </div>

      {/* Error Alert */}
      {error && (
        <div className=\"bg-red-50 border border-red-200 rounded-md p-4\">
          <div className=\"text-sm text-red-700\">{error}</div>
        </div>
      )}

      {/* Role Overview Cards */}
      <div className=\"grid grid-cols-1 md:grid-cols-3 lg:grid-cols-5 gap-4\">
        {Object.entries(roleConfig).map(([role, config]) => {
          const count = adminUsers.filter(u => u.role === role && u.isActive).length;
          const IconComponent = config.icon;

          return (
            <Card key={role}>
              <CardHeader className=\"pb-2\">
                <div className={`inline-flex items-center gap-2 px-3 py-1 rounded-full text-sm font-medium ${config.bgColor} ${config.color}`}>
                  <IconComponent className=\"h-4 w-4\" />
                  {config.label}
                </div>
              </CardHeader>
              <CardContent>
                <div className=\"text-2xl font-bold text-gray-900\">{count}</div>
                <div className=\"text-sm text-gray-500\">Active Users</div>
              </CardContent>
            </Card>
          );
        })}
      </div>

      {/* Admin Users Table */}
      <Card>
        <CardHeader>
          <CardTitle>Admin Users ({adminUsers.length})</CardTitle>
        </CardHeader>
        <CardContent>
          <LazyDataTable
            data={adminUsers}
            columns={columns}
            loading={loading}
            emptyMessage=\"No admin users found\"
          />
        </CardContent>
      </Card>

      {/* Role Permissions Reference */}
      <Card>
        <CardHeader>
          <CardTitle>Role Permissions Reference</CardTitle>
        </CardHeader>
        <CardContent>
          <div className=\"grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4\">
            {Object.entries(roleConfig).map(([role, config]) => {
              const IconComponent = config.icon;

              return (
                <div key={role} className=\"border border-gray-200 rounded-lg p-4\">
                  <div className={`flex items-center gap-2 mb-2 ${config.color}`}>
                    <IconComponent className=\"h-5 w-5\" />
                    <h3 className=\"font-medium\">{config.label}</h3>
                  </div>
                  <p className=\"text-sm text-gray-600 mb-3\">{config.description}</p>
                  <ul className=\"space-y-1\">
                    {config.permissions.map((permission, index) => (
                      <li key={index} className=\"text-xs text-gray-500 flex items-center gap-1\">
                        <span className=\"w-1 h-1 bg-gray-400 rounded-full\"></span>
                        {permission}
                      </li>
                    ))}
                  </ul>
                </div>
              );
            })}
          </div>
        </CardContent>
      </Card>

      {/* Create Admin Modal - Simplified for now */}
      {showCreateModal && (
        <div className=\"fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50\">
          <div className=\"bg-white rounded-lg p-6 w-full max-w-md\">
            <h2 className=\"text-lg font-bold mb-4\">Create Admin User</h2>
            <form
              onSubmit={(e) => {
                e.preventDefault();
                const formData = new FormData(e.target as HTMLFormElement);
                handleCreateAdmin({
                  email: formData.get('email') as string,
                  firstName: formData.get('firstName') as string,
                  lastName: formData.get('lastName') as string,
                  role: formData.get('role') as AdminRole,
                });
              }}
            >
              <div className=\"space-y-4\">
                <div>
                  <label className=\"block text-sm font-medium mb-1\">Email</label>
                  <input
                    name=\"email\"
                    type=\"email\"
                    required
                    className=\"w-full border border-gray-300 rounded-md px-3 py-2\"
                  />
                </div>
                <div>
                  <label className=\"block text-sm font-medium mb-1\">First Name</label>
                  <input
                    name=\"firstName\"
                    type=\"text\"
                    className=\"w-full border border-gray-300 rounded-md px-3 py-2\"
                  />
                </div>
                <div>
                  <label className=\"block text-sm font-medium mb-1\">Last Name</label>
                  <input
                    name=\"lastName\"
                    type=\"text\"
                    className=\"w-full border border-gray-300 rounded-md px-3 py-2\"
                  />
                </div>
                <div>
                  <label className=\"block text-sm font-medium mb-1\">Role</label>
                  <select
                    name=\"role\"
                    required
                    className=\"w-full border border-gray-300 rounded-md px-3 py-2\"
                  >
                    {Object.entries(roleConfig).map(([role, config]) => (
                      <option key={role} value={role}>
                        {config.label}
                      </option>
                    ))}
                  </select>
                </div>
              </div>
              <div className=\"flex justify-end gap-2 mt-6\">
                <Button
                  type=\"button\"
                  variant=\"outline\"
                  onClick={() => setShowCreateModal(false)}
                >
                  Cancel
                </Button>
                <Button type=\"submit\">Create Admin</Button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}