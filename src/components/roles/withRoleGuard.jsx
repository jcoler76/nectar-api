import RoleGuard from './RoleGuard';

/**
 * Higher-order component version
 */
export const withRoleGuard = (WrappedComponent, guardConfig) => {
  return function RoleGuardedComponent(props) {
    return (
      <RoleGuard {...guardConfig} fallback={<div>Access Denied</div>}>
        <WrappedComponent {...props} />
      </RoleGuard>
    );
  };
};
