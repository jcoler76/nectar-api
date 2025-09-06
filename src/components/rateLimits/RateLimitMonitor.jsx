import { Activity, AlertTriangle, Shield, Timer, RefreshCw, Search, X } from 'lucide-react';
import React, { useState, useEffect, useCallback } from 'react';

import { useNotification } from '../../context/NotificationContext';
import { rateLimitApi } from '../../services/rateLimitApi';
import { Alert, AlertDescription } from '../ui/alert';
import { Badge } from '../ui/badge';
import { Button } from '../ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../ui/card';
import { Input } from '../ui/input';
import { Progress } from '../ui/progress';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '../ui/tabs';

const RateLimitMonitor = () => {
  const [activeLimits, setActiveLimits] = useState([]);
  const [filteredLimits, setFilteredLimits] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [autoRefresh, setAutoRefresh] = useState(true);
  const { showNotification } = useNotification();

  const fetchActiveLimits = useCallback(async () => {
    try {
      const response = await rateLimitApi.getActiveLimits();
      const data = Array.isArray(response?.data) ? response.data : [];
      setActiveLimits(data);
      setLoading(false);
    } catch (error) {
      console.error('Failed to fetch active rate limits:', error);
      showNotification('Failed to fetch active rate limits', 'error');
      setActiveLimits([]);
      setLoading(false);
    }
  }, [showNotification]);

  // Filter limits based on search term
  useEffect(() => {
    if (!searchTerm) {
      setFilteredLimits(activeLimits);
    } else {
      const filtered = activeLimits.filter(
        limit =>
          limit.key.toLowerCase().includes(searchTerm.toLowerCase()) ||
          limit.configName.toLowerCase().includes(searchTerm.toLowerCase())
      );
      setFilteredLimits(filtered);
    }
  }, [activeLimits, searchTerm]);

  // Auto-refresh functionality
  useEffect(() => {
    fetchActiveLimits();

    let interval;
    if (autoRefresh) {
      interval = setInterval(fetchActiveLimits, 10000); // Refresh every 10 seconds
    }

    return () => {
      if (interval) clearInterval(interval);
    };
  }, [fetchActiveLimits, autoRefresh]);

  const handleResetRateLimit = async (configName, key) => {
    try {
      await rateLimitApi.resetRateLimit(configName, key);
      showNotification('Rate limit reset successfully', 'success');
      fetchActiveLimits();
    } catch (error) {
      showNotification('Failed to reset rate limit', 'error');
    }
  };

  const formatTimeRemaining = resetTime => {
    if (!resetTime) return 'N/A';

    const remaining = Math.max(0, resetTime - Date.now());
    const minutes = Math.floor(remaining / 60000);
    const seconds = Math.floor((remaining % 60000) / 1000);

    if (minutes > 0) {
      return `${minutes}m ${seconds}s`;
    }
    return `${seconds}s`;
  };

  const getUsagePercentage = (current, max) => {
    return Math.min(100, (current / max) * 100);
  };

  const getUsageColor = percentage => {
    if (percentage >= 95) return 'bg-red-500';
    if (percentage >= 80) return 'bg-yellow-500';
    if (percentage >= 60) return 'bg-blue-500';
    return 'bg-green-500';
  };

  const getKeyTypeIcon = key => {
    if (key.startsWith('app:')) return '🔧';
    if (key.startsWith('role:')) return '👥';
    if (key.startsWith('comp:')) return '⚙️';
    if (key.startsWith('ip:')) return '🌐';
    return '🔑';
  };

  const formatKey = key => {
    const parts = key.split(':');
    if (parts.length >= 2) {
      return `${parts[0]}: ${parts.slice(1).join(':')}`;
    }
    return key;
  };

  // Group limits by configuration
  const limitsByConfig = filteredLimits.reduce((acc, limit) => {
    if (!acc[limit.configName]) {
      acc[limit.configName] = [];
    }
    acc[limit.configName].push(limit);
    return acc;
  }, {});

  // Calculate statistics
  const stats = {
    totalActive: activeLimits.length,
    nearLimit: activeLimits.filter(
      limit => getUsagePercentage(limit.currentCount, limit.maxAllowed) >= 80
    ).length,
    atLimit: activeLimits.filter(limit => limit.currentCount >= limit.maxAllowed).length,
    configs: Object.keys(limitsByConfig).length,
  };

  const statsCards = [
    {
      title: 'Active Rate Limits',
      value: stats.totalActive,
      icon: Activity,
      color: 'bg-blue-500',
    },
    {
      title: 'Near Limit (80%+)',
      value: stats.nearLimit,
      icon: AlertTriangle,
      color: 'bg-yellow-500',
    },
    {
      title: 'At Limit',
      value: stats.atLimit,
      icon: Shield,
      color: 'bg-red-500',
    },
    {
      title: 'Active Configs',
      value: stats.configs,
      icon: Timer,
      color: 'bg-green-500',
    },
  ];

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-ocean-800">Rate Limit Monitor</h1>
          <p className="text-gray-600">Monitor active rate limits and their current usage</p>
        </div>
        <div className="flex items-center gap-2">
          <Button variant="outline" size="sm" onClick={() => setAutoRefresh(!autoRefresh)}>
            <RefreshCw className={`mr-2 h-4 w-4 ${autoRefresh ? 'animate-spin' : ''}`} />
            Auto Refresh: {autoRefresh ? 'On' : 'Off'}
          </Button>
          <Button onClick={fetchActiveLimits} disabled={loading}>
            <RefreshCw className={`mr-2 h-4 w-4 ${loading ? 'animate-spin' : ''}`} />
            Refresh
          </Button>
        </div>
      </div>

      {/* Statistics Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        {statsCards.map((stat, index) => {
          const IconComponent = stat.icon;
          return (
            <Card key={index}>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">{stat.title}</CardTitle>
                <div className={`p-2 rounded-md ${stat.color} text-white`}>
                  <IconComponent className="h-4 w-4" />
                </div>
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{stat.value}</div>
              </CardContent>
            </Card>
          );
        })}
      </div>

      {/* Search and Filters */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle>Active Rate Limits</CardTitle>
            <div className="flex items-center gap-2">
              <div className="relative">
                <Search className="absolute left-2 top-2.5 h-4 w-4 text-gray-400" />
                <Input
                  placeholder="Search by key or config..."
                  value={searchTerm}
                  onChange={e => setSearchTerm(e.target.value)}
                  className="pl-8 w-64"
                />
                {searchTerm && (
                  <Button
                    variant="ghost"
                    size="sm"
                    className="absolute right-1 top-1 h-6 w-6 p-0"
                    onClick={() => setSearchTerm('')}
                  >
                    <X className="h-3 w-3" />
                  </Button>
                )}
              </div>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          {loading ? (
            <div className="text-center py-8">
              <RefreshCw className="h-8 w-8 animate-spin mx-auto mb-2" />
              <p>Loading active rate limits...</p>
            </div>
          ) : filteredLimits.length === 0 ? (
            <div className="text-center py-8">
              <Shield className="h-8 w-8 mx-auto mb-2 text-gray-400" />
              <p className="text-gray-500">
                {searchTerm ? 'No rate limits match your search' : 'No active rate limits found'}
              </p>
            </div>
          ) : (
            <Tabs defaultValue="grouped" className="w-full">
              <TabsList>
                <TabsTrigger value="grouped">Grouped by Config</TabsTrigger>
                <TabsTrigger value="list">All Limits</TabsTrigger>
              </TabsList>

              <TabsContent value="grouped" className="space-y-4">
                {Object.entries(limitsByConfig).map(([configName, limits]) => (
                  <Card key={configName}>
                    <CardHeader>
                      <CardTitle className="text-lg">{configName}</CardTitle>
                      <CardDescription>{limits.length} active limits</CardDescription>
                    </CardHeader>
                    <CardContent>
                      <div className="space-y-3">
                        {limits.map((limit, index) => {
                          const usagePercentage = getUsagePercentage(
                            limit.currentCount,
                            limit.maxAllowed
                          );
                          const isNearLimit = usagePercentage >= 80;
                          const isAtLimit = limit.currentCount >= limit.maxAllowed;

                          return (
                            <div
                              key={index}
                              className={`p-4 border rounded-lg ${isAtLimit ? 'border-red-200 bg-red-50' : isNearLimit ? 'border-yellow-200 bg-yellow-50' : ''}`}
                            >
                              <div className="flex items-center justify-between mb-2">
                                <div className="flex items-center gap-2">
                                  <span className="text-lg">{getKeyTypeIcon(limit.key)}</span>
                                  <span className="font-medium">{formatKey(limit.key)}</span>
                                  {isAtLimit && <Badge variant="destructive">At Limit</Badge>}
                                  {isNearLimit && !isAtLimit && (
                                    <Badge variant="warning">Near Limit</Badge>
                                  )}
                                </div>
                                <Button
                                  variant="outline"
                                  size="sm"
                                  onClick={() => handleResetRateLimit(limit.configName, limit.key)}
                                >
                                  Reset
                                </Button>
                              </div>

                              <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
                                <div>
                                  <span className="text-gray-500">Current:</span>
                                  <span className="ml-1 font-medium">{limit.currentCount}</span>
                                </div>
                                <div>
                                  <span className="text-gray-500">Max:</span>
                                  <span className="ml-1 font-medium">{limit.maxAllowed}</span>
                                </div>
                                <div>
                                  <span className="text-gray-500">Usage:</span>
                                  <span className="ml-1 font-medium">
                                    {usagePercentage.toFixed(1)}%
                                  </span>
                                </div>
                                <div>
                                  <span className="text-gray-500">Resets in:</span>
                                  <span className="ml-1 font-medium">
                                    {formatTimeRemaining(limit.resetTime)}
                                  </span>
                                </div>
                              </div>

                              <div className="mt-2">
                                <Progress
                                  value={usagePercentage}
                                  className="h-2"
                                  indicatorClassName={getUsageColor(usagePercentage)}
                                />
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </TabsContent>

              <TabsContent value="list" className="space-y-3">
                {filteredLimits.map((limit, index) => {
                  const usagePercentage = getUsagePercentage(limit.currentCount, limit.maxAllowed);
                  const isNearLimit = usagePercentage >= 80;
                  const isAtLimit = limit.currentCount >= limit.maxAllowed;

                  return (
                    <div
                      key={index}
                      className={`p-4 border rounded-lg ${isAtLimit ? 'border-red-200 bg-red-50' : isNearLimit ? 'border-yellow-200 bg-yellow-50' : ''}`}
                    >
                      <div className="flex items-center justify-between mb-2">
                        <div className="flex items-center gap-2">
                          <span className="text-lg">{getKeyTypeIcon(limit.key)}</span>
                          <span className="font-medium">{formatKey(limit.key)}</span>
                          <Badge variant="outline">{limit.configName}</Badge>
                          {isAtLimit && <Badge variant="destructive">At Limit</Badge>}
                          {isNearLimit && !isAtLimit && <Badge variant="warning">Near Limit</Badge>}
                        </div>
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => handleResetRateLimit(limit.configName, limit.key)}
                        >
                          Reset
                        </Button>
                      </div>

                      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm mb-2">
                        <div>
                          <span className="text-gray-500">Current:</span>
                          <span className="ml-1 font-medium">{limit.currentCount}</span>
                        </div>
                        <div>
                          <span className="text-gray-500">Max:</span>
                          <span className="ml-1 font-medium">{limit.maxAllowed}</span>
                        </div>
                        <div>
                          <span className="text-gray-500">Usage:</span>
                          <span className="ml-1 font-medium">{usagePercentage.toFixed(1)}%</span>
                        </div>
                        <div>
                          <span className="text-gray-500">Resets in:</span>
                          <span className="ml-1 font-medium">
                            {formatTimeRemaining(limit.resetTime)}
                          </span>
                        </div>
                      </div>

                      <Progress
                        value={usagePercentage}
                        className="h-2"
                        indicatorClassName={getUsageColor(usagePercentage)}
                      />
                    </div>
                  );
                })}
              </TabsContent>
            </Tabs>
          )}
        </CardContent>
      </Card>

      {/* Alerts for critical situations */}
      {stats.atLimit > 0 && (
        <Alert className="border-red-200 bg-red-50">
          <AlertTriangle className="h-4 w-4 text-red-600" />
          <AlertDescription className="text-red-800">
            <strong>{stats.atLimit}</strong> rate limit{stats.atLimit > 1 ? 's are' : ' is'}{' '}
            currently at their maximum threshold. Consider resetting or adjusting limits if
            necessary.
          </AlertDescription>
        </Alert>
      )}
    </div>
  );
};

export default RateLimitMonitor;
