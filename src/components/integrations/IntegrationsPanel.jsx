/**
 * Integrations Panel Component
 * Manages external service connections for API integrations
 */

import {
  CheckCircle,
  ExternalLink,
  Github,
  Globe,
  Key,
  Plus,
  Settings,
  Unlink,
} from 'lucide-react';
import React, { useEffect, useState } from 'react';

import { Alert, AlertDescription } from '../ui/alert';
import { Badge } from '../ui/badge';
import { Button } from '../ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '../ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '../ui/tabs';

// Provider icons
const GoogleIcon = () => (
  <svg viewBox="0 0 24 24" className="w-5 h-5" fill="currentColor">
    <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" />
    <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" />
    <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" />
    <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" />
  </svg>
);

const FacebookIcon = () => (
  <svg viewBox="0 0 24 24" className="w-5 h-5" fill="currentColor">
    <path d="M24 12.073c0-6.627-5.373-12-12-12s-12 5.373-12 12c0 5.99 4.388 10.954 10.125 11.854v-8.385H7.078v-3.47h3.047V9.43c0-3.007 1.792-4.669 4.533-4.669 1.312 0 2.686.235 2.686.235v2.953H15.83c-1.491 0-1.956.925-1.956 1.874v2.25h3.328l-.532 3.47h-2.796v8.385C19.612 23.027 24 18.062 24 12.073z" />
  </svg>
);

const AVAILABLE_INTEGRATIONS = [
  {
    id: 'google',
    name: 'Google',
    icon: GoogleIcon,
    description: 'Access Google Sheets, Drive, Gmail, and other Google services',
    scopes: ['sheets', 'drive', 'gmail'],
    category: 'productivity',
    color: 'text-red-600',
  },
  {
    id: 'github',
    name: 'GitHub',
    icon: Github,
    description: 'Access repositories, issues, and GitHub API',
    scopes: ['repo', 'user', 'workflow'],
    category: 'development',
    color: 'text-gray-800',
  },
  {
    id: 'facebook',
    name: 'Facebook',
    icon: FacebookIcon,
    description: 'Access Facebook pages, posts, and marketing APIs',
    scopes: ['pages', 'ads', 'insights'],
    category: 'marketing',
    color: 'text-blue-600',
  },
];

