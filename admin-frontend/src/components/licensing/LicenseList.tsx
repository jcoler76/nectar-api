import React, { useState, useEffect } from 'react';
import {
  FileText,
  Search,
  Filter,
  Plus,
  Eye,
  Pause,
  Play,
  MoreHorizontal,
  Calendar,
  User,
  Building,
  Activity,
  CheckSquare
} from 'lucide-react';
import { LazyDataTable } from '../ui/LazyDataTable';
import { licenseService, type LicenseData } from '../../services/licenseService';
import LicenseDetails from './LicenseDetails';
import LicenseWizard from './LicenseWizard';

export default function LicenseList() {
  const [licenses, setLicenses] = useState<LicenseData[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedLicenses, setSelectedLicenses] = useState<string[]>([]);
  const [selectedLicenseId, setSelectedLicenseId] = useState<string | null>(null);
  const [showDetails, setShowDetails] = useState(false);
  const [showWizard, setShowWizard] = useState(false);
  const [filters, setFilters] = useState({
    plan: '',
    licenseType: '',
    status: '',
  });
  const [pagination, setPagination] = useState({
    page: 1,
    limit: 20,
    total: 0,
    pages: 0,
  });

  useEffect(() => {
    loadLicenses();
  }, [searchTerm, filters, pagination.page]);

  const loadLicenses = async () => {
    try {
      setLoading(true);

      const params: any = {
        page: pagination.page,
        limit: pagination.limit,
      };

      if (searchTerm) params.search = searchTerm;
      if (filters.plan) params.plan = filters.plan;
      if (filters.licenseType) params.licenseType = filters.licenseType;
      if (filters.status === 'active') params.isActive = true;
      if (filters.status === 'suspended') params.isSuspended = true;
      if (filters.status === 'inactive') params.isActive = false;

      const response = await licenseService.getLicenses(params);

      setLicenses(response.licenses || []);
      setPagination(prev => ({
        ...prev,
        total: response.pagination?.total || 0,
        pages: response.pagination?.pages || 0,
      }));
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load licenses');
    } finally {
      setLoading(false);
    }
  };

  const handleSuspendLicense = async (licenseId: string) => {
    try {
      await licenseService.suspendLicense(licenseId, 'Manual suspension from admin portal');
      loadLicenses(); // Refresh the list
    } catch (err) {
      alert('Failed to suspend license: ' + (err instanceof Error ? err.message : 'Unknown error'));
    }
  };

  const handleReactivateLicense = async (licenseId: string) => {
    try {
      await licenseService.reactivateLicense(licenseId);
      loadLicenses(); // Refresh the list
    } catch (err) {
      alert('Failed to reactivate license: ' + (err instanceof Error ? err.message : 'Unknown error'));
    }
  };

  const handleViewDetails = (licenseId: string) => {
    setSelectedLicenseId(licenseId);
    setShowDetails(true);
  };

  const handleSelectLicense = (licenseId: string) => {
    setSelectedLicenses(prev =>
      prev.includes(licenseId)
        ? prev.filter(id => id !== licenseId)
        : [...prev, licenseId]
    );
  };

  const handleSelectAll = () => {
    if (selectedLicenses.length === licenses.length) {
      setSelectedLicenses([]);
    } else {
      setSelectedLicenses(licenses.map(l => l.id));
    }
  };

  const handleBulkSuspend = async () => {
    if (selectedLicenses.length === 0) return;

    const reason = prompt('Reason for bulk suspension (optional):');
    if (reason === null) return;

    try {
      setLoading(true);
      await Promise.all(
        selectedLicenses.map(id => licenseService.suspendLicense(id, reason))
      );
      setSelectedLicenses([]);
      loadLicenses();
    } catch (err) {
      alert('Failed to suspend licenses: ' + (err instanceof Error ? err.message : 'Unknown error'));
    } finally {
      setLoading(false);
    }
  };

  const handleBulkReactivate = async () => {
    if (selectedLicenses.length === 0) return;

    try {
      setLoading(true);
      await Promise.all(
        selectedLicenses.map(id => licenseService.reactivateLicense(id))
      );
      setSelectedLicenses([]);
      loadLicenses();
    } catch (err) {
      alert('Failed to reactivate licenses: ' + (err instanceof Error ? err.message : 'Unknown error'));
    } finally {
      setLoading(false);
    }
  };

  const getStatusBadge = (license: LicenseData) => {
    const status = licenseService.getLicenseStatus(license);
    const colorClasses = {
      active: 'bg-green-100 text-green-800',
      suspended: 'bg-red-100 text-red-800',
      expired: 'bg-orange-100 text-orange-800',
      inactive: 'bg-gray-100 text-gray-800',
    };

    return (
      <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${colorClasses[status.status]}`}>
        {status.label}
      </span>
    );
  };

  const formatDate = (dateString?: string) => {
    if (!dateString) return 'Never';
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
    });
  };

  const formatPlan = (plan: string) => {
    return plan.charAt(0) + plan.slice(1).toLowerCase();
  };

  const columns = [
    {
      key: 'select',
      label: (
        <input
          type="checkbox"
          checked={selectedLicenses.length === licenses.length && licenses.length > 0}
          onChange={handleSelectAll}
          className="rounded border-gray-300 text-blue-600 shadow-sm focus:border-blue-500 focus:ring-blue-500"
        />
      ),
      render: (license: LicenseData) => (
        <input
          type="checkbox"
          checked={selectedLicenses.includes(license.id)}
          onChange={() => handleSelectLicense(license.id)}
          className="rounded border-gray-300 text-blue-600 shadow-sm focus:border-blue-500 focus:ring-blue-500"
        />
      ),
    },
    {
      key: 'customer',
      label: 'Customer',
      render: (license: LicenseData) => (
        <div className="flex items-center">
          <div className="flex-shrink-0 h-10 w-10">
            <div className="h-10 w-10 rounded-full bg-gray-300 flex items-center justify-center">
              {license.customer.companyName ? (
                <Building className="h-5 w-5 text-gray-600" />
              ) : (
                <User className="h-5 w-5 text-gray-600" />
              )}
            </div>
          </div>
          <div className="ml-4">
            <div className="text-sm font-medium text-gray-900">
              {license.customer.companyName || license.customer.email}
            </div>
            <div className="text-sm text-gray-500">
              {license.customer.companyName ? license.customer.email : ''}
            </div>
          </div>
        </div>
      ),
    },
    {
      key: 'licenseKey',
      label: 'License Key',
      render: (license: LicenseData) => (
        <div className="text-sm font-mono">
          {license.licenseKey.substring(0, 20)}...
        </div>
      ),
    },
    {
      key: 'plan',
      label: 'Plan',
      render: (license: LicenseData) => (
        <div className="text-sm text-gray-900">
          {formatPlan(license.plan)}
        </div>
      ),
    },
    {
      key: 'status',
      label: 'Status',
      render: (license: LicenseData) => getStatusBadge(license),
    },
    {
      key: 'issuedAt',
      label: 'Issued',
      render: (license: LicenseData) => (
        <div className="text-sm text-gray-900">
          {formatDate(license.issuedAt)}
        </div>
      ),
    },
    {
      key: 'expiresAt',
      label: 'Expires',
      render: (license: LicenseData) => (
        <div className="text-sm text-gray-900">
          {formatDate(license.expiresAt)}
        </div>
      ),
    },
    {
      key: 'lastHeartbeat',
      label: 'Last Activity',
      render: (license: LicenseData) => (
        <div className="text-sm text-gray-900">
          {license.lastHeartbeat ? licenseService.formatRelativeTime(license.lastHeartbeat) : 'No activity'}
        </div>
      ),
    },
    {
      key: 'actions',
      label: 'Actions',
      render: (license: LicenseData) => (
        <div className="flex items-center space-x-2">
          <button
            onClick={() => handleViewDetails(license.id)}
            className="text-blue-600 hover:text-blue-900"
            title="View Details"
          >
            <Eye className="h-4 w-4" />
          </button>
          {license.isSuspended ? (
            <button
              onClick={() => handleReactivateLicense(license.id)}
              className="text-green-600 hover:text-green-900"
              title="Reactivate License"
            >
              <Play className="h-4 w-4" />
            </button>
          ) : (
            <button
              onClick={() => handleSuspendLicense(license.id)}
              className="text-red-600 hover:text-red-900"
              title="Suspend License"
            >
              <Pause className="h-4 w-4" />
            </button>
          )}
          <button
            className="text-gray-600 hover:text-gray-900"
            title="More Actions"
          >
            <MoreHorizontal className="h-4 w-4" />
          </button>
        </div>
      ),
    },
  ];

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">All Licenses</h1>
          <p className="mt-1 text-sm text-gray-600">
            Manage and monitor all customer licenses
          </p>
        </div>
        <div className="mt-4 sm:mt-0 flex space-x-3">
          {selectedLicenses.length > 0 && (
            <div className="flex space-x-2">
              <button
                onClick={handleBulkSuspend}
                className="inline-flex items-center px-3 py-2 border border-red-300 rounded-md shadow-sm text-sm font-medium text-red-700 bg-white hover:bg-red-50"
              >
                <Pause className="h-4 w-4 mr-2" />
                Suspend ({selectedLicenses.length})
              </button>
              <button
                onClick={handleBulkReactivate}
                className="inline-flex items-center px-3 py-2 border border-green-300 rounded-md shadow-sm text-sm font-medium text-green-700 bg-white hover:bg-green-50"
              >
                <Play className="h-4 w-4 mr-2" />
                Reactivate ({selectedLicenses.length})
              </button>
            </div>
          )}
          <button
            onClick={() => setShowWizard(true)}
            className="inline-flex items-center px-4 py-2 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
          >
            <Plus className="h-4 w-4 mr-2" />
            Create License
          </button>
        </div>
      </div>

      {/* Filters */}
      <div className="bg-white rounded-lg border border-gray-200 p-6">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          {/* Search */}
          <div className="relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
            <input
              type="text"
              placeholder="Search licenses..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-10 w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 sm:text-sm"
            />
          </div>

          {/* Plan Filter */}
          <select
            value={filters.plan}
            onChange={(e) => setFilters(prev => ({ ...prev, plan: e.target.value }))}
            className="rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 sm:text-sm"
          >
            <option value="">All Plans</option>
            <option value="STARTER">Starter</option>
            <option value="PROFESSIONAL">Professional</option>
            <option value="ENTERPRISE">Enterprise</option>
            <option value="CUSTOM">Custom</option>
          </select>

          {/* License Type Filter */}
          <select
            value={filters.licenseType}
            onChange={(e) => setFilters(prev => ({ ...prev, licenseType: e.target.value }))}
            className="rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 sm:text-sm"
          >
            <option value="">All Types</option>
            <option value="TRIAL">Trial</option>
            <option value="STANDARD">Standard</option>
            <option value="ENTERPRISE">Enterprise</option>
            <option value="CUSTOM">Custom</option>
          </select>

          {/* Status Filter */}
          <select
            value={filters.status}
            onChange={(e) => setFilters(prev => ({ ...prev, status: e.target.value }))}
            className="rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 sm:text-sm"
          >
            <option value="">All Statuses</option>
            <option value="active">Active</option>
            <option value="suspended">Suspended</option>
            <option value="inactive">Inactive</option>
          </select>
        </div>
      </div>

      {/* License Table */}
      <div className="bg-white rounded-lg border border-gray-200">
        <LazyDataTable
          data={licenses}
          columns={columns}
          loading={loading}
          error={error}
          pagination={{
            page: pagination.page,
            limit: pagination.limit,
            total: pagination.total,
            onPageChange: (page) => setPagination(prev => ({ ...prev, page })),
          }}
          emptyMessage="No licenses found"
        />
      </div>

      {/* Summary Stats */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <div className="bg-white rounded-lg border border-gray-200 p-4">
          <div className="flex items-center">
            <FileText className="h-8 w-8 text-blue-600" />
            <div className="ml-4">
              <div className="text-2xl font-bold text-gray-900">{pagination.total}</div>
              <div className="text-sm text-gray-600">Total Licenses</div>
            </div>
          </div>
        </div>

        <div className="bg-white rounded-lg border border-gray-200 p-4">
          <div className="flex items-center">
            <Activity className="h-8 w-8 text-green-600" />
            <div className="ml-4">
              <div className="text-2xl font-bold text-gray-900">
                {licenses.filter(l => licenseService.getLicenseStatus(l).status === 'active').length}
              </div>
              <div className="text-sm text-gray-600">Active</div>
            </div>
          </div>
        </div>

        <div className="bg-white rounded-lg border border-gray-200 p-4">
          <div className="flex items-center">
            <Pause className="h-8 w-8 text-red-600" />
            <div className="ml-4">
              <div className="text-2xl font-bold text-gray-900">
                {licenses.filter(l => l.isSuspended).length}
              </div>
              <div className="text-sm text-gray-600">Suspended</div>
            </div>
          </div>
        </div>

        <div className="bg-white rounded-lg border border-gray-200 p-4">
          <div className="flex items-center">
            <Calendar className="h-8 w-8 text-orange-600" />
            <div className="ml-4">
              <div className="text-2xl font-bold text-gray-900">
                {licenses.filter(l => l.expiresAt && new Date(l.expiresAt) < new Date()).length}
              </div>
              <div className="text-sm text-gray-600">Expired</div>
            </div>
          </div>
        </div>
      </div>

      {/* License Details Modal */}
      <LicenseDetails
        licenseId={selectedLicenseId}
        isOpen={showDetails}
        onClose={() => {
          setShowDetails(false);
          setSelectedLicenseId(null);
        }}
        onLicenseUpdated={loadLicenses}
      />

      {/* License Creation Wizard */}
      <LicenseWizard
        isOpen={showWizard}
        onClose={() => setShowWizard(false)}
        onLicenseCreated={() => {
          setShowWizard(false);
          loadLicenses();
        }}
      />
    </div>
  );
}