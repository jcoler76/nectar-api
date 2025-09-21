import React, { useState, useEffect, useRef } from 'react';
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  BarChart,
  Bar,
  Legend
} from 'recharts';
import {
  BellIcon,
  ExclamationTriangleIcon,
  CheckCircleIcon,
  XCircleIcon,
  ClockIcon,
  UserGroupIcon,
  EyeIcon,
  CursorArrowRaysIcon,
  SignalIcon,
  ShieldExclamationIcon
} from '@heroicons/react/24/outline';
import { Card, CardContent, CardHeader, CardTitle } from '../ui/card';
import { graphqlRequest } from '../../services/graphql';

interface RealTimeMetrics {
  timestamp: string;
  activeUsers: number;
  activeSessions: number;
  eventsPerMinute: number;
  pageViews: number;
  errors: number;
  averageResponseTime: number;
  cpuUsage: number;
  memoryUsage: number;
}

interface Alert {
  id: string;
  type: 'performance' | 'security' | 'usage' | 'error';
  severity: 'low' | 'medium' | 'high' | 'critical';
  title: string;
  message: string;
  timestamp: string;
  acknowledged: boolean;
  resolved: boolean;
  metadata?: Record<string, any>;
}

interface LiveEvent {
  id: string;
  type: string;
  user: string;
  page: string;
  timestamp: string;
  metadata: Record<string, any>;
}

