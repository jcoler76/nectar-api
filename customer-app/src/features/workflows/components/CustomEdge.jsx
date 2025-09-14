import AddCircleOutlineIcon from '@mui/icons-material/AddCircleOutline';
import { Box, IconButton } from '@mui/material';
import React from 'react';
import { BaseEdge, EdgeLabelRenderer, getSmoothStepPath } from 'reactflow';

export default function CustomEdge({
  id,
  sourceX,
  sourceY,
  targetX,
  targetY,
  sourcePosition,
  targetPosition,
  data,
  markerEnd,
}) {
  const [edgePath, labelX, labelY] = getSmoothStepPath({
    sourceX,
    sourceY,
    sourcePosition,
    targetX,
    targetY,
    targetPosition,
    borderRadius: 10,
  });

  const onEdgeClick = evt => {
    evt.stopPropagation();
    // The data object now contains the onAddNode function
    if (data && data.onAddNode) {
      // We pass the edgeId so we know where to insert the new node
      data.onAddNode(id);
    }
  };

  return (
    <>
      <BaseEdge
        path={edgePath}
        markerEnd={markerEnd}
        style={{ stroke: '#BDBDBD', strokeWidth: 2 }}
      />
      <EdgeLabelRenderer>
        <Box
          sx={{
            position: 'absolute',
            transform: `translate(-50%, -50%) translate(${labelX}px,${labelY}px)`,
            pointerEvents: 'all',
            // Make the button stand out more
            background: 'white',
            borderRadius: '50%',
            boxShadow: '0px 2px 4px rgba(0, 0, 0, 0.1)',
            '&:hover': {
              background: '#f0f0f0',
              boxShadow: '0px 3px 6px rgba(0, 0, 0, 0.15)',
            },
          }}
          className="nodrag nopan"
        >
          <IconButton
            aria-label="add node"
            onClick={onEdgeClick}
            size="medium"
            sx={{ color: '#6366F1' }}
          >
            <AddCircleOutlineIcon fontSize="medium" />
          </IconButton>
        </Box>
      </EdgeLabelRenderer>
    </>
  );
}
