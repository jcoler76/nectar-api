import DeleteIcon from '@mui/icons-material/Delete';
import MoreVertIcon from '@mui/icons-material/MoreVert';
import WarningAmberRoundedIcon from '@mui/icons-material/WarningAmberRounded';
import { Box, Typography, IconButton, Avatar, Paper, Tooltip } from '@mui/material';
import React, { useMemo } from 'react';
import { Handle, Position } from 'reactflow';

import { getNodeDefinition } from '../nodes/nodeTypes';

const renderHandles = (handles, type, position) => {
  if (!handles) return null;

  const handleStyle = {
    width: 12,
    height: 12,
    background: '#CBD5E1',
    border: '2px solid white',
  };

  if (typeof handles === 'number') {
    if (handles === 0) return null;
    return (
      <Handle type={type} position={position} className="default-handle" style={handleStyle} />
    );
  }

  const isTarget = type === 'target';

  return handles.map(handle => {
    const handleComponent = (
      <Handle
        type={type}
        position={position}
        id={handle.id}
        style={{
          ...handleStyle,
          position: 'absolute',
          ...(isTarget ? { left: -6 } : { right: -6 }),
        }}
      />
    );

    return (
      <Box
        key={handle.id}
        sx={{
          position: 'relative',
          padding: '8px 16px',
          borderTop: '1px solid #E5E7EB',
          display: 'flex',
          justifyContent: isTarget ? 'flex-start' : 'flex-end',
          alignItems: 'center',
          gap: 1,
        }}
      >
        {isTarget && handleComponent}
        <Typography variant="caption" color="text.secondary" sx={{ flexGrow: 1 }}>
          {handle.name}
        </Typography>
        {!isTarget && handleComponent}
      </Box>
    );
  });
};

const CustomNode = ({ data, selected }) => {
  const nodeDef = useMemo(() => getNodeDefinition(data.nodeType), [data.nodeType]);

  if (!nodeDef) {
    // A fallback for unrecognized node types
    return (
      <Paper
        elevation={selected ? 4 : 1}
        sx={{
          padding: '12px',
          borderRadius: '10px',
          border: '1px solid #ff4d4f',
          width: 300,
        }}
      >
        <Typography>Unknown Node Type: {data.nodeType}</Typography>
      </Paper>
    );
  }

  const { name, icon: NodeIcon, inputs, outputs } = nodeDef;
  const isConfigured = data.isConfigured !== false; // Default to true if not specified

  // Dynamically generate outputs for the router node
  let finalOutputs = outputs;
  if (data.nodeType === 'logic:router') {
    const ruleOutputs = (data.rules || []).map(rule => ({ id: rule.id, name: rule.name }));
    const fallbackOutput = Array.isArray(outputs)
      ? outputs.find(o => o.id === 'fallback')
      : { id: 'fallback', name: 'Fallback' };
    finalOutputs = [...ruleOutputs, fallbackOutput].filter(Boolean);
  }

  return (
    <Paper
      elevation={selected ? 4 : 1}
      sx={{
        borderRadius: '12px',
        border: selected ? '2px solid #6366F1' : '1px solid #E5E7EB',
        width: 300,
        overflow: 'hidden',
        '.default-handle': {
          opacity: 0,
        },
        '&:hover': {
          borderColor: '#6366F1',
          '.default-handle': {
            opacity: 1,
          },
        },
      }}
    >
      {renderHandles(inputs, 'target', Position.Left)}
      <Box sx={{ padding: '12px 16px' }}>
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5 }}>
          {!isConfigured && (
            <Tooltip title="This step is not fully configured.">
              <WarningAmberRoundedIcon color="warning" />
            </Tooltip>
          )}
          <Avatar
            sx={{
              bgcolor: '#F3F4F6',
              color: '#4B5563',
              width: 32,
              height: 32,
            }}
          >
            <NodeIcon fontSize="small" />
          </Avatar>
          <Box sx={{ flexGrow: 1 }}>
            <Typography variant="body1" fontWeight="600">
              {data.label || name}
            </Typography>
            <Typography variant="caption" color="text.secondary">
              {data.stepNumber ? `Step ${data.stepNumber}: ${name}` : name}
            </Typography>
          </Box>
          <Box
            sx={{
              opacity: 0,
              transition: 'opacity 0.2s ease-in-out',
              '.MuiPaper-root:hover &': { opacity: 1 },
              display: 'flex',
              gap: 0.5,
            }}
          >
            <IconButton
              size="small"
              sx={{
                color: 'error.main',
                '&:hover': {
                  backgroundColor: 'error.light',
                  color: 'error.contrastText',
                },
              }}
              onClick={e => {
                e.stopPropagation();
                // This will trigger the context menu functionality
                const event = new MouseEvent('contextmenu', {
                  bubbles: true,
                  cancelable: true,
                  clientX: e.clientX,
                  clientY: e.clientY,
                });
                e.currentTarget.parentElement.parentElement.parentElement.dispatchEvent(event);
              }}
              title="Delete node"
            >
              <DeleteIcon fontSize="small" />
            </IconButton>
            <IconButton size="small" title="More options">
              <MoreVertIcon />
            </IconButton>
          </Box>
        </Box>
      </Box>
      {renderHandles(finalOutputs, 'source', Position.Right)}
    </Paper>
  );
};

export default React.memo(CustomNode);
