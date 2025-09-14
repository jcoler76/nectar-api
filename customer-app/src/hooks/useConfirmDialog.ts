import { useState, useCallback } from 'react';

export interface ConfirmDialogOptions {
  title?: string;
  message?: string;
}

export interface ConfirmState {
  open: boolean;
  itemId: string | number | null;
  title: string;
  message: string;
}

export interface UseConfirmDialogReturn {
  confirmState: ConfirmState;
  openConfirm: (itemId: string | number, options?: ConfirmDialogOptions) => void;
  closeConfirm: () => void;
  handleConfirm: (actionFn?: (itemId: string | number) => Promise<void>) => Promise<void>;
}

export const useConfirmDialog = (): UseConfirmDialogReturn => {
  const [confirmState, setConfirmState] = useState<ConfirmState>({
    open: false,
    itemId: null,
    title: 'Confirm Action',
    message: 'Are you sure you want to proceed?',
  });

  const openConfirm = useCallback((itemId: string | number, options: ConfirmDialogOptions = {}) => {
    setConfirmState({
      open: true,
      itemId,
      title: options.title || 'Confirm Action',
      message: options.message || 'Are you sure you want to proceed?',
    });
  }, []);

  const closeConfirm = useCallback(() => {
    setConfirmState(prev => ({ ...prev, open: false, itemId: null }));
  }, []);

  const handleConfirm = useCallback(
    async (actionFn?: (itemId: string | number) => Promise<void>) => {
      if (confirmState.itemId && actionFn) {
        await actionFn(confirmState.itemId);
      }
      closeConfirm();
    },
    [confirmState.itemId, closeConfirm]
  );

  return {
    confirmState,
    openConfirm,
    closeConfirm,
    handleConfirm,
  };
};
