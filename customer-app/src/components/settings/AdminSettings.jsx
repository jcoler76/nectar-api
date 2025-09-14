import {
  AlertTriangle,
  CheckCircle,
  Clock,
  Crown,
  Key,
  Loader2,
  Mail,
  Shield,
  Trash2,
  User,
  Users,
} from 'lucide-react';
import { useEffect, useState } from 'react';

import { useAuth } from '../../context/AuthContext';
import { formatTimestampEST } from '../../utils/dateUtils';
import { Badge } from '../ui/badge';
import { Button } from '../ui/button';
import { Card, CardContent } from '../ui/card';
import { DataTable } from '../ui/data-table';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '../ui/dialog';
// Removed FormContainer; using a single DataTable card to avoid nested cards
import { ValidationMessage } from '../ui/form-validation';
import { Switch } from '../ui/switch';

const AdminSettings = () => {
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [resetDialogOpen, setResetDialogOpen] = useState(false);
  const [userToReset, setUserToReset] = useState(null);
  const [resetting, setResetting] = useState(false);
  const { getAllUsers, updateUserRole, resetUserAuth } = useAuth();

  useEffect(() => {
    const fetchUsers = async () => {
      try {
        setLoading(true);
        const response = await getAllUsers();
        // Handle paginated response structure
        const usersData = response?.users || response || [];
        setUsers(Array.isArray(usersData) ? usersData : []);
      } catch (err) {
        setError('Failed to load users: ' + (err.message || 'Unknown error'));
      } finally {
        setLoading(false);
      }
    };
    fetchUsers();
  }, [getAllUsers]);

  const handleRoleChange = async (userId, isAdmin) => {
    try {
      setError('');
      setSuccess('');
      await updateUserRole(userId, isAdmin);
      setUsers(
        users.map(user => (user._id === userId || user.id === userId ? { ...user, isAdmin } : user))
      );
      setSuccess(
        `User role updated successfully to ${isAdmin ? 'Administrator' : 'Standard User'}`
      );

      // Clear success message after 3 seconds
      setTimeout(() => setSuccess(''), 3000);
    } catch (error) {
      setError('Failed to update user role: ' + (error.message || 'Unknown error'));
    }
  };

  const handleResetAuthClick = user => {
    setUserToReset(user);
    setResetDialogOpen(true);
  };

  const handleResetAuthConfirm = async () => {
    if (!userToReset) return;

    try {
      setResetting(true);
      setError('');
      setSuccess('');

      await resetUserAuth(userToReset._id || userToReset.id);

      setSuccess(
        `Authentication reset successfully for ${userToReset.firstName} ${userToReset.lastName}. They will be prompted to set up 2FA on their next login.`
      );
      setResetDialogOpen(false);
      setUserToReset(null);

      // Clear success message after 5 seconds
      setTimeout(() => setSuccess(''), 5000);
    } catch (error) {
      setError('Failed to reset user authentication: ' + (error.message || 'Unknown error'));
    } finally {
      setResetting(false);
    }
  };

  const handleResetAuthCancel = () => {
    setResetDialogOpen(false);
    setUserToReset(null);
  };

  const columns = [
    {
      accessorKey: 'displayName',
      header: 'User',
      cell: ({ row }) => {
        const user = row;
        if (!user) return null;

        const displayName =
          user.firstName && user.lastName
            ? `${user.firstName} ${user.lastName}`
            : user.email || 'Unknown User';

        return (
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 bg-gradient-primary rounded-full flex items-center justify-center">
              <User className="h-4 w-4 text-primary-foreground" />
            </div>
            <div>
              <div className="font-medium">{displayName}</div>
              <div className="text-sm text-muted-foreground">{user.email}</div>
            </div>
          </div>
        );
      },
    },
    {
      accessorKey: 'email',
      header: 'Email Address',
      cell: ({ row }) => {
        const user = row;
        if (!user) return null;

        return (
          <div className="flex items-center gap-2">
            <Mail className="h-4 w-4 text-muted-foreground" />
            <span className="text-sm">{user.email}</span>
          </div>
        );
      },
    },
    {
      accessorKey: 'isActive',
      header: 'Status',
      cell: ({ row }) => {
        const user = row;
        if (!user) return null;
        const isActive = user.isActive !== false;
        return (
          <Badge variant={isActive ? 'active' : 'inactive'} className="text-xs">
            {isActive ? (
              <>
                <CheckCircle className="mr-1 h-3 w-3" />
                Active
              </>
            ) : (
              <>
                <Clock className="mr-1 h-3 w-3" />
                Inactive
              </>
            )}
          </Badge>
        );
      },
    },
    {
      accessorKey: 'lastLogin',
      header: 'Last Login',
      cell: ({ row }) => {
        const user = row;
        if (!user) return null;

        return (
          <div className="text-sm text-muted-foreground">
            {user.lastLogin ? formatTimestampEST(user.lastLogin, 'MM/DD/YYYY') : 'Never'}
          </div>
        );
      },
    },
    {
      accessorKey: 'isAdmin',
      header: 'Admin Access',
      cell: ({ row }) => {
        const user = row;
        if (!user) return null;

        return (
          <div className="flex items-center gap-3">
            <Switch
              checked={user.isAdmin || false}
              onCheckedChange={checked => handleRoleChange(user._id || user.id, checked)}
            />
            {user.isAdmin && (
              <Crown
                className="h-4 w-4 text-yellow-600"
                aria-label="Administrator"
                title="Administrator"
              />
            )}
          </div>
        );
      },
    },
    {
      accessorKey: 'actions',
      header: 'Actions',
      cell: ({ row }) => {
        const user = row;
        if (!user) return null;

        return (
          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={() => handleResetAuthClick(user)}
              className="flex items-center gap-2"
            >
              <Key className="h-4 w-4" />
              Reset Auth
            </Button>
          </div>
        );
      },
    },
  ];

  const adminCount = users.filter(user => user.isAdmin).length;
  const activeCount = users.filter(user => user.isActive !== false).length;

  return (
    <div className="container mx-auto p-6 max-w-6xl">
      <div className="space-y-2 mb-8">
        <h1 className="text-3xl font-bold tracking-tight flex items-center gap-3 text-ocean-800">
          <div className="w-10 h-10 bg-gradient-primary rounded-full flex items-center justify-center">
            <Shield className="h-5 w-5 text-primary-foreground" />
          </div>
          Admin Settings
        </h1>
        <p className="text-muted-foreground">Manage user roles and administrative permissions</p>
      </div>

      <div className="grid gap-6">
        {/* Statistics Cards */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <Card>
            <CardContent className="p-6">
              <div className="flex items-center gap-4">
                <div className="w-12 h-12 bg-blue-100 rounded-full flex items-center justify-center">
                  <Users className="h-6 w-6 text-blue-600" />
                </div>
                <div>
                  <p className="text-2xl font-bold">{users.length}</p>
                  <p className="text-sm text-muted-foreground">Total Users</p>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-6">
              <div className="flex items-center gap-4">
                <div className="w-12 h-12 bg-yellow-100 rounded-full flex items-center justify-center">
                  <Crown className="h-6 w-6 text-yellow-600" />
                </div>
                <div>
                  <p className="text-2xl font-bold">{adminCount}</p>
                  <p className="text-sm text-muted-foreground">Administrators</p>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-6">
              <div className="flex items-center gap-4">
                <div className="w-12 h-12 bg-green-100 rounded-full flex items-center justify-center">
                  <CheckCircle className="h-6 w-6 text-green-600" />
                </div>
                <div>
                  <p className="text-2xl font-bold">{activeCount}</p>
                  <p className="text-sm text-muted-foreground">Active Users</p>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* User Management - Single card via DataTable */}
        {error && <ValidationMessage type="error">{error}</ValidationMessage>}
        {success && <ValidationMessage type="success">{success}</ValidationMessage>}
        <DataTable
          data={users}
          columns={columns}
          searchable={true}
          loading={loading}
          title={undefined}
          description={undefined}
          headerExtra={
            <div className="p-4 bg-yellow-50 border border-yellow-200 rounded-lg">
              <div className="flex items-start gap-3">
                <AlertTriangle className="h-5 w-5 text-yellow-600 mt-0.5" />
                <div>
                  <h4 className="font-medium text-yellow-800">Important Notice</h4>
                  <p className="text-sm text-yellow-700 mt-1">
                    Be careful when modifying admin permissions. Ensure at least one administrator
                    account remains active to maintain system access.
                  </p>
                </div>
              </div>
            </div>
          }
        />
      </div>

      {/* Reset Authentication Confirmation Dialog */}
      <Dialog open={resetDialogOpen} onOpenChange={setResetDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <AlertTriangle className="h-5 w-5 text-orange-600" />
              Reset User Authentication
            </DialogTitle>
            <DialogDescription>
              Are you sure you want to reset the authentication for{' '}
              <strong>
                {userToReset?.firstName} {userToReset?.lastName} ({userToReset?.email})
              </strong>
              ?
            </DialogDescription>
          </DialogHeader>

          <div className="py-4">
            <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4">
              <div className="flex items-start gap-3">
                <Key className="h-5 w-5 text-yellow-600 mt-0.5" />
                <div>
                  <h4 className="font-medium text-yellow-800 mb-2">This action will:</h4>
                  <ul className="text-sm text-yellow-700 space-y-1">
                    <li>• Clear their two-factor authentication secret</li>
                    <li>• Remove all backup codes</li>
                    <li>• Clear trusted devices</li>
                    <li>• Force them to set up 2FA on their next login</li>
                  </ul>
                </div>
              </div>
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={handleResetAuthCancel} disabled={resetting}>
              Cancel
            </Button>
            <Button
              variant="destructive"
              onClick={handleResetAuthConfirm}
              disabled={resetting}
              className="flex items-center gap-2"
            >
              {resetting ? (
                <>
                  <Loader2 className="h-4 w-4 animate-spin" />
                  Resetting...
                </>
              ) : (
                <>
                  <Trash2 className="h-4 w-4" />
                  Reset Authentication
                </>
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default AdminSettings;
