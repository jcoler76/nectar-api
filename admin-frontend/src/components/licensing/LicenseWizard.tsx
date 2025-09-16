import React, { useState, useEffect } from 'react';
import {
  ArrowLeft,
  ArrowRight,
  Check,
  User,
  Building,
  CreditCard,
  Settings,
  X,
  Search,
  Plus
} from 'lucide-react';
import { licenseService, type CustomerData } from '../../services/licenseService';
import { Modal } from '../ui/modal';

interface LicenseWizardProps {
  isOpen: boolean;
  onClose: () => void;
  onLicenseCreated?: (license: any) => void;
}

interface LicenseFormData {
  customerId: string;
  customer?: CustomerData;
  plan: 'STARTER' | 'PROFESSIONAL' | 'ENTERPRISE' | 'CUSTOM';
  licenseType: 'TRIAL' | 'STANDARD' | 'ENTERPRISE' | 'CUSTOM';
  features: string[];
  maxUsers?: number;
  maxWorkflows?: number;
  maxIntegrations?: number;
  expiresAt?: string;
  billingCycle: 'MONTHLY' | 'QUARTERLY' | 'YEARLY' | 'LIFETIME';
  amount?: number;
  currency: string;
  deploymentId?: string;
}

interface PlanTemplate {
  plan: 'STARTER' | 'PROFESSIONAL' | 'ENTERPRISE' | 'CUSTOM';
  licenseType: 'TRIAL' | 'STANDARD' | 'ENTERPRISE' | 'CUSTOM';
  features: string[];
  maxUsers: number;
  maxWorkflows: number;
  maxIntegrations: number;
  recommendedPrice: number;
  description: string;
}

const PLAN_TEMPLATES: PlanTemplate[] = [
  {
    plan: 'STARTER',
    licenseType: 'STANDARD',
    features: ['basic_workflows', 'email_integration', 'basic_analytics'],
    maxUsers: 5,
    maxWorkflows: 10,
    maxIntegrations: 3,
    recommendedPrice: 29,
    description: 'Perfect for small teams getting started with automation',
  },
  {
    plan: 'PROFESSIONAL',
    licenseType: 'STANDARD',
    features: ['advanced_workflows', 'all_integrations', 'advanced_analytics', 'api_access'],
    maxUsers: 25,
    maxWorkflows: 100,
    maxIntegrations: 15,
    recommendedPrice: 99,
    description: 'Ideal for growing businesses with advanced automation needs',
  },
  {
    plan: 'ENTERPRISE',
    licenseType: 'ENTERPRISE',
    features: ['unlimited_workflows', 'custom_integrations', 'enterprise_analytics', 'priority_support', 'sso', 'audit_logs'],
    maxUsers: 999999,
    maxWorkflows: 999999,
    maxIntegrations: 999999,
    recommendedPrice: 299,
    description: 'Full-featured solution for large organizations',
  },
];

const FEATURE_OPTIONS = [
  { id: 'basic_workflows', label: 'Basic Workflows', category: 'Core' },
  { id: 'advanced_workflows', label: 'Advanced Workflows', category: 'Core' },
  { id: 'unlimited_workflows', label: 'Unlimited Workflows', category: 'Core' },
  { id: 'email_integration', label: 'Email Integration', category: 'Integrations' },
  { id: 'all_integrations', label: 'All Integrations', category: 'Integrations' },
  { id: 'custom_integrations', label: 'Custom Integrations', category: 'Integrations' },
  { id: 'basic_analytics', label: 'Basic Analytics', category: 'Analytics' },
  { id: 'advanced_analytics', label: 'Advanced Analytics', category: 'Analytics' },
  { id: 'enterprise_analytics', label: 'Enterprise Analytics', category: 'Analytics' },
  { id: 'api_access', label: 'API Access', category: 'Developer' },
  { id: 'webhooks', label: 'Webhooks', category: 'Developer' },
  { id: 'priority_support', label: 'Priority Support', category: 'Support' },
  { id: 'sso', label: 'Single Sign-On', category: 'Security' },
  { id: 'audit_logs', label: 'Audit Logs', category: 'Security' },
];

