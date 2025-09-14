import { Badge } from '../../ui/badge';

export const getStatusBadge = success => {
  return (
    <Badge variant={success ? 'success' : 'destructive'}>{success ? 'Success' : 'Failed'}</Badge>
  );
};

export const getMethodBadge = method => {
  const colors = {
    GET: 'default',
    POST: 'secondary',
    PUT: 'outline',
    DELETE: 'destructive',
    PATCH: 'secondary',
  };

  return <Badge variant={colors[method] || 'default'}>{method}</Badge>;
};

export const getCategoryBadge = category => {
  const colors = {
    api: 'default',
    workflow: 'secondary',
    webhook: 'outline',
    admin: 'destructive',
    auth: 'default',
  };

  return <Badge variant={colors[category] || 'default'}>{category}</Badge>;
};

export const formatDuration = duration => {
  if (duration < 1000) return `${Math.round(duration)}ms`;
  return `${(duration / 1000).toFixed(2)}s`;
};

export const formatTimestamp = timestamp => {
  // This will need to import formatTimestampEST from dateUtils if not already available
  const formatTimestampEST = require('../../../utils/dateUtils').formatTimestampEST;
  return formatTimestampEST(timestamp, 'MM/DD/YY h:mm:ss A');
};
