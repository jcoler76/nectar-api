import { createContext, useContext, useState, useEffect } from 'react';

import {
  DEFAULT_PERMISSIONS,
  ADMIN_PERMISSIONS,
  STANDARD_USER_PERMISSIONS,
} from '../constants/permissions';

import { useAuth } from './AuthContext';

const PermissionContext = createContext(null);

export const PermissionProvider = ({ children }) => {
  const { user } = useAuth();
  const [permissions, setPermissions] = useState(DEFAULT_PERMISSIONS);

  useEffect(() => {
    if (user?.permissions) {
      setPermissions(user.permissions);
    } else if (user?.isAdmin) {
      setPermissions(ADMIN_PERMISSIONS);
    } else if (user) {
      setPermissions(STANDARD_USER_PERMISSIONS);
    } else {
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
