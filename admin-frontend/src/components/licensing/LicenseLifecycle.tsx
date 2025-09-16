import React, { useState, useEffect } from 'react';
import {
  Calendar,
  Clock,
  Mail,
  Bell,
  RefreshCw,
  Pause,
  Play,
  Settings,
  AlertTriangle,
  CheckCircle,
  XCircle,
  MessageSquare,
  Zap,
  Target,
  BarChart3,
  Edit2,
  Save,
  X
} from 'lucide-react';

interface AutomationRule {
  id: string;
  name: string;
  type: 'renewal' | 'expiration' | 'suspension' | 'usage_limit';
  trigger: {
    condition: string;
    value: number;
    unit: 'days' | 'percentage' | 'count';
  };
  actions: {
    type: 'email' | 'suspend' | 'renew' | 'notify';
    config: any;
  }[];
  isActive: boolean;
  lastRun?: string;
  runCount: number;
  successRate: number;
}

interface LifecycleEvent {
  id: string;
  licenseId: string;
  customerName: string;
  type: 'reminder_sent' | 'license_renewed' | 'license_suspended' | 'payment_failed' | 'usage_warning';
  message: string;
  timestamp: string;
  status: 'success' | 'failed' | 'pending';
  metadata?: any;
}

const RULE_TEMPLATES = [
  {
    name: '30-Day Renewal Reminder',
    type: 'renewal' as const,
    trigger: { condition: 'expires_in', value: 30, unit: 'days' as const },
    actions: [{ type: 'email' as const, config: { template: 'renewal_reminder' } }],
  },
  {
    name: '7-Day Expiration Warning',
    type: 'expiration' as const,
    trigger: { condition: 'expires_in', value: 7, unit: 'days' as const },
    actions: [{ type: 'email' as const, config: { template: 'expiration_warning' } }],
  },
  {
    name: 'Auto-Suspend on Expiry',
    type: 'expiration' as const,
    trigger: { condition: 'expired_for', value: 0, unit: 'days' as const },
    actions: [{ type: 'suspend' as const, config: { reason: 'License expired' } }],
  },
  {
    name: 'Usage Limit Warning',
    type: 'usage_limit' as const,
    trigger: { condition: 'usage_above', value: 80, unit: 'percentage' as const },
    actions: [{ type: 'notify' as const, config: { urgency: 'medium' } }],
  },
];

