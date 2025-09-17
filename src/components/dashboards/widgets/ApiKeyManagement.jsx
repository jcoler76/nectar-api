/**
 * API Key Management Widget
 * Role-based API key management with different capabilities per role
 */

import React, { useState, useEffect, useCallback } from 'react';

import { useAuth } from '@/context/AuthContext';

const ApiKeyManagement = ({
  canCreate = false,
  canRevoke = false,
  canRotate = false,
  showUsageStats = false,
  showEnvironments = false,
}) => {
  const { user, organization } = useAuth();
  const [apiKeys, setApiKeys] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showCreateForm, setShowCreateForm] = useState(false);
  const [actionLoading, setActionLoading] = useState(false);
  const [confirmDialog, setConfirmDialog] = useState(null);
  const [reasonInput, setReasonInput] = useState('');

  // Form state
  const [newKey, setNewKey] = useState({
    name: '',
    description: '',
    environment: 'development',
    permissions: [],
    expiresIn: '1y',
  });

  const userRole = user?.memberships?.find(m => m.organizationId === organization?.id)?.role;

  const fetchApiKeys = useCallback(async () => {
    try {
      const response = await fetch(`/api/organizations/${organization?.id}/api-keys`, {
        headers: {
          Authorization: `Bearer ${localStorage.getItem('token')}`,
        },
      });

      if (response.ok) {
        const data = await response.json();
        setApiKeys(data.apiKeys || []);
      } else {
        console.error('Failed to fetch API keys');
      }
    } catch (error) {
      console.error('Error fetching API keys:', error);
    } finally {
      setLoading(false);
    }
  }, [organization?.id]);

  useEffect(() => {
    fetchApiKeys();
  }, [fetchApiKeys]);

  const handleCreateKey = async e => {
    e.preventDefault();
    setActionLoading(true);

    try {
      const response = await fetch(`/api/organizations/${organization?.id}/api-keys`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${localStorage.getItem('token')}`,
        },
        body: JSON.stringify(newKey),
      });

      if (response.ok) {
        const data = await response.json();

        // Show the new API key to the user (only shown once)
        alert(
          `API Key Created!\n\nKey: ${data.key}\n\nStore this securely - it won't be shown again.`
        );

        // Reset form and refresh list
        setNewKey({
          name: '',
          description: '',
          environment: 'development',
          permissions: [],
          expiresIn: '1y',
        });
        setShowCreateForm(false);
        fetchApiKeys();
      } else {
        const errorData = await response.json();
        alert(`Error: ${errorData.error}`);
      }
    } catch (error) {
      console.error('Error creating API key:', error);
      alert('Failed to create API key');
    } finally {
      setActionLoading(false);
    }
  };

  const handleRevokeKey = (keyId, keyName) => {
    setConfirmDialog({
      type: 'revoke',
      keyId,
      keyName,
      title: 'Revoke API Key',
      message: `Are you sure you want to revoke the API key "${keyName}"? This action cannot be undone.`,
      needsReason: true,
    });
  };

  const confirmRevokeKey = async () => {
    if (!reasonInput.trim()) {
      alert('Please provide a reason for revoking this key.');
      return;
    }

    const { keyId } = confirmDialog;
    setActionLoading(true);

    try {
      const response = await fetch(
        `/api/organizations/${organization?.id}/api-keys/${keyId}/revoke`,
        {
          method: 'PUT',
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${localStorage.getItem('token')}`,
          },
          body: JSON.stringify({ reason: reasonInput }),
        }
      );

      if (response.ok) {
        alert('API key revoked successfully');
        fetchApiKeys();
        setConfirmDialog(null);
        setReasonInput('');
      } else {
        const errorData = await response.json();
        alert(`Error: ${errorData.error}`);
      }
    } catch (error) {
      console.error('Error revoking API key:', error);
      alert('Failed to revoke API key');
    } finally {
      setActionLoading(false);
    }
  };

  const handleRotateKey = (keyId, keyName) => {
    setConfirmDialog({
      type: 'rotate',
      keyId,
      keyName,
      title: 'Rotate API Key',
      message: `Rotate the API key "${keyName}"? The old key will become invalid immediately.`,
      needsReason: false,
    });
  };

  const confirmRotateKey = async () => {
    const { keyId } = confirmDialog;
    setActionLoading(true);

    try {
      const response = await fetch(
        `/api/organizations/${organization?.id}/api-keys/${keyId}/rotate`,
        {
          method: 'PUT',
          headers: {
            Authorization: `Bearer ${localStorage.getItem('token')}`,
          },
        }
      );

      if (response.ok) {
        const data = await response.json();
        alert(`API Key Rotated!\n\nNew Key: ${data.key}\n\nUpdate your applications immediately.`);
        fetchApiKeys();
        setConfirmDialog(null);
      } else {
        const errorData = await response.json();
        alert(`Error: ${errorData.error}`);
      }
    } catch (error) {
      console.error('Error rotating API key:', error);
      alert('Failed to rotate API key');
    } finally {
      setActionLoading(false);
    }
  };

  const getEnvironmentBadge = environment => {
    const badges = {
      production: 'env-badge production',
      staging: 'env-badge staging',
      development: 'env-badge development',
    };
    return badges[environment] || 'env-badge';
  };

  const getStatusBadge = (isActive, expiresAt) => {
    if (!isActive) return <span className="status-badge revoked">Revoked</span>;

    if (expiresAt) {
      const expiry = new Date(expiresAt);
      const now = new Date();
      const daysUntilExpiry = Math.ceil((expiry - now) / (1000 * 60 * 60 * 24));

      if (daysUntilExpiry < 0) return <span className="status-badge expired">Expired</span>;
      if (daysUntilExpiry < 30) return <span className="status-badge expiring">Expires Soon</span>;
    }

    return <span className="status-badge active">Active</span>;
  };

  if (loading) {
    return (
      <div className="widget api-key-widget">
        <div className="widget-header">
          <h3>API Keys</h3>
        </div>
        <div className="widget-content">
          <div className="loading">Loading API keys...</div>
        </div>
      </div>
    );
  }

  return (
    <div className="widget api-key-widget">
      <div className="widget-header">
        <h3>API Keys</h3>
        {canCreate && (
          <button
            className="btn btn-primary btn-sm"
            onClick={() => setShowCreateForm(true)}
            disabled={actionLoading}
          >
            Create Key
          </button>
        )}
      </div>

      <div className="widget-content">
        {/* Role-based information */}
        <div className="role-info">
          <div className="permissions-summary">
            <span className="role-badge">{userRole}</span>
            <div className="capabilities">
              {canCreate && <span className="capability">Create</span>}
              {canRotate && <span className="capability">Rotate</span>}
              {canRevoke && <span className="capability">Revoke</span>}
              {showUsageStats && <span className="capability">Usage Stats</span>}
            </div>
          </div>
        </div>

        {/* Create Key Form */}
        {showCreateForm && (
          <div className="create-key-form">
            <h4>Create New API Key</h4>
            <form onSubmit={handleCreateKey}>
              <div className="form-group">
                <label>Name *</label>
                <input
                  type="text"
                  value={newKey.name}
                  onChange={e => setNewKey({ ...newKey, name: e.target.value })}
                  required
                  placeholder="My API Key"
                />
              </div>

              <div className="form-group">
                <label>Description</label>
                <textarea
                  value={newKey.description}
                  onChange={e => setNewKey({ ...newKey, description: e.target.value })}
                  placeholder="What will this key be used for?"
                  rows={3}
                />
              </div>

              {showEnvironments && (
                <div className="form-group">
                  <label>Environment *</label>
                  <select
                    value={newKey.environment}
                    onChange={e => setNewKey({ ...newKey, environment: e.target.value })}
                  >
                    <option value="development">Development</option>
                    <option value="staging">Staging</option>
                    {['ORGANIZATION_ADMIN', 'ORGANIZATION_OWNER'].includes(userRole) && (
                      <option value="production">Production</option>
                    )}
                  </select>
                </div>
              )}

              <div className="form-group">
                <label>Expires In</label>
                <select
                  value={newKey.expiresIn}
                  onChange={e => setNewKey({ ...newKey, expiresIn: e.target.value })}
                >
                  <option value="30d">30 days</option>
                  <option value="90d">90 days</option>
                  <option value="6m">6 months</option>
                  <option value="1y">1 year</option>
                  {userRole === 'ORGANIZATION_OWNER' && <option value="never">Never</option>}
                </select>
              </div>

              <div className="form-actions">
                <button type="submit" disabled={actionLoading}>
                  {actionLoading ? 'Creating...' : 'Create Key'}
                </button>
                <button
                  type="button"
                  onClick={() => setShowCreateForm(false)}
                  disabled={actionLoading}
                >
                  Cancel
                </button>
              </div>
            </form>
          </div>
        )}

        {/* API Keys List */}
        <div className="api-keys-list">
          {apiKeys.length === 0 ? (
            <div className="empty-state">
              <p>No API keys found.</p>
              {canCreate && (
                <button className="btn btn-primary" onClick={() => setShowCreateForm(true)}>
                  Create Your First API Key
                </button>
              )}
            </div>
          ) : (
            <div className="keys-grid">
              {apiKeys.map(key => (
                <div key={key.id} className="key-card">
                  <div className="key-header">
                    <div>
                      <h4>{key.name}</h4>
                      {key.description && <p className="key-description">{key.description}</p>}
                    </div>
                    <div className="key-badges">
                      {getStatusBadge(key.isActive, key.expiresAt)}
                      {showEnvironments && (
                        <span className={getEnvironmentBadge(key.environment)}>
                          {key.environment}
                        </span>
                      )}
                    </div>
                  </div>

                  <div className="key-details">
                    <div className="key-preview">
                      <label>Key:</label>
                      <code>{key.keyPreview}</code>
                    </div>

                    <div className="key-meta">
                      <div className="meta-item">
                        <label>Created:</label>
                        <span>{new Date(key.createdAt).toLocaleDateString()}</span>
                      </div>

                      {key.lastUsedAt && (
                        <div className="meta-item">
                          <label>Last Used:</label>
                          <span>{new Date(key.lastUsedAt).toLocaleDateString()}</span>
                        </div>
                      )}

                      {key.expiresAt && (
                        <div className="meta-item">
                          <label>Expires:</label>
                          <span>{new Date(key.expiresAt).toLocaleDateString()}</span>
                        </div>
                      )}

                      {showUsageStats && key.usage && (
                        <div className="meta-item">
                          <label>Requests (30d):</label>
                          <span>{key.usage.totalRequests.toLocaleString()}</span>
                        </div>
                      )}
                    </div>
                  </div>

                  {key.isActive && (
                    <div className="key-actions">
                      {canRotate && (
                        <button
                          className="btn btn-sm btn-secondary"
                          onClick={() => handleRotateKey(key.id, key.name)}
                          disabled={actionLoading}
                        >
                          Rotate
                        </button>
                      )}

                      {canRevoke && (
                        <button
                          className="btn btn-sm btn-danger"
                          onClick={() => handleRevokeKey(key.id, key.name)}
                          disabled={actionLoading}
                        >
                          Revoke
                        </button>
                      )}
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Role-based restrictions info */}
        <div className="restrictions-info">
          <h5>Your API Key Limits ({userRole})</h5>
          <div className="limits-grid">
            {userRole === 'DEVELOPER' && (
              <>
                <div className="limit-item">
                  <label>Max Keys:</label>
                  <span>10</span>
                </div>
                <div className="limit-item">
                  <label>Environments:</label>
                  <span>Development, Staging</span>
                </div>
                <div className="limit-item">
                  <label>Max Expiration:</label>
                  <span>1 year</span>
                </div>
              </>
            )}

            {userRole === 'ORGANIZATION_ADMIN' && (
              <>
                <div className="limit-item">
                  <label>Max Keys:</label>
                  <span>50</span>
                </div>
                <div className="limit-item">
                  <label>Environments:</label>
                  <span>All</span>
                </div>
                <div className="limit-item">
                  <label>Max Expiration:</label>
                  <span>2 years</span>
                </div>
              </>
            )}

            {userRole === 'ORGANIZATION_OWNER' && (
              <>
                <div className="limit-item">
                  <label>Max Keys:</label>
                  <span>100</span>
                </div>
                <div className="limit-item">
                  <label>Environments:</label>
                  <span>All</span>
                </div>
                <div className="limit-item">
                  <label>Max Expiration:</label>
                  <span>Unlimited</span>
                </div>
              </>
            )}
          </div>
        </div>
      </div>

      {/* Confirmation Dialog */}
      {confirmDialog && (
        <div className="modal-overlay">
          <div className="modal-dialog">
            <div className="modal-header">
              <h4>{confirmDialog.title}</h4>
            </div>
            <div className="modal-body">
              <p>{confirmDialog.message}</p>
              {confirmDialog.needsReason && (
                <div className="form-group">
                  <label>Reason for revoking:</label>
                  <textarea
                    value={reasonInput}
                    onChange={e => setReasonInput(e.target.value)}
                    placeholder="Please provide a reason..."
                    rows={3}
                    required
                  />
                </div>
              )}
            </div>
            <div className="modal-footer">
              <button
                className="btn btn-secondary"
                onClick={() => {
                  setConfirmDialog(null);
                  setReasonInput('');
                }}
                disabled={actionLoading}
              >
                Cancel
              </button>
              <button
                className={`btn ${confirmDialog.type === 'revoke' ? 'btn-danger' : 'btn-warning'}`}
                onClick={confirmDialog.type === 'revoke' ? confirmRevokeKey : confirmRotateKey}
                disabled={actionLoading || (confirmDialog.needsReason && !reasonInput.trim())}
              >
                {actionLoading
                  ? 'Processing...'
                  : confirmDialog.type === 'revoke'
                    ? 'Revoke Key'
                    : 'Rotate Key'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default ApiKeyManagement;
