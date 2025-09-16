import axios from 'axios';
import { X, Mail, Shield, AlertCircle } from 'lucide-react';
import React, { useState } from 'react';

import { useNotification } from '../../context/NotificationContext';

const InviteUserModal = ({ organizationId, userRole, onClose, onSuccess }) => {
  const { showNotification } = useNotification();
  const [formData, setFormData] = useState({
    email: '',
    role: 'MEMBER', // Default to MEMBER role
  });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const handleSubmit = async e => {
    e.preventDefault();
    setError('');
    setLoading(true);

    try {
      await axios.post('/api/invitations/send', {
        email: formData.email,
        role: formData.role,
        organizationId,
      });

      onSuccess();
    } catch (error) {
      const errorMessage = error.response?.data?.message || 'Failed to send invitation';
      setError(errorMessage);
      showNotification(errorMessage, 'error');
    } finally {
      setLoading(false);
    }
  };

  const handleChange = e => {
    const { name, value } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: value,
    }));
    setError('');
  };

  const getRoleDescription = role => {
    switch (role) {
      case 'SUPER_ADMIN':
        return 'Platform-level access with full administrative privileges';
      case 'ORGANIZATION_OWNER':
        return 'Full control over organization settings, members, and billing';
      case 'ORGANIZATION_ADMIN':
        return 'Can manage team members, settings, and organization resources';
      case 'DEVELOPER':
        return 'Can manage APIs, create integrations, and handle technical resources';
      case 'MEMBER':
        return 'Can create and manage workflows, connections, and services';
      case 'VIEWER':
        return 'Can view resources but cannot make changes';
      // Legacy role support
      case 'OWNER':
        return 'Legacy: Full organization control (use Organization Owner instead)';
      case 'ADMIN':
        return 'Legacy: Organization management (use Organization Admin instead)';
      default:
        return '';
    }
  };

  const getAvailableRoles = () => {
    const allRoles = [
      { value: 'ORGANIZATION_OWNER', label: 'Organization Owner', legacy: false },
      { value: 'ORGANIZATION_ADMIN', label: 'Organization Admin', legacy: false },
      { value: 'DEVELOPER', label: 'Developer', legacy: false },
      { value: 'MEMBER', label: 'Member', legacy: false },
      { value: 'VIEWER', label: 'Viewer', legacy: false },
      // Legacy roles (still supported for backward compatibility)
      { value: 'OWNER', label: 'Owner (Legacy)', legacy: true },
      { value: 'ADMIN', label: 'Admin (Legacy)', legacy: true },
    ];

    // Filter roles based on current user's permissions
    switch (userRole) {
      case 'SUPER_ADMIN':
        return allRoles; // Super admin can assign any role
      case 'OWNER':
      case 'ORGANIZATION_OWNER':
        return allRoles.filter(r => !['SUPER_ADMIN'].includes(r.value));
      case 'ADMIN':
      case 'ORGANIZATION_ADMIN':
        return allRoles.filter(r =>
          !['SUPER_ADMIN', 'OWNER', 'ORGANIZATION_OWNER'].includes(r.value)
        );
      case 'DEVELOPER':
        return allRoles.filter(r =>
          ['MEMBER', 'VIEWER'].includes(r.value)
        );
      default:
        return allRoles.filter(r => r.value === 'VIEWER'); // Minimal permissions
    }
  };

  return (
    <div className="fixed inset-0 bg-gray-600 bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white rounded-lg shadow-xl max-w-md w-full mx-4">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b">
          <h2 className="text-xl font-semibold text-gray-900">Invite Team Member</h2>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-500 transition-colors">
            <X size={24} />
          </button>
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit} className="p-6">
          {error && (
            <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded-md flex items-start">
              <AlertCircle className="text-red-500 mr-2 flex-shrink-0 mt-0.5" size={16} />
              <span className="text-sm text-red-700">{error}</span>
            </div>
          )}

          {/* Email Input */}
          <div className="mb-4">
            <label htmlFor="email" className="block text-sm font-medium text-gray-700 mb-2">
              Email Address
            </label>
            <div className="relative">
              <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                <Mail className="h-5 w-5 text-gray-400" />
              </div>
              <input
                type="email"
                id="email"
                name="email"
                value={formData.email}
                onChange={handleChange}
                required
                placeholder="colleague@example.com"
                className="block w-full pl-10 pr-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              />
            </div>
            <p className="mt-1 text-xs text-gray-500">
              They'll receive an email invitation to join your organization
            </p>
          </div>

          {/* Role Selection */}
          <div className="mb-6">
            <label htmlFor="role" className="block text-sm font-medium text-gray-700 mb-2">
              Role
            </label>
            <div className="relative">
              <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                <Shield className="h-5 w-5 text-gray-400" />
              </div>
              <select
                id="role"
                name="role"
                value={formData.role}
                onChange={handleChange}
                className="block w-full pl-10 pr-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              >
                {getAvailableRoles().map(role => (
                  <option key={role.value} value={role.value}>
                    {role.label}
                  </option>
                ))}
              </select>
            </div>
            <p className="mt-1 text-xs text-gray-500">{getRoleDescription(formData.role)}</p>
          </div>

          {/* Actions */}
          <div className="flex justify-end space-x-3">
            <button
              type="button"
              onClick={onClose}
              disabled={loading}
              className="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-md hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 disabled:opacity-50"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={loading}
              className="px-4 py-2 text-sm font-medium text-white bg-blue-600 border border-transparent rounded-md hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {loading ? (
                <span className="flex items-center">
                  <svg
                    className="animate-spin -ml-1 mr-2 h-4 w-4 text-white"
                    fill="none"
                    viewBox="0 0 24 24"
                  >
                    <circle
                      className="opacity-25"
                      cx="12"
                      cy="12"
                      r="10"
                      stroke="currentColor"
                      strokeWidth="4"
                    />
                    <path
                      className="opacity-75"
                      fill="currentColor"
                      d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
                    />
                  </svg>
                  Sending...
                </span>
              ) : (
                'Send Invitation'
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default InviteUserModal;
