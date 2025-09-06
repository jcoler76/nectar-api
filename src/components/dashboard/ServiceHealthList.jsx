import { AlertTriangle, CheckCircle, XCircle } from 'lucide-react';

import { formatTimestampEST } from '../../utils/dateUtils';
import { Badge } from '../ui/badge';

const ServiceHealthList = ({ services }) => {
  if (!services || services.length === 0) {
    return (
      <div className="flex items-center justify-center p-8 text-center">
        <p className="text-muted-foreground">No services to display</p>
      </div>
    );
  }

  const getStatusIcon = status => {
    switch (status?.toLowerCase()) {
      case 'healthy':
        return <CheckCircle className="h-5 w-5 text-green-500" />;
      case 'warning':
        return <AlertTriangle className="h-5 w-5 text-yellow-500" />;
      case 'error':
        return <XCircle className="h-5 w-5 text-red-500" />;
      default:
        return <AlertTriangle className="h-5 w-5 text-gray-400" />;
    }
  };

  const getStatusVariant = status => {
    switch (status?.toLowerCase()) {
      case 'healthy':
        return 'success';
      case 'warning':
        return 'warning';
      case 'error':
        return 'destructive';
      default:
        return 'secondary';
    }
  };

  return (
    <div className="space-y-2">
      {services.map(service => (
        <div
          key={service._id}
          className="flex items-center justify-between p-4 border rounded-lg hover:bg-muted/50 transition-colors"
        >
          <div className="flex items-center gap-3">
            {getStatusIcon(service.status)}
            <div>
              <p className="font-medium text-foreground">{service.name}</p>
              <p className="text-sm text-muted-foreground">
                {service.host}:{service.port}
              </p>
            </div>
          </div>

          <div className="flex items-center gap-3">
            <Badge variant={getStatusVariant(service.status)}>{service.status || 'Unknown'}</Badge>
            <p className="text-xs text-muted-foreground">
              {service.lastCheck
                ? formatTimestampEST(service.lastCheck, 'MM/DD/YY h:mm A')
                : 'Never checked'}
            </p>
          </div>
        </div>
      ))}
    </div>
  );
};

export default ServiceHealthList;