const IntegrationsPanel = () => {
  const [connectedAccounts, setConnectedAccounts] = useState([]);
  const [availableProviders, setAvailableProviders] = useState([]);
  const [loading, setLoading] = useState(true);
  const [connecting, setConnecting] = useState(null);

  useEffect(() => {
    fetchIntegrations();
  }, []);

  const fetchIntegrations = async () => {
    try {
      setLoading(true);

      // Fetch available providers
      const providersResponse = await fetch('/api/auth/oauth/providers');
      if (providersResponse.ok) {
        const providersData = await providersResponse.json();
        setAvailableProviders(providersData.providers || []);
      }

      // Fetch connected accounts
      const accountsResponse = await fetch('/api/auth/oauth/linked', {
        headers: {
          Authorization: `Bearer ${localStorage.getItem('authToken')}`,
        },
      });

      if (accountsResponse.ok) {
        const accountsData = await accountsResponse.json();
        setConnectedAccounts(accountsData.linkedAccounts || []);
      }
    } catch (error) {
      console.error('Error fetching integrations:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleConnect = integrationId => {
    setConnecting(integrationId);

    // Open OAuth flow in popup window
    const width = 600;
    const height = 700;
    const left = window.screenX + (window.outerWidth - width) / 2;
    const top = window.screenY + (window.outerHeight - height) / 2.5;

    const popup = window.open(
      `/api/auth/oauth/${integrationId}?integration=true`,
      'oauth',
      `width=${width},height=${height},left=${left},top=${top},scrollbars=yes,resizable=yes`
    );

    // Listen for popup completion
    const checkClosed = setInterval(() => {
      if (popup.closed) {
        clearInterval(checkClosed);
        setConnecting(null);
        // Refresh the connected accounts
        setTimeout(fetchIntegrations, 1000);
      }
    }, 1000);
  };

  const handleDisconnect = async integrationId => {
    try {
      const response = await fetch(`/api/auth/oauth/unlink/${integrationId}`, {
        method: 'DELETE',
        headers: {
          Authorization: `Bearer ${localStorage.getItem('authToken')}`,
        },
      });

      if (response.ok) {
        // Refresh the list
        fetchIntegrations();
      }
    } catch (error) {
      console.error('Error disconnecting integration:', error);
    }
  };

  const isConnected = integrationId => {
    return connectedAccounts.some(account => account.provider === integrationId);
  };

  const getConnectedAccount = integrationId => {
    return connectedAccounts.find(account => account.provider === integrationId);
  };

  const renderIntegrationCard = integration => {
    const connected = isConnected(integration.id);
    const account = getConnectedAccount(integration.id);
    const isConnectingThis = connecting === integration.id;
    const Icon = integration.icon;

    return (
      <Card key={integration.id} className="relative">
        <CardHeader className="pb-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className={`p-2 rounded-lg bg-gray-50 ${integration.color}`}>
                <Icon />
              </div>
              <div>
                <CardTitle className="text-lg">{integration.name}</CardTitle>
                <Badge variant="outline" className="text-xs">
                  {integration.category}
                </Badge>
              </div>
            </div>
            {connected && (
              <Badge variant="default" className="bg-green-100 text-green-800">
                <CheckCircle className="w-3 h-3 mr-1" />
                Connected
              </Badge>
            )}
          </div>
        </CardHeader>

        <CardContent className="space-y-4">
          <p className="text-sm text-muted-foreground">{integration.description}</p>

          {connected && account && (
            <div className="bg-green-50 p-3 rounded-lg border border-green-200">
              <div className="flex items-center gap-2 text-sm">
                <CheckCircle className="w-4 h-4 text-green-600" />
                <span className="font-medium">Connected as: {account.name || account.email}</span>
              </div>
              <p className="text-xs text-green-600 mt-1">
                Connected {new Date(account.createdAt).toLocaleDateString()}
              </p>
            </div>
          )}

          <div className="space-y-2">
            <p className="text-xs font-medium text-muted-foreground">Available Scopes:</p>
            <div className="flex flex-wrap gap-1">
              {integration.scopes.map(scope => (
                <Badge key={scope} variant="secondary" className="text-xs">
                  {scope}
                </Badge>
              ))}
            </div>
          </div>

          <div className="flex gap-2 pt-2">
            {!connected ? (
              <Button
                onClick={() => handleConnect(integration.id)}
                disabled={isConnectingThis || availableProviders.length === 0}
                className="flex-1"
              >
                {isConnectingThis ? (
                  <>
                    <div className="w-4 h-4 border-2 border-current border-t-transparent rounded-full animate-spin mr-2" />
                    Connecting...
                  </>
                ) : (
                  <>
                    <Plus className="w-4 h-4 mr-2" />
                    Connect
                  </>
                )}
              </Button>
            ) : (
              <>
                <Button variant="outline" size="sm" className="flex-1">
                  <Settings className="w-4 h-4 mr-2" />
                  Settings
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => handleDisconnect(integration.id)}
                  className="text-red-600 hover:text-red-700"
                >
                  <Unlink className="w-4 h-4" />
                </Button>
              </>
            )}
          </div>
        </CardContent>
      </Card>
    );
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-8">
        <div className="animate-spin h-6 w-6 border-2 border-primary border-t-transparent rounded-full" />
        <span className="ml-2">Loading integrations...</span>
      </div>
    );
  }

  const connectedIntegrations = AVAILABLE_INTEGRATIONS.filter(integration =>
    isConnected(integration.id)
  );
  const availableIntegrations = AVAILABLE_INTEGRATIONS.filter(
    integration => !isConnected(integration.id)
  );

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="space-y-2">
        <h2 className="text-2xl font-bold">Integrations</h2>
        <p className="text-muted-foreground">
          Connect external services to use in your workflows and automations
        </p>
      </div>

      {availableProviders.length === 0 && (
        <Alert>
          <Key className="h-4 w-4" />
          <AlertDescription>
            OAuth providers are not configured on this server. Contact your administrator to enable
            integrations.
          </AlertDescription>
        </Alert>
      )}

      <Tabs defaultValue="available" className="space-y-4">
        <TabsList>
          <TabsTrigger value="available">Available ({availableIntegrations.length})</TabsTrigger>
          <TabsTrigger value="connected">Connected ({connectedIntegrations.length})</TabsTrigger>
        </TabsList>

        <TabsContent value="available" className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {availableIntegrations.map(renderIntegrationCard)}
          </div>
        </TabsContent>

        <TabsContent value="connected" className="space-y-4">
          {connectedIntegrations.length === 0 ? (
            <Card>
              <CardContent className="py-12 text-center">
                <Globe className="h-12 w-12 mx-auto mb-4 text-muted-foreground" />
                <h3 className="text-lg font-semibold mb-2">No Connections Yet</h3>
                <p className="text-muted-foreground mb-4">
                  Connect external services to use them in your workflows
                </p>
                <Button variant="outline">
                  <ExternalLink className="w-4 h-4 mr-2" />
                  Browse Available Integrations
                </Button>
              </CardContent>
            </Card>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {connectedIntegrations.map(renderIntegrationCard)}
            </div>
          )}
        </TabsContent>
      </Tabs>
    </div>
  );
};

export default IntegrationsPanel;