export default function LicenseWizard({ isOpen, onClose, onLicenseCreated }: LicenseWizardProps) {
  const [currentStep, setCurrentStep] = useState(1);
  const [formData, setFormData] = useState<LicenseFormData>({
    customerId: '',
    plan: 'PROFESSIONAL',
    licenseType: 'STANDARD',
    features: [],
    billingCycle: 'MONTHLY',
    currency: 'USD',
  });

  const [customers, setCustomers] = useState<CustomerData[]>([]);
  const [customerSearch, setCustomerSearch] = useState('');
  const [showNewCustomer, setShowNewCustomer] = useState(false);
  const [newCustomer, setNewCustomer] = useState({
    email: '',
    companyName: '',
    contactName: '',
    phone: '',
    country: '',
  });

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (isOpen) {
      loadCustomers();
      resetForm();
    }
  }, [isOpen]);

  const resetForm = () => {
    setCurrentStep(1);
    setFormData({
      customerId: '',
      plan: 'PROFESSIONAL',
      licenseType: 'STANDARD',
      features: [],
      billingCycle: 'MONTHLY',
      currency: 'USD',
    });
    setCustomerSearch('');
    setShowNewCustomer(false);
    setNewCustomer({
      email: '',
      companyName: '',
      contactName: '',
      phone: '',
      country: '',
    });
    setError(null);
  };

  const loadCustomers = async () => {
    try {
      const result = await licenseService.getCustomers({ limit: 100 });
      setCustomers(result.customers || []);
    } catch (err) {
      console.error('Failed to load customers:', err);
    }
  };

  const handlePlanSelect = (template: PlanTemplate) => {
    setFormData(prev => ({
      ...prev,
      plan: template.plan,
      licenseType: template.licenseType,
      features: [...template.features],
      maxUsers: template.maxUsers,
      maxWorkflows: template.maxWorkflows,
      maxIntegrations: template.maxIntegrations,
      amount: template.recommendedPrice,
    }));
  };

  const handleFeatureToggle = (featureId: string) => {
    setFormData(prev => ({
      ...prev,
      features: prev.features.includes(featureId)
        ? prev.features.filter(f => f !== featureId)
        : [...prev.features, featureId],
    }));
  };

  const handleCreateCustomer = async () => {
    try {
      setLoading(true);
      const customer = await licenseService.createCustomer(newCustomer);
      setCustomers(prev => [customer, ...prev]);
      setFormData(prev => ({ ...prev, customerId: customer.id, customer }));
      setShowNewCustomer(false);
      setCurrentStep(2);
    } catch (err) {
      setError('Failed to create customer');
    } finally {
      setLoading(false);
    }
  };

  const handleNext = () => {
    if (currentStep < 4) {
      setCurrentStep(currentStep + 1);
    }
  };

  const handlePrevious = () => {
    if (currentStep > 1) {
      setCurrentStep(currentStep - 1);
    }
  };

  const handleSubmit = async () => {
    try {
      setLoading(true);
      setError(null);

      const license = await licenseService.createLicense(formData);

      if (onLicenseCreated) {
        onLicenseCreated(license);
      }

      onClose();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to create license');
    } finally {
      setLoading(false);
    }
  };

  const filteredCustomers = customers.filter(customer =>
    customer.email.toLowerCase().includes(customerSearch.toLowerCase()) ||
    customer.companyName?.toLowerCase().includes(customerSearch.toLowerCase())
  );

  const selectedCustomer = customers.find(c => c.id === formData.customerId);

  const stepTitles = [
    'Select Customer',
    'Choose Plan',
    'Configure Features',
    'Review & Create'
  ];

  if (!isOpen) return null;

  return (
    <Modal isOpen={isOpen} onClose={onClose} size="large">
      <div className="max-w-4xl mx-auto">
        {/* Header */}
        <div className="border-b border-gray-200 pb-6 mb-6">
          <div className="flex items-center justify-between">
            <h2 className="text-2xl font-bold text-gray-900">Create New License</h2>
            <button
              onClick={onClose}
              className="text-gray-400 hover:text-gray-600"
            >
              <X className="h-6 w-6" />
            </button>
          </div>

          {/* Progress Steps */}
          <div className="mt-6">
            <div className="flex items-center justify-between">
              {stepTitles.map((title, index) => (
                <div key={index} className="flex items-center">
                  <div className={`flex items-center justify-center w-8 h-8 rounded-full ${
                    index + 1 < currentStep ? 'bg-blue-600 text-white' :
                    index + 1 === currentStep ? 'bg-blue-100 text-blue-600 border-2 border-blue-600' :
                    'bg-gray-100 text-gray-400'
                  }`}>
                    {index + 1 < currentStep ? (
                      <Check className="h-4 w-4" />
                    ) : (
                      <span className="text-sm font-medium">{index + 1}</span>
                    )}
                  </div>
                  <span className={`ml-2 text-sm font-medium ${
                    index + 1 <= currentStep ? 'text-gray-900' : 'text-gray-400'
                  }`}>
                    {title}
                  </span>
                  {index < stepTitles.length - 1 && (
                    <div className={`mx-4 w-16 h-0.5 ${
                      index + 1 < currentStep ? 'bg-blue-600' : 'bg-gray-200'
                    }`} />
                  )}
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Error Display */}
        {error && (
          <div className="mb-6 bg-red-50 border border-red-200 rounded-md p-4">
            <div className="text-sm text-red-700">{error}</div>
          </div>
        )}

        {/* Step Content */}
        <div className="min-h-96">
          {/* Step 1: Select Customer */}
          {currentStep === 1 && (
            <div>
              <h3 className="text-lg font-medium text-gray-900 mb-4">Select Customer</h3>

              {!showNewCustomer ? (
                <div>
                  <div className="mb-4">
                    <div className="relative">
                      <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
                      <input
                        type="text"
                        placeholder="Search customers..."
                        value={customerSearch}
                        onChange={(e) => setCustomerSearch(e.target.value)}
                        className="pl-10 w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500"
                      />
                    </div>
                  </div>

                  <div className="space-y-2 mb-4 max-h-60 overflow-y-auto">
                    {filteredCustomers.map((customer) => (
                      <div
                        key={customer.id}
                        onClick={() => setFormData(prev => ({ ...prev, customerId: customer.id, customer }))}
                        className={`p-3 border rounded-lg cursor-pointer transition-colors ${
                          formData.customerId === customer.id
                            ? 'border-blue-500 bg-blue-50'
                            : 'border-gray-200 hover:border-gray-300'
                        }`}
                      >
                        <div className="flex items-center">
                          <div className="flex-shrink-0">
                            {customer.companyName ? (
                              <Building className="h-5 w-5 text-gray-400" />
                            ) : (
                              <User className="h-5 w-5 text-gray-400" />
                            )}
                          </div>
                          <div className="ml-3">
                            <div className="text-sm font-medium text-gray-900">
                              {customer.companyName || customer.email}
                            </div>
                            <div className="text-sm text-gray-500">
                              {customer.companyName ? customer.email : 'Individual'}
                            </div>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>

                  <button
                    onClick={() => setShowNewCustomer(true)}
                    className="flex items-center px-4 py-2 border border-gray-300 rounded-md shadow-sm text-sm font-medium text-gray-700 bg-white hover:bg-gray-50"
                  >
                    <Plus className="h-4 w-4 mr-2" />
                    Create New Customer
                  </button>
                </div>
              ) : (
                <div>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        Email *
                      </label>
                      <input
                        type="email"
                        value={newCustomer.email}
                        onChange={(e) => setNewCustomer(prev => ({ ...prev, email: e.target.value }))}
                        className="w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500"
                        required
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        Company Name
                      </label>
                      <input
                        type="text"
                        value={newCustomer.companyName}
                        onChange={(e) => setNewCustomer(prev => ({ ...prev, companyName: e.target.value }))}
                        className="w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        Contact Name
                      </label>
                      <input
                        type="text"
                        value={newCustomer.contactName}
                        onChange={(e) => setNewCustomer(prev => ({ ...prev, contactName: e.target.value }))}
                        className="w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        Phone
                      </label>
                      <input
                        type="text"
                        value={newCustomer.phone}
                        onChange={(e) => setNewCustomer(prev => ({ ...prev, phone: e.target.value }))}
                        className="w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500"
                      />
                    </div>
                  </div>

                  <div className="flex space-x-3">
                    <button
                      onClick={handleCreateCustomer}
                      disabled={!newCustomer.email || loading}
                      className="px-4 py-2 bg-blue-600 text-white rounded-md shadow-sm hover:bg-blue-700 disabled:opacity-50"
                    >
                      {loading ? 'Creating...' : 'Create Customer'}
                    </button>
                    <button
                      onClick={() => setShowNewCustomer(false)}
                      className="px-4 py-2 border border-gray-300 rounded-md shadow-sm text-gray-700 bg-white hover:bg-gray-50"
                    >
                      Cancel
                    </button>
                  </div>
                </div>
              )}
            </div>
          )}

          {/* Step 2: Choose Plan */}
          {currentStep === 2 && (
            <div>
              <h3 className="text-lg font-medium text-gray-900 mb-4">Choose Plan</h3>

              <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                {PLAN_TEMPLATES.map((template) => (
                  <div
                    key={template.plan}
                    onClick={() => handlePlanSelect(template)}
                    className={`p-6 border rounded-lg cursor-pointer transition-colors ${
                      formData.plan === template.plan
                        ? 'border-blue-500 bg-blue-50'
                        : 'border-gray-200 hover:border-gray-300'
                    }`}
                  >
                    <div className="text-center">
                      <h4 className="text-lg font-semibold text-gray-900">{template.plan}</h4>
                      <p className="text-sm text-gray-500 mt-1">{template.description}</p>
                      <div className="mt-4">
                        <span className="text-3xl font-bold text-gray-900">${template.recommendedPrice}</span>
                        <span className="text-gray-500">/month</span>
                      </div>
                      <div className="mt-4 space-y-2">
                        <div className="text-sm text-gray-600">
                          Up to {template.maxUsers} users
                        </div>
                        <div className="text-sm text-gray-600">
                          Up to {template.maxWorkflows} workflows
                        </div>
                        <div className="text-sm text-gray-600">
                          {template.maxIntegrations} integrations
                        </div>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Step 3: Configure Features */}
          {currentStep === 3 && (
            <div>
              <h3 className="text-lg font-medium text-gray-900 mb-4">Configure Features & Limits</h3>

              <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
                {/* Limits */}
                <div>
                  <h4 className="text-md font-medium text-gray-900 mb-4">Usage Limits</h4>
                  <div className="space-y-4">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        Max Users
                      </label>
                      <input
                        type="number"
                        value={formData.maxUsers || ''}
                        onChange={(e) => setFormData(prev => ({ ...prev, maxUsers: parseInt(e.target.value) || undefined }))}
                        className="w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        Max Workflows
                      </label>
                      <input
                        type="number"
                        value={formData.maxWorkflows || ''}
                        onChange={(e) => setFormData(prev => ({ ...prev, maxWorkflows: parseInt(e.target.value) || undefined }))}
                        className="w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        Max Integrations
                      </label>
                      <input
                        type="number"
                        value={formData.maxIntegrations || ''}
                        onChange={(e) => setFormData(prev => ({ ...prev, maxIntegrations: parseInt(e.target.value) || undefined }))}
                        className="w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        Expires At
                      </label>
                      <input
                        type="date"
                        value={formData.expiresAt || ''}
                        onChange={(e) => setFormData(prev => ({ ...prev, expiresAt: e.target.value }))}
                        className="w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500"
                      />
                    </div>
                  </div>
                </div>

                {/* Features */}
                <div>
                  <h4 className="text-md font-medium text-gray-900 mb-4">Features</h4>
                  <div className="space-y-4">
                    {Object.entries(
                      FEATURE_OPTIONS.reduce((groups, feature) => {
                        if (!groups[feature.category]) groups[feature.category] = [];
                        groups[feature.category].push(feature);
                        return groups;
                      }, {} as Record<string, typeof FEATURE_OPTIONS>)
                    ).map(([category, features]) => (
                      <div key={category}>
                        <h5 className="text-sm font-medium text-gray-700 mb-2">{category}</h5>
                        <div className="space-y-2">
                          {features.map((feature) => (
                            <label key={feature.id} className="flex items-center">
                              <input
                                type="checkbox"
                                checked={formData.features.includes(feature.id)}
                                onChange={() => handleFeatureToggle(feature.id)}
                                className="rounded border-gray-300 text-blue-600 shadow-sm focus:border-blue-500 focus:ring-blue-500"
                              />
                              <span className="ml-2 text-sm text-gray-700">{feature.label}</span>
                            </label>
                          ))}
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              </div>

              {/* Billing */}
              <div className="mt-8 pt-8 border-t border-gray-200">
                <h4 className="text-md font-medium text-gray-900 mb-4">Billing</h4>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Billing Cycle
                    </label>
                    <select
                      value={formData.billingCycle}
                      onChange={(e) => setFormData(prev => ({ ...prev, billingCycle: e.target.value as any }))}
                      className="w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500"
                    >
                      <option value="MONTHLY">Monthly</option>
                      <option value="QUARTERLY">Quarterly</option>
                      <option value="YEARLY">Yearly</option>
                      <option value="LIFETIME">Lifetime</option>
                    </select>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Amount
                    </label>
                    <input
                      type="number"
                      step="0.01"
                      value={formData.amount || ''}
                      onChange={(e) => setFormData(prev => ({ ...prev, amount: parseFloat(e.target.value) || undefined }))}
                      className="w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Currency
                    </label>
                    <select
                      value={formData.currency}
                      onChange={(e) => setFormData(prev => ({ ...prev, currency: e.target.value }))}
                      className="w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500"
                    >
                      <option value="USD">USD</option>
                      <option value="EUR">EUR</option>
                      <option value="GBP">GBP</option>
                    </select>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* Step 4: Review & Create */}
          {currentStep === 4 && (
            <div>
              <h3 className="text-lg font-medium text-gray-900 mb-4">Review & Create</h3>

              <div className="bg-gray-50 rounded-lg p-6">
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
                  <div>
                    <h4 className="text-md font-medium text-gray-900 mb-3">Customer</h4>
                    {selectedCustomer && (
                      <div className="text-sm text-gray-600">
                        <div>{selectedCustomer.companyName || selectedCustomer.email}</div>
                        <div>{selectedCustomer.email}</div>
                        {selectedCustomer.contactName && <div>{selectedCustomer.contactName}</div>}
                      </div>
                    )}
                  </div>

                  <div>
                    <h4 className="text-md font-medium text-gray-900 mb-3">Plan & Pricing</h4>
                    <div className="text-sm text-gray-600">
                      <div>{formData.plan} ({formData.licenseType})</div>
                      <div>{licenseService.formatCurrency(formData.amount || 0, formData.currency)} / {formData.billingCycle.toLowerCase()}</div>
                    </div>
                  </div>

                  <div>
                    <h4 className="text-md font-medium text-gray-900 mb-3">Limits</h4>
                    <div className="text-sm text-gray-600">
                      <div>Users: {formData.maxUsers || 'Unlimited'}</div>
                      <div>Workflows: {formData.maxWorkflows || 'Unlimited'}</div>
                      <div>Integrations: {formData.maxIntegrations || 'Unlimited'}</div>
                      {formData.expiresAt && <div>Expires: {new Date(formData.expiresAt).toLocaleDateString()}</div>}
                    </div>
                  </div>

                  <div>
                    <h4 className="text-md font-medium text-gray-900 mb-3">Features</h4>
                    <div className="text-sm text-gray-600">
                      {formData.features.length > 0 ? (
                        <div className="flex flex-wrap gap-1">
                          {formData.features.map(featureId => {
                            const feature = FEATURE_OPTIONS.find(f => f.id === featureId);
                            return feature ? (
                              <span key={featureId} className="inline-block bg-blue-100 text-blue-800 px-2 py-1 rounded text-xs">
                                {feature.label}
                              </span>
                            ) : null;
                          })}
                        </div>
                      ) : (
                        <div>No features selected</div>
                      )}
                    </div>
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="flex justify-between items-center pt-6 border-t border-gray-200 mt-8">
          <button
            onClick={handlePrevious}
            disabled={currentStep === 1}
            className="flex items-center px-4 py-2 border border-gray-300 rounded-md shadow-sm text-sm font-medium text-gray-700 bg-white hover:bg-gray-50 disabled:opacity-50"
          >
            <ArrowLeft className="h-4 w-4 mr-2" />
            Previous
          </button>

          <div className="flex space-x-3">
            <button
              onClick={onClose}
              className="px-4 py-2 border border-gray-300 rounded-md shadow-sm text-sm font-medium text-gray-700 bg-white hover:bg-gray-50"
            >
              Cancel
            </button>

            {currentStep < 4 ? (
              <button
                onClick={handleNext}
                disabled={currentStep === 1 && !formData.customerId}
                className="flex items-center px-4 py-2 bg-blue-600 text-white rounded-md shadow-sm hover:bg-blue-700 disabled:opacity-50"
              >
                Next
                <ArrowRight className="h-4 w-4 ml-2" />
              </button>
            ) : (
              <button
                onClick={handleSubmit}
                disabled={loading || !formData.customerId}
                className="px-6 py-2 bg-blue-600 text-white rounded-md shadow-sm hover:bg-blue-700 disabled:opacity-50"
              >
                {loading ? 'Creating...' : 'Create License'}
              </button>
            )}
          </div>
        </div>
      </div>
    </Modal>
  );
}