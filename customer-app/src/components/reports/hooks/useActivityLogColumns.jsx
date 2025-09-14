import { Eye } from 'lucide-react';
import { useMemo } from 'react';

import { Badge } from '../../ui/badge';
import { Button } from '../../ui/button';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '../../ui/dialog';
import LogDetails from '../shared/LogDetails';
import {
  formatDuration,
  formatTimestamp,
  getCategoryBadge,
  getMethodBadge,
  getStatusBadge,
} from '../utils/badgeHelpers';

// Action Cell Component for the eye icon
const ActionCell = ({ log }) => {
  return (
    <Dialog>
      <DialogTrigger asChild>
        <Button variant="ghost" size="sm" onClick={() => {}}>
          <Eye className="h-4 w-4" />
        </Button>
      </DialogTrigger>
      <DialogContent className="max-w-4xl max-h-[80vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Activity Log Details</DialogTitle>
        </DialogHeader>
        <LogDetails log={log} />
      </DialogContent>
    </Dialog>
  );
};

const useActivityLogColumns = () => {
  return useMemo(
    () => [
      {
        accessorKey: 'timestamp',
        header: 'Time',
        sortable: true,
        width: '12%',
        cell: ({ value }) => (
          <span className="text-sm text-muted-foreground">{formatTimestamp(value)}</span>
        ),
      },
      {
        accessorKey: 'success',
        header: 'Status',
        sortable: true,
        width: '8%',
        cell: ({ value }) => getStatusBadge(value),
      },
      {
        accessorKey: 'method',
        header: 'Method',
        sortable: true,
        width: '8%',
        cell: ({ value }) => getMethodBadge(value),
      },
      {
        accessorKey: 'endpoint',
        header: 'Endpoint',
        sortable: true,
        width: '20%',
        cell: ({ value }) => (
          <span className="font-mono text-sm truncate" title={value}>
            {value}
          </span>
        ),
      },
      {
        accessorKey: 'responseStatus',
        header: 'Code',
        sortable: true,
        width: '6%',
        cell: ({ value }) => (
          <Badge variant={value >= 400 ? 'destructive' : value >= 300 ? 'outline' : 'default'}>
            {value}
          </Badge>
        ),
      },
      {
        accessorKey: 'duration',
        header: 'Duration',
        sortable: true,
        width: '8%',
        cell: ({ value }) => <span className="text-sm">{formatDuration(value)}</span>,
      },
      {
        accessorKey: 'category',
        header: 'Category',
        sortable: true,
        width: '8%',
        cell: ({ value }) => getCategoryBadge(value),
      },
      {
        accessorKey: 'ipAddress',
        header: 'IP',
        sortable: true,
        width: '10%',
        cell: ({ value }) => <span className="text-sm font-mono">{value}</span>,
      },
      {
        id: 'actions',
        header: '',
        width: '5%',
        cell: ({ row }) => <ActionCell log={row} />,
      },
    ],
    []
  );
};

export default useActivityLogColumns;
