import { Bot, CheckCircle2, Loader2, AlertCircle, RefreshCw } from 'lucide-react';
import React, { useState, useEffect, useCallback } from 'react';

import api from '../../services/api';
import { Alert, AlertDescription } from '../ui/alert';
import { Badge } from '../ui/badge';
import { Button } from '../ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '../ui/card';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '../ui/dialog';
import { Progress } from '../ui/progress';

const FolderMCPStatus = ({ folder, open, onOpenChange }) => {
  const [status, setStatus] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [reindexing, setReindexing] = useState(false);

  // Fetch MCP status
  const fetchStatus = useCallback(async () => {
    try {
      setLoading(true);
      setError('');
      const response = await api.get(`/api/folders/${folder.id}/mcp/status`);

      if (response.data.success) {
        setStatus(response.data.status);
      } else {
        setError(response.data.message || 'Failed to fetch MCP status');
      }
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to fetch MCP status');
    } finally {
      setLoading(false);
    }
  }, [folder.id]);

  // Poll status if indexing is in progress
  useEffect(() => {
    if (!open) return;

    fetchStatus();

    const interval = setInterval(() => {
      if (status?.indexingStatus === 'processing' || status?.indexingStatus === 'pending') {
        fetchStatus();
      }
    }, 5000); // Poll every 5 seconds

    return () => clearInterval(interval);
  }, [open, fetchStatus, status?.indexingStatus]);

  // Handle reindex
  const handleReindex = async () => {
    setReindexing(true);
    setError('');

    try {
      const response = await api.post(`/api/folders/${folder.id}/mcp/reindex`);

      if (response.data.success) {
        await fetchStatus();
      } else {
        setError(response.data.message || 'Failed to trigger reindexing');
      }
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to trigger reindexing');
    } finally {
      setReindexing(false);
    }
  };

  // Calculate progress
  const getProgress = () => {
    if (!status || !status.fileCount || status.fileCount === 0) return 0;
    return Math.round((status.embeddingCount / status.fileCount) * 100);
  };

  // Get status badge
  const getStatusBadge = () => {
    if (!status) return null;

    const statusConfig = {
      idle: { variant: 'secondary', text: 'Idle', icon: CheckCircle2, color: 'text-gray-600' },
      pending: { variant: 'default', text: 'Pending', icon: Loader2, color: 'text-blue-600' },
      processing: {
        variant: 'default',
        text: 'Processing',
        icon: Loader2,
        color: 'text-blue-600',
      },
      completed: {
        variant: 'success',
        text: 'Completed',
        icon: CheckCircle2,
        color: 'text-green-600',
      },
      failed: { variant: 'destructive', text: 'Failed', icon: AlertCircle, color: 'text-red-600' },
    };

    const config = statusConfig[status.indexingStatus] || statusConfig.idle;
    const Icon = config.icon;

    return (
      <Badge variant={config.variant} className="flex items-center gap-1">
        <Icon className={`h-3 w-3 ${config.icon === Loader2 ? 'animate-spin' : ''}`} />
        {config.text}
      </Badge>
    );
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Bot className="h-5 w-5 text-purple-600" />
            MCP Status - "{folder?.name}"
          </DialogTitle>
          <DialogDescription>Monitor indexing progress and MCP server status</DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          {error && (
            <Alert variant="destructive">
              <AlertDescription>{error}</AlertDescription>
            </Alert>
          )}

          {loading ? (
            <div className="flex justify-center py-8">
              <Loader2 className="h-8 w-8 animate-spin text-purple-600" />
            </div>
          ) : status ? (
            <>
              {/* Status Overview */}
              <Card>
                <CardHeader>
                  <CardTitle className="text-base flex items-center justify-between">
                    <span>MCP Server Status</span>
                    {getStatusBadge()}
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-3">
                  <div className="grid grid-cols-2 gap-4 text-sm">
                    <div>
                      <p className="text-muted-foreground">Indexed Files</p>
                      <p className="text-lg font-semibold">{status.embeddingCount || 0}</p>
                    </div>
                    <div>
                      <p className="text-muted-foreground">Total Files</p>
                      <p className="text-lg font-semibold">{status.fileCount || 0}</p>
                    </div>
                  </div>

                  {/* Progress Bar */}
                  {(status.indexingStatus === 'processing' ||
                    status.indexingStatus === 'pending') && (
                    <div className="space-y-2">
                      <div className="flex justify-between text-sm">
                        <span>Indexing Progress</span>
                        <span>{getProgress()}%</span>
                      </div>
                      <Progress value={getProgress()} className="h-2" />
                      <p className="text-xs text-muted-foreground">
                        This may take a few minutes depending on the number and size of files
                      </p>
                    </div>
                  )}

                  {/* Last Indexed */}
                  {status.lastIndexedAt && (
                    <div className="text-sm">
                      <p className="text-muted-foreground">Last Indexed</p>
                      <p>{new Date(status.lastIndexedAt).toLocaleString()}</p>
                    </div>
                  )}

                  {/* Active Jobs */}
                  {status.activeJobs > 0 && (
                    <Alert>
                      <AlertDescription>
                        <div className="flex items-center gap-2">
                          <Loader2 className="h-4 w-4 animate-spin" />
                          {status.activeJobs} indexing job{status.activeJobs > 1 ? 's' : ''} in
                          progress
                        </div>
                      </AlertDescription>
                    </Alert>
                  )}
                </CardContent>
              </Card>

              {/* Configuration */}
              {status.config && (
                <Card>
                  <CardHeader>
                    <CardTitle className="text-base">Configuration</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="grid grid-cols-2 gap-3 text-sm">
                      <div>
                        <p className="text-muted-foreground">Embedding Model</p>
                        <p className="font-mono text-xs">{status.config.embedding_model}</p>
                      </div>
                      <div>
                        <p className="text-muted-foreground">LLM Model</p>
                        <p className="font-mono text-xs">{status.config.llm_model}</p>
                      </div>
                      <div>
                        <p className="text-muted-foreground">Chunk Size</p>
                        <p>{status.config.chunk_size}</p>
                      </div>
                      <div>
                        <p className="text-muted-foreground">Top K Results</p>
                        <p>{status.config.top_k_results}</p>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              )}

              {/* Actions */}
              <div className="flex justify-between pt-4">
                <Button
                  variant="outline"
                  onClick={handleReindex}
                  disabled={reindexing || status.indexingStatus === 'processing'}
                >
                  {reindexing ? (
                    <>
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                      Reindexing...
                    </>
                  ) : (
                    <>
                      <RefreshCw className="mr-2 h-4 w-4" />
                      Reindex
                    </>
                  )}
                </Button>

                <Button variant="outline" onClick={() => onOpenChange(false)}>
                  Close
                </Button>
              </div>
            </>
          ) : (
            <Alert>
              <AlertDescription>No MCP status data available</AlertDescription>
            </Alert>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
};

export default FolderMCPStatus;
