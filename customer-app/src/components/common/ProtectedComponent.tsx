import * as React from 'react';

import type { CustomerPermissions } from '../../constants/permissions';
import { usePermissions } from '../../context/PermissionContext';

export interface ProtectedComponentProps {
  permission: keyof CustomerPermissions;
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
