import CloseIcon from '@mui/icons-material/Close';
import {
  Drawer,
  Box,
  Typography,
  IconButton,
  Alert,
  AlertTitle,
  Select,
  MenuItem,
  FormControl,
  InputLabel,
} from '@mui/material';
import React, { useMemo } from 'react';

import { NODE_TYPES, getNodeDefinition } from '../nodes/nodeTypes';

const PropertiesPanel = ({
  open,
  onClose,
  selectedNode,
  onNodeDataChange,
  onNodeUpgrade,
  workflowId,
}) => {
  const nodeDef = useMemo(() => {
    if (!selectedNode) return null;
    return getNodeDefinition(selectedNode.data.nodeType);
  }, [selectedNode]);

  const compatibleNodes = useMemo(() => {
    if (!nodeDef) return [];
    const currentCategory = nodeDef.category;
    if (currentCategory === 'system' || currentCategory === 'triggers') {
      return []; // Don't allow changing type for triggers or system nodes
    }
    return Object.values(NODE_TYPES).filter(
      def =>
        def.category !== 'triggers' &&
        def.category !== 'system' &&
        def.type !== selectedNode.data.nodeType
    );
  }, [nodeDef, selectedNode]);

  const PropertiesComponent = nodeDef ? nodeDef.getPropertiesComponent() : null;

  const handleDataChange = newData => {
    if (selectedNode) {
      onNodeDataChange(selectedNode.id, newData);
    }
  };

  const renderContent = () => {
    if (!selectedNode) {
      return (
        <Box sx={{ p: 2 }}>
          <Typography>Select a node to edit its properties.</Typography>
        </Box>
      );
    }

    const hasError = selectedNode.data?.status === 'failed';

    return (
      <>
        {compatibleNodes.length > 0 && (
          <Box sx={{ p: 2, borderBottom: 1, borderColor: 'divider' }}>
            <FormControl fullWidth>
              <InputLabel>Change Node Type</InputLabel>
              <Select
                value=""
                label="Change Node Type"
                onChange={e => onNodeUpgrade(e.target.value)}
              >
                {compatibleNodes.map(def => (
                  <MenuItem key={def.type} value={def.type}>
                    {def.name}
                  </MenuItem>
                ))}
              </Select>
            </FormControl>
          </Box>
        )}
        {hasError && (
          <Alert severity="error" sx={{ m: 2, mb: 0 }}>
            <AlertTitle>Node Failed</AlertTitle>
            {selectedNode.data.error || 'An unknown error occurred.'}
          </Alert>
        )}
        {PropertiesComponent && (
          <PropertiesComponent
            node={selectedNode}
            nodeData={selectedNode.data}
            data={selectedNode.data}
            onNodeDataChange={handleDataChange}
            onDataChange={handleDataChange}
            onNodeUpgrade={onNodeUpgrade}
            workflowId={workflowId}
          />
        )}
      </>
    );
  };

  return (
    <Drawer
      anchor="right"
      open={open}
      onClose={onClose}
      sx={{
        '& .MuiDrawer-paper': {
          width: 380,
          boxSizing: 'border-box',
          boxShadow: -3,
        },
      }}
    >
      <Box
        sx={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          p: 2,
          borderBottom: 1,
          borderColor: 'divider',
        }}
      >
        <Typography variant="h6" component="div">
          Properties
        </Typography>
        <IconButton onClick={onClose}>
          <CloseIcon />
        </IconButton>
      </Box>
      {renderContent()}
    </Drawer>
  );
};

export default PropertiesPanel;
