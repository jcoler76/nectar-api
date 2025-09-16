import React, { useState, useEffect } from 'react';
import {
  Users,
  Search,
  Plus,
  Eye,
  Edit2,
  Building,
  User,
  Mail,
  Phone,
  MapPin,
  Calendar,
  FileText,
  Activity,
  MoreHorizontal
} from 'lucide-react';
import { LazyDataTable } from '../ui/LazyDataTable';
import { licenseService, type CustomerData, type LicenseData } from '../../services/licenseService';
import { Modal } from '../ui/modal';
import LicenseWizard from './LicenseWizard';

interface CustomerDetailsModalProps {
  customer: CustomerData | null;
  isOpen: boolean;
  onClose: () => void;
}

function CustomerDetailsModal({ customer, isOpen, onClose }: CustomerDetailsModalProps) {
  const [licenses, setLicenses] = useState<LicenseData[]>([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (customer && isOpen) {
      loadCustomerLicenses();
    }
  }, [customer, isOpen]);

  const loadCustomerLicenses = async () => {
    if (!customer) return;

    try {
      setLoading(true);
      const result = await licenseService.getLicenses({
        customerId: customer.id,
        limit: 100,
      });
      setLicenses(result.licenses || []);
    } catch (err) {
      console.error('Failed to load customer licenses:', err);
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

  if (!customer) return null;

  return (
    <Modal isOpen={isOpen} onClose={onClose} size="large">
      <div className="max-w-4xl mx-auto">
        {/* Header */}
        <div className="flex items-start justify-between mb-6">
          <div className="flex items-start">
            <div className="flex-shrink-0">
              {customer.companyName ? (
                <div className="h-16 w-16 bg-blue-100 rounded-lg flex items-center justify-center">
                  <Building className="h-8 w-8 text-blue-600" />
                </div>
              ) : (
                <div className="h-16 w-16 bg-gray-100 rounded-lg flex items-center justify-center">
                  <User className="h-8 w-8 text-gray-600" />
                </div>
              )}
            </div>
            <div className="ml-4">
              <h2 className="text-2xl font-bold text-gray-900">
                {customer.companyName || customer.email}
              </h2>
              <p className="text-gray-500">
                {customer.companyName ? customer.email : 'Individual Customer'}
              </p>
              <div className="flex items-center mt-2 text-sm text-gray-500">
                <Calendar className="h-4 w-4 mr-1" />
                Customer since {formatDate(customer.createdAt)}
              </div>
            </div>
          </div>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-gray-600"
          >
            <MoreHorizontal className="h-6 w-6" />
          </button>
        </div>

        {/* Customer Info */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-8">
          <div className="bg-gray-50 rounded-lg p-6">
            <h3 className="text-lg font-medium text-gray-900 mb-4">Contact Information</h3>
            <div className="space-y-3">
              <div className="flex items-center">
                <Mail className="h-4 w-4 text-gray-400 mr-3" />
                <span className="text-sm text-gray-900">{customer.email}</span>
              </div>
              {customer.contactName && (
                <div className="flex items-center">
                  <User className="h-4 w-4 text-gray-400 mr-3" />
                  <span className="text-sm text-gray-900">{customer.contactName}</span>
                </div>
              )}
              {customer.phone && (
                <div className="flex items-center">
                  <Phone className="h-4 w-4 text-gray-400 mr-3" />
                  <span className="text-sm text-gray-900">{customer.phone}</span>
                </div>
              )}
              {customer.address && (
                <div className="flex items-center">
                  <MapPin className="h-4 w-4 text-gray-400 mr-3" />
                  <span className="text-sm text-gray-900">{customer.address}</span>
                </div>
              )}
            </div>
          </div>

          <div className="bg-gray-50 rounded-lg p-6">
            <h3 className="text-lg font-medium text-gray-900 mb-4">Account Summary</h3>
            <div className="space-y-3">
              <div className="flex justify-between">
                <span className="text-sm text-gray-500">Total Licenses</span>
                <span className="text-sm font-medium text-gray-900">{licenses.length}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-sm text-gray-500">Active Licenses</span>
                <span className="text-sm font-medium text-gray-900">
                  {licenses.filter(l => licenseService.getLicenseStatus(l).status === 'active').length}
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-sm text-gray-500">Account Status</span>
                <span className={`text-sm font-medium ${customer.isActive ? 'text-green-600' : 'text-red-600'}`}>
                  {customer.isActive ? 'Active' : 'Inactive'}
                </span>
              </div>
              {customer.stripeCustomerId && (
                <div className="flex justify-between">
                  <span className="text-sm text-gray-500">Stripe Customer</span>
                  <span className="text-sm font-medium text-gray-900">Connected</span>
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Licenses Table */}
        <div className="bg-white border border-gray-200 rounded-lg">
          <div className="px-6 py-4 border-b border-gray-200">
            <h3 className="text-lg font-medium text-gray-900">Customer Licenses</h3>
          </div>

          {loading ? (
            <div className="flex items-center justify-center h-32">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
            </div>
          ) : licenses.length > 0 ? (
            <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-gray-200">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      License Key
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Plan
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Status
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Issued
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Expires
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Last Activity
                    </th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-200">
                  {licenses.map((license) => (
                    <tr key={license.id}>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="text-sm font-mono text-gray-900">
                          {license.licenseKey.substring(0, 20)}...
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="text-sm text-gray-900">
                          {license.plan.charAt(0) + license.plan.slice(1).toLowerCase()}
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        {getStatusBadge(license)}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                        {formatDate(license.issuedAt)}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                        {formatDate(license.expiresAt)}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                        {license.lastHeartbeat ? licenseService.formatRelativeTime(license.lastHeartbeat) : 'No activity'}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ) : (
            <div className="text-center py-12">
              <FileText className="mx-auto h-12 w-12 text-gray-400" />
              <h3 className="mt-2 text-sm font-medium text-gray-900">No licenses</h3>
              <p className="mt-1 text-sm text-gray-500">This customer doesn't have any licenses yet.</p>
            </div>
          )}
        </div>
      </div>
    </Modal>
  );
}

export default function CustomerManagement() {
  const [customers, setCustomers] = useState<CustomerData[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedCustomer, setSelectedCustomer] = useState<CustomerData | null>(null);
  const [showDetails, setShowDetails] = useState(false);
  const [showLicenseWizard, setShowLicenseWizard] = useState(false);
  const [pagination, setPagination] = useState({
    page: 1,
    limit: 20,
    total: 0,
    pages: 0,
  });

  useEffect(() => {
    loadCustomers();
  }, [searchTerm, pagination.page]);

  const loadCustomers = async () => {
    try {
      setLoading(true);

      const params: any = {
        page: pagination.page,
        limit: pagination.limit,
      };

      if (searchTerm) params.search = searchTerm;

      const result = await licenseService.getCustomers(params);

      setCustomers(result.customers || []);
      setPagination(prev => ({
        ...prev,
        total: result.pagination?.total || 0,
        pages: result.pagination?.pages || 0,
      }));
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load customers');
    } finally {
      setLoading(false);
    }
  };

  const handleViewCustomer = (customer: CustomerData) => {
    setSelectedCustomer(customer);
    setShowDetails(true);
  };

  const handleCreateLicense = (customer: CustomerData) => {
    setSelectedCustomer(customer);
    setShowLicenseWizard(true);
  };

  const columns = [
    {
      key: 'customer',
      label: 'Customer',
      render: (customer: CustomerData) => (
        <div className="flex items-center">
          <div className="flex-shrink-0 h-10 w-10">
            <div className="h-10 w-10 rounded-full bg-gray-300 flex items-center justify-center">
              {customer.companyName ? (
                <Building className="h-5 w-5 text-gray-600" />
              ) : (
                <User className="h-5 w-5 text-gray-600" />
              )}
            </div>
          </div>
          <div className="ml-4">
            <div className="text-sm font-medium text-gray-900">
              {customer.companyName || customer.email}
            </div>
            <div className="text-sm text-gray-500">
              {customer.companyName ? customer.email : 'Individual'}
            </div>
          </div>
        </div>
      ),
    },
    {
      key: 'contact',
      label: 'Contact',
      render: (customer: CustomerData) => (
        <div className="text-sm">
          {customer.contactName && (
            <div className="text-gray-900">{customer.contactName}</div>
          )}
          {customer.phone && (
            <div className="text-gray-500">{customer.phone}</div>
          )}
        </div>
      ),
    },
    {
      key: 'licenses',
      label: 'Licenses',
      render: (customer: CustomerData) => (
        <div className="text-sm text-gray-900">
          {customer.licenses?.length || 0}
        </div>
      ),
    },
    {
      key: 'status',
      label: 'Status',
      render: (customer: CustomerData) => (
        <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
          customer.isActive ? 'bg-green-100 text-green-800' : 'bg-gray-100 text-gray-800'
        }`}>
          {customer.isActive ? 'Active' : 'Inactive'}
        </span>
      ),
    },
    {
      key: 'created',
      label: 'Created',
      render: (customer: CustomerData) => (
        <div className="text-sm text-gray-900">
          {new Date(customer.createdAt).toLocaleDateString('en-US', {
            year: 'numeric',
            month: 'short',
            day: 'numeric',
          })}
        </div>
      ),
    },
    {
      key: 'actions',
      label: 'Actions',
      render: (customer: CustomerData) => (
        <div className="flex items-center space-x-2">
          <button
            onClick={() => handleViewCustomer(customer)}
            className="text-blue-600 hover:text-blue-900"
            title="View Details"
          >
            <Eye className="h-4 w-4" />
          </button>
          <button
            onClick={() => handleCreateLicense(customer)}
            className="text-green-600 hover:text-green-900"
            title="Create License"
          >
            <Plus className="h-4 w-4" />
          </button>
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
          <h1 className="text-2xl font-bold text-gray-900">Customer Management</h1>
          <p className="mt-1 text-sm text-gray-600">
            Manage customers and their license relationships
          </p>
        </div>
        <button
          onClick={() => setShowLicenseWizard(true)}
          className="mt-4 sm:mt-0 inline-flex items-center px-4 py-2 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
        >
          <Plus className="h-4 w-4 mr-2" />
          Create License
        </button>
      </div>

      {/* Search */}
      <div className="bg-white rounded-lg border border-gray-200 p-6">
        <div className="relative">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
          <input
            type="text"
            placeholder="Search customers..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="pl-10 w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 sm:text-sm"
          />
        </div>
      </div>

      {/* Customer Table */}
      <div className="bg-white rounded-lg border border-gray-200">
        <LazyDataTable
          data={customers}
          columns={columns}
          loading={loading}
          error={error}
          pagination={{
            page: pagination.page,
            limit: pagination.limit,
            total: pagination.total,
            onPageChange: (page) => setPagination(prev => ({ ...prev, page })),
          }}
          emptyMessage="No customers found"
        />
      </div>

      {/* Summary Stats */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <div className="bg-white rounded-lg border border-gray-200 p-4">
          <div className="flex items-center">
            <Users className="h-8 w-8 text-blue-600" />
            <div className="ml-4">
              <div className="text-2xl font-bold text-gray-900">{pagination.total}</div>
              <div className="text-sm text-gray-600">Total Customers</div>
            </div>
          </div>
        </div>

        <div className="bg-white rounded-lg border border-gray-200 p-4">
          <div className="flex items-center">
            <Activity className="h-8 w-8 text-green-600" />
            <div className="ml-4">
              <div className="text-2xl font-bold text-gray-900">
                {customers.filter(c => c.isActive).length}
              </div>
              <div className="text-sm text-gray-600">Active</div>
            </div>
          </div>
        </div>

        <div className="bg-white rounded-lg border border-gray-200 p-4">
          <div className="flex items-center">
            <Building className="h-8 w-8 text-purple-600" />
            <div className="ml-4">
              <div className="text-2xl font-bold text-gray-900">
                {customers.filter(c => c.companyName).length}
              </div>
              <div className="text-sm text-gray-600">Companies</div>
            </div>
          </div>
        </div>

        <div className="bg-white rounded-lg border border-gray-200 p-4">
          <div className="flex items-center">
            <FileText className="h-8 w-8 text-orange-600" />
            <div className="ml-4">
              <div className="text-2xl font-bold text-gray-900">
                {customers.reduce((sum, c) => sum + (c.licenses?.length || 0), 0)}
              </div>
              <div className="text-sm text-gray-600">Total Licenses</div>
            </div>
          </div>
        </div>
      </div>

      {/* Customer Details Modal */}
      <CustomerDetailsModal
        customer={selectedCustomer}
        isOpen={showDetails}
        onClose={() => {
          setShowDetails(false);
          setSelectedCustomer(null);
        }}
      />

      {/* License Creation Wizard */}
      <LicenseWizard
        isOpen={showLicenseWizard}
        onClose={() => {
          setShowLicenseWizard(false);
          setSelectedCustomer(null);
        }}
        onLicenseCreated={() => {
          setShowLicenseWizard(false);
          setSelectedCustomer(null);
          loadCustomers(); // Refresh customer list
        }}
      />
    </div>
  );
}