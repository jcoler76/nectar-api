import React from 'react';

import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '../ui/dialog';

/**
 * Reusable form dialog wrapper component
 * Eliminates duplication across form dialogs throughout the application
 *
 * @param {Object} props - Component props
 * @param {boolean} props.open - Dialog open state
 * @param {Function} props.onClose - Close handler
 * @param {string} props.title - Dialog title
 * @param {string} props.description - Dialog description
 * @param {React.ReactNode} props.children - Form content
 * @param {string} props.maxWidth - Dialog max width (default: 'sm:max-w-[600px]')
 * @param {boolean} props.scrollable - Enable vertical scrolling (default: true)
 */
const FormDialog = ({
  open,
  onClose,
  title,
  description,
  children,
  maxWidth = 'sm:max-w-[600px]',
  scrollable = true,
}) => {
  const handleOpenChange = isOpen => {
    if (!isOpen) {
      onClose();
    }
  };

  const dialogClassName = scrollable ? `${maxWidth} max-h-[90vh] overflow-y-auto` : maxWidth;

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogContent className={dialogClassName}>
        {(title || description) && (
          <DialogHeader>
            {title && <DialogTitle>{title}</DialogTitle>}
            {description && <DialogDescription>{description}</DialogDescription>}
          </DialogHeader>
        )}
        {children}
      </DialogContent>
    </Dialog>
  );
};

export default FormDialog;
