import { Box } from '@mui/material';
import React, { useMemo } from 'react';
import ReactFlow, { Controls, Background, MiniMap } from 'reactflow';
import 'reactflow/dist/style.css';

import CustomEdge from './CustomEdge';

const WorkflowCanvas = props => {
  const {
    nodes,
    edges,
    nodeTypes,
    onConnect,
    onNodesChange,
    onEdgesChange,
    isValidConnection,
    onConnectStart,
    onConnectEnd,
    onNodeClick,
    onNodesDelete,
    onNodeContextMenu,
    onEdgeContextMenu,
  } = props;

  const edgeTypes = useMemo(() => ({ custom: CustomEdge }), []);

  return (
    <Box sx={{ width: '100%', height: '100%' }}>
      <ReactFlow
        nodes={nodes}
        edges={edges}
        onNodesChange={onNodesChange}
        onEdgesChange={onEdgesChange}
        onConnect={onConnect}
        onNodeClick={onNodeClick}
        nodeTypes={nodeTypes}
        edgeTypes={edgeTypes}
        isValidConnection={isValidConnection}
        onConnectStart={onConnectStart}
        onConnectEnd={onConnectEnd}
        onNodesDelete={onNodesDelete}
        onNodeContextMenu={onNodeContextMenu}
        onEdgeContextMenu={onEdgeContextMenu}
        deleteKeyCode="Delete"
        multiSelectionKeyCode="Shift"
        fitView
      >
        <Background />
        <Controls />
        <MiniMap />
      </ReactFlow>
    </Box>
  );
};

export default WorkflowCanvas;
