import React, { useState, useEffect } from 'react';
import {
  ShieldCheckIcon,
  DocumentTextIcon,
  TrashIcon,
  DownloadIcon,
  EyeSlashIcon,
  UserIcon,
  ClockIcon,
  ExclamationTriangleIcon,
  CheckCircleIcon,
  InformationCircleIcon
} from '@heroicons/react/24/outline';
import { Card, CardContent, CardHeader, CardTitle } from '../ui/card';
import { graphqlRequest } from '../../services/graphql';

interface PrivacySettings {
  dataRetentionDays: number;
  anonymizeAfterDays: number;
  allowDataExport: boolean;
  allowDataDeletion: boolean;
  requireConsentForTracking: boolean;
  logDataAccess: boolean;
  minimumAgeForTracking: number;
}

interface DataSubject {
  userId: string;
  email: string;
  firstName: string;
  lastName: string;
  dataCollected: {
    appUsageEvents: number;
    loginEvents: number;
    lastActivity: string;
    firstActivity: string;
  };
  consentStatus: {
    hasConsented: boolean;
    consentDate: string | null;
    consentVersion: string | null;
  };
  privacyRequests: Array<{
    id: string;
    type: 'export' | 'delete' | 'correct' | 'restrict';
    status: 'pending' | 'processing' | 'completed' | 'rejected';
    requestDate: string;
    completedDate?: string;
  }>;
}

interface DataAuditLog {
  id: string;
  action: string;
  userId: string;
  adminUserId: string;
  adminEmail: string;
  timestamp: string;
  details: Record<string, any>;
  ipAddress: string;
}

