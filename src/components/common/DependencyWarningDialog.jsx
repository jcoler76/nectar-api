import { AlertTriangle, Trash2 } from 'lucide-react';
import { useState } from 'react';

import { Button } from '../ui/button';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '../ui/dialog';
import { Input } from '../ui/input';

/**
 * Reusable dialog component for warning about dependencies before deletion
 * Requires user to type the resource name or "DELETE" to confirm force deletion
 */
const DependencyWarningDialog = ({
  open,
  onClose,
  onConfirm,
  resourceType = 'resource', // e.g., 'service', 'connection'
  resourceName,
  dependencies,
  additionalWarning = null,
}) => {
  const [confirmationText, setConfirmationText] = useState('');
  const [isDeleting, setIsDeleting] = useState(false);

  const handleClose = () => {
    setConfirmationText('');
    setIsDeleting(false);
    onClose();
  };

  const handleConfirm = async () => {
    setIsDeleting(true);
    try {
      await onConfirm();
      handleClose();
    } catch (error) {
      console.error('Error during force deletion:', error);
      setIsDeleting(false);
    }
  };

  const isConfirmationValid =
    confirmationText === resourceName || confirmationText.toUpperCase() === 'DELETE';

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="sm:max-w-lg bg-white border border-gray-200 shadow-lg">
        <DialogHeader className="border-b border-gray-100 pb-4">
          <DialogTitle className="flex items-center gap-2 text-lg font-semibold text-gray-900">
            <AlertTriangle className="h-5 w-5 text-amber-500" />
            {resourceType.charAt(0).toUpperCase() + resourceType.slice(1)} Has Dependencies
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-4 py-4">
          <p className="text-sm text-gray-700">
            The {resourceType} "<strong className="text-gray-900">{resourceName}</strong>" cannot be
            deleted because it has the following dependencies:
          </p>

          <div className="bg-amber-50 border border-amber-200 rounded-md p-3">
            <p className="text-sm font-medium text-amber-800">{dependencies}</p>
          </div>

          {additionalWarning && (
            <div className="bg-red-50 border border-red-200 rounded-md p-3">
              <p className="text-sm font-medium text-red-800">{additionalWarning}</p>
            </div>
          )}

          <div className="bg-red-50 border border-red-200 rounded-md p-3">
            <p className="text-sm font-medium text-red-800">
              ⚠️ Warning: Force deleting this {resourceType} will permanently remove all associated
              records. This action cannot be undone.
            </p>
          </div>

          <div className="space-y-2">
            <p className="text-sm font-medium text-gray-700">
              To confirm force deletion, type{' '}
              <strong className="text-gray-900 font-semibold">{resourceName}</strong> or{' '}
              <strong className="text-gray-900 font-semibold">DELETE</strong> below:
            </p>
            <Input
              type="text"
              placeholder={`Type "${resourceName}" or "DELETE" to confirm`}
              value={confirmationText}
              onChange={e => setConfirmationText(e.target.value)}
              className="w-full border-gray-300 focus:border-blue-500 focus:ring-1 focus:ring-blue-500 text-gray-900"
              disabled={isDeleting}
            />
          </div>
        </div>

        <div className="flex justify-end gap-3 pt-4 border-t border-gray-100">
          <Button
            variant="outline"
            onClick={handleClose}
            disabled={isDeleting}
            className="border-gray-300 text-gray-700 hover:bg-gray-50 hover:text-gray-900 transition-none"
          >
            Cancel
          </Button>
          <Button
            disabled={!isConfirmationValid || isDeleting}
            onClick={handleConfirm}
            className="bg-red-600 text-white hover:bg-red-700 border-red-600 transition-none transform-none"
          >
            <Trash2 className="mr-2 h-4 w-4" />
            {isDeleting ? 'Deleting...' : `Force Delete ${resourceType}`}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
};

export default DependencyWarningDialog;
