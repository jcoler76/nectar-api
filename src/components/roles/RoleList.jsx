import Tooltip from '@mui/material/Tooltip';
import { Edit, HelpCircle, Info, Trash2 } from 'lucide-react';
import { useCallback, useEffect, useMemo, useState } from 'react';

import { useAuth } from '../../hooks/useAuth';
import { useConfirmDialog } from '../../hooks/useConfirmDialog';
import { useRoles } from '../../hooks/useRoles';
import api from '../../services/api';
import { BaseListView } from '../common/BaseListView';
import ConfirmDialog from '../common/ConfirmDialog';
import SecureIframe from '../common/SecureIframe';
import { Badge } from '../ui/badge';
import { Button } from '../ui/button';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '../ui/dialog';
import { Switch } from '../ui/switch';

// SECURITY: Enhanced API URL validation with additional security checks
const getApiUrl = () => {
  const envUrl = process.env.REACT_APP_API_URL;

  if (!envUrl || envUrl.trim() === '') {
    return 'http://localhost:3001';
  }

  try {
    const url = new URL(envUrl.trim());

    // SECURITY: Block dangerous protocols
    if (!['http:', 'https:'].includes(url.protocol)) {
      console.warn('Invalid protocol in REACT_APP_API_URL, falling back to localhost:', envUrl);
      return 'http://localhost:3001';
    }

    // SECURITY: In production, require HTTPS
    if (process.env.NODE_ENV === 'production' && url.protocol !== 'https:') {
      console.warn('HTTPS required in production, falling back to secure localhost:', envUrl);
      return 'https://localhost:3001';
    }

    // SECURITY: Block suspicious hostnames
    const suspiciousPatterns = [/javascript:/i, /data:/i, /vbscript:/i, /<script/i];

    for (const pattern of suspiciousPatterns) {
      if (pattern.test(url.href)) {
        console.warn('Suspicious URL pattern detected, falling back to localhost:', envUrl);
        return 'http://localhost:3001';
      }
    }

    return url.href.replace(/\/$/, ''); // Remove trailing slash
  } catch (error) {
    console.warn('Invalid REACT_APP_API_URL, falling back to localhost:', envUrl);
    return 'http://localhost:3001';
  }
};