const PrivacyManagement: React.FC = () => {
  const [privacySettings, setPrivacySettings] = useState<PrivacySettings | null>(null);
  const [dataSubjects, setDataSubjects] = useState<DataSubject[]>([]);
  const [auditLogs, setAuditLogs] = useState<DataAuditLog[]>([]);
  const [selectedUser, setSelectedUser] = useState<string>('');
  const [searchEmail, setSearchEmail] = useState<string>('');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [actionLoading, setActionLoading] = useState<string | null>(null);

  const loadPrivacyData = async () => {
    try {
      setLoading(true);
      setError(null);

      const query = `
        query GetPrivacyData($searchEmail: String) {
          privacySettings {
            dataRetentionDays
            anonymizeAfterDays
            allowDataExport
            allowDataDeletion
            requireConsentForTracking
            logDataAccess
            minimumAgeForTracking
          }
          dataSubjects(searchEmail: $searchEmail, limit: 50) {
            userId
            email
            firstName
            lastName
            dataCollected {
              appUsageEvents
              loginEvents
              lastActivity
              firstActivity
            }
            consentStatus {
              hasConsented
              consentDate
              consentVersion
            }
            privacyRequests {
              id
              type
              status
              requestDate
              completedDate
            }
          }
          dataAuditLogs(limit: 20) {
            id
            action
            userId
            adminUserId
            adminEmail
            timestamp
            details
            ipAddress
          }
        }
      `;

      const variables = {
        searchEmail: searchEmail || null
      };

      const result = await graphqlRequest(query, variables);

      setPrivacySettings(result.privacySettings);
      setDataSubjects(result.dataSubjects || []);
      setAuditLogs(result.dataAuditLogs || []);
    } catch (err) {
      console.error('Failed to load privacy data:', err);
      setError('Failed to load privacy management data');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadPrivacyData();
  }, [searchEmail]);

  const updatePrivacySetting = async (setting: string, value: any) => {
    try {
      setActionLoading(`setting_${setting}`);

      const mutation = `
        mutation UpdatePrivacySetting($setting: String!, $value: String!) {
          updatePrivacySetting(setting: $setting, value: $value) {
            success
            message
          }
        }
      `;

      await graphqlRequest(mutation, {
        setting,
        value: String(value)
      });

      // Reload data to get updated settings
      await loadPrivacyData();
    } catch (error) {
      console.error('Failed to update privacy setting:', error);
      setError('Failed to update privacy setting');
    } finally {
      setActionLoading(null);
    }
  };

  const exportUserData = async (userId: string) => {
    try {
      setActionLoading(`export_${userId}`);

      const response = await fetch(`/api/data-retention/export/${userId}`, {
        method: 'GET',
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('token')}`,
        },
      });

      if (!response.ok) {
        throw new Error('Failed to export user data');
      }

      const blob = await response.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.style.display = 'none';
      a.href = url;
      a.download = `user-data-${userId}-${Date.now()}.json`;
      document.body.appendChild(a);
      a.click();
      window.URL.revokeObjectURL(url);
      document.body.removeChild(a);

      // Reload data to update audit logs
      await loadPrivacyData();
    } catch (error) {
      console.error('Failed to export user data:', error);
      setError('Failed to export user data');
    } finally {
      setActionLoading(null);
    }
  };

  const deleteUserData = async (userId: string) => {
    if (!window.confirm('Are you sure you want to permanently delete all data for this user? This action cannot be undone.')) {
      return;
    }

    try {
      setActionLoading(`delete_${userId}`);

      const response = await fetch(`/api/data-retention/user/${userId}`, {
        method: 'DELETE',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${localStorage.getItem('token')}`,
        },
        body: JSON.stringify({ confirm: true }),
      });

      if (!response.ok) {
        throw new Error('Failed to delete user data');
      }

      // Reload data to update the list
      await loadPrivacyData();
    } catch (error) {
      console.error('Failed to delete user data:', error);
      setError('Failed to delete user data');
    } finally {
      setActionLoading(null);
    }
  };

  const getRequestStatusColor = (status: string) => {
    switch (status) {
      case 'completed':
        return 'bg-green-100 text-green-800';
      case 'processing':
        return 'bg-yellow-100 text-yellow-800';
      case 'pending':
        return 'bg-blue-100 text-blue-800';
      case 'rejected':
        return 'bg-red-100 text-red-800';
      default:
        return 'bg-gray-100 text-gray-800';
    }
  };

  const formatBytes = (bytes: number) => {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  };

  if (loading && !privacySettings) {
    return (
      <div className="space-y-6">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {[...Array(3)].map((_, i) => (
            <div key={i} className="h-32 bg-gray-200 rounded-lg animate-pulse" />
          ))}
        </div>
        <div className="h-80 bg-gray-200 rounded-lg animate-pulse" />
      </div>
    );
  }

  if (error) {
    return (
      <div className="text-center py-8">
        <p className="text-red-600 mb-4">{error}</p>
        <button
          onClick={loadPrivacyData}
          className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
        >
          Retry
        </button>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex justify-between items-center">
        <h1 className="text-2xl font-bold text-gray-900">Privacy & GDPR Management</h1>
        <div className="flex items-center space-x-2">
          <ShieldCheckIcon className="h-5 w-5 text-green-600" />
          <span className="text-sm text-green-600 font-medium">GDPR Compliant</span>
        </div>
      </div>

      {/* Privacy Settings */}
      {privacySettings && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center">
              <ShieldCheckIcon className="h-5 w-5 mr-2" />
              Privacy Settings
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              <div className="space-y-2">
                <label className="text-sm font-medium text-gray-700">
                  Data Retention (days)
                </label>
                <input
                  type="number"
                  value={privacySettings.dataRetentionDays}
                  onChange={(e) => updatePrivacySetting('dataRetentionDays', parseInt(e.target.value))}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                  disabled={actionLoading === 'setting_dataRetentionDays'}
                />
              </div>

              <div className="space-y-2">
                <label className="text-sm font-medium text-gray-700">
                  Anonymize After (days)
                </label>
                <input
                  type="number"
                  value={privacySettings.anonymizeAfterDays}
                  onChange={(e) => updatePrivacySetting('anonymizeAfterDays', parseInt(e.target.value))}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                  disabled={actionLoading === 'setting_anonymizeAfterDays'}
                />
              </div>

              <div className="space-y-2">
                <label className="text-sm font-medium text-gray-700">
                  Minimum Age for Tracking
                </label>
                <input
                  type="number"
                  value={privacySettings.minimumAgeForTracking}
                  onChange={(e) => updatePrivacySetting('minimumAgeForTracking', parseInt(e.target.value))}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                  disabled={actionLoading === 'setting_minimumAgeForTracking'}
                />
              </div>

              <div className="flex items-center space-x-2">
                <input
                  type="checkbox"
                  id="allowDataExport"
                  checked={privacySettings.allowDataExport}
                  onChange={(e) => updatePrivacySetting('allowDataExport', e.target.checked)}
                  className="rounded border-gray-300"
                  disabled={actionLoading === 'setting_allowDataExport'}
                />
                <label htmlFor="allowDataExport" className="text-sm font-medium text-gray-700">
                  Allow Data Export
                </label>
              </div>

              <div className="flex items-center space-x-2">
                <input
                  type="checkbox"
                  id="allowDataDeletion"
                  checked={privacySettings.allowDataDeletion}
                  onChange={(e) => updatePrivacySetting('allowDataDeletion', e.target.checked)}
                  className="rounded border-gray-300"
                  disabled={actionLoading === 'setting_allowDataDeletion'}
                />
                <label htmlFor="allowDataDeletion" className="text-sm font-medium text-gray-700">
                  Allow Data Deletion
                </label>
              </div>

              <div className="flex items-center space-x-2">
                <input
                  type="checkbox"
                  id="requireConsentForTracking"
                  checked={privacySettings.requireConsentForTracking}
                  onChange={(e) => updatePrivacySetting('requireConsentForTracking', e.target.checked)}
                  className="rounded border-gray-300"
                  disabled={actionLoading === 'setting_requireConsentForTracking'}
                />
                <label htmlFor="requireConsentForTracking" className="text-sm font-medium text-gray-700">
                  Require Consent for Tracking
                </label>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* User Search */}
      <Card>
        <CardHeader>
          <CardTitle>Data Subject Search</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex space-x-4">
            <div className="flex-1">
              <input
                type="email"
                placeholder="Search by email address..."
                value={searchEmail}
                onChange={(e) => setSearchEmail(e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>
            <button
              onClick={loadPrivacyData}
              className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
              disabled={loading}
            >
              Search
            </button>
          </div>
        </CardContent>
      </Card>

      {/* Data Subjects List */}
      <Card>
        <CardHeader>
          <CardTitle>Data Subjects ({dataSubjects.length})</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    User
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Data Collected
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Consent Status
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Privacy Requests
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Actions
                  </th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {dataSubjects.map((subject) => (
                  <tr key={subject.userId} className="hover:bg-gray-50">
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="flex items-center">
                        <UserIcon className="h-5 w-5 text-gray-400 mr-2" />
                        <div>
                          <p className="text-sm font-medium text-gray-900">
                            {subject.firstName} {subject.lastName}
                          </p>
                          <p className="text-sm text-gray-500">{subject.email}</p>
                        </div>
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                      <div>
                        <p>{subject.dataCollected.appUsageEvents.toLocaleString()} app events</p>
                        <p>{subject.dataCollected.loginEvents.toLocaleString()} login events</p>
                        <p className="text-xs">
                          Last: {new Date(subject.dataCollected.lastActivity).toLocaleDateString()}
                        </p>
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${
                        subject.consentStatus.hasConsented
                          ? 'bg-green-100 text-green-800'
                          : 'bg-red-100 text-red-800'
                      }`}>
                        {subject.consentStatus.hasConsented ? 'Consented' : 'No Consent'}
                      </span>
                      {subject.consentStatus.consentDate && (
                        <p className="text-xs text-gray-500 mt-1">
                          {new Date(subject.consentStatus.consentDate).toLocaleDateString()}
                        </p>
                      )}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="space-y-1">
                        {subject.privacyRequests.slice(0, 2).map((request) => (
                          <span
                            key={request.id}
                            className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${getRequestStatusColor(request.status)}`}
                          >
                            {request.type} - {request.status}
                          </span>
                        ))}
                        {subject.privacyRequests.length > 2 && (
                          <p className="text-xs text-gray-500">+{subject.privacyRequests.length - 2} more</p>
                        )}
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                      <div className="flex space-x-2">
                        <button
                          onClick={() => exportUserData(subject.userId)}
                          disabled={actionLoading === `export_${subject.userId}` || !privacySettings?.allowDataExport}
                          className="inline-flex items-center px-2 py-1 border border-transparent text-xs font-medium rounded text-blue-700 bg-blue-100 hover:bg-blue-200 disabled:opacity-50"
                        >
                          <DownloadIcon className="h-3 w-3 mr-1" />
                          Export
                        </button>
                        <button
                          onClick={() => deleteUserData(subject.userId)}
                          disabled={actionLoading === `delete_${subject.userId}` || !privacySettings?.allowDataDeletion}
                          className="inline-flex items-center px-2 py-1 border border-transparent text-xs font-medium rounded text-red-700 bg-red-100 hover:bg-red-200 disabled:opacity-50"
                        >
                          <TrashIcon className="h-3 w-3 mr-1" />
                          Delete
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
            {dataSubjects.length === 0 && (
              <div className="text-center py-8 text-gray-500">
                <UserIcon className="h-12 w-12 mx-auto mb-2 text-gray-300" />
                <p>No data subjects found</p>
              </div>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Audit Logs */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center">
            <DocumentTextIcon className="h-5 w-5 mr-2" />
            Data Access Audit Log
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Timestamp
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Action
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Admin User
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Subject User
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    IP Address
                  </th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {auditLogs.map((log) => (
                  <tr key={log.id} className="hover:bg-gray-50">
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                      {new Date(log.timestamp).toLocaleString()}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <span className="inline-flex px-2 py-1 text-xs font-semibold rounded-full bg-blue-100 text-blue-800">
                        {log.action}
                      </span>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                      {log.adminEmail}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                      {log.userId}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                      {log.ipAddress}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
            {auditLogs.length === 0 && (
              <div className="text-center py-8 text-gray-500">
                <DocumentTextIcon className="h-12 w-12 mx-auto mb-2 text-gray-300" />
                <p>No audit logs found</p>
              </div>
            )}
          </div>
        </CardContent>
      </Card>

      {/* GDPR Compliance Info */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center">
            <InformationCircleIcon className="h-5 w-5 mr-2" />
            GDPR Compliance Information
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div>
              <h4 className="font-semibold mb-2">Data Subject Rights</h4>
              <ul className="space-y-1 text-sm text-gray-600">
                <li>• Right to access personal data</li>
                <li>• Right to data portability (export)</li>
                <li>• Right to erasure (delete)</li>
                <li>• Right to rectification</li>
                <li>• Right to restrict processing</li>
                <li>• Right to withdraw consent</li>
              </ul>
            </div>
            <div>
              <h4 className="font-semibold mb-2">Compliance Features</h4>
              <ul className="space-y-1 text-sm text-gray-600">
                <li>• Automated data retention policies</li>
                <li>• Data anonymization after specified period</li>
                <li>• Comprehensive audit logging</li>
                <li>• Consent management system</li>
                <li>• Data export in machine-readable format</li>
                <li>• Secure data deletion processes</li>
              </ul>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

export default PrivacyManagement;