import { useState, useCallback } from 'react';

/**
 * Custom hook for managing context menu state and handlers
 * @param {Function} handleEdgeAddNode - Function to handle adding node on edge
 * @param {Function} handleDeleteNode - Function to handle node deletion
 * @param {Function} setSelectedNode - Function to set selected node
 * @param {Array} nodes - Current nodes array
 * @returns {Object} Context menu state and handlers
 */
export const useContextMenu = (handleEdgeAddNode, handleDeleteNode, setSelectedNode, nodes) => {
  const [contextMenu, setContextMenu] = useState(null);

  const handleCloseContextMenu = useCallback(() => {
    setContextMenu(null);
  }, []);

  const handleEditNodeFromContextMenu = useCallback(
    nodeId => {
      const nodeToEdit = nodes.find(n => n.id === nodeId);
      if (nodeToEdit) {
        setSelectedNode(nodeToEdit);
      }
    },
    [nodes, setSelectedNode]
  );

  const handleNodeContextMenu = useCallback((event, node) => {
    event.preventDefault();
    setContextMenu({
      id: node.id,
      top: event.clientY,
      left: event.clientX,
      type: 'node',
    });
  }, []);

  const handleEdgeContextMenu = useCallback((event, edge) => {
    event.preventDefault();
    setContextMenu({
      id: edge.id,
      top: event.clientY,
      left: event.clientX,
      type: 'edge',
    });
  }, []);

  return {
    contextMenu,
    handleCloseContextMenu,
    handleEditNodeFromContextMenu,
    handleNodeContextMenu,
    handleEdgeContextMenu,
  };
};