const RealTimeMonitor: React.FC = () => {
  const [metrics, setMetrics] = useState<RealTimeMetrics[]>([]);
  const [alerts, setAlerts] = useState<Alert[]>([]);
  const [liveEvents, setLiveEvents] = useState<LiveEvent[]>([]);
  const [isConnected, setIsConnected] = useState(false);
  const [lastUpdate, setLastUpdate] = useState<Date | null>(null);
  const [alertFilters, setAlertFilters] = useState({
    performance: true,
    security: true,
    usage: true,
    error: true
  });
  const [showResolved, setShowResolved] = useState(false);
  const intervalRef = useRef<NodeJS.Timeout | null>(null);

  const fetchRealTimeData = async () => {
    try {
      const query = `
        query GetRealTimeData {
          realTimeMetrics {
            timestamp
            activeUsers
            activeSessions
            eventsPerMinute
            pageViews
            errors
            averageResponseTime
            cpuUsage
            memoryUsage
          }
          realTimeAlerts(includeResolved: ${showResolved}) {
            id
            type
            severity
            title
            message
            timestamp
            acknowledged
            resolved
            metadata
          }
          liveEvents(limit: 20) {
            id
            type
            user
            page
            timestamp
            metadata
          }
        }
      `;

      const result = await graphqlRequest(query);

      if (result.realTimeMetrics) {
        setMetrics(prev => {
          const newMetrics = [...prev, result.realTimeMetrics].slice(-30); // Keep last 30 data points
          return newMetrics;
        });
      }

      if (result.realTimeAlerts) {
        setAlerts(result.realTimeAlerts);
      }

      if (result.liveEvents) {
        setLiveEvents(result.liveEvents);
      }

      setIsConnected(true);
      setLastUpdate(new Date());
    } catch (error) {
      console.error('Failed to fetch real-time data:', error);
      setIsConnected(false);
    }
  };

  useEffect(() => {
    // Initial fetch
    fetchRealTimeData();

    // Set up polling every 5 seconds
    intervalRef.current = setInterval(fetchRealTimeData, 5000);

    return () => {
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
      }
    };
  }, [showResolved]);

  const acknowledgeAlert = async (alertId: string) => {
    try {
      await graphqlRequest(`
        mutation AcknowledgeAlert($alertId: String!) {
          acknowledgeAlert(alertId: $alertId) {
            success
          }
        }
      `, { alertId });

      setAlerts(prev =>
        prev.map(alert =>
          alert.id === alertId ? { ...alert, acknowledged: true } : alert
        )
      );
    } catch (error) {
      console.error('Failed to acknowledge alert:', error);
    }
  };

  const resolveAlert = async (alertId: string) => {
    try {
      await graphqlRequest(`
        mutation ResolveAlert($alertId: String!) {
          resolveAlert(alertId: $alertId) {
            success
          }
        }
      `, { alertId });

      setAlerts(prev =>
        prev.map(alert =>
          alert.id === alertId ? { ...alert, resolved: true } : alert
        )
      );
    } catch (error) {
      console.error('Failed to resolve alert:', error);
    }
  };

  const getSeverityColor = (severity: string) => {
    switch (severity) {
      case 'critical':
        return 'bg-red-100 text-red-800 border-red-200';
      case 'high':
        return 'bg-orange-100 text-orange-800 border-orange-200';
      case 'medium':
        return 'bg-yellow-100 text-yellow-800 border-yellow-200';
      case 'low':
        return 'bg-blue-100 text-blue-800 border-blue-200';
      default:
        return 'bg-gray-100 text-gray-800 border-gray-200';
    }
  };

  const getAlertIcon = (type: string) => {
    switch (type) {
      case 'security':
        return ShieldExclamationIcon;
      case 'performance':
        return SignalIcon;
      case 'error':
        return XCircleIcon;
      case 'usage':
        return ExclamationTriangleIcon;
      default:
        return BellIcon;
    }
  };

  const filteredAlerts = alerts.filter(alert => {
    if (!alertFilters[alert.type as keyof typeof alertFilters]) return false;
    if (!showResolved && alert.resolved) return false;
    return true;
  });

  const currentMetrics = metrics[metrics.length - 1] || {
    activeUsers: 0,
    activeSessions: 0,
    eventsPerMinute: 0,
    errors: 0,
    averageResponseTime: 0
  };

  const unacknowledgedAlertsCount = alerts.filter(a => !a.acknowledged && !a.resolved).length;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex justify-between items-center">
        <div className="flex items-center space-x-4">
          <h1 className="text-2xl font-bold text-gray-900">Real-Time Monitor</h1>
          <div className="flex items-center space-x-2">
            <div className={`w-3 h-3 rounded-full ${isConnected ? 'bg-green-500' : 'bg-red-500'}`} />
            <span className="text-sm text-gray-600">
              {isConnected ? 'Connected' : 'Disconnected'}
            </span>
            {lastUpdate && (
              <span className="text-xs text-gray-500">
                Last update: {lastUpdate.toLocaleTimeString()}
              </span>
            )}
          </div>
        </div>
        <div className="flex items-center space-x-4">
          {unacknowledgedAlertsCount > 0 && (
            <div className="bg-red-100 text-red-800 px-3 py-1 rounded-full text-sm font-medium">
              {unacknowledgedAlertsCount} new alerts
            </div>
          )}
        </div>
      </div>

      {/* Real-Time Metrics */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-6">
        <Card>
          <CardContent className="p-6">
            <div className="flex items-center">
              <div className="p-3 rounded-lg bg-green-100">
                <UserGroupIcon className="h-6 w-6 text-green-600" />
              </div>
              <div className="ml-4 flex-1">
                <p className="text-sm font-medium text-gray-600">Active Users</p>
                <p className="text-2xl font-semibold text-gray-900">
                  {currentMetrics.activeUsers}
                </p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-6">
            <div className="flex items-center">
              <div className="p-3 rounded-lg bg-blue-100">
                <EyeIcon className="h-6 w-6 text-blue-600" />
              </div>
              <div className="ml-4 flex-1">
                <p className="text-sm font-medium text-gray-600">Sessions</p>
                <p className="text-2xl font-semibold text-gray-900">
                  {currentMetrics.activeSessions}
                </p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-6">
            <div className="flex items-center">
              <div className="p-3 rounded-lg bg-purple-100">
                <CursorArrowRaysIcon className="h-6 w-6 text-purple-600" />
              </div>
              <div className="ml-4 flex-1">
                <p className="text-sm font-medium text-gray-600">Events/Min</p>
                <p className="text-2xl font-semibold text-gray-900">
                  {currentMetrics.eventsPerMinute}
                </p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-6">
            <div className="flex items-center">
              <div className="p-3 rounded-lg bg-orange-100">
                <XCircleIcon className="h-6 w-6 text-orange-600" />
              </div>
              <div className="ml-4 flex-1">
                <p className="text-sm font-medium text-gray-600">Errors</p>
                <p className="text-2xl font-semibold text-gray-900">
                  {currentMetrics.errors}
                </p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-6">
            <div className="flex items-center">
              <div className="p-3 rounded-lg bg-yellow-100">
                <ClockIcon className="h-6 w-6 text-yellow-600" />
              </div>
              <div className="ml-4 flex-1">
                <p className="text-sm font-medium text-gray-600">Avg Response</p>
                <p className="text-2xl font-semibold text-gray-900">
                  {currentMetrics.averageResponseTime}ms
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Real-Time Charts */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* User Activity */}
        <Card>
          <CardHeader>
            <CardTitle>User Activity</CardTitle>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={300}>
              <LineChart data={metrics}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis
                  dataKey="timestamp"
                  tickFormatter={(value) => new Date(value).toLocaleTimeString()}
                />
                <YAxis />
                <Tooltip
                  labelFormatter={(value) => new Date(value).toLocaleTimeString()}
                />
                <Legend />
                <Line type="monotone" dataKey="activeUsers" stroke="#10B981" name="Active Users" />
                <Line type="monotone" dataKey="activeSessions" stroke="#3B82F6" name="Sessions" />
              </LineChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

        {/* Performance Metrics */}
        <Card>
          <CardHeader>
            <CardTitle>Performance</CardTitle>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={300}>
              <LineChart data={metrics}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis
                  dataKey="timestamp"
                  tickFormatter={(value) => new Date(value).toLocaleTimeString()}
                />
                <YAxis />
                <Tooltip
                  labelFormatter={(value) => new Date(value).toLocaleTimeString()}
                />
                <Legend />
                <Line type="monotone" dataKey="averageResponseTime" stroke="#F59E0B" name="Response Time (ms)" />
                <Line type="monotone" dataKey="errors" stroke="#EF4444" name="Errors" />
              </LineChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Alerts */}
        <Card>
          <CardHeader>
            <div className="flex justify-between items-center">
              <CardTitle className="flex items-center">
                <BellIcon className="h-5 w-5 mr-2" />
                Active Alerts
              </CardTitle>
              <div className="flex items-center space-x-4">
                <div className="flex items-center space-x-2">
                  <input
                    type="checkbox"
                    id="showResolved"
                    checked={showResolved}
                    onChange={(e) => setShowResolved(e.target.checked)}
                    className="rounded border-gray-300"
                  />
                  <label htmlFor="showResolved" className="text-sm text-gray-600">
                    Show resolved
                  </label>
                </div>
              </div>
            </div>
            <div className="flex flex-wrap gap-2 mt-2">
              {Object.entries(alertFilters).map(([type, enabled]) => (
                <button
                  key={type}
                  onClick={() => setAlertFilters(prev => ({ ...prev, [type]: !enabled }))}
                  className={`px-3 py-1 text-xs rounded-full ${
                    enabled
                      ? 'bg-blue-100 text-blue-800'
                      : 'bg-gray-100 text-gray-600'
                  }`}
                >
                  {type.charAt(0).toUpperCase() + type.slice(1)}
                </button>
              ))}
            </div>
          </CardHeader>
          <CardContent>
            <div className="space-y-3 max-h-80 overflow-y-auto">
              {filteredAlerts.length === 0 ? (
                <div className="text-center py-8 text-gray-500">
                  <CheckCircleIcon className="h-12 w-12 mx-auto mb-2 text-green-500" />
                  <p>No active alerts</p>
                </div>
              ) : (
                filteredAlerts.map((alert) => {
                  const AlertIcon = getAlertIcon(alert.type);
                  return (
                    <div
                      key={alert.id}
                      className={`p-4 border rounded-lg ${getSeverityColor(alert.severity)} ${
                        alert.resolved ? 'opacity-60' : ''
                      }`}
                    >
                      <div className="flex justify-between items-start">
                        <div className="flex items-start space-x-3 flex-1">
                          <AlertIcon className="h-5 w-5 mt-0.5" />
                          <div className="flex-1">
                            <div className="flex items-center space-x-2 mb-1">
                              <span className="font-medium text-sm">{alert.title}</span>
                              <span className={`px-2 py-1 text-xs font-semibold rounded-full ${getSeverityColor(alert.severity)}`}>
                                {alert.severity.toUpperCase()}
                              </span>
                              {alert.acknowledged && (
                                <span className="px-2 py-1 text-xs font-semibold rounded-full bg-blue-100 text-blue-800">
                                  ACK
                                </span>
                              )}
                              {alert.resolved && (
                                <span className="px-2 py-1 text-xs font-semibold rounded-full bg-green-100 text-green-800">
                                  RESOLVED
                                </span>
                              )}
                            </div>
                            <p className="text-sm">{alert.message}</p>
                            <p className="text-xs text-gray-500 mt-1">
                              {new Date(alert.timestamp).toLocaleString()}
                            </p>
                          </div>
                        </div>
                        {!alert.resolved && (
                          <div className="flex flex-col space-y-1 ml-2">
                            {!alert.acknowledged && (
                              <button
                                onClick={() => acknowledgeAlert(alert.id)}
                                className="text-xs px-2 py-1 bg-blue-600 text-white rounded hover:bg-blue-700"
                              >
                                Ack
                              </button>
                            )}
                            <button
                              onClick={() => resolveAlert(alert.id)}
                              className="text-xs px-2 py-1 bg-green-600 text-white rounded hover:bg-green-700"
                            >
                              Resolve
                            </button>
                          </div>
                        )}
                      </div>
                    </div>
                  );
                })
              )}
            </div>
          </CardContent>
        </Card>

        {/* Live Events */}
        <Card>
          <CardHeader>
            <CardTitle>Live Activity Stream</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-2 max-h-80 overflow-y-auto">
              {liveEvents.length === 0 ? (
                <div className="text-center py-8 text-gray-500">
                  <SignalIcon className="h-12 w-12 mx-auto mb-2" />
                  <p>No recent activity</p>
                </div>
              ) : (
                liveEvents.map((event) => (
                  <div key={event.id} className="flex items-center space-x-3 p-2 bg-gray-50 rounded">
                    <div className="w-2 h-2 bg-green-500 rounded-full animate-pulse" />
                    <div className="flex-1">
                      <div className="flex items-center space-x-2">
                        <span className="text-sm font-medium">{event.type}</span>
                        <span className="text-xs text-gray-500">by {event.user}</span>
                        <span className="text-xs text-gray-400">on {event.page}</span>
                      </div>
                      <p className="text-xs text-gray-500">
                        {new Date(event.timestamp).toLocaleTimeString()}
                      </p>
                    </div>
                  </div>
                ))
              )}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Events Per Minute Chart */}
      <Card>
        <CardHeader>
          <CardTitle>Activity Levels</CardTitle>
        </CardHeader>
        <CardContent>
          <ResponsiveContainer width="100%" height={300}>
            <BarChart data={metrics}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis
                dataKey="timestamp"
                tickFormatter={(value) => new Date(value).toLocaleTimeString()}
              />
              <YAxis />
              <Tooltip
                labelFormatter={(value) => new Date(value).toLocaleTimeString()}
              />
              <Legend />
              <Bar dataKey="eventsPerMinute" fill="#8884d8" name="Events/Min" />
              <Bar dataKey="pageViews" fill="#82ca9d" name="Page Views" />
            </BarChart>
          </ResponsiveContainer>
        </CardContent>
      </Card>
    </div>
  );
};

export default RealTimeMonitor;