import { Eye, EyeOff, Loader2, Lock, Mail, Shield, User } from 'lucide-react';
import { useState } from 'react';

import { inviteUser, updateUser } from '../../services/userService';
import { Button } from '../ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../ui/card';
import { Checkbox } from '../ui/checkbox';
import {
  FormActions,
  FormContainer,
  FormFieldGroup,
  FormGrid,
  FormHint,
  FormSection,
} from '../ui/form-layout';
import { ValidationMessage } from '../ui/form-validation';
import { Input } from '../ui/input';
import { Label } from '../ui/label';

const UserForm = ({ user, onUserSubmitted, hideHeader = false }) => {
  const [formData, setFormData] = useState({
    firstName: user?.firstName || '',
    lastName: user?.lastName || '',
    email: user?.email || '',
    password: '',
    isAdmin: user?.isAdmin || false,
  });
  const [error, setError] = useState('');
  const [saving, setSaving] = useState(false);
  const [showPassword, setShowPassword] = useState(false);

  const handleChange = e => {
    const { name, value, checked, type } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: type === 'checkbox' ? checked : value,
    }));
  };

  const handleAdminChange = checked => {
    setFormData(prev => ({
      ...prev,
      isAdmin: checked,
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
        await updateUser(user._id, updateData);
      } else {
        // Invite user instead of creating with password
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
            {error && <ValidationMessage type="error">{error}</ValidationMessage>}

            <FormSection
              title="Personal Information"
              description="Basic user details and contact information"
            >
              <FormGrid columns={2}>
                <FormFieldGroup>
                  <Label htmlFor="firstName">First Name *</Label>
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
                  <Label htmlFor="lastName">Last Name *</Label>
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
                <Label htmlFor="email">Email Address *</Label>
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
                  <Label htmlFor="password">New Password</Label>
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
              title="Permissions"
              description="Configure user access levels and administrative privileges"
            >
              <div className="flex items-start space-x-3 p-4 bg-gradient-subtle/30 rounded-lg border border-border/50">
                <Checkbox
                  id="isAdmin"
                  checked={formData.isAdmin}
                  onCheckedChange={handleAdminChange}
                  className="mt-1"
                />
                <div className="flex-1 space-y-2">
                  <div className="flex items-center gap-2">
                    <Shield className="h-4 w-4 text-primary" />
                    <Label
                      htmlFor="isAdmin"
                      className="text-base font-medium leading-none cursor-pointer"
                    >
                      Administrator Access
                    </Label>
                  </div>
                  <p className="text-sm text-muted-foreground">
                    Grant full administrative privileges including user management, system settings,
                    and access to all application features.
                  </p>
                </div>
              </div>
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
              <Button
                type="button"
                variant="outline"
                onClick={() => {
                  setFormData({
                    firstName: user?.firstName || '',
                    lastName: user?.lastName || '',
                    email: user?.email || '',
                    password: '',
                    isAdmin: user?.isAdmin || false,
                  });
                  setError('');
                }}
              >
                Reset
              </Button>
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
            </FormActions>
          </form>
        </FormContainer>
      </CardContent>
    </Card>
  );
};

export default UserForm;
