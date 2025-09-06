import * as React from 'react';

import type { UserPermissions } from '../../constants/permissions';
import { usePermissions } from '../../context/PermissionContext';

export interface ProtectedComponentProps {
  permission: keyof UserPermissions;
  children: React.ReactNode;
  fallback?: React.ReactNode;
}

const ProtectedComponent: React.FC<ProtectedComponentProps> = ({
  permission,
  children,
  fallback = null,
}) => {
  const permissions = usePermissions();

  if (!permissions[permission]) {
    return <>{fallback}</>;
  }

  return <>{children}</>;
};

export default ProtectedComponent;
