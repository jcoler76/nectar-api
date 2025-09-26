import { useEffect, useState } from 'react';

import api from '../services/api';

const SuperAdminOrganizationSelect = ({ onOrganizationSelect }) => {
  const [organizations, setOrganizations] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [selectedOrgId, setSelectedOrgId] = useState('');

  useEffect(() => {
    const fetchOrganizations = async () => {
      try {
        // Get user ID from super admin temp storage
        const nectarSession = localStorage.getItem('superadmin_temp_session');
        const legacyUser = localStorage.getItem('superadmin_temp_user');

        let userId = null;
        if (nectarSession) {
          try {
            const session = JSON.parse(nectarSession);
            userId = session.user?.id || session.user?.userId;
          } catch {}
        }
        if (!userId && legacyUser) {
          try {
            const user = JSON.parse(legacyUser);
            userId = user.id || user.userId;
          } catch {}
        }

        const response = await api.get(`/api/organizations?userId=${userId}`);
        setOrganizations(response.data.organizations || []);
      } catch (err) {
        console.error('Error fetching organizations:', err);
        console.error('Error details:', err.response?.data);
        setError(err.response?.data?.message || 'Failed to load organizations');
      } finally {
        setLoading(false);
      }
    };

    fetchOrganizations();
  }, []);

  const handleSelectOrganization = async () => {
    if (!selectedOrgId) {
      setError('Please select an organization');
      return;
    }

    try {
      // Get user ID from super admin temp storage
      const nectarSession = localStorage.getItem('superadmin_temp_session');
      const legacyUser = localStorage.getItem('superadmin_temp_user');

      let userId = null;
      if (nectarSession) {
        try {
          const session = JSON.parse(nectarSession);
          userId = session.user?.id || session.user?.userId;
        } catch (e) {
          console.error('Error parsing nectar_session:', e);
        }
      }
      if (!userId && legacyUser) {
        try {
          const user = JSON.parse(legacyUser);
          userId = user.id || user.userId;
        } catch (e) {
          console.error('Error parsing legacy user:', e);
        }
      }

      if (!userId) {
        console.error(
          'No userId found in storage. nectar_session:',
          nectarSession,
          'legacyUser:',
          legacyUser
        );
        setError('User session not found. Please log in again.');
        return;
      }

      const response = await api.post('/api/auth/super-admin/select-organization', {
        organizationId: selectedOrgId,
        userId: userId,
      });

      const { token, user, organization } = response.data;

      // Store in the same format as the login response
      const sessionData = {
        user: {
          ...user,
          userId: user.id,
          organizationId: organization.id,
          token,
          inSupportMode: true,
        },
        token,
        expiresAt: new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString(),
      };

      localStorage.setItem('nectar_session', JSON.stringify(sessionData));

      // Also update old format for compatibility
      localStorage.setItem(
        'user',
        JSON.stringify({
          ...user,
          token,
          organizationId: organization.id,
          inSupportMode: true,
        })
      );

      // Clean up temp storage
      localStorage.removeItem('superadmin_temp_session');
      localStorage.removeItem('superadmin_temp_user');

      api.defaults.headers.common.Authorization = `Bearer ${token}`;

      // Force reload to reinitialize auth state
      window.location.href = '/dashboard';
    } catch (err) {
      console.error('Error selecting organization:', err);
      console.error('Error response:', err.response?.data);
      setError(err.response?.data?.message || 'Failed to select organization');
    }
  };

  const handleCancel = () => {
    // Clear all auth data and reload
    localStorage.clear();
    sessionStorage.clear();
    window.location.href = '/login';
  };

  return (
    <div
      style={{
        position: 'fixed',
        top: 0,
        left: 0,
        right: 0,
        bottom: 0,
        backgroundColor: 'rgba(0, 0, 0, 0.5)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        zIndex: 10000,
      }}
    >
      <div
        style={{
          backgroundColor: 'white',
          padding: '2rem',
          borderRadius: '8px',
          maxWidth: '500px',
          width: '90%',
          maxHeight: '80vh',
          overflow: 'auto',
        }}
      >
        <div
          style={{
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            marginBottom: '1rem',
          }}
        >
          <h2 style={{ margin: 0 }}>Select Organization</h2>
          <button
            onClick={handleCancel}
            style={{
              background: 'none',
              border: 'none',
              fontSize: '1.5rem',
              cursor: 'pointer',
              color: '#666',
            }}
            title="Cancel and logout"
          >
            ×
          </button>
        </div>
        <p style={{ marginBottom: '1.5rem', color: '#666' }}>
          As a Super Admin, please select which organization you want to access.
        </p>

        {loading && <div>Loading organizations...</div>}

        {error && (
          <div
            style={{
              padding: '0.75rem',
              backgroundColor: '#fee',
              color: '#c33',
              borderRadius: '4px',
              marginBottom: '1rem',
            }}
          >
            {error}
          </div>
        )}

        {!loading && organizations.length === 0 && (
          <div style={{ padding: '1rem', backgroundColor: '#f5f5f5', borderRadius: '4px' }}>
            No organizations found
          </div>
        )}

        {!loading && organizations.length > 0 && (
          <>
            <select
              value={selectedOrgId}
              onChange={e => setSelectedOrgId(e.target.value)}
              style={{
                width: '100%',
                padding: '0.75rem',
                fontSize: '1rem',
                borderRadius: '4px',
                border: '1px solid #ddd',
                marginBottom: '1.5rem',
              }}
            >
              <option value="">-- Select an Organization --</option>
              {organizations.map(org => (
                <option key={org.id} value={org.id}>
                  {org.name} {org.slug ? `(${org.slug})` : ''}
                </option>
              ))}
            </select>

            <button
              onClick={handleSelectOrganization}
              disabled={!selectedOrgId}
              style={{
                width: '100%',
                padding: '0.75rem',
                fontSize: '1rem',
                backgroundColor: selectedOrgId ? '#007bff' : '#ccc',
                color: 'white',
                border: 'none',
                borderRadius: '4px',
                cursor: selectedOrgId ? 'pointer' : 'not-allowed',
              }}
            >
              Continue
            </button>
          </>
        )}
      </div>
    </div>
  );
};

export default SuperAdminOrganizationSelect;
