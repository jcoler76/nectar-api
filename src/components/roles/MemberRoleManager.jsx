import React, { useState, useEffect } from 'react';
import {
  Users,
  Shield,
  Crown,
  Settings,
  Code,
  Eye,
  ChevronDown,
  MoreHorizontal,
  UserPlus,
  Trash2,
  Edit3,
  AlertTriangle
} from 'lucide-react';
import { Badge } from '../ui/badge';
import { Button } from '../ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '../ui/card';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '../ui/dropdown-menu';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '../ui/table';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '../ui/dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../ui/select';
import InviteUserModal from '../invitations/InviteUserModal';

const MemberRoleManager = ({ organizationId, currentUserRole }) => {
  const [members, setMembers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showInviteModal, setShowInviteModal] = useState(false);
  const [editingMember, setEditingMember] = useState(null);
  const [error, setError] = useState('');

  // Role configuration
  const roleConfig = {
    SUPER_ADMIN: {
      label: 'Super Admin',
      icon: Crown,
      color: 'bg-purple-100 text-purple-800',
      description: 'Platform-level administrative access'
    },
    ORGANIZATION_OWNER: {
      label: 'Organization Owner',
      icon: Crown,
      color: 'bg-red-100 text-red-800',
      description: 'Full organization control'
    },
    ORGANIZATION_ADMIN: {
      label: 'Organization Admin',
      icon: Settings,
      color: 'bg-blue-100 text-blue-800',
      description: 'Manage organization resources'
    },
    DEVELOPER: {
      label: 'Developer',
      icon: Code,
      color: 'bg-green-100 text-green-800',
      description: 'Technical resource management'
    },
    MEMBER: {
      label: 'Member',
      icon: Users,
      color: 'bg-gray-100 text-gray-800',
      description: 'Standard access'
    },
    VIEWER: {
      label: 'Viewer',
      icon: Eye,
      color: 'bg-yellow-100 text-yellow-800',
      description: 'Read-only access'
    },
    // Legacy roles
    OWNER: {
      label: 'Owner (Legacy)',
      icon: Crown,
      color: 'bg-red-100 text-red-800',
      description: 'Legacy organization owner'
    },
    ADMIN: {
      label: 'Admin (Legacy)',
      icon: Settings,
      color: 'bg-blue-100 text-blue-800',
      description: 'Legacy administrator'
    }
  };

  const fetchMembers = async () => {
    try {
      setLoading(true);
      const response = await fetch(`/api/organizations/${organizationId}/members`);
      const data = await response.json();
      setMembers(data.members || []);
    } catch (err) {
      setError('Failed to load team members');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (organizationId) {
      fetchMembers();
    }
  }, [organizationId]);

  const handleRoleChange = async (memberId, newRole) => {
    try {
      const response = await fetch(`/api/organizations/${organizationId}/members/${memberId}/role`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ role: newRole }),
      });

      if (!response.ok) {
        throw new Error('Failed to update role');
      }

      await fetchMembers(); // Refresh the list
      setEditingMember(null);
    } catch (err) {
      setError('Failed to update member role');
    }
  };

  const handleRemoveMember = async (memberId) => {
    if (!window.confirm('Are you sure you want to remove this member from the organization?')) {
      return;
    }

    try {
      const response = await fetch(`/api/organizations/${organizationId}/members/${memberId}`, {
        method: 'DELETE',
      });

      if (!response.ok) {
        throw new Error('Failed to remove member');
      }

      await fetchMembers(); // Refresh the list
    } catch (err) {
      setError('Failed to remove member');
    }
  };

  const canManageRole = (memberRole, targetRole) => {
    const roleHierarchy = {
      SUPER_ADMIN: 1000,
      ORGANIZATION_OWNER: 800,
      OWNER: 780, // Legacy
      ORGANIZATION_ADMIN: 600,
      ADMIN: 580, // Legacy
      DEVELOPER: 400,
      MEMBER: 200,
      VIEWER: 100
    };

    const currentUserLevel = roleHierarchy[currentUserRole] || 0;
    const memberLevel = roleHierarchy[memberRole] || 0;
    const targetLevel = roleHierarchy[targetRole] || 0;

    // Can only manage users with lower privileges and assign roles lower than own
    return currentUserLevel > memberLevel && currentUserLevel > targetLevel;
  };

  const getAvailableRoles = (memberRole) => {
    const allRoles = Object.keys(roleConfig);
    return allRoles.filter(role => {
      // Don't show SUPER_ADMIN unless current user is SUPER_ADMIN
      if (role === 'SUPER_ADMIN' && currentUserRole !== 'SUPER_ADMIN') {
        return false;
      }
      return canManageRole(memberRole, role);
    });
  };

  const RoleIcon = ({ role }) => {
    const config = roleConfig[role] || roleConfig.MEMBER;
    const IconComponent = config.icon;
    return <IconComponent className="h-4 w-4" />;
  };

  const RoleBadge = ({ role }) => {
    const config = roleConfig[role] || roleConfig.MEMBER;
    return (
      <Badge className={`${config.color} flex items-center gap-1`}>
        <RoleIcon role={role} />
        {config.label}
      </Badge>
    );
  };

  if (loading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Users className="h-5 w-5" />
            Team Members
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex items-center justify-center py-8">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <>
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle className="flex items-center gap-2">
              <Users className="h-5 w-5" />
              Team Members ({members.length})
            </CardTitle>
            {canManageRole('MEMBER', 'MEMBER') && (
              <Button onClick={() => setShowInviteModal(true)} size="sm">
                <UserPlus className="h-4 w-4 mr-2" />
                Invite Member
              </Button>
            )}
          </div>
        </CardHeader>
        <CardContent>
          {error && (
            <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded-md flex items-center gap-2">
              <AlertTriangle className="h-4 w-4 text-red-500" />
              <span className="text-sm text-red-700">{error}</span>
            </div>
          )}

          {members.length === 0 ? (
            <div className="text-center py-8 text-gray-500">
              <Users className="h-12 w-12 mx-auto mb-4 text-gray-300" />
              <p>No team members yet</p>
              <p className="text-sm mt-1">Invite colleagues to collaborate</p>
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Member</TableHead>
                  <TableHead>Role</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Joined</TableHead>
                  <TableHead className="w-16"></TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {members.map((member) => (
                  <TableRow key={member.id}>
                    <TableCell>
                      <div className="flex items-center gap-3">
                        <div className="h-8 w-8 rounded-full bg-blue-100 flex items-center justify-center">
                          <span className="text-sm font-medium text-blue-700">
                            {member.firstName?.[0] || member.email[0].toUpperCase()}
                          </span>
                        </div>
                        <div>
                          <div className="font-medium">
                            {member.firstName && member.lastName
                              ? `${member.firstName} ${member.lastName}`
                              : member.email
                            }
                          </div>
                          <div className="text-sm text-gray-500">{member.email}</div>
                        </div>
                      </div>
                    </TableCell>
                    <TableCell>
                      <RoleBadge role={member.role} />
                    </TableCell>
                    <TableCell>
                      <Badge variant={member.isActive ? "success" : "secondary"}>
                        {member.isActive ? "Active" : "Inactive"}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      {member.createdAt ? new Date(member.createdAt).toLocaleDateString() : '-'}
                    </TableCell>
                    <TableCell>
                      {canManageRole(member.role, 'MEMBER') && (
                        <DropdownMenu>
                          <DropdownMenuTrigger asChild>
                            <Button variant="ghost" size="sm">
                              <MoreHorizontal className="h-4 w-4" />
                            </Button>
                          </DropdownMenuTrigger>
                          <DropdownMenuContent align="end">
                            <DropdownMenuLabel>Actions</DropdownMenuLabel>
                            <DropdownMenuSeparator />
                            <DropdownMenuItem onClick={() => setEditingMember(member)}>
                              <Edit3 className="h-4 w-4 mr-2" />
                              Change Role
                            </DropdownMenuItem>
                            <DropdownMenuItem
                              onClick={() => handleRemoveMember(member.id)}
                              className="text-red-600"
                            >
                              <Trash2 className="h-4 w-4 mr-2" />
                              Remove Member
                            </DropdownMenuItem>
                          </DropdownMenuContent>
                        </DropdownMenu>
                      )}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>

      {/* Invite User Modal */}
      {showInviteModal && (
        <InviteUserModal
          organizationId={organizationId}
          userRole={currentUserRole}
          onClose={() => setShowInviteModal(false)}
          onSuccess={() => {
            setShowInviteModal(false);
            fetchMembers();
          }}
        />
      )}

      {/* Edit Role Modal */}
      {editingMember && (
        <Dialog open={!!editingMember} onOpenChange={() => setEditingMember(null)}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Change Member Role</DialogTitle>
              <DialogDescription>
                Update the role for {editingMember.firstName || editingMember.email}
              </DialogDescription>
            </DialogHeader>
            <div className="py-4">
              <label className="block text-sm font-medium mb-2">New Role</label>
              <Select
                value={editingMember.role}
                onValueChange={(newRole) => handleRoleChange(editingMember.id, newRole)}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {getAvailableRoles(editingMember.role).map((role) => {
                    const config = roleConfig[role];
                    return (
                      <SelectItem key={role} value={role}>
                        <div className="flex items-center gap-2">
                          <RoleIcon role={role} />
                          <span>{config.label}</span>
                        </div>
                      </SelectItem>
                    );
                  })}
                </SelectContent>
              </Select>
              <p className="text-xs text-gray-500 mt-1">
                {roleConfig[editingMember.role]?.description}
              </p>
            </div>
          </DialogContent>
        </Dialog>
      )}
    </>
  );
};

export default MemberRoleManager;