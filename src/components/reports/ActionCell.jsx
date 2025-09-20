import { Eye } from 'lucide-react';

import { Button } from '../ui/button';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '../ui/dialog';

import LogDetails from './shared/LogDetails';

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

export default ActionCell;
