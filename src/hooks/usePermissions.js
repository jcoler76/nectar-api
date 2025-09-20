import { useContext } from 'react';

import { DEFAULT_PERMISSIONS } from '../constants/permissions';
import { PermissionContext } from '../context/PermissionContext';

export const usePermissions = () => {
  const context = useContext(PermissionContext);
  if (context === null) {
    // Return default permissions instead of throwing error
    return DEFAULT_PERMISSIONS;
  }
  return context;
};
