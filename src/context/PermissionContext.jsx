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

    // Simple organization role-based permissions
    switch (user.role) {
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
        setPermissions(DEFAULT_PERMISSIONS);
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
