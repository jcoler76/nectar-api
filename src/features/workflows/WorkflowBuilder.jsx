import { Box } from '@mui/material';
import React, { memo, useState, useEffect, useCallback, useRef, useMemo } from 'react';
import { useParams } from 'react-router-dom';
import { useReactFlow, ReactFlowProvider, applyNodeChanges, applyEdgeChanges } from 'reactflow';
import { v4 as uuidv4 } from 'uuid';

import ConfirmDialog from '../../components/common/ConfirmDialog';
import LoadingSpinner from '../../components/common/LoadingSpinner';
import { useNotification } from '../../context/NotificationContext';
import { useBreadcrumbs } from '../../contexts/BreadcrumbContext';
import {
  sanitizeData,
  sanitizeNodeConfig,
  sanitizeString,
  sanitizeErrorMessage,
} from '../../utils/xssProtection';

import { getWorkflow, saveWorkflow } from './api/workflowApi';
import AddNodeModal from './components/AddNodeModal.jsx';
import ContextMenu from './components/ContextMenu';
import CustomNode from './components/CustomNode.jsx';
import ExecutionHistoryPanel from './components/ExecutionHistoryPanel';
import NodePalette from './components/NodePalette.jsx';
import PropertiesPanel from './components/PropertiesPanel';
import WorkflowBuilderTopNav from './components/WorkflowBuilderTopNav.jsx';
import WorkflowCanvas from './components/WorkflowCanvas.jsx';
import { useContextMenu } from './hooks/useContextMenu';
import { useNodeDeletion } from './hooks/useNodeDeletion';
import { useNodeManagement } from './hooks/useNodeManagement';
import { useWorkflowExecution } from './hooks/useWorkflowExecution';
import { useWorkflowHistory } from './hooks/useWorkflowHistory';
import { NODE_TYPES, getNodeDefinition } from './nodes/nodeTypes';
import { isValidConnection as validateConnection } from './utils/connectionValidation';
import { handleNodeConnection, configureEdgesWithData } from './utils/edgeManagement';
import { migrateNodeData } from './utils/nodeMigration';
import { getLayoutedElements, NODE_WIDTH } from './utils/workflowLayout';

