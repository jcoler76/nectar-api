import { Tooltip } from '@mui/material';
import {
  Eye,
  EyeOff,
  HelpCircle,
  Loader2,
  Lock,
  Mail,
  Shield,
  User,
  Crown,
  Settings,
  Code,
  Users as UsersIcon,
  Eye as ViewIcon,
} from 'lucide-react';
import { useState } from 'react';

import { inviteUser, updateUser } from '../../services/userService';
import { StatusMessages } from '../common/StatusMessages';
import { Button } from '../ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../ui/card';
import {
  FormActions,
  FormContainer,
  FormFieldGroup,
  FormGrid,
  FormHint,
  FormSection,
} from '../ui/form-layout';
import { Input } from '../ui/input';
import { Label } from '../ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../ui/select';

const UserForm = ({ user, onUserSubmitted, hideHeader = false }) => {
  // Helper function to determine role from user data
  const getUserRole = user => {
    if (!user) return 'MEMBER';
    // If editing existing user, try to determine role from isAdmin flag
    // In a real implementation, this would come from user.memberships or user.role
    return user.isAdmin ? 'ADMIN' : 'MEMBER';
  };

  const [formData, setFormData] = useState({
    firstName: user?.firstName || '',
    lastName: user?.lastName || '',
    email: user?.email || '',
    password: '',
    role: getUserRole(user),
  });
  const [error, setError] = useState('');
  const [saving, setSaving] = useState(false);
  const [showPassword, setShowPassword] = useState(false);

  // Role configuration (matching InviteUserModal pattern)
  const roleConfig = {
    ORGANIZATION_OWNER: {
      label: 'Organization Owner',
      icon: Crown,
      description: 'Full control over organization settings, members, and billing',
      color: 'text-red-600',
    },
    ORGANIZATION_ADMIN: {
      label: 'Organization Admin',
      icon: Settings,
      description: 'Can manage team members, settings, and organization resources',
      color: 'text-blue-600',
    },
    DEVELOPER: {
      label: 'Developer',
      icon: Code,
      description: 'Can manage APIs, create integrations, and handle technical resources',
      color: 'text-green-600',
    },
    MEMBER: {
      label: 'Member',
      icon: UsersIcon,
      description: 'Can create and manage workflows, connections, and services',
      color: 'text-gray-600',
    },
    VIEWER: {
      label: 'Viewer',
      icon: ViewIcon,
      description: 'Can view resources but cannot make changes (read-only access)',
      color: 'text-yellow-600',
    },
    // Legacy roles for backward compatibility
    ADMIN: {
      label: 'Admin (Legacy)',
      icon: Shield,
      description: 'Legacy administrator role - use Organization Admin instead',
      color: 'text-blue-500',
    },
  };

  const getAvailableRoles = () => {
    return [
      'ORGANIZATION_OWNER',
      'ORGANIZATION_ADMIN',
      'DEVELOPER',
      'MEMBER',
      'VIEWER',
      // Include legacy for existing users
      'ADMIN',
    ];
  };

  const handleChange = e => {
    const { name, value, checked, type } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: type === 'checkbox' ? checked : value,
    }));
  };

  const handleRoleChange = value => {
    setFormData(prev => ({
      ...prev,
      role: value,
    }));
  };

  const handleSubmit = async e => {
    e.preventDefault();
    setSaving(true);
    setError('');
    try {
      if (user) {
        // Don't send password if it's empty (no password change)
        const updateData = { ...formData };
        if (!updateData.password) delete updateData.password;

        // Convert role to isAdmin for legacy user update API
        // The backend still expects isAdmin boolean, not role string
        updateData.isAdmin = ['ORGANIZATION_OWNER', 'ORGANIZATION_ADMIN', 'ADMIN'].includes(
          formData.role
        );
        delete updateData.role; // Remove role field since backend doesn't expect it

        await updateUser(user._id, updateData);
      } else {
        // Invite user using new role-based system
        await inviteUser(formData);
      }
      onUserSubmitted();
    } catch (err) {
      setError(err.message);
      setSaving(false);
    }
  };

  return (
    <Card
      className={
        hideHeader ? 'w-full border-none shadow-none' : 'w-full max-w-2xl mx-auto shadow-large'
      }
    >
      {!hideHeader && (
        <CardHeader className="space-y-1 pb-6">
          <CardTitle className="text-2xl font-bold flex items-center gap-3">
            <div className="w-10 h-10 bg-gradient-primary rounded-full flex items-center justify-center">
              <User className="h-5 w-5 text-primary-foreground" />
            </div>
            {user ? 'Edit User' : 'Add New User'}
          </CardTitle>
          <CardDescription className="text-base">
            {user
              ? 'Update user information and permissions'
              : 'Create a new user account and send an invitation'}
          </CardDescription>
        </CardHeader>
      )}

      <CardContent className={hideHeader ? 'p-0' : 'p-0'}>
        <FormContainer>
          <form onSubmit={handleSubmit} className="space-y-6">
            <StatusMessages error={error} variant="inline" />

            <FormSection
              title="Personal Information"
              description="Basic user details and contact information"
            >
              <FormGrid columns={2}>
                <FormFieldGroup>
                  <div className="flex items-center gap-2">
                    <Label htmlFor="firstName">First Name *</Label>
                    <Tooltip title="User's first name as it will appear throughout the system. This is required for creating a complete user profile.">
                      <HelpCircle className="h-4 w-4 text-gray-500 cursor-help" />
                    </Tooltip>
                  </div>
                  <div className="relative">
                    <User className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                    <Input
                      id="firstName"
                      name="firstName"
                      type="text"
                      required
                      value={formData.firstName}
                      onChange={handleChange}
                      placeholder="Enter first name"
                      className="pl-8"
                    />
                  </div>
                </FormFieldGroup>

                <FormFieldGroup>
                  <div className="flex items-center gap-2">
                    <Label htmlFor="lastName">Last Name *</Label>
                    <Tooltip title="User's last name to complete their full name display. Required for professional identification within the system.">
                      <HelpCircle className="h-4 w-4 text-gray-500 cursor-help" />
                    </Tooltip>
                  </div>
                  <Input
                    id="lastName"
                    name="lastName"
                    type="text"
                    required
                    value={formData.lastName}
                    onChange={handleChange}
                    placeholder="Enter last name"
                  />
                </FormFieldGroup>
              </FormGrid>

              <FormFieldGroup>
                <div className="flex items-center gap-2">
                  <Label htmlFor="email">Email Address *</Label>
                  <Tooltip title="Primary email address for user authentication and system notifications. Must be unique across all users and will be used for login and password recovery.">
                    <HelpCircle className="h-4 w-4 text-gray-500 cursor-help" />
                  </Tooltip>
                </div>
                <div className="relative">
                  <Mail className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                  <Input
                    id="email"
                    name="email"
                    type="email"
                    required
                    value={formData.email}
                    onChange={handleChange}
                    placeholder="Enter email address"
                    className="pl-10"
                  />
                </div>
              </FormFieldGroup>
            </FormSection>

            {user && (
              <FormSection
                title="Security Settings"
                description="Update password and security preferences"
              >
                <FormFieldGroup>
                  <div className="flex items-center gap-2">
                    <Label htmlFor="password">New Password</Label>
                    <Tooltip title="Set a new password for this user account. Leave blank to keep the current password unchanged. Users can also change their own password through their profile settings.">
                      <HelpCircle className="h-4 w-4 text-gray-500 cursor-help" />
                    </Tooltip>
                  </div>
                  <div className="relative">
                    <Lock className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                    <Input
                      id="password"
                      name="password"
                      type={showPassword ? 'text' : 'password'}
                      value={formData.password}
                      onChange={handleChange}
                      placeholder="Leave blank to keep current password"
                      className="pl-8 pr-10"
                    />
                    <Button
                      type="button"
                      variant="ghost"
                      size="icon-sm"
                      className="absolute right-2 top-1/2 transform -translate-y-1/2"
                      onClick={() => setShowPassword(!showPassword)}
                    >
                      {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                    </Button>
                  </div>
                  <p className="text-sm text-muted-foreground">
                    Leave blank to keep the current password
                  </p>
                </FormFieldGroup>
              </FormSection>
            )}

            <FormSection
              title="Role & Permissions"
              description="Configure user access level and permissions within the organization"
            >
              <FormFieldGroup>
                <div className="flex items-center gap-2">
                  <Label htmlFor="role">User Role *</Label>
                  <Tooltip title="Select the appropriate role that defines what the user can access and manage within your organization. Each role has specific permissions and capabilities.">
                    <HelpCircle className="h-4 w-4 text-gray-500 cursor-help" />
                  </Tooltip>
                </div>
                <Select value={formData.role} onValueChange={handleRoleChange}>
                  <SelectTrigger className="w-full">
                    <SelectValue placeholder="Select a role" />
                  </SelectTrigger>
                  <SelectContent>
                    {getAvailableRoles().map(roleKey => {
                      const role = roleConfig[roleKey];
                      const IconComponent = role.icon;
                      return (
                        <SelectItem key={roleKey} value={roleKey}>
                          <div className="flex items-center gap-2">
                            <IconComponent className={`h-4 w-4 ${role.color}`} />
                            <span>{role.label}</span>
                          </div>
                        </SelectItem>
                      );
                    })}
                  </SelectContent>
                </Select>
                {formData.role && roleConfig[formData.role] && (
                  <p className="text-sm text-muted-foreground mt-2 p-3 bg-muted/50 rounded-md border">
                    <strong>{roleConfig[formData.role].label}:</strong>{' '}
                    {roleConfig[formData.role].description}
                  </p>
                )}
              </FormFieldGroup>
            </FormSection>

            {!user && (
              <FormHint>
                <p className="font-medium">Invitation Process</p>
                <p className="text-sm text-muted-foreground mt-1">
                  An invitation email will be sent to the user with instructions to set up their
                  account. They will be able to create their own password during the setup process.
                </p>
              </FormHint>
            )}

            <FormActions>
              <Tooltip title="Reset all form fields to their original values, discarding any unsaved changes">
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => {
                    setFormData({
                      firstName: user?.firstName || '',
                      lastName: user?.lastName || '',
                      email: user?.email || '',
                      password: '',
                      role: getUserRole(user),
                    });
                    setError('');
                  }}
                >
                  Reset
                </Button>
              </Tooltip>
              <Tooltip
                title={
                  user
                    ? 'Save all changes to this user account. Any password change will take effect immediately.'
                    : 'Create the new user account and send an invitation email with setup instructions.'
                }
              >
                <Button
                  type="submit"
                  variant="gradient"
                  disabled={saving}
                  className="min-w-[140px] w-full sm:w-auto"
                >
                  {saving ? (
                    <>
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                      {user ? 'Updating...' : 'Sending...'}
                    </>
                  ) : (
                    <>{user ? 'Update User' : 'Send Invitation'}</>
                  )}
                </Button>
              </Tooltip>
            </FormActions>
          </form>
        </FormContainer>
      </CardContent>
    </Card>
  );
};

export default UserForm;
