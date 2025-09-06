import {
  AddCircleOutline as AddIcon,
  Delete as DeleteIcon,
  Edit as EditIcon,
} from '@mui/icons-material';
import { Menu, MenuItem, ListItemIcon, ListItemText, Divider } from '@mui/material';
import React from 'react';

const ContextMenu = ({ menu, onClose, onAddNode, onDeleteNode, onEditNode }) => {
  if (!menu) {
    return null;
  }

  const { type, top, left, id } = menu;

  const handleAddNode = () => {
    if (onAddNode) {
      onAddNode({ x: left, y: top });
    }
    onClose();
  };

  const handleDeleteNode = () => {
    if (onDeleteNode && id) {
      onDeleteNode(id);
    }
    onClose();
  };

  const handleEditNode = () => {
    if (onEditNode && id) {
      onEditNode(id);
    }
    onClose();
  };

  return (
    <Menu
      open={true}
      onClose={onClose}
      anchorReference="anchorPosition"
      anchorPosition={top !== null && left !== null ? { top, left } : undefined}
    >
      {type === 'node' && (
        <>
          <MenuItem onClick={handleEditNode}>
            <ListItemIcon>
              <EditIcon fontSize="small" />
            </ListItemIcon>
            <ListItemText>Edit Node</ListItemText>
          </MenuItem>
          <Divider />
          <MenuItem onClick={handleDeleteNode} sx={{ color: 'error.main' }}>
            <ListItemIcon>
              <DeleteIcon fontSize="small" sx={{ color: 'error.main' }} />
            </ListItemIcon>
            <ListItemText>Delete Node</ListItemText>
          </MenuItem>
        </>
      )}

      {type === 'edge' && (
        <MenuItem onClick={handleAddNode}>
          <ListItemIcon>
            <AddIcon fontSize="small" />
          </ListItemIcon>
          <ListItemText>Add Node</ListItemText>
        </MenuItem>
      )}
    </Menu>
  );
};

export default ContextMenu;
