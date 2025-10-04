import { Key, Plus, Trash2, Copy, Check } from 'lucide-react';
import React, { useState, useEffect, useCallback } from 'react';

import api from '../../services/api';
import LoadingSpinner from '../common/LoadingSpinner';
import { Alert, AlertDescription } from '../ui/alert';
import { Badge } from '../ui/badge';
import { Button } from '../ui/button';
import { Card, CardContent } from '../ui/card';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '../ui/dialog';
import { Input } from '../ui/input';
import { Label } from '../ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../ui/select';

const FolderAPIKeyManager = ({ folder, open, onOpenChange }) => {
  const [apiKeys, setApiKeys] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  // Generation state
  const [showGenerateForm, setShowGenerateForm] = useState(false);
  const [generating, setGenerating] = useState(false);
  const [newKeyName, setNewKeyName] = useState('');
  const [newKeyExpiration, setNewKeyExpiration] = useState('1y');
  const [generatedKey, setGeneratedKey] = useState(null);
  const [copiedKey, setCopiedKey] = useState(false);

  // Fetch API keys
  const fetchAPIKeys = useCallback(async () => {
    try {
      setLoading(true);
      setError('');
      const response = await api.get(`/api/folders/${folder.id}/mcp/api-keys`);

      if (response.data.success) {
        setApiKeys(response.data.apiKeys || []);
      } else {
        setError(response.data.message || 'Failed to fetch API keys');
      }
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to fetch API keys');
    } finally {
      setLoading(false);
    }
  }, [folder.id]);

  useEffect(() => {
    if (open) {
      fetchAPIKeys();
    }
  }, [open, fetchAPIKeys]);

  // Generate new API key
  const handleGenerateKey = async () => {
    if (!newKeyName.trim()) {
      setError('API key name is required');
      return;
    }

    setGenerating(true);
    setError('');

    try {
      const response = await api.post(`/api/folders/${folder.id}/mcp/api-key`, {
        name: newKeyName.trim(),
        expiresIn: newKeyExpiration,
      });

      if (response.data.success) {
        setGeneratedKey(response.data);
        setNewKeyName('');
        setShowGenerateForm(false);
        await fetchAPIKeys();
      } else {
        setError(response.data.message || 'Failed to generate API key');
      }
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to generate API key');
    } finally {
      setGenerating(false);
    }
  };

  // Revoke API key
  const handleRevokeKey = async keyId => {
    // eslint-disable-next-line no-restricted-globals
    if (!confirm('Are you sure you want to revoke this API key? This action cannot be undone.')) {
      return;
    }

    try {
      setError('');
      const response = await api.delete(`/api/folders/${folder.id}/mcp/api-key/${keyId}`);

      if (response.data.success) {
        await fetchAPIKeys();
      } else {
        setError(response.data.message || 'Failed to revoke API key');
      }
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to revoke API key');
    }
  };

  // Copy API key to clipboard
  const copyToClipboard = async text => {
    try {
      await navigator.clipboard.writeText(text);
      setCopiedKey(true);
      setTimeout(() => setCopiedKey(false), 2000);
    } catch (err) {
      console.error('Failed to copy:', err);
    }
  };

  // Close generated key dialog
  const closeGeneratedKeyDialog = () => {
    setGeneratedKey(null);
    setCopiedKey(false);
  };

  return (
    <>
      <Dialog open={open} onOpenChange={onOpenChange}>
        <DialogContent className="sm:max-w-2xl max-h-[80vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Key className="h-5 w-5 text-purple-600" />
              API Keys - "{folder?.name}"
            </DialogTitle>
            <DialogDescription>
              Manage folder-scoped API keys for secure document querying
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4">
            {error && (
              <Alert variant="destructive">
                <AlertDescription>{error}</AlertDescription>
              </Alert>
            )}

            {/* Generate New Key Form */}
            {showGenerateForm ? (
              <Card className="border-purple-200 bg-purple-50">
                <CardContent className="pt-6 space-y-4">
                  <div>
                    <Label htmlFor="keyName">API Key Name</Label>
                    <Input
                      id="keyName"
                      value={newKeyName}
                      onChange={e => setNewKeyName(e.target.value)}
                      placeholder="Production Integration Key"
                      className="mt-1"
                    />
                  </div>

                  <div>
                    <Label htmlFor="expiration">Expiration</Label>
                    <Select value={newKeyExpiration} onValueChange={setNewKeyExpiration}>
                      <SelectTrigger className="mt-1">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="1w">1 Week</SelectItem>
                        <SelectItem value="1m">1 Month</SelectItem>
                        <SelectItem value="6m">6 Months</SelectItem>
                        <SelectItem value="1y">1 Year (Recommended)</SelectItem>
                        <SelectItem value="never">Never</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>

                  <div className="flex justify-end space-x-2">
                    <Button variant="outline" onClick={() => setShowGenerateForm(false)}>
                      Cancel
                    </Button>
                    <Button
                      onClick={handleGenerateKey}
                      disabled={generating}
                      className="bg-purple-600 hover:bg-purple-700"
                    >
                      {generating ? (
                        <>
                          <LoadingSpinner size="sm" className="mr-2" />
                          Generating...
                        </>
                      ) : (
                        'Generate Key'
                      )}
                    </Button>
                  </div>
                </CardContent>
              </Card>
            ) : (
              <Button
                onClick={() => setShowGenerateForm(true)}
                className="w-full bg-purple-600 hover:bg-purple-700"
              >
                <Plus className="mr-2 h-4 w-4" />
                Generate New API Key
              </Button>
            )}

            {/* API Keys List */}
            {loading ? (
              <div className="flex justify-center py-8">
                <LoadingSpinner />
              </div>
            ) : apiKeys.length > 0 ? (
              <div className="space-y-3">
                <h4 className="text-sm font-medium">Existing API Keys</h4>
                {apiKeys.map(key => (
                  <Card key={key.id}>
                    <CardContent className="pt-4">
                      <div className="flex items-start justify-between">
                        <div className="flex-1 space-y-1">
                          <div className="flex items-center gap-2">
                            <p className="font-medium">{key.name}</p>
                            <Badge variant={key.isActive ? 'success' : 'secondary'}>
                              {key.isActive ? 'Active' : 'Inactive'}
                            </Badge>
                          </div>

                          <div className="text-sm text-muted-foreground space-y-1">
                            <p className="font-mono text-xs">{key.keyPrefix}</p>
                            <p>Created: {new Date(key.createdAt).toLocaleDateString()}</p>
                            {key.lastUsedAt && (
                              <p>Last used: {new Date(key.lastUsedAt).toLocaleString()}</p>
                            )}
                            {key.expiresAt && (
                              <p>
                                Expires: {new Date(key.expiresAt).toLocaleDateString()}
                                {new Date(key.expiresAt) < new Date() && (
                                  <Badge variant="destructive" className="ml-2">
                                    Expired
                                  </Badge>
                                )}
                              </p>
                            )}
                          </div>

                          {key.createdBy && (
                            <p className="text-xs text-muted-foreground">
                              Created by {key.createdBy.firstName} {key.createdBy.lastName}
                            </p>
                          )}
                        </div>

                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => handleRevokeKey(key.id)}
                          disabled={!key.isActive}
                          className="text-destructive hover:text-destructive"
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            ) : (
              <Alert>
                <AlertDescription>
                  No API keys yet. Generate your first key to enable external access to this folder.
                </AlertDescription>
              </Alert>
            )}

            <div className="flex justify-end pt-4">
              <Button variant="outline" onClick={() => onOpenChange(false)}>
                Close
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* Generated Key Display Dialog */}
      <Dialog open={!!generatedKey} onOpenChange={closeGeneratedKeyDialog}>
        <DialogContent className="sm:max-w-2xl">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-amber-600">
              <Key className="h-5 w-5" />
              Important: Save Your API Key
            </DialogTitle>
            <DialogDescription>
              This key will only be shown once. Store it securely - you won't be able to see it
              again.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4">
            {/* API Key Display */}
            <div className="bg-amber-50 border border-amber-200 rounded-lg p-4">
              <Label className="text-sm font-medium mb-2 block">Your API Key</Label>
              <div className="flex gap-2">
                <Input
                  value={generatedKey?.key || ''}
                  readOnly
                  className="font-mono text-sm bg-white"
                />
                <Button
                  onClick={() => copyToClipboard(generatedKey?.key)}
                  variant="outline"
                  size="icon"
                >
                  {copiedKey ? (
                    <Check className="h-4 w-4 text-green-600" />
                  ) : (
                    <Copy className="h-4 w-4" />
                  )}
                </Button>
              </div>
            </div>

            {/* Usage Example */}
            <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
              <Label className="text-sm font-medium mb-2 block">Usage Example</Label>
              <pre className="text-xs bg-blue-100 p-3 rounded overflow-x-auto">
                {`curl -X POST ${window.location.origin}/api/public/folders/${folder.id}/query \\
  -H "Authorization: Bearer ${generatedKey?.key}" \\
  -H "Content-Type: application/json" \\
  -d '{
    "question": "What are the main topics in these documents?",
    "options": {
      "topK": 5
    }
  }'`}
              </pre>
            </div>

            {/* Warning */}
            <Alert>
              <AlertDescription>
                <strong>Security Note:</strong> Store this key in a secure location like a password
                manager or environment variables. Never commit it to version control.
              </AlertDescription>
            </Alert>

            <div className="flex justify-end">
              <Button
                onClick={closeGeneratedKeyDialog}
                className="bg-purple-600 hover:bg-purple-700"
              >
                I've Saved the Key
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
};

export default FolderAPIKeyManager;
