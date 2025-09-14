import { addEdge } from 'reactflow';

/**
 * Creates a custom edge with standard properties
 * @param {Object} connection - The connection object from React Flow
 * @returns {Object} Custom edge object
 */
export const createCustomEdge = connection => {
  return {
    ...connection,
    type: 'custom',
  };
};

/**
 * Handles the connection between nodes with validation
 * @param {Object} connection - The connection to create
 * @param {Function} isValidConnection - Validation function
 * @param {Function} setEdges - Function to update edges
 * @returns {boolean} Whether the connection was created
 */
export const handleNodeConnection = (connection, isValidConnection, setEdges) => {
  if (isValidConnection(connection)) {
    const newEdge = createCustomEdge(connection);
    setEdges(eds => addEdge(newEdge, eds));
    return true;
  }
  return false;
};

/**
 * Removes all edges connected to a specific node
 * @param {string} nodeId - ID of the node
 * @param {Function} setEdges - Function to update edges
 */
export const removeNodeEdges = (nodeId, setEdges) => {
  setEdges(currentEdges =>
    currentEdges.filter(edge => edge.source !== nodeId && edge.target !== nodeId)
  );
};

/**
 * Removes edges connected to multiple nodes
 * @param {Array} nodeIds - Array of node IDs
 * @param {Function} setEdges - Function to update edges
 */
export const removeMultipleNodeEdges = (nodeIds, setEdges) => {
  setEdges(currentEdges =>
    currentEdges.filter(edge => !nodeIds.includes(edge.source) && !nodeIds.includes(edge.target))
  );
};

/**
 * Configure edges with custom type and additional data
 * @param {Array} edges - Array of edges
 * @param {Function} onAddNode - Handler for adding nodes on edges
 * @returns {Array} Configured edges with custom data
 */
export const configureEdgesWithData = (edges, onAddNode) => {
  return edges.map(edge => ({
    ...edge,
    type: 'custom',
    data: {
      onAddNode,
    },
  }));
};
