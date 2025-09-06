import React, { useState } from 'react';

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
          <DialogDescription>Enter a name for your new workflow to get started.</DialogDescription>
        </DialogHeader>
        <div className="grid gap-4 py-4">
          <div className="grid grid-cols-4 items-center gap-4">
            <Label htmlFor="name" className="text-right">
              Name
            </Label>
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
          <Button variant="outline" onClick={handleClose}>
            Cancel
          </Button>
          <Button onClick={handleSave} disabled={!name.trim()}>
            Create
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};

export default AddWorkflowDialog;