const WorkflowBuilder = () => {
  const { id } = useParams();
  const { showNotification } = useNotification();
  const { setBreadcrumbs, clearBreadcrumbs } = useBreadcrumbs();
  const [workflow, setWorkflow] = useState(null);
  const {
    state: workflowState,
    setState: setWorkflowState,
    resetState,
    undo,
    redo,
    canUndo,
    canRedo,
  } = useWorkflowHistory({ nodes: [], edges: [] });
  const { nodes, edges } = workflowState;
  const setNodes = useCallback(
    newNodes => {
      setWorkflowState(current => {
        const updatedNodes = typeof newNodes === 'function' ? newNodes(current.nodes) : newNodes;
        return {
          ...current,
          nodes: updatedNodes,
        };
      });
    },
    [setWorkflowState]
  );
  const setEdges = useCallback(
    newEdges => {
      setWorkflowState(current => ({
        ...current,
        edges: typeof newEdges === 'function' ? newEdges(current.edges) : newEdges,
      }));
    },
    [setWorkflowState]
  );
  const [isPaletteOpen, setIsPaletteOpen] = useState(false);
  const [isAddNodeModalOpen, setIsAddNodeModalOpen] = useState(false);
  const [selectedNode, setSelectedNode] = useState(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isHistoryOpen, setIsHistoryOpen] = useState(false);
  const { project, fitView } = useReactFlow();
  const connectingNode = useRef(null);
  const [edgeForNodeInsertion, setEdgeForNodeInsertion] = useState(null);
  const [currentNodeForPanel, setCurrentNodeForPanel] = useState(null);

  const nodeTypes = useMemo(() => {
    const types = {};
    // Map all defined node types to CustomNode
    Object.keys(NODE_TYPES).forEach(type => {
      types[type] = CustomNode;
    });
    // Add a fallback for any unrecognized types
    types.default = CustomNode;
    // Ensure 'custom' type is mapped to CustomNode (this is what all nodes will use)
    types.custom = CustomNode;
    return types;
  }, []);

  const handleRenameWorkflow = newName => {
    setWorkflow(prev => ({ ...prev, name: newName }));
    // Update breadcrumb when workflow name changes
    setBreadcrumbs([
      { label: 'Home', path: '/dashboard' },
      { label: 'Workflows', path: '/workflows' },
      { label: newName || `Workflow ${id}`, path: `/workflows/${id}` },
    ]);
    showNotification('Workflow name updated. Save to apply changes.', 'info');
  };

  const handleLayout = useCallback(async () => {
    const { nodes: layoutedNodes, edges: layoutedEdges } = await getLayoutedElements(nodes, edges);
    setNodes(layoutedNodes);
    setEdges(layoutedEdges);
    // Center the view after layout
    setTimeout(() => fitView({ padding: 0.1 }), 100);
  }, [nodes, edges, setNodes, setEdges, fitView]);

  const onSave = useCallback(async () => {
    try {
      const workflowData = { name: workflow.name, active: workflow.active, nodes, edges };
      await saveWorkflow(id, workflowData);
      showNotification('Workflow saved successfully!', 'success');
    } catch (err) {
      showNotification(err.message || 'Failed to save workflow.', 'error');
    }
  }, [id, workflow, nodes, edges, showNotification]);

  const onConnectStart = useCallback((_, { nodeId, handleType }) => {
    connectingNode.current = { nodeId, handleType };
  }, []);

  const onConnectEnd = useCallback(() => {
    connectingNode.current = null;
  }, []);

  const isValidConnection = useCallback(
    connection => validateConnection(connection, edges, connectingNode.current, showNotification),
    [edges, showNotification]
  );

  // Use custom hook for node management
  const { handleNodeDataChange, handleNodeUpgrade, addNodeBetweenEdges, addStandaloneNode } =
    useNodeManagement(
      nodes,
      edges,
      setNodes,
      setEdges,
      showNotification,
      project,
      fitView,
      getNodeDefinition
    );

  // Use custom hook for node deletion
  const {
    deleteConfirmDialog,
    handleDeleteNode,
    confirmDeleteNode,
    cancelDeleteNode,
    handleMultipleNodesDelete,
  } = useNodeDeletion(nodes, setNodes, setEdges, selectedNode, setSelectedNode, showNotification);

  const onConnect = useCallback(
    connection => {
      handleNodeConnection(connection, isValidConnection, setEdges);
    },
    [isValidConnection, setEdges]
  );

  const onNodesDelete = useCallback(
    deletedNodes => handleMultipleNodesDelete(deletedNodes),
    [handleMultipleNodesDelete]
  );

  const handleAddNodeClick = () => {
    setEdgeForNodeInsertion(null);
    setIsAddNodeModalOpen(true);
  };

  // eslint-disable-next-line react-hooks/exhaustive-deps
  const onAddNodeFromPalette = useCallback(
    newNodeFromPalette => {
      setIsPaletteOpen(false);

      const nodeDef = getNodeDefinition(newNodeFromPalette.data.nodeType);
      const isTrigger = nodeDef.category === 'triggers';

      // If it's a trigger and there are already other triggers, prevent adding it.
      if (
        isTrigger &&
        nodes.some(n => getNodeDefinition(n.data.nodeType)?.category === 'triggers')
      ) {
        showNotification('Only one trigger node is allowed per workflow.', 'error');
        return;
      }

      const position = edgeForNodeInsertion
        ? { x: 0, y: 0 } // Position will be set by layout
        : project({ x: window.innerWidth / 2 - NODE_WIDTH / 2, y: window.innerHeight / 3 });

      const newNode = {
        ...newNodeFromPalette,
        id: uuidv4(),
        position,
      };

      if (edgeForNodeInsertion) {
        const edge = edges.find(e => e.id === edgeForNodeInsertion);
        if (!edge) return;

        const newEdge1 = {
          id: `${edge.source}->${newNode.id}`,
          source: edge.source,
          sourceHandle: edge.sourceHandle,
          target: newNode.id,
          type: 'custom',
        };
        const newEdge2 = {
          id: `${newNode.id}->${edge.target}`,
          source: newNode.id,
          target: edge.target,
          targetHandle: edge.targetHandle,
          type: 'custom',
        };

        const updatedNodes = nodes.concat(newNode);
        const updatedEdges = edges
          .filter(e => e.id !== edgeForNodeInsertion)
          .concat([newEdge1, newEdge2]);

        getLayoutedElements(updatedNodes, updatedEdges).then(
          ({ nodes: layoutedNodes, edges: layoutedEdges }) => {
            setNodes(layoutedNodes);
            setEdges(layoutedEdges);
          }
        );

        setEdgeForNodeInsertion(null);
      } else {
        setNodes(nds => nds.concat(newNode));
      }
    },
    [nodes, edges, setNodes, setEdges, edgeForNodeInsertion, showNotification, project]
  );

  const handleNodeClick = useCallback((event, node) => {
    setSelectedNode(node);
    setIsPaletteOpen(false);
  }, []);

  const handleNodeDataChangeWrapper = useCallback(
    (nodeId, newData) => {
      handleNodeDataChange(nodeId, newData);
      setSelectedNode(prev => ({ ...prev, data: { ...prev.data, ...newData } }));
    },
    [handleNodeDataChange]
  );

  const handleNodeUpgradeWrapper = useCallback(
    (nodeId, newType) => {
      const nodeDef = getNodeDefinition(newType);
      if (!nodeDef) return;

      const defaultData =
        typeof nodeDef.defaultData === 'function' ? nodeDef.defaultData() : nodeDef.defaultData;

      handleNodeUpgrade(nodeId, newType);
      const upgradedNode = { id: nodeId, data: { ...defaultData, nodeType: newType } };
      setSelectedNode(upgradedNode);
    },
    [handleNodeUpgrade]
  );

  // Use custom hook for workflow execution
  const { isExecuting, handleTestExecution } = useWorkflowExecution(
    id,
    onSave,
    setNodes,
    showNotification
  );

  // Clear selected node when executing tests
  const handleTestExecutionWrapper = useCallback(async () => {
    setSelectedNode(null);
    await handleTestExecution();
  }, [handleTestExecution]);

  // Handler for adding nodes between existing nodes via edge click
  const handleEdgeAddNode = useCallback(edgeId => {
    setEdgeForNodeInsertion(edgeId);
    setIsAddNodeModalOpen(true);
  }, []);

  // Enhanced onAddNode to handle insertion between nodes
  const onAddNodeEnhanced = useCallback(
    nodeType => {
      if (edgeForNodeInsertion) {
        addNodeBetweenEdges(nodeType, edgeForNodeInsertion);
        setEdgeForNodeInsertion(null);
      } else {
        addStandaloneNode(nodeType);
      }
    },
    [edgeForNodeInsertion, addNodeBetweenEdges, addStandaloneNode]
  );

  // Configure edges with custom type and data for the add button
  const edgesWithData = useMemo(() => {
    return configureEdgesWithData(edges, handleEdgeAddNode);
  }, [edges, handleEdgeAddNode]);

  useEffect(() => {
    const fetchWorkflowDetails = async () => {
      try {
        setIsLoading(true);
        const rawData = await getWorkflow(id);
        // Security: Sanitize all incoming data to prevent Stored XSS.
        const data = sanitizeData(rawData);
        const workflowData = {
          ...data,
          name: sanitizeString(data.name || ''),
        };
        setWorkflow(workflowData);

        // Set breadcrumbs with workflow name
        setBreadcrumbs([
          { label: 'Home', path: '/dashboard' },
          { label: 'Workflows', path: '/workflows' },
          { label: workflowData.name || `Workflow ${id}`, path: `/workflows/${id}` },
        ]);
        const migratedNodes = (data.nodes || []).map(node => {
          const migratedNode = migrateNodeData(node);
          return {
            ...migratedNode,
            data: sanitizeNodeConfig(migratedNode.data),
          };
        });
        resetState({ nodes: migratedNodes, edges: data.edges || [] });
      } catch (err) {
        const sanitizedError = sanitizeErrorMessage(
          err.message || 'Failed to fetch workflow details.'
        );
        showNotification(sanitizedError, 'error');
      } finally {
        setIsLoading(false);
      }
    };
    if (id) {
      fetchWorkflowDetails();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [id]);

  useEffect(() => {
    // Temporarily disabled for debugging.
    /*
        const sortedNodes = getSortedNodes(nodes, edges);
        const nodeStepMap = new Map();
        let actionStepCounter = 1;

        // Only assign step numbers to non-trigger nodes
        sortedNodes.forEach(node => {
            const nodeDef = getNodeDefinition(node.data.nodeType);
            if (nodeDef && nodeDef.category !== 'triggers') {
                nodeStepMap.set(node.id, actionStepCounter++);
            }
        });

        // Determine which nodes are actually connected to a trigger
        const connectedToTrigger = new Set();
        const queue = sortedNodes.filter(n => {
            const nodeDef = getNodeDefinition(n.data.nodeType);
            return nodeDef && nodeDef.category === 'triggers';
        }).map(n => n.id);

        const adjList = new Map(nodes.map(node => [node.id, []]));
        for (const edge of edges) {
            if (adjList.has(edge.source)) {
                adjList.get(edge.source).push(edge.target);
            }
        }

        while(queue.length > 0) {
            const nodeId = queue.shift();
            if (connectedToTrigger.has(nodeId)) continue;
            connectedToTrigger.add(nodeId);

            const neighbors = adjList.get(nodeId) || [];
            neighbors.forEach(neighborId => {
                if (!connectedToTrigger.has(neighborId)) {
                    queue.push(neighborId);
                }
            });
        }
        
        let needsUpdate = false;
        const updatedNodes = nodes.map(node => {
            // Only assign a step number if the node is connected to a trigger
            const newStepNumber = connectedToTrigger.has(node.id) ? nodeStepMap.get(node.id) : undefined;
            if (node.data.stepNumber !== newStepNumber) {
                needsUpdate = true;
                return { ...node, data: { ...node.data, stepNumber: newStepNumber } };
            }
            return node;
        });

        if (needsUpdate) {
            setNodes(updatedNodes);
        }
        */
  }, [nodes, edges, setNodes]);

  useEffect(() => {
    if (selectedNode) {
      // Find the most up-to-date version of the node from the state
      const fullNode = nodes.find(n => n.id === selectedNode.id);
      if (fullNode) {
        // If it's a router and is missing rules, add the default.
        // This is a safeguard for any nodes created before the defaultData was robust.
        if (fullNode.data.nodeType === 'logic:router' && !fullNode.data.rules) {
          const nodeDef = getNodeDefinition('logic:router');
          const defaultData =
            typeof nodeDef.defaultData === 'function' ? nodeDef.defaultData() : nodeDef.defaultData;
          const updatedNode = {
            ...fullNode,
            data: {
              ...fullNode.data,
              ...defaultData,
            },
          };
          setNodes(nds => nds.map(n => (n.id === updatedNode.id ? updatedNode : n)));
          setCurrentNodeForPanel(updatedNode);
        } else {
          setCurrentNodeForPanel(fullNode);
        }
      }
    } else {
      setCurrentNodeForPanel(null);
    }
  }, [selectedNode, nodes, setNodes]);

  // Cleanup breadcrumbs when component unmounts
  useEffect(() => {
    return () => {
      clearBreadcrumbs();
    };
  }, [clearBreadcrumbs]);

  // Use custom hook for context menu management
  const {
    contextMenu,
    handleCloseContextMenu,
    handleEditNodeFromContextMenu,
    handleNodeContextMenu,
    handleEdgeContextMenu,
  } = useContextMenu(handleEdgeAddNode, handleDeleteNode, setSelectedNode, nodes);

  const onEdgesChange = useCallback(
    changes => setEdges(eds => applyEdgeChanges(changes, eds)),
    [setEdges]
  );

  const onNodesChange = useCallback(
    changes => setNodes(nds => applyNodeChanges(changes, nds)),
    [setNodes]
  );

  if (isLoading || !workflow) return <LoadingSpinner />;

  return (
    <Box sx={{ display: 'flex', flexDirection: 'column', height: 'calc(100vh - 64px)' }}>
      <WorkflowBuilderTopNav
        workflowName={workflow.name}
        onRename={handleRenameWorkflow}
        isActive={workflow.active}
        onToggleActive={event => setWorkflow(prev => ({ ...prev, active: event.target.checked }))}
        onSave={onSave}
        onAddNode={handleAddNodeClick}
        onExecute={handleTestExecutionWrapper}
        isExecuting={isExecuting}
        onUndo={undo}
        onRedo={redo}
        canUndo={canUndo}
        canRedo={canRedo}
        onToggleHistory={() => setIsHistoryOpen(prev => !prev)}
        onLayout={handleLayout}
      />
      <Box
        sx={{ flex: 1, position: 'relative', backgroundColor: '#F9FAFB' }}
        onContextMenu={e => e.preventDefault()}
      >
        <WorkflowCanvas
          nodes={nodes}
          edges={edgesWithData}
          setNodes={setNodes}
          setEdges={setEdges}
          nodeTypes={nodeTypes}
          onConnect={onConnect}
          onNodesChange={onNodesChange}
          onEdgesChange={onEdgesChange}
          isValidConnection={isValidConnection}
          onConnectStart={onConnectStart}
          onConnectEnd={onConnectEnd}
          onNodeClick={handleNodeClick}
          onNodesDelete={onNodesDelete}
          onNodeContextMenu={handleNodeContextMenu}
          onEdgeContextMenu={handleEdgeContextMenu}
        />
        <NodePalette
          isOpen={isPaletteOpen}
          onClose={() => setIsPaletteOpen(false)}
          onAddNode={onAddNodeFromPalette}
        />
        <PropertiesPanel
          open={!!currentNodeForPanel}
          onClose={() => setSelectedNode(null)}
          selectedNode={currentNodeForPanel}
          onNodeDataChange={handleNodeDataChangeWrapper}
          onNodeUpgrade={newType => handleNodeUpgradeWrapper(selectedNode?.id, newType)}
          workflowId={id}
        />
        <ExecutionHistoryPanel
          open={isHistoryOpen}
          onClose={() => setIsHistoryOpen(false)}
          workflowId={id}
        />
        {contextMenu && (
          <ContextMenu
            menu={contextMenu}
            onClose={handleCloseContextMenu}
            onAddNode={handleEdgeAddNode}
            onDeleteNode={handleDeleteNode}
            onEditNode={handleEditNodeFromContextMenu}
          />
        )}
        <AddNodeModal
          open={isAddNodeModalOpen}
          onClose={() => setIsAddNodeModalOpen(false)}
          onAddNode={onAddNodeEnhanced}
        />
        <ConfirmDialog
          open={!!deleteConfirmDialog}
          title="Delete Node"
          message={`Are you sure you want to delete the node "${deleteConfirmDialog?.nodeName}"? This action cannot be undone.`}
          onConfirm={confirmDeleteNode}
          onCancel={cancelDeleteNode}
        />
      </Box>
    </Box>
  );
};

const MemoizedWorkflowBuilder = memo(WorkflowBuilder);

const WorkflowBuilderWrapper = () => (
  <ReactFlowProvider>
    <MemoizedWorkflowBuilder />
  </ReactFlowProvider>
);

export default WorkflowBuilderWrapper;
