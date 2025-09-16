import React, { useState, useEffect } from 'react';
import {
  CheckCircle,
  AlertTriangle,
  XCircle,
  Activity,
  Database,
  Server,
  RefreshCw,
  Clock,
  TrendingUp
} from 'lucide-react';
import { licenseService, type SystemHealth as SystemHealthData } from '../../services/licenseService';

interface HealthMetric {
  name: string;
  status: 'healthy' | 'warning' | 'error';
  value: string;
  description: string;
  lastUpdated: string;
}

export default function SystemHealth() {
  const [health, setHealth] = useState<SystemHealthData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [lastRefresh, setLastRefresh] = useState<Date>(new Date());

  useEffect(() => {
    loadSystemHealth();
    const interval = setInterval(loadSystemHealth, 30000); // Refresh every 30 seconds
    return () => clearInterval(interval);
  }, []);

  const loadSystemHealth = async () => {
    try {
      setLoading(true);
      const healthData = await licenseService.getSystemHealth();
      setHealth(healthData);
      setLastRefresh(new Date());
      setError(null);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load system health');
    } finally {
      setLoading(false);
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'healthy':
        return <CheckCircle className="h-5 w-5 text-green-500" />;
      case 'warning':
        return <AlertTriangle className="h-5 w-5 text-yellow-500" />;
      case 'unhealthy':
        return <XCircle className="h-5 w-5 text-red-500" />;
      default:
        return <Server className="h-5 w-5 text-gray-500" />;
    }
  };

  const getStatusBadge = (status: string) => {
    const styles = {
      healthy: 'bg-green-100 text-green-800',
      warning: 'bg-yellow-100 text-yellow-800',
      unhealthy: 'bg-red-100 text-red-800',
    };

    return (
      <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
        styles[status as keyof typeof styles] || 'bg-gray-100 text-gray-800'
      }`}>
        {status.charAt(0).toUpperCase() + status.slice(1)}
      </span>
    );
  };

  // Mock metrics for demonstration
  const mockMetrics: HealthMetric[] = [
    {
      name: 'License Server',
      status: 'healthy',
      value: '99.9% uptime',
      description: 'License validation service is operational',
      lastUpdated: new Date().toISOString(),
    },
    {
      name: 'Database',
      status: health?.database === 'connected' ? 'healthy' : 'error',
      value: health?.database || 'unknown',
      description: 'PostgreSQL database connectivity',
      lastUpdated: new Date().toISOString(),
    },
    {
      name: 'API Response Time',
      status: 'healthy',
      value: '< 200ms',
      description: 'Average API response time',
      lastUpdated: new Date().toISOString(),
    },
    {
      name: 'License Validations',
      status: 'healthy',
      value: '2.5k/hour',
      description: 'Current validation rate',
      lastUpdated: new Date().toISOString(),
    },
    {
      name: 'Error Rate',
      status: 'healthy',
      value: '0.1%',
      description: 'System error rate',
      lastUpdated: new Date().toISOString(),
    },
    {
      name: 'Storage Usage',
      status: 'warning',
      value: '75%',
      description: 'Database storage utilization',
      lastUpdated: new Date().toISOString(),
    },
  ];

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">System Health</h1>
          <p className="mt-1 text-sm text-gray-600">
            Monitor license server health and performance metrics
          </p>
        </div>
        <div className="mt-4 sm:mt-0 flex items-center space-x-3">
          <div className="text-sm text-gray-500">
            Last updated: {lastRefresh.toLocaleTimeString()}
          </div>
          <button
            onClick={loadSystemHealth}
            disabled={loading}
            className="inline-flex items-center px-4 py-2 border border-gray-300 rounded-md shadow-sm text-sm font-medium text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 disabled:opacity-50"
          >
            <RefreshCw className={`h-4 w-4 mr-2 ${loading ? 'animate-spin' : ''}`} />
            Refresh
          </button>
        </div>
      </div>

      {/* Overall Status */}
      <div className="bg-white rounded-lg border border-gray-200 p-6">
        <div className="flex items-center justify-between">
          <div className="flex items-center">
            {getStatusIcon(health?.status || 'unknown')}
            <div className="ml-4">
              <h3 className="text-lg font-medium text-gray-900">Overall System Status</h3>
              <p className="text-sm text-gray-600">
                {health?.status === 'healthy'
                  ? 'All systems operational'
                  : health?.status === 'warning'
                  ? 'Some issues detected'
                  : 'System issues require attention'}
              </p>
            </div>
          </div>
          <div className="text-right">
            {getStatusBadge(health?.status || 'unknown')}
            <div className="text-xs text-gray-500 mt-1">
              {health?.timestamp ? new Date(health.timestamp).toLocaleString() : 'Unknown'}
            </div>
          </div>
        </div>

        {/* Issues */}
        {health?.issues && health.issues.length > 0 && (
          <div className="mt-4 p-4 bg-yellow-50 rounded-md border border-yellow-200">
            <h4 className="text-sm font-medium text-yellow-800 mb-2">Active Issues:</h4>
            <ul className="text-sm text-yellow-700 space-y-1">
              {health.issues.map((issue, index) => (
                <li key={index} className="flex items-start">
                  <span className="flex-shrink-0 w-1.5 h-1.5 bg-yellow-600 rounded-full mt-2 mr-2"></span>
                  {issue}
                </li>
              ))}
            </ul>
          </div>
        )}
      </div>

      {/* Health Metrics Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {mockMetrics.map((metric, index) => (
          <div key={index} className="bg-white rounded-lg border border-gray-200 p-6">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-sm font-medium text-gray-900">{metric.name}</h3>
              {getStatusIcon(metric.status)}
            </div>
            <div className="text-2xl font-bold text-gray-900 mb-1">
              {metric.value}
            </div>
            <p className="text-sm text-gray-600 mb-2">
              {metric.description}
            </p>
            <div className="flex items-center text-xs text-gray-500">
              <Clock className="h-3 w-3 mr-1" />
              {licenseService.formatRelativeTime(metric.lastUpdated)}
            </div>
          </div>
        ))}
      </div>

      {/* Performance Trends */}
      <div className="bg-white rounded-lg border border-gray-200 p-6">
        <h3 className="text-lg font-medium text-gray-900 mb-4">Performance Trends</h3>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <div className="text-center">
            <div className="flex items-center justify-center mb-2">
              <TrendingUp className="h-5 w-5 text-green-500 mr-2" />
              <span className="text-sm font-medium text-gray-900">Uptime</span>
            </div>
            <div className="text-2xl font-bold text-green-600">99.95%</div>
            <div className="text-sm text-gray-600">Last 30 days</div>
          </div>
          <div className="text-center">
            <div className="flex items-center justify-center mb-2">
              <Activity className="h-5 w-5 text-blue-500 mr-2" />
              <span className="text-sm font-medium text-gray-900">Response Time</span>
            </div>
            <div className="text-2xl font-bold text-blue-600">185ms</div>
            <div className="text-sm text-gray-600">Average</div>
          </div>
          <div className="text-center">
            <div className="flex items-center justify-center mb-2">
              <Database className="h-5 w-5 text-purple-500 mr-2" />
              <span className="text-sm font-medium text-gray-900">Throughput</span>
            </div>
            <div className="text-2xl font-bold text-purple-600">2.8k</div>
            <div className="text-sm text-gray-600">Requests/hour</div>
          </div>
        </div>
      </div>

      {/* System Information */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="bg-white rounded-lg border border-gray-200 p-6">
          <h3 className="text-lg font-medium text-gray-900 mb-4">System Information</h3>
          <dl className="space-y-3">
            <div className="flex justify-between">
              <dt className="text-sm text-gray-600">License Server Version</dt>
              <dd className="text-sm font-medium text-gray-900">v1.0.0</dd>
            </div>
            <div className="flex justify-between">
              <dt className="text-sm text-gray-600">Database Version</dt>
              <dd className="text-sm font-medium text-gray-900">PostgreSQL 15</dd>
            </div>
            <div className="flex justify-between">
              <dt className="text-sm text-gray-600">Environment</dt>
              <dd className="text-sm font-medium text-gray-900">Production</dd>
            </div>
            <div className="flex justify-between">
              <dt className="text-sm text-gray-600">Region</dt>
              <dd className="text-sm font-medium text-gray-900">US-East-1</dd>
            </div>
            <div className="flex justify-between">
              <dt className="text-sm text-gray-600">Last Deployment</dt>
              <dd className="text-sm font-medium text-gray-900">2 days ago</dd>
            </div>
          </dl>
        </div>

        <div className="bg-white rounded-lg border border-gray-200 p-6">
          <h3 className="text-lg font-medium text-gray-900 mb-4">Resource Usage</h3>
          <div className="space-y-4">
            <div>
              <div className="flex justify-between text-sm mb-1">
                <span className="text-gray-600">CPU Usage</span>
                <span className="font-medium text-gray-900">45%</span>
              </div>
              <div className="w-full bg-gray-200 rounded-full h-2">
                <div className="bg-blue-600 h-2 rounded-full" style={{ width: '45%' }}></div>
              </div>
            </div>
            <div>
              <div className="flex justify-between text-sm mb-1">
                <span className="text-gray-600">Memory Usage</span>
                <span className="font-medium text-gray-900">68%</span>
              </div>
              <div className="w-full bg-gray-200 rounded-full h-2">
                <div className="bg-green-600 h-2 rounded-full" style={{ width: '68%' }}></div>
              </div>
            </div>
            <div>
              <div className="flex justify-between text-sm mb-1">
                <span className="text-gray-600">Disk Usage</span>
                <span className="font-medium text-gray-900">75%</span>
              </div>
              <div className="w-full bg-gray-200 rounded-full h-2">
                <div className="bg-yellow-600 h-2 rounded-full" style={{ width: '75%' }}></div>
              </div>
            </div>
            <div>
              <div className="flex justify-between text-sm mb-1">
                <span className="text-gray-600">Network I/O</span>
                <span className="font-medium text-gray-900">32%</span>
              </div>
              <div className="w-full bg-gray-200 rounded-full h-2">
                <div className="bg-purple-600 h-2 rounded-full" style={{ width: '32%' }}></div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Recent Events */}
      <div className="bg-white rounded-lg border border-gray-200 p-6">
        <h3 className="text-lg font-medium text-gray-900 mb-4">Recent Events</h3>
        <div className="space-y-3">
          {[
            { time: '2 minutes ago', event: 'License validation spike detected', type: 'info' },
            { time: '15 minutes ago', event: 'Database backup completed successfully', type: 'success' },
            { time: '1 hour ago', event: 'High memory usage alert resolved', type: 'warning' },
            { time: '3 hours ago', event: 'License server restart completed', type: 'info' },
            { time: '6 hours ago', event: 'SSL certificate renewal successful', type: 'success' },
          ].map((event, index) => (
            <div key={index} className="flex items-center space-x-3 text-sm">
              <div className={`w-2 h-2 rounded-full ${
                event.type === 'success' ? 'bg-green-500' :
                event.type === 'warning' ? 'bg-yellow-500' :
                event.type === 'error' ? 'bg-red-500' : 'bg-blue-500'
              }`}></div>
              <span className="text-gray-600">{event.time}</span>
              <span className="text-gray-900">{event.event}</span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}