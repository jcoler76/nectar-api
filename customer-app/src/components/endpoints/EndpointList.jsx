import { AlertCircle, Copy, Plus, RefreshCw, Terminal, Trash2 } from 'lucide-react';
import { useEffect, useState } from 'react';

import { useNotification } from '../../context/NotificationContext';
import {
  createEndpoint,
  deleteEndpoint,
  getEndpoints,
  regenerateEndpointKey,
} from '../../services/endpointService';
import ConfirmDialog from '../common/ConfirmDialog';
import LoadingSpinner from '../common/LoadingSpinner';
import { Button } from '../ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '../ui/card';
import { DataTable } from '../ui/data-table';
import { Input } from '../ui/input';
import { Label } from '../ui/label';
import { Switch } from '../ui/switch';

const EndpointList = () => {
  const [endpoints, setEndpoints] = useState([]);
  const [newEndpointName, setNewEndpointName] = useState('');
  const [customApiKey, setCustomApiKey] = useState('');
  const [useCustomApiKey, setUseCustomApiKey] = useState(false);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [confirmDelete, setConfirmDelete] = useState({ open: false, endpointId: null });
  const [confirmRegenerate, setConfirmRegenerate] = useState({ open: false, endpointId: null });
  const { showNotification } = useNotification();

  const fetchEndpoints = async () => {
    try {
      setLoading(true);
      setError(''); // Clear any previous errors
      const fetchedEndpoints = await getEndpoints();
      // Ensure we always have an array
      if (Array.isArray(fetchedEndpoints)) {
        setEndpoints(fetchedEndpoints);
      } else {
        console.error('Expected array but received:', fetchedEndpoints);
        setEndpoints([]);
        setError('Invalid data format received from server.');
      }
    } catch (err) {
      // Handle different types of errors
      if (err.includes('Admin access required')) {
        setError('You need administrator privileges to view endpoints.');
      } else {
        setError('Failed to fetch endpoints. Please try again later.');
      }
      setEndpoints([]); // Reset to empty array on error
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchEndpoints();
  }, []);

  const handleCreateEndpoint = async e => {
    e.preventDefault();
    if (!newEndpointName.trim()) {
      showNotification('Endpoint name cannot be empty.', 'warning');
      return;
    }
    try {
      const endpointData = { name: newEndpointName.trim() };
      if (useCustomApiKey && customApiKey.trim()) {
        endpointData.apiKey = customApiKey.trim();
      }
      await createEndpoint(endpointData);
      setNewEndpointName('');
      setCustomApiKey('');
      setUseCustomApiKey(false);
      fetchEndpoints();
      showNotification('Endpoint created successfully.', 'success');
    } catch (err) {
      showNotification(err.toString(), 'error');
    }
  };

  const handleRegenerateKey = async endpointId => {
    try {
      const updatedEndpoint = await regenerateEndpointKey(endpointId);
      setEndpoints(prevEndpoints =>
        prevEndpoints.map(ep => (ep._id === endpointId ? updatedEndpoint : ep))
      );
      showNotification('API Key regenerated successfully.', 'success');
    } catch (err) {
      showNotification(err.toString(), 'error');
    }
    setConfirmRegenerate({ open: false, endpointId: null });
  };

  const handleDeleteEndpoint = async endpointId => {
    try {
      await deleteEndpoint(endpointId);
      fetchEndpoints();
      showNotification('Endpoint deleted successfully.', 'success');
    } catch (err) {
      showNotification(err.toString(), 'error');
    }
    setConfirmDelete({ open: false, endpointId: null });
  };

  const copyToClipboard = text => {
    if (!text) {
      console.error('No text to copy');
      showNotification('No API key to copy.', 'error');
      return;
    }

    navigator.clipboard.writeText(text).then(
      () => {
        showNotification('API Key copied to clipboard!', 'success');
      },
      err => {
        console.error('Could not copy text: ', err);
        showNotification('Failed to copy API key.', 'error');
      }
    );
  };

  // Define columns for the modern data table
  const columns = [
    {
      accessorKey: 'name',
      header: 'Name',
      sortable: true,
      width: '25%',
      cell: ({ row }) => <div className="font-medium">{row.name}</div>,
    },
    {
      accessorKey: 'apiKey',
      header: 'API Key',
      width: '40%',
      cell: ({ row, value }) => (
        <div className="flex items-center gap-2">
          <code className="font-mono text-xs bg-muted px-2 py-1 rounded max-w-[200px] truncate">
            {value || row.apiKey}
          </code>
          <Button
            variant="ghost"
            size="icon"
            className="h-6 w-6"
            onClick={() => copyToClipboard(value || row.apiKey)}
            aria-label="Copy API key"
          >
            <Copy className="h-3 w-3" />
          </Button>
        </div>
      ),
    },
    {
      accessorKey: 'createdAt',
      header: 'Created At',
      width: '20%',
      cell: ({ value }) => (
        <span className="text-sm text-muted-foreground">{new Date(value).toLocaleString()}</span>
      ),
    },
    {
      accessorKey: 'actions',
      header: 'Actions',
      type: 'actions',
      width: '15%',
      actions: [
        {
          label: 'Regenerate API Key',
          icon: RefreshCw,
          onClick: endpoint => setConfirmRegenerate({ open: true, endpointId: endpoint._id }),
        },
        {
          label: 'Delete Endpoint',
          icon: Trash2,
          onClick: endpoint => setConfirmDelete({ open: true, endpointId: endpoint._id }),
          destructive: true,
          separator: true,
        },
      ],
    },
  ];

  if (loading) return <LoadingSpinner />;

  return (
    <div className="flex flex-col h-full p-4 sm:p-6 space-y-4 sm:space-y-6">
      {/* Error Messages */}
      {error && (
        <Card className="border-destructive/50 bg-destructive/10">
          <CardContent className="flex items-center gap-2 p-4">
            <AlertCircle className="h-4 w-4 text-destructive" />
            <span className="text-destructive font-medium">{error}</span>
          </CardContent>
        </Card>
      )}

      {/* Header */}
      <div className="text-center sm:text-left">
        <h1 className="text-2xl sm:text-3xl font-bold tracking-tight text-ocean-800">
          Developer Endpoints
        </h1>
        <p className="text-muted-foreground text-sm sm:text-base">
          Create and manage API endpoints for development access
        </p>
      </div>

      {/* Create New Endpoint Form */}
      <Card>
        <CardHeader>
          <CardTitle className="text-ocean-800">Create New Endpoint</CardTitle>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleCreateEndpoint} className="space-y-4">
            <div className="flex flex-col sm:flex-row gap-4">
              <div className="flex-1">
                <Label htmlFor="endpoint-name" className="sr-only">
                  Endpoint Name
                </Label>
                <Input
                  id="endpoint-name"
                  placeholder="Endpoint Name (e.g., api_GetContacts)"
                  value={newEndpointName}
                  onChange={e => setNewEndpointName(e.target.value)}
                  className="w-full"
                />
              </div>
              <Button
                type="submit"
                className="sm:w-auto bg-ocean-500 text-white hover:bg-ocean-600 border-ocean-500"
              >
                <Plus className="mr-2 h-4 w-4" />
                Create
              </Button>
            </div>

            <div className="space-y-3">
              <div className="flex items-center space-x-2">
                <Switch
                  id="use-custom-key"
                  checked={useCustomApiKey}
                  onCheckedChange={checked => {
                    setUseCustomApiKey(checked);
                    if (!checked) {
                      setCustomApiKey('');
                    }
                  }}
                />
                <Label htmlFor="use-custom-key" className="cursor-pointer text-sm">
                  Specify custom API key
                </Label>
              </div>

              {useCustomApiKey && (
                <div>
                  <Label htmlFor="custom-api-key" className="sr-only">
                    Custom API Key
                  </Label>
                  <Input
                    id="custom-api-key"
                    placeholder="Enter custom API key (e.g., your-custom-key-here)"
                    value={customApiKey}
                    onChange={e => setCustomApiKey(e.target.value)}
                    className="w-full"
                  />
                  <p className="text-xs text-muted-foreground mt-1">
                    Use only alphanumeric characters, underscores, and hyphens
                  </p>
                </div>
              )}
            </div>
          </form>
        </CardContent>
      </Card>

      {/* Endpoints Table or Empty State */}
      {endpoints.length === 0 && !loading ? (
        <Card className="border-info/50 bg-info/10">
          <CardContent className="flex flex-col items-center gap-4 p-8 text-center">
            <Terminal className="h-12 w-12 text-info" />
            <div>
              <h3 className="text-lg font-semibold text-info">No Endpoints Found</h3>
              <p className="text-muted-foreground mt-1">
                No endpoints found. Create your first endpoint above.
              </p>
            </div>
          </CardContent>
        </Card>
      ) : (
        <>
          {/* Mobile Card List */}
          <div className="sm:hidden space-y-3">
            {endpoints.map(ep => (
              <Card key={ep._id}>
                <CardContent className="p-4 space-y-3">
                  <div className="flex items-center justify-between gap-3">
                    <div>
                      <div className="font-semibold text-base">{ep.name}</div>
                      {ep.createdAt && (
                        <div className="text-xs text-muted-foreground">
                          Created: {new Date(ep.createdAt).toLocaleString()}
                        </div>
                      )}
                    </div>
                  </div>

                  <div className="flex items-center justify-between gap-3">
                    <code className="font-mono text-xs bg-muted px-2 py-1 rounded max-w-[180px] truncate">
                      {ep.apiKey}
                    </code>
                    <div className="flex items-center gap-2">
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => copyToClipboard(ep.apiKey)}
                        aria-label="Copy API key"
                      >
                        <Copy className="h-3 w-3" />
                      </Button>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => setConfirmRegenerate({ open: true, endpointId: ep._id })}
                        aria-label="Regenerate API key"
                      >
                        <RefreshCw className="h-3 w-3" />
                      </Button>
                      <Button
                        variant="destructive"
                        size="sm"
                        onClick={() => setConfirmDelete({ open: true, endpointId: ep._id })}
                        aria-label="Delete Endpoint"
                      >
                        <Trash2 className="h-3 w-3" />
                      </Button>
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>

          {/* Table for >= sm screens */}
          <div className="hidden sm:block">
            <DataTable
              data={endpoints}
              columns={columns}
              searchable={true}
              filterable={false}
              exportable={false}
              loading={loading}
            />
          </div>
        </>
      )}

      <ConfirmDialog
        open={confirmDelete.open}
        title="Delete Endpoint"
        message="Are you sure you want to delete this endpoint and its API key? This action cannot be undone."
        onConfirm={() => handleDeleteEndpoint(confirmDelete.endpointId)}
        onCancel={() => setConfirmDelete({ open: false, endpointId: null })}
      />

      <ConfirmDialog
        open={confirmRegenerate.open}
        title="Regenerate API Key"
        message="Are you sure you want to generate a new API key? The old key will stop working immediately."
        onConfirm={() => handleRegenerateKey(confirmRegenerate.endpointId)}
        onCancel={() => setConfirmRegenerate({ open: false, endpointId: null })}
      />
    </div>
  );
};

export default EndpointList;
