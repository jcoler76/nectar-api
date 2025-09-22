import {
  CreditCard,
  ExternalLink,
  AlertCircle,
  Clock,
  CheckCircle,
  AlertTriangle,
  Calendar,
  Users,
  Database,
  BarChart3,
  Receipt,
  Settings,
  ArrowUpCircle,
  XCircle,
} from 'lucide-react';
import React, { useState, useEffect } from 'react';

export default function BillingPage() {
  const [loading, setLoading] = useState(false);
  const [subscriptionLoading, setSubscriptionLoading] = useState(true);
  const [error, setError] = useState('');
  const [subscriptionData, setSubscriptionData] = useState(null);
  const [invoices, setInvoices] = useState([]);
  const [availablePlans, setAvailablePlans] = useState([]);

  useEffect(() => {
    loadSubscriptionData();
    loadAvailablePlans();
  }, []);

  const loadSubscriptionData = async () => {
    try {
      setSubscriptionLoading(true);
      const res = await fetch('/api/billing/subscription');
      const data = await res.json();

      if (res.ok) {
        setSubscriptionData(data);
        loadInvoices();
      } else {
        setError(data?.error || 'Unable to load subscription details');
      }
    } catch (e) {
      setError('Unable to load subscription details');
    } finally {
      setSubscriptionLoading(false);
    }
  };

  const loadInvoices = async () => {
    try {
      const res = await fetch('/api/billing/invoices?limit=5');
      const data = await res.json();

      if (res.ok) {
        setInvoices(data.invoices || []);
      }
    } catch (e) {
      console.error('Failed to load invoices:', e);
    }
  };

  const loadAvailablePlans = async () => {
    try {
      const res = await fetch('/api/billing/plans');
      const data = await res.json();

      if (res.ok) {
        setAvailablePlans(data.plans || []);
      }
    } catch (e) {
      console.error('Failed to load available plans:', e);
    }
  };

  const openPortal = async () => {
    try {
      setLoading(true);
      setError('');
      const res = await fetch('/api/billing/portal', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
      });
      const data = await res.json();
      if (data?.url) {
        window.location.href = data.url;
      } else {
        setError(data?.error || 'Unable to open billing portal');
      }
    } catch (e) {
      setError('Unable to open billing portal');
    } finally {
      setLoading(false);
    }
  };

  const getStatusColor = status => {
    switch (status?.toLowerCase()) {
      case 'active':
        return 'text-green-600 bg-green-100';
      case 'trialing':
        return 'text-blue-600 bg-blue-100';
      case 'past_due':
        return 'text-yellow-600 bg-yellow-100';
      case 'canceled':
      case 'cancelled':
        return 'text-red-600 bg-red-100';
      default:
        return 'text-gray-600 bg-gray-100';
    }
  };

  const formatDate = dateString => {
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
    });
  };

  const formatCurrency = (amount, currency = 'USD') => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency,
    }).format(amount);
  };

  const getPlanDisplayName = plan => {
    const planMap = {
      FREE: 'Free',
      STARTER: 'Starter',
      TEAM: 'Team',
      BUSINESS: 'Business',
      ENTERPRISE: 'Enterprise',
    };
    return planMap[plan] || plan;
  };

  if (subscriptionLoading) {
    return (
      <div className="max-w-6xl mx-auto p-6">
        <div className="bg-white rounded-2xl p-8 border border-gray-200">
          <div className="animate-pulse">
            <div className="h-8 bg-gray-200 rounded w-1/4 mb-6"></div>
            <div className="h-4 bg-gray-200 rounded w-1/2 mb-8"></div>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
              {[1, 2, 3].map(i => (
                <div key={i} className="h-32 bg-gray-200 rounded-lg"></div>
              ))}
            </div>
            <div className="h-40 bg-gray-200 rounded-lg"></div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-6xl mx-auto p-6 space-y-6">
      {/* Header */}
      <div className="bg-white rounded-2xl p-8 border border-gray-200">
        <div className="flex items-center gap-3 mb-6">
          <div className="w-10 h-10 rounded-lg bg-blue-100 text-blue-700 flex items-center justify-center">
            <CreditCard className="w-6 h-6" />
          </div>
          <h1 className="text-2xl font-bold text-gray-900">Billing & Subscription</h1>
        </div>

        {error && (
          <div className="flex items-center gap-2 p-4 rounded-lg bg-red-50 border border-red-200 text-red-700 mb-6">
            <AlertCircle className="w-5 h-5" />
            <span>{error}</span>
          </div>
        )}

        {/* Current Subscription Overview */}
        {subscriptionData?.subscription ? (
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
            <div className="bg-gradient-to-r from-blue-50 to-blue-100 p-6 rounded-xl border border-blue-200">
              <div className="flex items-center justify-between mb-4">
                <h3 className="font-semibold text-gray-900">Current Plan</h3>
                <span
                  className={`px-3 py-1 rounded-full text-xs font-medium ${getStatusColor(subscriptionData.subscription.status)}`}
                >
                  {subscriptionData.subscription.status}
                </span>
              </div>
              <p className="text-2xl font-bold text-blue-600 mb-2">
                {getPlanDisplayName(subscriptionData.subscription.plan)}
              </p>
              {subscriptionData.subscription.monthlyRevenue && (
                <p className="text-sm text-gray-600">
                  {formatCurrency(subscriptionData.subscription.monthlyRevenue)}/month
                </p>
              )}
            </div>

            <div className="bg-gradient-to-r from-green-50 to-green-100 p-6 rounded-xl border border-green-200">
              <div className="flex items-center gap-2 mb-4">
                <Calendar className="w-5 h-5 text-green-600" />
                <h3 className="font-semibold text-gray-900">Billing Period</h3>
              </div>
              <p className="text-sm text-gray-600 mb-1">
                {formatDate(subscriptionData.subscription.currentPeriodStart)} -
              </p>
              <p className="text-sm font-medium text-gray-900">
                {formatDate(subscriptionData.subscription.currentPeriodEnd)}
              </p>
              {subscriptionData.subscription.trialEndsAt && (
                <p className="text-xs text-blue-600 mt-2">
                  Trial ends: {formatDate(subscriptionData.subscription.trialEndsAt)}
                </p>
              )}
            </div>

            <div className="bg-gradient-to-r from-purple-50 to-purple-100 p-6 rounded-xl border border-purple-200">
              <div className="flex items-center gap-2 mb-4">
                <Users className="w-5 h-5 text-purple-600" />
                <h3 className="font-semibold text-gray-900">Organization</h3>
              </div>
              <p className="text-lg font-medium text-gray-900 mb-1">
                {subscriptionData.organization.name}
              </p>
              <p className="text-sm text-gray-600">
                {subscriptionData.organization.memberCount} member
                {subscriptionData.organization.memberCount !== 1 ? 's' : ''}
              </p>
            </div>
          </div>
        ) : (
          <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-6 mb-8">
            <div className="flex items-center gap-3">
              <AlertTriangle className="w-6 h-6 text-yellow-600" />
              <div>
                <h3 className="font-medium text-yellow-900">No Active Subscription</h3>
                <p className="text-sm text-yellow-700 mt-1">
                  You don't have an active subscription. Consider upgrading to unlock more features.
                </p>
              </div>
            </div>
          </div>
        )}

        {/* Usage Overview */}
        {subscriptionData?.usage && (
          <div className="mb-8">
            <h3 className="text-lg font-semibold text-gray-900 mb-4">Current Usage</h3>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div className="bg-gray-50 p-4 rounded-lg">
                <div className="flex items-center gap-2 mb-2">
                  <BarChart3 className="w-4 h-4 text-gray-600" />
                  <span className="text-sm font-medium text-gray-700">API Calls</span>
                </div>
                <p className="text-xl font-bold text-gray-900">
                  {subscriptionData.usage.apiCallsThisMonth?.toLocaleString() || 0}
                </p>
                <p className="text-xs text-gray-600">this month</p>
              </div>

              <div className="bg-gray-50 p-4 rounded-lg">
                <div className="flex items-center gap-2 mb-2">
                  <Database className="w-4 h-4 text-gray-600" />
                  <span className="text-sm font-medium text-gray-700">Storage</span>
                </div>
                <p className="text-xl font-bold text-gray-900">
                  {subscriptionData.usage.storageUsedGB?.toFixed(2) || 0} GB
                </p>
                <p className="text-xs text-gray-600">used</p>
              </div>

              <div className="bg-gray-50 p-4 rounded-lg">
                <div className="flex items-center gap-2 mb-2">
                  <Database className="w-4 h-4 text-gray-600" />
                  <span className="text-sm font-medium text-gray-700">Data Sources</span>
                </div>
                <p className="text-xl font-bold text-gray-900">
                  {subscriptionData.usage.datasourceCount || 0}
                </p>
                <p className="text-xs text-gray-600">connected</p>
              </div>
            </div>
          </div>
        )}

        {/* Action Buttons */}
        <div className="flex flex-wrap gap-4">
          {subscriptionData?.permissions?.canManageBilling && (
            <button
              onClick={openPortal}
              disabled={loading}
              className={`inline-flex items-center gap-2 px-6 py-3 rounded-xl text-white font-semibold shadow-sm transition-colors ${
                loading ? 'bg-gray-400 cursor-not-allowed' : 'bg-blue-600 hover:bg-blue-700'
              }`}
            >
              {loading ? 'Opening…' : 'Manage Billing'}
              <ExternalLink className="w-4 h-4" />
            </button>
          )}

          {subscriptionData?.subscription?.status === 'CANCELED' && (
            <button className="inline-flex items-center gap-2 px-6 py-3 rounded-xl bg-green-600 hover:bg-green-700 text-white font-semibold shadow-sm transition-colors">
              <ArrowUpCircle className="w-4 h-4" />
              Reactivate Subscription
            </button>
          )}
        </div>
      </div>

      {/* Recent Invoices */}
      {invoices.length > 0 && (
        <div className="bg-white rounded-2xl p-8 border border-gray-200">
          <div className="flex items-center gap-3 mb-6">
            <Receipt className="w-6 h-6 text-gray-600" />
            <h2 className="text-xl font-semibold text-gray-900">Recent Invoices</h2>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b border-gray-200">
                  <th className="text-left py-3 px-4 font-medium text-gray-700">Invoice</th>
                  <th className="text-left py-3 px-4 font-medium text-gray-700">Date</th>
                  <th className="text-left py-3 px-4 font-medium text-gray-700">Amount</th>
                  <th className="text-left py-3 px-4 font-medium text-gray-700">Status</th>
                  <th className="text-left py-3 px-4 font-medium text-gray-700">Actions</th>
                </tr>
              </thead>
              <tbody>
                {invoices.map(invoice => (
                  <tr key={invoice.id} className="border-b border-gray-100">
                    <td className="py-3 px-4">
                      <span className="font-medium text-gray-900">{invoice.invoiceNumber}</span>
                    </td>
                    <td className="py-3 px-4 text-gray-600">{formatDate(invoice.createdAt)}</td>
                    <td className="py-3 px-4 font-medium text-gray-900">
                      {formatCurrency(invoice.amount, invoice.currency)}
                    </td>
                    <td className="py-3 px-4">
                      <span
                        className={`px-2 py-1 rounded-full text-xs font-medium ${
                          invoice.status === 'PAID'
                            ? 'text-green-600 bg-green-100'
                            : invoice.status === 'PENDING'
                              ? 'text-yellow-600 bg-yellow-100'
                              : 'text-red-600 bg-red-100'
                        }`}
                      >
                        {invoice.status}
                      </span>
                    </td>
                    <td className="py-3 px-4">
                      {invoice.hostedInvoiceUrl && (
                        <a
                          href={invoice.hostedInvoiceUrl}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="text-blue-600 hover:text-blue-700 text-sm font-medium"
                        >
                          View
                        </a>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {!subscriptionData?.permissions?.canManageBilling && (
        <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-6">
          <div className="flex items-center gap-3">
            <Settings className="w-6 h-6 text-yellow-600" />
            <div>
              <h3 className="font-medium text-yellow-900">Limited Access</h3>
              <p className="text-sm text-yellow-700 mt-1">
                Only organization owners and administrators can manage billing settings. Contact
                your organization owner to make billing changes.
              </p>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
