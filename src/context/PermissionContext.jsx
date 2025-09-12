import { createContext, useContext, useState, useEffect } from 'react';

import {
  DEFAULT_PERMISSIONS,
  ORG_OWNER_PERMISSIONS,
  ORG_ADMIN_PERMISSIONS,
  ORG_MEMBER_PERMISSIONS,
  ORG_VIEWER_PERMISSIONS,
} from '../constants/permissions';

import { useAuth } from './AuthContext';

const PermissionContext = createContext(null);

export const PermissionProvider = ({ children }) => {
  const { user } = useAuth();
  const [permissions, setPermissions] = useState(DEFAULT_PERMISSIONS);

  useEffect(() => {
    if (!user) {
      setPermissions(DEFAULT_PERMISSIONS);
      return;
    }

    // Normalize role value and provide robust fallbacks
    const normalizedRole = (user.role || '').toString().toUpperCase().trim();

    if (!normalizedRole && user.isAdmin) {
      // If we at least know the user is an org owner/admin, grant owner perms
      setPermissions(ORG_OWNER_PERMISSIONS);
      return;
    }

    switch (normalizedRole) {
      case 'OWNER':
        setPermissions(ORG_OWNER_PERMISSIONS);
        break;
      case 'ADMIN':
        setPermissions(ORG_ADMIN_PERMISSIONS);
        break;
      case 'MEMBER':
        setPermissions(ORG_MEMBER_PERMISSIONS);
        break;
      case 'VIEWER':
        setPermissions(ORG_VIEWER_PERMISSIONS);
        break;
      default:
        // Unknown role string: default to safe viewer access so core nav appears
        setPermissions(ORG_VIEWER_PERMISSIONS);
    }
  }, [user]);

  return <PermissionContext.Provider value={permissions}>{children}</PermissionContext.Provider>;
};

export const usePermissions = () => {
  const context = useContext(PermissionContext);
  if (context === null) {
    // Return default permissions instead of throwing error
    return DEFAULT_PERMISSIONS;
  }
  return context;
};
