import { useCallback } from 'react';
import { v4 as uuidv4 } from 'uuid';

import { getLayoutedElements, NODE_WIDTH } from '../utils/workflowLayout';

/**
 * Custom hook for managing workflow nodes
 * @param {Array} nodes - Current nodes array
 * @param {Array} edges - Current edges array
 * @param {Function} setNodes - Function to update nodes
 * @param {Function} setEdges - Function to update edges
 * @param {Function} showNotification - Function to show notifications
 * @param {Function} project - React Flow project function for coordinate transformation
 * @param {Function} fitView - React Flow fitView function
 * @param {Function} getNodeDefinition - Function to get node definition by type
 * @returns {Object} Node management handlers
 */
export const useNodeManagement = (
  nodes,
  edges,
  setNodes,
  setEdges,
  showNotification,
  project,
  fitView,
  getNodeDefinition
) => {
  const handleNodeDataChange = useCallback(
    (nodeId, newData) => {
      setNodes(nds =>
        nds.map(node => {
          if (node.id === nodeId) {
            return { ...node, data: { ...node.data, ...newData } };
          }
          return node;
        })
      );
    },
    [setNodes]
  );

  const handleNodeUpgrade = useCallback(
    (nodeId, newType) => {
      const nodeDef = getNodeDefinition(newType);
      if (!nodeDef) return;

      const defaultData =
        typeof nodeDef.defaultData === 'function' ? nodeDef.defaultData() : nodeDef.defaultData;

      setNodes(nds =>
        nds.map(node => {
          if (node.id === nodeId) {
            return { ...node, data: { ...defaultData, nodeType: newType } };
          }
          return node;
        })
      );
    },
    [setNodes, getNodeDefinition]
  );

  const addNodeBetweenEdges = useCallback(
    async (nodeType, edgeForNodeInsertion) => {
      const nodeDef = getNodeDefinition(nodeType);
      if (!nodeDef) {
        showNotification(`Unknown node type: ${nodeType}`, 'error');
        return;
      }

      const defaultData =
        typeof nodeDef.defaultData === 'function' ? nodeDef.defaultData() : nodeDef.defaultData;

      const newNode = {
        id: uuidv4(),
        type: 'custom',
        position: { x: 0, y: 0 }, // Will be set by layout
        data: {
          ...defaultData,
          nodeType: nodeDef.type,
        },
        draggable: true,
        selectable: true,
      };

      // Find the target edge
      const targetEdge = edges.find(e => e.id === edgeForNodeInsertion);
      if (!targetEdge) {
        showNotification('Target edge not found.', 'error');
        return;
      }

      // Create new edges: source -> newNode -> target
      const newEdge1 = {
        id: `${targetEdge.source}->${newNode.id}`,
        source: targetEdge.source,
        sourceHandle: targetEdge.sourceHandle,
        target: newNode.id,
        type: 'custom',
      };

      const newEdge2 = {
        id: `${newNode.id}->${targetEdge.target}`,
        source: newNode.id,
        target: targetEdge.target,
        targetHandle: targetEdge.targetHandle,
        type: 'custom',
      };

      const updatedNodes = nodes.concat(newNode);
      const updatedEdges = edges
        .filter(e => e.id !== edgeForNodeInsertion)
        .concat([newEdge1, newEdge2]);

      // Apply layout to position the new node properly
      try {
        const { nodes: layoutedNodes, edges: layoutedEdges } = await getLayoutedElements(
          updatedNodes,
          updatedEdges
        );
        setNodes(layoutedNodes);
        setEdges(layoutedEdges);
        showNotification(`${nodeDef.name} node inserted.`, 'success');
        // Center the view after layout
        setTimeout(() => fitView({ padding: 0.1 }), 100);
      } catch (error) {
        showNotification('Failed to layout nodes after insertion.', 'error');
      }
    },
    [nodes, edges, setNodes, setEdges, showNotification, fitView, getNodeDefinition]
  );

  const addStandaloneNode = useCallback(
    nodeType => {
      const nodeDef = getNodeDefinition(nodeType);
      if (!nodeDef) {
        showNotification(`Unknown node type: ${nodeType}`, 'error');
        return;
      }

      const defaultData =
        typeof nodeDef.defaultData === 'function' ? nodeDef.defaultData() : nodeDef.defaultData;

      const position = project({
        x: window.innerWidth / 2 - NODE_WIDTH / 2,
        y: window.innerHeight / 3,
      });

      const newNode = {
        id: uuidv4(),
        type: 'custom',
        position,
        data: {
          ...defaultData,
          nodeType: nodeDef.type,
        },
        draggable: true,
        selectable: true,
      };

      setNodes(currentNodes => {
        const isTrigger = nodeDef.category === 'triggers';
        if (
          isTrigger &&
          currentNodes.some(n => getNodeDefinition(n.data.nodeType)?.category === 'triggers')
        ) {
          showNotification('Only one trigger node is allowed per workflow.', 'error');
          return currentNodes;
        }
        showNotification(`${nodeDef.name} node added.`, 'success');
        // Center the view after adding the node
        setTimeout(() => fitView({ padding: 0.1 }), 100);
        return currentNodes.concat(newNode);
      });
    },
    [setNodes, showNotification, project, fitView, getNodeDefinition]
  );

  return {
    handleNodeDataChange,
    handleNodeUpgrade,
    addNodeBetweenEdges,
    addStandaloneNode,
  };
};
