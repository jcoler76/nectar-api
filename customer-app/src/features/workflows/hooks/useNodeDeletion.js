import { useState, useCallback } from 'react';

import { removeNodeEdges, removeMultipleNodeEdges } from '../utils/edgeManagement';

/**
 * Custom hook for managing node deletion with confirmation
 * @param {Array} nodes - Current nodes array
 * @param {Function} setNodes - Function to update nodes
 * @param {Function} setEdges - Function to update edges
 * @param {Object} selectedNode - Currently selected node
 * @param {Function} setSelectedNode - Function to update selected node
 * @param {Function} showNotification - Function to show notifications
 * @returns {Object} Node deletion handlers and state
 */
export const useNodeDeletion = (
  nodes,
  setNodes,
  setEdges,
  selectedNode,
  setSelectedNode,
  showNotification
) => {
  const [deleteConfirmDialog, setDeleteConfirmDialog] = useState(null);

  const handleDeleteNode = useCallback(
    nodeId => {
      const nodeToDelete = nodes.find(n => n.id === nodeId);
      if (!nodeToDelete) return;

      // Show confirmation dialog
      setDeleteConfirmDialog({
        nodeId,
        nodeName: nodeToDelete.data.label || 'Untitled',
      });
    },
    [nodes]
  );

  const confirmDeleteNode = useCallback(() => {
    if (!deleteConfirmDialog) return;

    const { nodeId, nodeName } = deleteConfirmDialog;

    // Remove the node
    setNodes(currentNodes => currentNodes.filter(n => n.id !== nodeId));

    // Remove all edges connected to this node
    removeNodeEdges(nodeId, setEdges);

    // Clear selection if this node was selected
    if (selectedNode && selectedNode.id === nodeId) {
      setSelectedNode(null);
    }

    // Close dialog
    setDeleteConfirmDialog(null);

    showNotification(`Node "${nodeName}" deleted.`, 'info');
  }, [deleteConfirmDialog, setNodes, setEdges, selectedNode, setSelectedNode, showNotification]);

  const cancelDeleteNode = useCallback(() => {
    setDeleteConfirmDialog(null);
  }, []);

  const handleMultipleNodesDelete = useCallback(
    deletedNodes => {
      // This is called when nodes are deleted via keyboard (Delete key)
      if (deletedNodes.length === 0) return;

      if (deletedNodes.length === 1) {
        // Single node deletion - show confirmation
        const node = deletedNodes[0];
        setDeleteConfirmDialog({
          nodeId: node.id,
          nodeName: node.data.label || 'Untitled',
        });
      } else {
        // Multiple nodes deletion - handle directly with confirmation
        const nodeNames = deletedNodes.map(n => n.data.label || 'Untitled').join(', ');
        const confirmed = window.confirm(
          `Are you sure you want to delete ${deletedNodes.length} nodes (${nodeNames})? This action cannot be undone.`
        );

        if (confirmed) {
          const deletedNodeIds = deletedNodes.map(node => node.id);

          // Remove all edges connected to the deleted nodes
          removeMultipleNodeEdges(deletedNodeIds, setEdges);

          // Clear selection if selected node was deleted
          if (selectedNode && deletedNodeIds.includes(selectedNode.id)) {
            setSelectedNode(null);
          }

          showNotification(`${deletedNodes.length} node(s) deleted.`, 'info');
        }
      }
    },
    [showNotification, selectedNode, setEdges, setSelectedNode]
  );

  return {
    deleteConfirmDialog,
    handleDeleteNode,
    confirmDeleteNode,
    cancelDeleteNode,
    handleMultipleNodesDelete,
  };
};
