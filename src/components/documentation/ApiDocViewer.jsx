import {
  AlertCircle,
  RefreshCw as RefreshIcon,
  Download,
  FileText,
  Code,
  Bot,
  CheckCircle,
  Clock,
  Zap,
} from 'lucide-react';
import { useEffect, useState } from 'react';

import api from '../../services/api';
import LoadingSpinner from '../common/LoadingSpinner';
import { Badge } from '../ui/badge';
import { Button } from '../ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '../ui/card';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '../ui/dialog';
import { Label } from '../ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../ui/select';

import EndpointDetails from './EndpointDetails';

const ApiDocViewer = () => {
  const [roles, setRoles] = useState([]);
  const [selectedRole, setSelectedRole] = useState('');
  const [endpoints, setEndpoints] = useState([]);
  const [actions, setActions] = useState(null);
  const [summary, setSummary] = useState(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState(null);
  const [aiModalOpen, setAiModalOpen] = useState(false);
  const [aiEnhancing, setAiEnhancing] = useState(false);
  const [aiResults, setAiResults] = useState([]);

  // Fetch roles on component mount
  useEffect(() => {
    const fetchRoles = async () => {
      try {
        const response = await api.get('/api/roles');
        setRoles(response.data);
        setLoading(false);
      } catch (err) {
        setError('Failed to load roles');
        setLoading(false);
      }
    };

    fetchRoles();
  }, []);

  // Fetch endpoints when role is selected
  const handleRoleChange = async roleId => {
    setSelectedRole(roleId);
    setLoading(true);
    setError(null);

    try {
      const response = await api.get(`/api/documentation/role/${roleId}`);
      setEndpoints(response.data.endpoints);
      setActions(response.data.actions);
      setSummary(response.data.summary);
    } catch (err) {
      setError('Failed to load documentation');
    } finally {
      setLoading(false);
    }
  };

  const handleBulkRefresh = async () => {
    if (!selectedRole) return;

    setRefreshing(true);
    try {
      await api.post(`/api/documentation/refresh-schemas/${selectedRole}`);

      // Refetch endpoints to get updated schemas
      const updatedData = await api.get(`/api/documentation/role/${selectedRole}`);

      setEndpoints(updatedData.data.endpoints);
      setActions(updatedData.data.actions);
      setSummary(updatedData.data.summary);
    } catch (err) {
      setError('Failed to refresh schemas');
    } finally {
      setRefreshing(false);
    }
  };

  const handleSchemaUpdate = (endpointPath, newSchema) => {
    setEndpoints(prevEndpoints =>
      prevEndpoints.map(endpoint =>
        endpoint.path === endpointPath ? { ...endpoint, schema: newSchema } : endpoint
      )
    );
  };

  const handleExport = async type => {
    if (!actions) return;

    try {
      let url;
      switch (type) {
        case 'pdf':
          url = actions.pdf.standard;
          break;
        case 'openapi':
          url = actions.openapi;
          break;
        case 'postman':
          url = actions.postman;
          break;
        default:
          return;
      }

      if (type === 'pdf') {
        // For PDF, trigger download
        const response = await fetch(url);
        const blob = await response.blob();
        const downloadUrl = window.URL.createObjectURL(blob);
        const link = document.createElement('a');
        link.href = downloadUrl;
        link.download = `api-documentation-${selectedRole}.pdf`;
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        window.URL.revokeObjectURL(downloadUrl);
      } else {
        // For JSON exports, open in new tab or download
        const response = await api.get(url);
        const dataStr = JSON.stringify(response.data, null, 2);
        const dataBlob = new Blob([dataStr], { type: 'application/json' });
        const downloadUrl = window.URL.createObjectURL(dataBlob);
        const link = document.createElement('a');
        link.href = downloadUrl;
        link.download = `api-${type}-${selectedRole}.json`;
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        window.URL.revokeObjectURL(downloadUrl);
      }
    } catch (err) {
      setError(`Failed to export ${type} documentation`);
    }
  };

  const handleAIEnhance = async () => {
    if (!actions || !endpoints.length) return;

    setAiModalOpen(true);
    setAiEnhancing(true);
    setAiResults([]);

    try {
      const results = [];

      // Process each endpoint for AI enhancement
      for (const endpoint of endpoints) {
        try {
          const enhanceUrl = `${actions.aiEnhance}/${endpoint.permissionId}`;
          const response = await api.get(enhanceUrl);

          results.push({
            endpoint: endpoint,
            success: true,
            data: response.data,
            cached: response.data.cached,
          });
        } catch (err) {
          results.push({
            endpoint: endpoint,
            success: false,
            error: err.message,
          });
        }
      }

      setAiResults(results);
    } catch (err) {
      setError('Failed to enhance documentation with AI');
    } finally {
      setAiEnhancing(false);
    }
  };

  if (loading && !roles.length) {
    return (
      <div className="flex justify-center p-8">
        <LoadingSpinner />
      </div>
    );
  }

  if (error) {
    return (
      <Card className="border-destructive/50 bg-destructive/10 m-4">
        <CardContent className="flex items-center gap-2 p-4">
          <AlertCircle className="h-4 w-4 text-destructive" />
          <span className="text-destructive font-medium">{error}</span>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="flex flex-col h-full p-4 sm:p-6 space-y-4 sm:space-y-6">
      <div>
        <h1 className="text-2xl sm:text-3xl font-bold tracking-tight">API Documentation</h1>
        <p className="text-muted-foreground text-sm sm:text-base">
          Browse API endpoints and schemas by role
        </p>
      </div>

      <div className="flex flex-col sm:flex-row gap-4">
        <div className="flex-1">
          <Label htmlFor="role-select">Select Role</Label>
          <Select value={selectedRole} onValueChange={handleRoleChange}>
            <SelectTrigger>
              <SelectValue placeholder="Choose a role to view endpoints" />
            </SelectTrigger>
            <SelectContent>
              {roles.map(role => (
                <SelectItem key={role._id} value={role._id}>
                  {role.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        {selectedRole && (
          <div className="flex items-end">
            <Button
              variant="outline"
              onClick={handleBulkRefresh}
              disabled={refreshing}
              title="Refresh all schemas"
            >
              {refreshing ? (
                <RefreshIcon className="mr-2 h-4 w-4 animate-spin" />
              ) : (
                <RefreshIcon className="mr-2 h-4 w-4" />
              )}
              {refreshing ? 'Refreshing...' : 'Refresh All'}
            </Button>
          </div>
        )}
      </div>

      {/* Export Actions Section */}
      {selectedRole && actions && summary && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-lg">
              <Download className="h-5 w-5" />
              Export Documentation
            </CardTitle>
            <div className="text-sm text-muted-foreground">
              {summary.totalEndpoints} endpoints • {summary.schemasLoaded} loaded •{' '}
              {summary.completeness}% complete
            </div>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
              <Button
                variant="outline"
                onClick={() => handleExport('pdf')}
                className="flex items-center gap-2"
              >
                <FileText className="h-4 w-4" />
                PDF Export
              </Button>
              <Button
                variant="outline"
                onClick={() => handleExport('openapi')}
                className="flex items-center gap-2"
              >
                <Code className="h-4 w-4" />
                OpenAPI
              </Button>
              <Button
                variant="outline"
                onClick={() => handleExport('postman')}
                className="flex items-center gap-2"
              >
                <Download className="h-4 w-4" />
                Postman
              </Button>
              <Button
                variant="outline"
                onClick={() => handleAIEnhance()}
                className="flex items-center gap-2"
              >
                <Bot className="h-4 w-4" />
                AI Enhance
              </Button>
            </div>
            {summary.recommendations && summary.recommendations.length > 0 && (
              <div className="mt-4 p-3 bg-blue-50 rounded-lg border border-blue-200">
                <h4 className="font-medium text-blue-900 mb-2">Recommendations:</h4>
                <ul className="text-sm text-blue-800 space-y-1">
                  {summary.recommendations.map((rec, index) => (
                    <li key={index} className="flex items-start gap-2">
                      <span className="text-blue-600 mt-0.5">•</span>
                      {rec}
                    </li>
                  ))}
                </ul>
              </div>
            )}
          </CardContent>
        </Card>
      )}

      {selectedRole && loading && (
        <div className="flex justify-center p-8">
          <LoadingSpinner />
        </div>
      )}

      {selectedRole && !loading && endpoints.length === 0 && (
        <Card className="border-blue-200 bg-blue-50">
          <CardContent className="flex items-center gap-2 p-4">
            <AlertCircle className="h-4 w-4 text-blue-600" />
            <span className="text-blue-800 font-medium">No endpoints found for this role</span>
          </CardContent>
        </Card>
      )}

      {selectedRole &&
        !loading &&
        endpoints.map((endpoint, index) => (
          <EndpointDetails
            key={`${endpoint.path}-${index}`}
            endpoint={endpoint}
            onSchemaUpdate={handleSchemaUpdate}
          />
        ))}

      {/* AI Enhancement Dialog */}
      <Dialog open={aiModalOpen} onOpenChange={setAiModalOpen}>
        <DialogContent className="max-w-4xl max-h-[80vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Bot className="h-5 w-5" />
              AI Documentation Enhancement
            </DialogTitle>
            <DialogDescription>
              Enhancing your API documentation with AI-powered analysis and comprehensive
              descriptions.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4">
            {aiEnhancing && (
              <div className="flex items-center justify-center p-8">
                <div className="text-center space-y-4">
                  <div className="animate-spin h-8 w-8 border-2 border-blue-500 border-t-transparent rounded-full mx-auto"></div>
                  <p className="text-muted-foreground">
                    Analyzing {endpoints.length} endpoints with AI...
                  </p>
                </div>
              </div>
            )}

            {!aiEnhancing && aiResults.length > 0 && (
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <h3 className="text-lg font-semibold">Enhancement Results</h3>
                  <Badge variant="outline">
                    {aiResults.filter(r => r.success).length}/{aiResults.length} successful
                  </Badge>
                </div>

                <div className="space-y-3">
                  {aiResults.map((result, index) => (
                    <Card
                      key={index}
                      className={`border-l-4 ${
                        result.success
                          ? 'border-l-green-500 bg-green-50'
                          : 'border-l-red-500 bg-red-50'
                      }`}
                    >
                      <CardContent className="p-4">
                        <div className="flex items-start justify-between">
                          <div className="flex-1">
                            <div className="flex items-center gap-2 mb-2">
                              {result.success ? (
                                <CheckCircle className="h-4 w-4 text-green-600" />
                              ) : (
                                <AlertCircle className="h-4 w-4 text-red-600" />
                              )}
                              <span className="font-medium">
                                {result.endpoint.objectName.replace(/^.*\//, '')}
                              </span>
                              {result.success && result.cached && (
                                <Badge variant="secondary" className="flex items-center gap-1">
                                  <Clock className="h-3 w-3" />
                                  Cached
                                </Badge>
                              )}
                              {result.success && !result.cached && (
                                <Badge variant="default" className="flex items-center gap-1">
                                  <Zap className="h-3 w-3" />
                                  Fresh AI
                                </Badge>
                              )}
                            </div>

                            {result.success ? (
                              <div className="space-y-2">
                                {result.data.documentation?.structured?.summary && (
                                  <p className="text-sm text-muted-foreground">
                                    {result.data.documentation.structured.summary}
                                  </p>
                                )}
                                {result.cached && result.data.cacheAge && (
                                  <p className="text-xs text-muted-foreground">
                                    Using cached analysis from {result.data.cacheAge} hours ago
                                  </p>
                                )}
                              </div>
                            ) : (
                              <p className="text-sm text-red-600">Error: {result.error}</p>
                            )}
                          </div>
                        </div>
                      </CardContent>
                    </Card>
                  ))}
                </div>

                <div className="flex justify-between items-center pt-4 border-t">
                  <div className="text-sm text-muted-foreground">
                    AI enhancement completed. Enhanced documentation is now cached for future use.
                  </div>
                  <div className="flex gap-2">
                    <Button
                      variant="outline"
                      onClick={() => {
                        setAiModalOpen(false);
                        // Optionally refresh the page to show enhanced data
                        window.location.reload();
                      }}
                    >
                      Refresh Page
                    </Button>
                    <Button onClick={() => setAiModalOpen(false)}>Close</Button>
                  </div>
                </div>
              </div>
            )}
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default ApiDocViewer;