export default function LicenseLifecycle() {
  const [rules, setRules] = useState<AutomationRule[]>([]);
  const [events, setEvents] = useState<LifecycleEvent[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState('rules');
  const [editingRule, setEditingRule] = useState<string | null>(null);
  const [showCreateRule, setShowCreateRule] = useState(false);

  useEffect(() => {
    loadLifecycleData();
  }, []);

  const loadLifecycleData = async () => {
    try {
      setLoading(true);

      // Generate mock data for demonstration
      const mockRules: AutomationRule[] = [
        {
          id: '1',
          name: '30-Day Renewal Reminder',
          type: 'renewal',
          trigger: { condition: 'expires_in', value: 30, unit: 'days' },
          actions: [{ type: 'email', config: { template: 'renewal_reminder' } }],
          isActive: true,
          lastRun: new Date(Date.now() - 2 * 24 * 60 * 60 * 1000).toISOString(),
          runCount: 45,
          successRate: 95.6,
        },
        {
          id: '2',
          name: '7-Day Expiration Warning',
          type: 'expiration',
          trigger: { condition: 'expires_in', value: 7, unit: 'days' },
          actions: [{ type: 'email', config: { template: 'expiration_warning' } }],
          isActive: true,
          lastRun: new Date(Date.now() - 1 * 24 * 60 * 60 * 1000).toISOString(),
          runCount: 23,
          successRate: 100,
        },
        {
          id: '3',
          name: 'Auto-Suspend on Expiry',
          type: 'expiration',
          trigger: { condition: 'expired_for', value: 0, unit: 'days' },
          actions: [{ type: 'suspend', config: { reason: 'License expired' } }],
          isActive: false,
          runCount: 8,
          successRate: 87.5,
        },
      ];

      const mockEvents: LifecycleEvent[] = [
        {
          id: '1',
          licenseId: 'lic_123',
          customerName: 'Acme Corp',
          type: 'reminder_sent',
          message: '30-day renewal reminder sent successfully',
          timestamp: new Date(Date.now() - 2 * 60 * 60 * 1000).toISOString(),
          status: 'success',
        },
        {
          id: '2',
          licenseId: 'lic_456',
          customerName: 'TechStart Inc',
          type: 'license_renewed',
          message: 'License automatically renewed for 1 year',
          timestamp: new Date(Date.now() - 4 * 60 * 60 * 1000).toISOString(),
          status: 'success',
        },
        {
          id: '3',
          licenseId: 'lic_789',
          customerName: 'Global Solutions',
          type: 'payment_failed',
          message: 'Automatic renewal failed - payment declined',
          timestamp: new Date(Date.now() - 6 * 60 * 60 * 1000).toISOString(),
          status: 'failed',
        },
        {
          id: '4',
          licenseId: 'lic_012',
          customerName: 'Innovation Labs',
          type: 'usage_warning',
          message: 'Usage exceeded 80% of plan limits',
          timestamp: new Date(Date.now() - 8 * 60 * 60 * 1000).toISOString(),
          status: 'success',
        },
      ];

      setRules(mockRules);
      setEvents(mockEvents);
    } catch (err) {
      console.error('Failed to load lifecycle data:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleToggleRule = async (ruleId: string) => {
    setRules(prev => prev.map(rule =>
      rule.id === ruleId ? { ...rule, isActive: !rule.isActive } : rule
    ));
  };

  const handleDeleteRule = async (ruleId: string) => {
    if (confirm('Are you sure you want to delete this automation rule?')) {
      setRules(prev => prev.filter(rule => rule.id !== ruleId));
    }
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  const getRuleIcon = (type: string) => {
    switch (type) {
      case 'renewal': return RefreshCw;
      case 'expiration': return Clock;
      case 'suspension': return Pause;
      case 'usage_limit': return BarChart3;
      default: return Settings;
    }
  };

  const getEventIcon = (type: string) => {
    switch (type) {
      case 'reminder_sent': return Mail;
      case 'license_renewed': return RefreshCw;
      case 'license_suspended': return Pause;
      case 'payment_failed': return XCircle;
      case 'usage_warning': return AlertTriangle;
      default: return Bell;
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'success': return 'text-green-600 bg-green-100';
      case 'failed': return 'text-red-600 bg-red-100';
      case 'pending': return 'text-yellow-600 bg-yellow-100';
      default: return 'text-gray-600 bg-gray-100';
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">License Lifecycle Automation</h1>
          <p className="mt-1 text-sm text-gray-600">
            Automate license renewals, notifications, and lifecycle management
          </p>
        </div>
        <div className="mt-4 sm:mt-0 flex space-x-3">
          <button
            onClick={() => setShowCreateRule(true)}
            className="inline-flex items-center px-4 py-2 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-blue-600 hover:bg-blue-700"
          >
            <Zap className="h-4 w-4 mr-2" />
            Create Rule
          </button>
        </div>
      </div>

      {/* Tabs */}
      <div className="border-b border-gray-200">
        <nav className="-mb-px flex space-x-8">
          {[
            { id: 'rules', label: 'Automation Rules', icon: Settings },
            { id: 'events', label: 'Recent Events', icon: Clock },
            { id: 'analytics', label: 'Performance', icon: BarChart3 },
          ].map((tab) => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={`flex items-center py-2 px-1 border-b-2 font-medium text-sm ${
                activeTab === tab.id
                  ? 'border-blue-500 text-blue-600'
                  : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
              }`}
            >
              <tab.icon className="h-4 w-4 mr-2" />
              {tab.label}
            </button>
          ))}
        </nav>
      </div>

      {/* Tab Content */}
      {activeTab === 'rules' && (
        <div className="space-y-6">
          {/* Quick Templates */}
          <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
            <h3 className="text-sm font-medium text-blue-900 mb-2">Quick Start Templates</h3>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-3">
              {RULE_TEMPLATES.map((template, index) => (
                <button
                  key={index}
                  className="text-left p-3 bg-white border border-blue-200 rounded-md hover:border-blue-300 text-sm"
                >
                  <div className="font-medium text-gray-900">{template.name}</div>
                  <div className="text-gray-500 text-xs mt-1">
                    {template.trigger.condition.replace('_', ' ')} {template.trigger.value} {template.trigger.unit}
                  </div>
                </button>
              ))}
            </div>
          </div>

          {/* Rules List */}
          <div className="space-y-4">
            {rules.map((rule) => {
              const RuleIcon = getRuleIcon(rule.type);
              return (
                <div
                  key={rule.id}
                  className="bg-white border border-gray-200 rounded-lg p-6"
                >
                  <div className="flex items-start justify-between">
                    <div className="flex items-start">
                      <div className={`p-2 rounded-lg ${rule.isActive ? 'bg-blue-100' : 'bg-gray-100'}`}>
                        <RuleIcon className={`h-5 w-5 ${rule.isActive ? 'text-blue-600' : 'text-gray-400'}`} />
                      </div>
                      <div className="ml-4">
                        <div className="flex items-center">
                          <h3 className="text-lg font-medium text-gray-900">{rule.name}</h3>
                          <span className={`ml-3 inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                            rule.isActive ? 'bg-green-100 text-green-800' : 'bg-gray-100 text-gray-800'
                          }`}>
                            {rule.isActive ? 'Active' : 'Inactive'}
                          </span>
                        </div>
                        <p className="text-sm text-gray-600 mt-1">
                          Triggers when {rule.trigger.condition.replace('_', ' ')} {rule.trigger.value} {rule.trigger.unit}
                        </p>
                        <div className="flex items-center mt-2 text-sm text-gray-500">
                          <Target className="h-4 w-4 mr-1" />
                          {rule.runCount} executions
                          <span className="mx-2">•</span>
                          {rule.successRate}% success rate
                          {rule.lastRun && (
                            <>
                              <span className="mx-2">•</span>
                              Last run {formatDate(rule.lastRun)}
                            </>
                          )}
                        </div>
                      </div>
                    </div>

                    <div className="flex items-center space-x-2">
                      <button
                        onClick={() => handleToggleRule(rule.id)}
                        className={`p-2 rounded-md ${
                          rule.isActive
                            ? 'text-orange-600 hover:text-orange-700 hover:bg-orange-50'
                            : 'text-green-600 hover:text-green-700 hover:bg-green-50'
                        }`}
                        title={rule.isActive ? 'Pause Rule' : 'Activate Rule'}
                      >
                        {rule.isActive ? <Pause className="h-4 w-4" /> : <Play className="h-4 w-4" />}
                      </button>
                      <button
                        onClick={() => setEditingRule(rule.id)}
                        className="p-2 rounded-md text-gray-600 hover:text-gray-700 hover:bg-gray-50"
                        title="Edit Rule"
                      >
                        <Edit2 className="h-4 w-4" />
                      </button>
                      <button
                        onClick={() => handleDeleteRule(rule.id)}
                        className="p-2 rounded-md text-red-600 hover:text-red-700 hover:bg-red-50"
                        title="Delete Rule"
                      >
                        <X className="h-4 w-4" />
                      </button>
                    </div>
                  </div>

                  {/* Rule Actions */}
                  <div className="mt-4 pt-4 border-t border-gray-200">
                    <h4 className="text-sm font-medium text-gray-700 mb-2">Actions</h4>
                    <div className="flex flex-wrap gap-2">
                      {rule.actions.map((action, index) => (
                        <span
                          key={index}
                          className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-gray-100 text-gray-800"
                        >
                          {action.type === 'email' && <Mail className="h-3 w-3 mr-1" />}
                          {action.type === 'suspend' && <Pause className="h-3 w-3 mr-1" />}
                          {action.type === 'renew' && <RefreshCw className="h-3 w-3 mr-1" />}
                          {action.type === 'notify' && <Bell className="h-3 w-3 mr-1" />}
                          {action.type.charAt(0).toUpperCase() + action.type.slice(1)}
                        </span>
                      ))}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {activeTab === 'events' && (
        <div className="space-y-4">
          <div className="bg-white border border-gray-200 rounded-lg">
            <div className="px-6 py-4 border-b border-gray-200">
              <h3 className="text-lg font-medium text-gray-900">Recent Automation Events</h3>
            </div>
            <div className="divide-y divide-gray-200">
              {events.map((event) => {
                const EventIcon = getEventIcon(event.type);
                return (
                  <div key={event.id} className="p-6">
                    <div className="flex items-start">
                      <div className="flex-shrink-0">
                        <EventIcon className="h-5 w-5 text-gray-400" />
                      </div>
                      <div className="ml-4 flex-1">
                        <div className="flex items-center justify-between">
                          <p className="text-sm font-medium text-gray-900">
                            {event.customerName}
                          </p>
                          <div className="flex items-center">
                            <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${getStatusColor(event.status)}`}>
                              {event.status}
                            </span>
                            <span className="ml-3 text-sm text-gray-500">
                              {formatDate(event.timestamp)}
                            </span>
                          </div>
                        </div>
                        <p className="text-sm text-gray-600 mt-1">{event.message}</p>
                        <p className="text-xs text-gray-500 mt-1 font-mono">
                          License: {event.licenseId}
                        </p>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      )}

      {activeTab === 'analytics' && (
        <div className="space-y-6">
          {/* Performance Metrics */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <div className="bg-white border border-gray-200 rounded-lg p-6">
              <div className="flex items-center">
                <CheckCircle className="h-8 w-8 text-green-600" />
                <div className="ml-4">
                  <div className="text-2xl font-bold text-gray-900">
                    {rules.reduce((sum, rule) => sum + rule.runCount, 0)}
                  </div>
                  <div className="text-sm text-gray-600">Total Executions</div>
                </div>
              </div>
            </div>

            <div className="bg-white border border-gray-200 rounded-lg p-6">
              <div className="flex items-center">
                <Target className="h-8 w-8 text-blue-600" />
                <div className="ml-4">
                  <div className="text-2xl font-bold text-gray-900">
                    {Math.round(rules.reduce((sum, rule) => sum + rule.successRate, 0) / rules.length)}%
                  </div>
                  <div className="text-sm text-gray-600">Average Success Rate</div>
                </div>
              </div>
            </div>

            <div className="bg-white border border-gray-200 rounded-lg p-6">
              <div className="flex items-center">
                <Zap className="h-8 w-8 text-purple-600" />
                <div className="ml-4">
                  <div className="text-2xl font-bold text-gray-900">
                    {rules.filter(r => r.isActive).length}
                  </div>
                  <div className="text-sm text-gray-600">Active Rules</div>
                </div>
              </div>
            </div>
          </div>

          {/* Rule Performance */}
          <div className="bg-white border border-gray-200 rounded-lg p-6">
            <h3 className="text-lg font-medium text-gray-900 mb-4">Rule Performance</h3>
            <div className="space-y-4">
              {rules.map((rule) => (
                <div key={rule.id} className="flex items-center justify-between">
                  <div className="flex items-center">
                    <div className={`w-3 h-3 rounded-full mr-3 ${rule.isActive ? 'bg-green-500' : 'bg-gray-300'}`}></div>
                    <span className="text-sm font-medium text-gray-900">{rule.name}</span>
                  </div>
                  <div className="flex items-center space-x-6">
                    <div className="text-right">
                      <div className="text-sm font-medium text-gray-900">{rule.runCount}</div>
                      <div className="text-xs text-gray-500">executions</div>
                    </div>
                    <div className="text-right">
                      <div className="text-sm font-medium text-gray-900">{rule.successRate}%</div>
                      <div className="text-xs text-gray-500">success</div>
                    </div>
                    <div className="w-24">
                      <div className="w-full bg-gray-200 rounded-full h-2">
                        <div
                          className="bg-blue-600 h-2 rounded-full"
                          style={{ width: `${rule.successRate}%` }}
                        ></div>
                      </div>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Event Type Distribution */}
          <div className="bg-white border border-gray-200 rounded-lg p-6">
            <h3 className="text-lg font-medium text-gray-900 mb-4">Event Type Distribution (Last 30 Days)</h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {[
                { type: 'reminder_sent', count: 45, color: 'bg-blue-500' },
                { type: 'license_renewed', count: 23, color: 'bg-green-500' },
                { type: 'payment_failed', count: 8, color: 'bg-red-500' },
                { type: 'usage_warning', count: 12, color: 'bg-orange-500' },
              ].map((item) => (
                <div key={item.type} className="flex items-center justify-between">
                  <div className="flex items-center">
                    <div className={`w-3 h-3 rounded-full mr-3 ${item.color}`}></div>
                    <span className="text-sm text-gray-700">
                      {item.type.replace('_', ' ').replace(/\b\w/g, l => l.toUpperCase())}
                    </span>
                  </div>
                  <span className="text-sm font-medium text-gray-900">{item.count}</span>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}