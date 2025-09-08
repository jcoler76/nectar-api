import { Bell, Eye, EyeOff, Loader2, Lock, Save, Shield, User, CreditCard, ExternalLink } from 'lucide-react';
import { useEffect, useState } from 'react';

import { useAuth } from '../../context/AuthContext';
import api from '../../services/api';
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
import { ValidationMessage } from '../ui/form-validation';
import { Input } from '../ui/input';
import { Label } from '../ui/label';
import { Switch } from '../ui/switch';

const UserSettings = () => {
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [loading, setLoading] = useState(false);
  const [showCurrentPassword, setShowCurrentPassword] = useState(false);
  const [showNewPassword, setShowNewPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);

  // Notification preferences state
  const [notificationPreferences, setNotificationPreferences] = useState({
    inbox: {
      system: true,
      workflow: true,
      security: true,
      user_message: true,
    },
    email: {
      system: false,
      workflow: false,
      security: true,
      user_message: false,
    },
  });
  const [notificationLoading, setNotificationLoading] = useState(false);
  const [notificationError, setNotificationError] = useState('');
  const [notificationSuccess, setNotificationSuccess] = useState('');

  const { updatePassword, user } = useAuth();
  const [billingLoading, setBillingLoading] = useState(false);
  const openPortal = async () => {
    try {
      setBillingLoading(true);
      const res = await fetch('/api/checkout/portal', { method: 'POST', headers: { 'Content-Type': 'application/json' } });
      const data = await res.json();
      if (data?.url) {
        window.location.href = data.url;
      }
    } catch (e) {
      // no-op: keep UI simple here
    } finally {
      setBillingLoading(false);
    }
  };

  // Load notification preferences on component mount
  useEffect(() => {
    const loadNotificationPreferences = async () => {
      try {
        const response = await api.get('/api/users/notification-preferences');
        setNotificationPreferences(response.data);
      } catch (error) {
        console.error('Failed to load notification preferences:', error);
      }
    };

    loadNotificationPreferences();
  }, []);

  const handleSubmit = async e => {
    e.preventDefault();

    if (newPassword !== confirmPassword) {
      setError('New passwords do not match');
      return;
    }

    if (newPassword.length < 8) {
      setError('New password must be at least 8 characters long');
      return;
    }

    setError('');
    setSuccess('');
    setLoading(true);

    try {
      await updatePassword(currentPassword, newPassword);
      setSuccess('Password updated successfully!');
      setCurrentPassword('');
      setNewPassword('');
      setConfirmPassword('');
    } catch (err) {
      setError(err.message || 'Failed to update password');
    } finally {
      setLoading(false);
    }
  };

  const getPasswordStrength = password => {
    if (!password) return { strength: 0, label: '', color: '' };

    let strength = 0;
    if (password.length >= 8) strength++;
    if (/[A-Z]/.test(password)) strength++;
    if (/[a-z]/.test(password)) strength++;
    if (/\d/.test(password)) strength++;
    if (/[^A-Za-z0-9]/.test(password)) strength++;

    const levels = [
      { strength: 0, label: 'Very Weak', color: 'text-red-600' },
      { strength: 1, label: 'Weak', color: 'text-red-500' },
      { strength: 2, label: 'Fair', color: 'text-yellow-500' },
      { strength: 3, label: 'Good', color: 'text-blue-500' },
      { strength: 4, label: 'Strong', color: 'text-green-500' },
      { strength: 5, label: 'Very Strong', color: 'text-green-600' },
    ];

    return levels[strength] || levels[0];
  };

  const passwordStrength = getPasswordStrength(newPassword);

  const handleNotificationChange = (category, type, value) => {
    setNotificationPreferences(prev => ({
      ...prev,
      [category]: {
        ...prev[category],
        [type]: value,
      },
    }));
  };

  const saveNotificationPreferences = async () => {
    setNotificationLoading(true);
    setNotificationError('');
    setNotificationSuccess('');

    try {
      await api.put('/api/users/notification-preferences', notificationPreferences);
      setNotificationSuccess('Notification preferences updated successfully!');
      setTimeout(() => setNotificationSuccess(''), 3000);
    } catch (error) {
      const errorMessage =
        error.response?.data?.error?.message || 'Failed to update notification preferences';
      setNotificationError(errorMessage);
    } finally {
      setNotificationLoading(false);
    }
  };

  const notificationTypes = [
    {
      key: 'system',
      label: 'System Notifications',
      description: 'Important system updates and maintenance alerts',
    },
    {
      key: 'workflow',
      label: 'Workflow Notifications',
      description: 'Workflow execution status and completion updates',
    },
    {
      key: 'security',
      label: 'Security Alerts',
      description: 'Critical security notifications (cannot be disabled)',
      mandatory: true,
    },
    {
      key: 'user_message',
      label: 'User Messages',
      description: 'Messages and communications from other users',
    },
  ];

  return (
    <div className="container mx-auto p-6 max-w-4xl">
      <div className="space-y-2 mb-8">
        <h1 className="text-3xl font-bold tracking-tight flex items-center gap-3 text-ocean-800">
          <div className="w-10 h-10 bg-gradient-primary rounded-full flex items-center justify-center">
            <User className="h-5 w-5 text-primary-foreground" />
          </div>
          User Settings
        </h1>
        <p className="text-muted-foreground">
          Manage your account settings and security preferences
        </p>
      </div>

      <div className="grid gap-6">
        {(user?.isAdmin || user?.role === 'OWNER' || user?.organizationRole === 'OWNER') && (
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <CreditCard className="h-5 w-5" />
                Billing
              </CardTitle>
              <CardDescription>Manage your subscription, payment methods, and invoices</CardDescription>
            </CardHeader>
            <CardContent>
              <Button onClick={openPortal} disabled={billingLoading} className="inline-flex items-center gap-2">
                {billingLoading ? 'Opening…' : 'Manage Billing'}
                <ExternalLink className="w-4 h-4" />
              </Button>
            </CardContent>
          </Card>
        )}
        {/* Account Information */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <User className="h-5 w-5" />
              Account Information
            </CardTitle>
            <CardDescription>Your current account details and profile information</CardDescription>
          </CardHeader>
          <CardContent>
            <FormGrid columns={2}>
              <FormFieldGroup>
                <Label>Email Address</Label>
                <Input value={user?.email || ''} disabled className="bg-muted/30" />
              </FormFieldGroup>
              <FormFieldGroup>
                <Label>Account Type</Label>
                <div className="flex items-center gap-2 h-10 px-3 py-2 bg-muted/30 rounded-lg border">
                  <Shield className="h-4 w-4 text-muted-foreground" />
                  <span className="text-sm">
                    {user?.isAdmin ? 'Administrator' : 'Standard User'}
                  </span>
                </div>
              </FormFieldGroup>
            </FormGrid>
          </CardContent>
        </Card>

        {/* Notification Preferences */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Bell className="h-5 w-5" />
              Notification Preferences
            </CardTitle>
            <CardDescription>
              Control how and where you receive different types of notifications
            </CardDescription>
          </CardHeader>
          <CardContent>
            <FormContainer>
              {notificationError && (
                <ValidationMessage type="error">{notificationError}</ValidationMessage>
              )}

              {notificationSuccess && (
                <ValidationMessage type="success">{notificationSuccess}</ValidationMessage>
              )}

              <div className="space-y-6">
                {/* Notification Types Table */}
                <div className="border rounded-lg overflow-hidden">
                  <div className="grid grid-cols-4 bg-muted/50 p-4 font-medium text-sm border-b">
                    <div>Notification Type</div>
                    <div className="text-center">Inbox</div>
                    <div className="text-center">Email</div>
                    <div className="text-center">Status</div>
                  </div>

                  {notificationTypes.map(type => (
                    <div
                      key={type.key}
                      className="grid grid-cols-4 p-4 border-b last:border-b-0 items-center"
                    >
                      <div>
                        <div className="font-medium">{type.label}</div>
                        <div className="text-sm text-muted-foreground mt-1">{type.description}</div>
                      </div>

                      <div className="flex justify-center">
                        <Switch
                          checked={notificationPreferences.inbox[type.key]}
                          onCheckedChange={checked =>
                            !type.mandatory && handleNotificationChange('inbox', type.key, checked)
                          }
                          disabled={type.mandatory}
                        />
                      </div>

                      <div className="flex justify-center">
                        <Switch
                          checked={notificationPreferences.email[type.key]}
                          onCheckedChange={checked =>
                            !type.mandatory && handleNotificationChange('email', type.key, checked)
                          }
                          disabled={type.mandatory}
                        />
                      </div>

                      <div className="flex justify-center">
                        {type.mandatory ? (
                          <span className="text-xs px-2 py-1 bg-red-100 text-red-700 rounded-full">
                            Required
                          </span>
                        ) : (
                          <span className="text-xs px-2 py-1 bg-green-100 text-green-700 rounded-full">
                            Optional
                          </span>
                        )}
                      </div>
                    </div>
                  ))}
                </div>

                <FormHint>
                  <p className="font-medium">About Notification Settings</p>
                  <ul className="text-xs text-muted-foreground mt-1 space-y-1">
                    <li>
                      • <strong>Inbox:</strong> Shows notifications in the application&apos;s
                      notification center
                    </li>
                    <li>
                      • <strong>Email:</strong> Sends notifications to your registered email address
                    </li>
                    <li>
                      • <strong>Security alerts</strong> are mandatory and cannot be disabled for
                      account safety
                    </li>
                    <li>• You can choose to receive notifications in one or both locations</li>
                  </ul>
                </FormHint>

                <FormActions>
                  <Button
                    type="button"
                    variant="outline"
                    onClick={() => {
                      setNotificationError('');
                      setNotificationSuccess('');
                    }}
                  >
                    Cancel
                  </Button>
                  <Button
                    type="button"
                    variant="gradient"
                    onClick={saveNotificationPreferences}
                    disabled={notificationLoading}
                  >
                    {notificationLoading ? (
                      <>
                        <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                        Saving...
                      </>
                    ) : (
                      <>
                        <Save className="mr-2 h-4 w-4" />
                        Save Preferences
                      </>
                    )}
                  </Button>
                </FormActions>
              </div>
            </FormContainer>
          </CardContent>
        </Card>

        {/* Password Change */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Lock className="h-5 w-5" />
              Change Password
            </CardTitle>
            <CardDescription>Update your password to keep your account secure</CardDescription>
          </CardHeader>
          <CardContent>
            <FormContainer>
              <form onSubmit={handleSubmit} className="space-y-6">
                {error && <ValidationMessage type="error">{error}</ValidationMessage>}

                {success && <ValidationMessage type="success">{success}</ValidationMessage>}

                <FormSection>
                  <FormFieldGroup>
                    <Label htmlFor="currentPassword">Current Password *</Label>
                    <div className="relative">
                      <Lock className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                      <Input
                        id="currentPassword"
                        type={showCurrentPassword ? 'text' : 'password'}
                        required
                        value={currentPassword}
                        onChange={e => setCurrentPassword(e.target.value)}
                        placeholder="Enter your current password"
                        className="pl-8 pr-10"
                      />
                      <Button
                        type="button"
                        variant="ghost"
                        size="icon-sm"
                        className="absolute right-2 top-1/2 transform -translate-y-1/2"
                        onClick={() => setShowCurrentPassword(!showCurrentPassword)}
                      >
                        {showCurrentPassword ? (
                          <EyeOff className="h-4 w-4" />
                        ) : (
                          <Eye className="h-4 w-4" />
                        )}
                      </Button>
                    </div>
                  </FormFieldGroup>

                  <FormGrid columns={2}>
                    <FormFieldGroup>
                      <Label htmlFor="newPassword">New Password *</Label>
                      <div className="relative">
                        <Lock className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                        <Input
                          id="newPassword"
                          type={showNewPassword ? 'text' : 'password'}
                          required
                          value={newPassword}
                          onChange={e => setNewPassword(e.target.value)}
                          placeholder="Enter new password"
                          className="pl-8 pr-10"
                        />
                        <Button
                          type="button"
                          variant="ghost"
                          size="icon-sm"
                          className="absolute right-2 top-1/2 transform -translate-y-1/2"
                          onClick={() => setShowNewPassword(!showNewPassword)}
                        >
                          {showNewPassword ? (
                            <EyeOff className="h-4 w-4" />
                          ) : (
                            <Eye className="h-4 w-4" />
                          )}
                        </Button>
                      </div>
                      {newPassword && (
                        <div className="flex items-center gap-2 mt-1">
                          <div className="flex-1 bg-muted rounded-full h-2">
                            <div
                              className={`h-2 rounded-full transition-all duration-300 ${
                                passwordStrength.strength <= 1
                                  ? 'bg-red-500'
                                  : passwordStrength.strength <= 2
                                    ? 'bg-yellow-500'
                                    : passwordStrength.strength <= 3
                                      ? 'bg-blue-500'
                                      : 'bg-green-500'
                              }`}
                              style={{ width: `${(passwordStrength.strength / 5) * 100}%` }}
                            />
                          </div>
                          <span className={`text-xs font-medium ${passwordStrength.color}`}>
                            {passwordStrength.label}
                          </span>
                        </div>
                      )}
                    </FormFieldGroup>

                    <FormFieldGroup>
                      <Label htmlFor="confirmPassword">Confirm New Password *</Label>
                      <div className="relative">
                        <Lock className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                        <Input
                          id="confirmPassword"
                          type={showConfirmPassword ? 'text' : 'password'}
                          required
                          value={confirmPassword}
                          onChange={e => setConfirmPassword(e.target.value)}
                          placeholder="Confirm new password"
                          className="pl-8 pr-10"
                          error={confirmPassword && newPassword !== confirmPassword}
                        />
                        <Button
                          type="button"
                          variant="ghost"
                          size="icon-sm"
                          className="absolute right-2 top-1/2 transform -translate-y-1/2"
                          onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                        >
                          {showConfirmPassword ? (
                            <EyeOff className="h-4 w-4" />
                          ) : (
                            <Eye className="h-4 w-4" />
                          )}
                        </Button>
                      </div>
                      {confirmPassword && newPassword !== confirmPassword && (
                        <p className="text-sm text-destructive mt-1">Passwords do not match</p>
                      )}
                    </FormFieldGroup>
                  </FormGrid>
                </FormSection>

                <FormHint>
                  <p className="font-medium">Password Requirements</p>
                  <ul className="text-xs text-muted-foreground mt-1 space-y-1">
                    <li>• At least 8 characters long</li>
                    <li>• Include uppercase and lowercase letters</li>
                    <li>• Include at least one number</li>
                    <li>• Include at least one special character</li>
                  </ul>
                </FormHint>

                <FormActions>
                  <Button
                    type="button"
                    variant="outline"
                    onClick={() => {
                      setCurrentPassword('');
                      setNewPassword('');
                      setConfirmPassword('');
                      setError('');
                      setSuccess('');
                    }}
                  >
                    Cancel
                  </Button>
                  <Button
                    type="submit"
                    variant="gradient"
                    disabled={
                      loading ||
                      !currentPassword ||
                      !newPassword ||
                      !confirmPassword ||
                      newPassword !== confirmPassword
                    }
                  >
                    {loading ? (
                      <>
                        <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                        Updating...
                      </>
                    ) : (
                      <>
                        <Save className="mr-2 h-4 w-4" />
                        Update Password
                      </>
                    )}
                  </Button>
                </FormActions>
              </form>
            </FormContainer>
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

export default UserSettings;
