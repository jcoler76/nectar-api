import { HelpCircle } from 'lucide-react';
import React, { useState } from 'react';
import { Tooltip } from '@mui/material';

import { Button } from '../../../components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '../../../components/ui/dialog';
import { Input } from '../../../components/ui/input';
import { Label } from '../../../components/ui/label';

const AddWorkflowDialog = ({ open, onClose, onSave }) => {
  const [name, setName] = useState('');

  const handleClose = () => {
    onClose();
    setName('');
  };

  const handleSave = () => {
    const trimmedName = name.trim();
    if (trimmedName) {
      onSave(trimmedName);
      handleClose();
    }
  };

  const handleKeyDown = event => {
    if (event.key === 'Enter') {
      handleSave();
    }
  };

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="sm:max-w-[425px]">
        <DialogHeader>
          <DialogTitle>Create New Workflow</DialogTitle>
          <DialogDescription>
            Enter a descriptive name for your new workflow. After creation, you'll be taken to the workflow designer to add nodes and configure automation logic.
          </DialogDescription>
        </DialogHeader>
        <div className="grid gap-4 py-4">
          <div className="grid grid-cols-4 items-center gap-4">
            <div className="flex items-center gap-2 justify-end">
              <Label htmlFor="name" className="text-right">
                Name
              </Label>
              <Tooltip title="Choose a descriptive name that clearly identifies the workflow's purpose, such as 'Customer Onboarding', 'Invoice Processing', or 'Data Sync Weekly'. This name will be used throughout the system.">
                <HelpCircle className="h-4 w-4 text-gray-500 cursor-help" />
              </Tooltip>
            </div>
            <Input
              id="name"
              value={name}
              onChange={e => setName(e.target.value)}
              onKeyDown={handleKeyDown}
              className="col-span-3"
              placeholder="Enter workflow name"
              autoFocus
            />
          </div>
        </div>
        <DialogFooter>
          <Tooltip title="Close this dialog without creating a workflow">
            <Button variant="outline" onClick={handleClose}>
              Cancel
            </Button>
          </Tooltip>
          <Tooltip title="Create the workflow and open the workflow designer to configure nodes, triggers, and automation logic">
            <Button onClick={handleSave} disabled={!name.trim()}>
              Create
            </Button>
          </Tooltip>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};

export default AddWorkflowDialog;