const RoleList = () => {
  useAuth();
  const {
    roles,
    loading,
    error,
    operationInProgress,
    fetchRoles,
    handleDelete,
    handleToggleActive,
    handleToggleMCP,
    handleEdit,
    handleAdd,
    prepareExportData,
  } = useRoles();

  const { confirmState, openConfirm, closeConfirm, handleConfirm } = useConfirmDialog();

  // Subscription plan state for MCP feature gating
  const [subscriptionPlan, setSubscriptionPlan] = useState(null);

  // Swagger dialog state
  const [swaggerDialog, setSwaggerDialog] = useState({
    open: false,
    selectedRole: null,
  });

  // MCP Endpoint dialog state
  const [mcpEndpointDialog, setMcpEndpointDialog] = useState({
    open: false,
    endpoint: '',
    roleName: '',
    roleId: '',
  });

  const openSwaggerDialog = useCallback(role => {
    setSwaggerDialog({
      open: true,
      selectedRole: role,
    });
  }, []);

  const openMcpEndpointDialog = useCallback(role => {
    const apiUrl = getApiUrl();
    const baseEndpoint = `${apiUrl}/api/mcp`;

    setMcpEndpointDialog({
      open: true,
      endpoint: baseEndpoint,
      roleName: role.name,
      roleId: role.id,
    });
  }, []);

  const copyEndpointToClipboard = useCallback(async () => {
    try {
      await navigator.clipboard.writeText(mcpEndpointDialog.endpoint);
      alert('Endpoint copied to clipboard!');
    } catch (err) {
      console.error('Failed to copy:', err);
    }
  }, [mcpEndpointDialog.endpoint]);

  // Documentation viewer state
  const [docViewer, setDocViewer] = useState({
    open: false,
    url: '',
    title: '',
  });

  const handleOpenSwaggerForRole = async () => {
    if (!swaggerDialog.selectedRole?.id) return;

    // SECURITY: Validate role ID format (should be UUID)
    const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
    if (!uuidRegex.test(swaggerDialog.selectedRole.id)) {
      console.error('Invalid role ID format, blocking iframe load');
      return;
    }

    // SECURITY: Sanitize role name for display
    const sanitizedRoleName =
      swaggerDialog.selectedRole.name?.replace(/[<>"']/g, '') || 'Unknown Role';

    const apiUrl = getApiUrl();

    // Fetch short-lived access token for iframe
    try {
      const tokenResponse = await api.get(
        `/api/documentation/openapi/${swaggerDialog.selectedRole.id}/token`
      );
      const accessToken = tokenResponse.data.token;

      const url = `${apiUrl}/api/swagger-ui/openapi/${encodeURIComponent(swaggerDialog.selectedRole.id)}/ui?token=${encodeURIComponent(accessToken)}`;

      setDocViewer({
        open: true,
        url,
        title: `Swagger Documentation - ${sanitizedRoleName}`,
      });
      setSwaggerDialog(prev => ({ ...prev, open: false }));
    } catch (error) {
      console.error('Failed to get access token for Swagger UI', error);
      alert('Failed to load Swagger documentation. Please try again.');
    }
  };

  const handleOpenBlueprintsDoc = () => {
    const apiUrl = getApiUrl();
    setDocViewer({
      open: true,
      url: `${apiUrl}/api/swagger-ui/blueprints/ui`,
      title: 'Blueprints Documentation',
    });
    setSwaggerDialog(prev => ({ ...prev, open: false }));
  };

  useEffect(() => {
    const abortController = new AbortController();
    fetchRoles();
    return () => abortController.abort();
  }, [fetchRoles]);

  // Fetch subscription plan for MCP feature gating
  useEffect(() => {
    const fetchSubscriptionPlan = async () => {
      try {
        const response = await api.get('/api/billing/subscription');
        const data = response.data;

        // Check different possible response structures
        if (data.subscription && data.subscription.plan) {
          setSubscriptionPlan(data.subscription.plan);
        } else if (data.plan) {
          setSubscriptionPlan(data.plan);
        } else {
          // Default to FREE if no subscription found
          setSubscriptionPlan('FREE');
        }
      } catch (err) {
        console.error('Error fetching subscription plan:', err);
        // Default to FREE on error (safest default)
        setSubscriptionPlan('FREE');
      }
    };

    fetchSubscriptionPlan();
  }, []);

  // Check if MCP is available on current subscription tier
  // MCP is available on: TEAM, BUSINESS, ENTERPRISE, CUSTOM
  // MCP is NOT available on: FREE, STARTER
  const isMCPAvailable = useMemo(() => {
    if (!subscriptionPlan) return false;
    const mcpEnabledTiers = ['TEAM', 'BUSINESS', 'ENTERPRISE', 'CUSTOM'];
    return mcpEnabledTiers.includes(subscriptionPlan);
  }, [subscriptionPlan]);

  // Define columns for the modern data table - memoized to prevent re-creation
  const columns = useMemo(
    () => [
      {
        accessorKey: 'name',
        header: (
          <div className="flex items-center gap-1">
            Name
            <Tooltip title="Unique role identifier used throughout the system. Role names should be descriptive and follow your organization's naming conventions.">
              <HelpCircle className="h-3 w-3 text-gray-500 cursor-help" />
            </Tooltip>
          </div>
        ),
        sortable: true,
        width: '25%',
        cell: ({ row }) => (
          <Tooltip title={`Role name: ${row.name}`}>
            <div className="font-medium cursor-help">{row.name}</div>
          </Tooltip>
        ),
      },
      {
        accessorKey: 'description',
        header: (
          <div className="flex items-center gap-1">
            Description
            <Tooltip title="Detailed explanation of the role's purpose, responsibilities, and permissions. This helps administrators understand what access this role provides.">
              <HelpCircle className="h-3 w-3 text-gray-500 cursor-help" />
            </Tooltip>
          </div>
        ),
        width: '40%',
        cell: ({ row }) => (
          <Tooltip
            title={
              row.description ||
              "No description provided - consider adding one to document the role's purpose and permissions"
            }
          >
            <div
              className={`text-muted-foreground cursor-help truncate ${!row.description ? 'italic text-gray-400' : ''}`}
            >
              {row.description || 'No description'}
            </div>
          </Tooltip>
        ),
      },
      {
        accessorKey: 'isActive',
        header: (
          <div className="flex items-center gap-1">
            Status
            <Tooltip title="Toggle role availability - Active roles can be assigned to users, Inactive roles are disabled but preserved for future use">
              <HelpCircle className="h-3 w-3 text-gray-500 cursor-help" />
            </Tooltip>
          </div>
        ),
        type: 'switch',
        width: '15%',
        cell: ({ row, value }) => (
          <Tooltip
            title={
              value
                ? 'Role is active and can be assigned to users'
                : 'Role is inactive and cannot be assigned to new users'
            }
          >
            <div className="flex items-center gap-2">
              <Switch
                checked={value || false}
                onCheckedChange={() => {
                  // Prevent multiple rapid clicks
                  if (operationInProgress[`toggle-${row.id}`]) {
                    return;
                  }
                  handleToggleActive(row);
                }}
                aria-label={`Toggle status for ${row.name}`}
                className="data-[state=checked]:bg-ocean-500 data-[state=unchecked]:bg-gray-200"
              />
              <Badge variant={value ? 'active' : 'inactive'} className="text-xs">
                {value ? 'Active' : 'Inactive'}
              </Badge>
            </div>
          </Tooltip>
        ),
      },
      {
        accessorKey: 'mcpEnabled',
        header: (
          <div className="flex items-center gap-1">
            MCP Server
            <Tooltip title="Enable this role as an MCP server - Autonomous agents can use role permissions as tools to explore, design, and implement APIs automatically">
              <HelpCircle className="h-3 w-3 text-gray-500 cursor-help" />
            </Tooltip>
          </div>
        ),
        type: 'switch',
        width: '15%',
        cell: ({ row, value }) => {
          const isDisabled = !isMCPAvailable;
          const tooltipTitle = isDisabled
            ? 'MCP Server is available on Team tier and higher. Upgrade your plan to enable this feature.'
            : value
              ? "MCP Server enabled - Agents can use this role's permissions as tools"
              : 'Enable as MCP Server to allow autonomous agents to use this role';

          return (
            <Tooltip title={tooltipTitle}>
              <div className="flex items-center gap-2">
                <Switch
                  checked={value || false}
                  disabled={isDisabled}
                  onCheckedChange={() => {
                    // Prevent multiple rapid clicks
                    if (operationInProgress[`toggle-mcp-${row.id}`]) {
                      return;
                    }
                    if (!isDisabled) {
                      handleToggleMCP(row);
                    }
                  }}
                  aria-label={`Toggle MCP for ${row.name}`}
                  className={`data-[state=checked]:bg-ocean-500 data-[state=unchecked]:bg-gray-200 ${isDisabled ? 'opacity-50 cursor-not-allowed' : ''}`}
                />
                <Badge
                  variant={value ? 'active' : 'inactive'}
                  className={`text-xs ${isDisabled ? 'opacity-50' : ''}`}
                >
                  {value ? 'Enabled' : 'Disabled'}
                </Badge>
              </div>
            </Tooltip>
          );
        },
      },
      {
        accessorKey: 'actions',
        header: 'Actions',
        type: 'actions',
        width: '15%',
        actions: [
          {
            label: 'Edit Role',
            icon: Edit,
            tooltip: 'Modify role name, description, and permission settings',
            onClick: handleEdit,
          },
          {
            label: 'Swagger',
            icon: Info,
            tooltip: 'Open Swagger UI documentation for this role or view Blueprints documentation',
            onClick: role => openSwaggerDialog(role),
          },
          {
            label: 'MCP Endpoint',
            icon: Info,
            tooltip: isMCPAvailable
              ? 'Get the MCP server endpoint URL for autonomous agents'
              : 'MCP Server is available on Team tier and higher',
            onClick: role => openMcpEndpointDialog(role),
            hidden: row => !row.mcpEnabled || !isMCPAvailable,
          },
          {
            label: 'Delete Role',
            icon: Trash2,
            tooltip:
              'Permanently remove this role - users with this role will lose associated permissions',
            onClick: role => {
              // Prevent multiple rapid clicks
              if (operationInProgress[`delete-${role.id}`]) {
                return;
              }
              openConfirm(role.id, {
                title: 'Delete Role',
                message: 'Are you sure you want to delete this role? This action cannot be undone.',
              });
            },
            destructive: true,
            separator: true,
          },
        ],
      },
    ],
    [
      handleToggleActive,
      handleToggleMCP,
      handleEdit,
      openConfirm,
      openSwaggerDialog,
      openMcpEndpointDialog,
      operationInProgress,
      isMCPAvailable,
    ]
  );

  return (
    <>
      <BaseListView
        title="Roles"
        description="Manage user roles and permissions"
        data={roles.sort((a, b) => a.name.localeCompare(b.name))}
        columns={columns}
        loading={loading}
        error={error}
        onAdd={handleAdd}
        prepareExportData={prepareExportData}
        exportFilename="roles-list.csv"
        searchable={true}
        filterable={true}
        enableVirtualization={true}
        customActions={[
          {
            label: 'Role Info',
            icon: Info,
            variant: 'ghost',
            onClick: () => {},
            tooltip:
              'Roles define sets of permissions that can be assigned to users. Use roles to control access to different parts of the system and manage user capabilities efficiently.',
            mobileHidden: true,
          },
        ]}
      ></BaseListView>

      {/* Swagger Role Documentation Dialog */}
      <Dialog
        open={swaggerDialog.open}
        onOpenChange={open => setSwaggerDialog(prev => ({ ...prev, open }))}
      >
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Role Documentation</DialogTitle>
            <DialogDescription>
              Access documentation for the "{swaggerDialog.selectedRole?.name}" role. Documentation
              will be embedded below using session-based authentication.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-3">
            <div className="flex gap-2 justify-end pt-2">
              <Button variant="outline" onClick={handleOpenBlueprintsDoc}>
                Open Blueprints Docs
              </Button>
              <Button onClick={handleOpenSwaggerForRole} disabled={!swaggerDialog.selectedRole?.id}>
                Open Role Swagger
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* Embedded Documentation Viewer */}
      <Dialog
        open={docViewer.open}
        onOpenChange={open => setDocViewer(prev => ({ ...prev, open }))}
        className="max-w-7xl w-full h-[90vh]"
      >
        <DialogContent className="max-w-7xl w-full h-[90vh] p-0">
          <DialogHeader className="p-4 pb-2">
            <DialogTitle>{docViewer.title}</DialogTitle>
            <DialogDescription>
              Interactive API documentation with session-based authentication.
            </DialogDescription>
          </DialogHeader>
          <div className="flex-1 w-full h-full min-h-[70vh]">
            {/* SECURITY: Replaced unsafe iframe with SecureIframe component */}
            <SecureIframe
              src={docViewer.url}
              title={docViewer.title}
              className="rounded-b-lg"
              style={{ minHeight: '70vh' }}
              onLoad={() => {
                // Documentation loaded successfully
              }}
              onError={() => {
                console.error('Failed to load documentation:', docViewer.title);
              }}
            />
          </div>
        </DialogContent>
      </Dialog>

      <ConfirmDialog
        open={confirmState.open}
        title={confirmState.title}
        message={confirmState.message}
        onConfirm={() => handleConfirm(handleDelete)}
        onCancel={closeConfirm}
      />

      {/* MCP Endpoint Dialog */}
      <Dialog
        open={mcpEndpointDialog.open}
        onOpenChange={open => setMcpEndpointDialog(prev => ({ ...prev, open }))}
      >
        <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>MCP Server Connection - {mcpEndpointDialog.roleName}</DialogTitle>
            <DialogDescription>
              Connect AI development tools (Claude Desktop, Cursor, etc.) to this role's MCP server
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-5 pt-4">
            {/* Role Information */}
            <div className="bg-blue-50 border border-blue-200 rounded-md p-3">
              <div className="flex items-start gap-2">
                <Info className="h-4 w-4 text-blue-600 mt-0.5" />
                <div className="text-sm text-blue-800">
                  <strong>Role Name:</strong> {mcpEndpointDialog.roleName}
                  <br />
                  <strong>Role ID:</strong>{' '}
                  <code className="bg-blue-100 px-1 rounded text-xs">
                    {mcpEndpointDialog.roleId}
                  </code>
                  <br />
                  <strong>MCP Status:</strong>{' '}
                  <span className="bg-green-100 text-green-800 px-2 py-0.5 rounded text-xs font-medium">
                    Enabled
                  </span>
                </div>
              </div>
            </div>

            {/* API Key Required Section */}
            <div className="bg-purple-50 border border-purple-200 rounded-md p-4">
              <h4 className="text-sm font-semibold text-purple-900 mb-3 flex items-center gap-2">
                <HelpCircle className="h-4 w-4" />
                API Key Required for MCP Authentication
              </h4>
              <div className="space-y-2 text-sm text-purple-800">
                <p>To connect to this MCP server, you need an API key from an Application:</p>
                <ol className="list-decimal list-inside space-y-1 ml-2">
                  <li>
                    Go to <strong>Applications</strong> in the dashboard
                  </li>
                  <li>Create or select an existing application</li>
                  <li>
                    Set <strong>{mcpEndpointDialog.roleName}</strong> as the Default Role
                  </li>
                  <li>
                    Copy the <strong>API Key</strong> (starts with{' '}
                    <code className="bg-purple-100 px-1 rounded">mapi_</code>)
                  </li>
                  <li>Use it in the configuration below</li>
                </ol>
              </div>
            </div>

            {/* Claude Desktop Configuration */}
            <div className="bg-gray-50 border border-gray-200 rounded-md p-4">
              <h4 className="text-sm font-semibold text-gray-900 mb-3 flex items-center justify-between">
                <span>Claude Desktop Configuration</span>
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => {
                    const config = JSON.stringify(
                      {
                        mcpServers: {
                          [mcpEndpointDialog.roleName.replace(/\s+/g, '-').toLowerCase()]: {
                            command: 'node',
                            args: [
                              'C:\\\\Users\\\\YOUR_USERNAME\\\\nectar-api\\\\server\\\\mcp\\\\index.js',
                              '--api-key',
                              'YOUR_API_KEY_HERE',
                            ],
                          },
                        },
                      },
                      null,
                      2
                    );
                    navigator.clipboard.writeText(config);
                    alert('Configuration copied to clipboard!');
                  }}
                >
                  Copy Config
                </Button>
              </h4>
              <p className="text-xs text-gray-600 mb-2">
                Add this to your{' '}
                <code className="bg-gray-200 px-1 rounded">claude_desktop_config.json</code> file
                (replace YOUR_API_KEY_HERE with your actual API key):
              </p>
              <pre className="bg-gray-900 text-gray-100 px-3 py-3 rounded text-xs overflow-x-auto">
                {JSON.stringify(
                  {
                    mcpServers: {
                      [mcpEndpointDialog.roleName.replace(/\s+/g, '-').toLowerCase()]: {
                        command: 'node',
                        args: [
                          'C:\\\\Users\\\\YOUR_USERNAME\\\\nectar-api\\\\server\\\\mcp\\\\index.js',
                          '--api-key',
                          'YOUR_API_KEY_HERE',
                        ],
                      },
                    },
                  },
                  null,
                  2
                )}
              </pre>
            </div>

            {/* Config File Locations */}
            <div className="bg-yellow-50 border border-yellow-200 rounded-md p-3">
              <h4 className="text-sm font-semibold text-yellow-900 mb-2">
                📁 Config File Locations
              </h4>
              <div className="text-xs text-yellow-800 space-y-1 font-mono">
                <div>
                  <strong>Windows:</strong>
                </div>
                <div className="ml-3">%APPDATA%\Claude\claude_desktop_config.json</div>
                <div className="mt-2">
                  <strong>macOS:</strong>
                </div>
                <div className="ml-3">
                  ~/Library/Application Support/Claude/claude_desktop_config.json
                </div>
              </div>
            </div>

            {/* Quick Setup Steps */}
            <div className="bg-green-50 border border-green-200 rounded-md p-4">
              <h4 className="text-sm font-semibold text-green-900 mb-3">✅ Quick Setup Steps</h4>
              <ol className="list-decimal list-inside space-y-2 text-sm text-green-800">
                <li>Go to Applications and get an API key (set this role as Default Role)</li>
                <li>Copy the configuration above</li>
                <li>Open your Claude Desktop config file</li>
                <li>
                  Paste the configuration and replace YOUR_API_KEY_HERE with your actual API key
                </li>
                <li>Update the path to your nectar-api installation</li>
                <li>Restart Claude Desktop</li>
                <li>
                  Look for the <strong>🔌 icon</strong> to confirm connection
                </li>
              </ol>
            </div>

            {/* HTTP API Alternative */}
            <div className="border-t pt-4">
              <h4 className="text-sm font-semibold text-gray-900 mb-3">
                Alternative: HTTP API (for scripts)
              </h4>
              <div className="bg-gray-50 border border-gray-200 rounded-md p-3">
                <label className="text-xs font-medium text-gray-700 block mb-2">
                  Base HTTP Endpoint
                </label>
                <div className="flex gap-2">
                  <input
                    type="text"
                    value={mcpEndpointDialog.endpoint}
                    readOnly
                    className="flex-1 px-2 py-1.5 border border-gray-300 rounded bg-white font-mono text-xs"
                  />
                  <Button size="sm" onClick={copyEndpointToClipboard} variant="outline">
                    Copy
                  </Button>
                </div>
                <div className="mt-3 text-xs text-gray-600">
                  <strong>Example:</strong> Discover available tools
                </div>
                <code className="block bg-gray-900 text-gray-100 px-3 py-2 rounded mt-2 text-xs overflow-x-auto">
                  curl -X GET "{mcpEndpointDialog.endpoint}/discover" \{'\n'}
                  {'  '}-H "Authorization: Bearer YOUR_API_KEY"
                </code>
              </div>
            </div>

            <div className="flex justify-end gap-2 pt-2">
              <Button
                variant="outline"
                onClick={() => setMcpEndpointDialog(prev => ({ ...prev, open: false }))}
              >
                Close
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
};

export default RoleList;
