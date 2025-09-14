import {
  Plus,
  Timer,
  Activity,
  Shield,
  Database,
  Globe,
  MessageSquare,
  Settings,
} from 'lucide-react';
import React from 'react';
import { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';

import { useNotification } from '../../context/NotificationContext';
import { useConfirmDialog } from '../../hooks/useConfirmDialog';
import { rateLimitApi } from '../../services/rateLimitApi';
import BaseListView from '../common/BaseListView';
import { Badge } from '../ui/badge';
import { Button } from '../ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../ui/card';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '../ui/dialog';
import { Switch } from '../ui/switch';

const RateLimitList = () => {
  const [rateLimits, setRateLimits] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [stats, setStats] = useState({});
  const navigate = useNavigate();
  const { showNotification } = useNotification();
  const { confirmState, openConfirm, closeConfirm, handleConfirm } = useConfirmDialog();

  const typeIcons = {
    api: Globe,
    auth: Shield,
    upload: Database,
    graphql: Activity,
    websocket: MessageSquare,
    custom: Settings,
  };

  const typeColors = {
    api: 'bg-blue-100 text-blue-800',
    auth: 'bg-red-100 text-red-800',
    upload: 'bg-green-100 text-green-800',
    graphql: 'bg-purple-100 text-purple-800',
    websocket: 'bg-orange-100 text-orange-800',
    custom: 'bg-gray-100 text-gray-800',
  };

  const fetchRateLimits = useCallback(async () => {
    try {
      setLoading(true);

      // Check if rate limit endpoints are available
      const [configsResponse, analyticsResponse] = await Promise.all([
        rateLimitApi.getConfigs().catch(err => {
          console.error('RateLimitList: getConfigs failed:', err);
          // Check if it's a 404 error (endpoints not available)
          if (err.response?.status === 404) {
            throw new Error('ENDPOINTS_NOT_AVAILABLE');
          }
          throw err;
        }),
        rateLimitApi.getAnalytics().catch(err => {
          console.error('RateLimitList: getAnalytics failed:', err);
          // Check if it's a 404 error (endpoints not available)
          if (err.response?.status === 404) {
            throw new Error('ENDPOINTS_NOT_AVAILABLE');
          }
          throw err;
        }),
      ]);

      // Extract the actual array from the nested response structure
      const configs = configsResponse?.data?.data || [];
      const analytics = analyticsResponse?.data?.data || analyticsResponse?.data || {};

      setRateLimits(configs);
      setStats(analytics);
      setError('');
    } catch (err) {
      console.error('RateLimitList: Critical error in fetchRateLimits:', err);
      console.error('RateLimitList: Error response:', err.response);

      if (err.message === 'ENDPOINTS_NOT_AVAILABLE') {
        setError('Rate limit management is temporarily unavailable during system migration');
        showNotification(
          'Rate limit management is temporarily unavailable during system migration',
          'warning'
        );
      } else {
        setError('Failed to fetch rate limit configurations');
        showNotification('Failed to fetch rate limit configurations', 'error');
      }
    } finally {
      setLoading(false);
    }
  }, [showNotification]);

  useEffect(() => {
    fetchRateLimits();
  }, [fetchRateLimits]);

  const handleToggleEnabled = async config => {
    try {
      await rateLimitApi.toggleConfig(config._id, {
        reason: `${config.enabled ? 'Disabled' : 'Enabled'} via admin interface`,
      });

      showNotification(
        `Rate limit ${config.enabled ? 'disabled' : 'enabled'} successfully`,
        'success'
      );
      fetchRateLimits();
    } catch (err) {
      showNotification('Failed to toggle rate limit configuration', 'error');
    }
  };

  const handleDelete = useCallback(
    async id => {
      try {
        await rateLimitApi.deleteConfig(id);
        showNotification('Rate limit configuration deleted successfully', 'success');
        fetchRateLimits();
      } catch (err) {
        showNotification('Failed to delete rate limit configuration', 'error');
      }
    },
    [showNotification, fetchRateLimits]
  );

  const formatTimeWindow = windowMs => {
    if (windowMs < 60 * 1000) {
      return `${Math.round(windowMs / 1000)}s`;
    } else if (windowMs < 60 * 60 * 1000) {
      return `${Math.round(windowMs / (60 * 1000))}m`;
    } else {
      return `${Math.round(windowMs / (60 * 60 * 1000))}h`;
    }
  };

  const prepareExportData = () => {
    return rateLimits.map(config => ({
      Name: config.name,
      'Display Name': config.displayName,
      Type: config.type,
      'Max Requests': config.max,
      'Time Window': formatTimeWindow(config.windowMs),
      'Key Strategy': config.keyStrategy,
      Enabled: config.enabled ? 'Yes' : 'No',
      'Created At': new Date(config.createdAt).toLocaleDateString(),
      'Created By': `${config.createdBy?.firstName} ${config.createdBy?.lastName}`,
      'Updated At': new Date(config.updatedAt).toLocaleDateString(),
    }));
  };

  const columns = [
    {
      accessorKey: 'displayName',
      header: 'Configuration',
      sortable: true,
      cell: ({ row }) => {
        const TypeIcon = typeIcons[row.type] || Timer;
        return (
          <div className="flex items-center gap-3">
            <div
              className={`p-2 rounded-md ${typeColors[row.type] || 'bg-gray-100 text-gray-800'}`}
            >
              <TypeIcon className="h-4 w-4" />
            </div>
            <div>
              <div className="font-medium">{row.displayName}</div>
              <div className="text-sm text-gray-500">{row.name}</div>
            </div>
          </div>
        );
      },
    },
    {
      accessorKey: 'type',
      header: 'Type',
      sortable: true,
      cell: ({ row }) => (
        <Badge variant="outline" className="capitalize">
          {row.type}
        </Badge>
      ),
    },
    {
      accessorKey: 'max',
      header: 'Rate Limit',
      sortable: true,
      cell: ({ row }) => (
        <div className="text-center">
          <div className="font-medium">{row.max.toLocaleString()}</div>
          <div className="text-sm text-gray-500">per {formatTimeWindow(row.windowMs)}</div>
        </div>
      ),
    },
    {
      accessorKey: 'keyStrategy',
      header: 'Strategy',
      sortable: true,
      cell: ({ row }) => (
        <Badge variant="secondary" className="capitalize">
          {row.keyStrategy}
        </Badge>
      ),
    },
    {
      accessorKey: 'enabled',
      header: 'Status',
      type: 'switch',
      cell: ({ row, value }) => (
        <div className="flex items-center gap-2">
          <Switch checked={value} onCheckedChange={() => handleToggleEnabled(row)} />
          <Badge variant={value ? 'success' : 'secondary'}>{value ? 'Active' : 'Inactive'}</Badge>
        </div>
      ),
    },
    {
      accessorKey: 'applicationLimits',
      header: 'Custom Limits',
      cell: ({ row }) => {
        const totalCustom =
          (row.applicationLimits?.length || 0) +
          (row.roleLimits?.length || 0) +
          (row.componentLimits?.length || 0);

        return totalCustom > 0 ? (
          <Badge variant="outline">{totalCustom} custom</Badge>
        ) : (
          <span className="text-gray-400">Default only</span>
        );
      },
    },
    {
      accessorKey: 'actions',
      header: 'Actions',
      type: 'actions',
      actions: [
        {
          label: 'Edit',
          onClick: item => navigate(`/rate-limits/${item._id}/edit`),
        },
        {
          label: 'Duplicate',
          onClick: item => navigate(`/rate-limits/create?duplicate=${item._id}`),
        },
        {
          label: 'Delete',
          onClick: item =>
            openConfirm(item._id, {
              title: 'Delete Rate Limit Configuration',
              message: `Are you sure you want to delete "${item.displayName}"? This action cannot be undone.`,
            }),
          destructive: true,
        },
      ],
    },
  ];

  const onConfirmDelete = useCallback(
    async itemId => {
      await handleDelete(itemId);
    },
    [handleDelete]
  );

  const statsCards = [
    {
      title: 'Total Configurations',
      value: stats.totalConfigs || 0,
      icon: Timer,
      color: 'bg-blue-500',
    },
    {
      title: 'Active Configurations',
      value: stats.enabledConfigs || 0,
      icon: Activity,
      color: 'bg-green-500',
    },
    {
      title: 'Currently Limited',
      value: stats.activeLimits || 0,
      icon: Shield,
      color: 'bg-red-500',
    },
    {
      title: 'Recent Changes',
      value: stats.recentChanges?.length || 0,
      icon: Settings,
      color: 'bg-purple-500',
    },
  ];

  return (
    <div className="space-y-6">
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

      {/* Configuration Types Overview */}
      {stats.configsByType && (
        <Card>
          <CardHeader>
            <CardTitle>Configuration Types</CardTitle>
            <CardDescription>Distribution of rate limit configurations by type</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4">
              {Object.entries(stats.configsByType).map(([type, count]) => {
                const TypeIcon = typeIcons[type] || Timer;
                return (
                  <div key={type} className="flex items-center gap-2">
                    <div
                      className={`p-1 rounded ${typeColors[type] || 'bg-gray-100 text-gray-800'}`}
                    >
                      <TypeIcon className="h-3 w-3" />
                    </div>
                    <span className="text-sm capitalize">{type}</span>
                    <Badge variant="secondary">{count}</Badge>
                  </div>
                );
              })}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Main List View */}
      <BaseListView
        title="Rate Limit Configurations"
        description="Manage API rate limiting rules and thresholds"
        data={rateLimits}
        columns={columns}
        loading={loading}
        error={error}
        onAdd={() => navigate('/rate-limits/create')}
        addButtonText="Add Rate Limit"
        addButtonIcon={Plus}
        prepareExportData={prepareExportData}
        exportFilename="rate-limit-configs.csv"
        searchPlaceholder="Search configurations..."
        emptyStateTitle="No Rate Limit Configurations"
        emptyStateDescription="Get started by creating your first rate limit configuration."
        emptyStateAction={
          <Button onClick={() => navigate('/rate-limits/create')}>
            <Plus className="mr-2 h-4 w-4" />
            Add Rate Limit
          </Button>
        }
      />

      {/* Confirm Dialog */}
      <Dialog open={confirmState.open} onOpenChange={closeConfirm}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{confirmState.title}</DialogTitle>
            <DialogDescription>{confirmState.message}</DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={closeConfirm}>
              Cancel
            </Button>
            <Button variant="destructive" onClick={() => handleConfirm(onConfirmDelete)}>
              Delete
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default RateLimitList;
