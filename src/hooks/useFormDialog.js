import { useState, useCallback } from 'react';

export const useFormDialog = () => {
  const [openForm, setOpenForm] = useState(false);
  const [editItem, setEditItem] = useState(null);

  const handleAdd = useCallback(async onConnectionsNeeded => {
    if (onConnectionsNeeded) {
      await onConnectionsNeeded();
    }
    setEditItem(null);
    setOpenForm(true);
  }, []);

  const handleEdit = useCallback(async (item, onConnectionsNeeded) => {
    if (onConnectionsNeeded) {
      await onConnectionsNeeded();
    }
    setEditItem(item);
    setOpenForm(true);
  }, []);

  const handleClose = useCallback(() => {
    setOpenForm(false);
    setEditItem(null);
  }, []);

  return {
    openForm,
    editItem,
    handleAdd,
    handleEdit,
    handleClose,
    isEditing: !!editItem,
  };
};
