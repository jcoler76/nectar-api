/**
 * Validates if a connection between two nodes is allowed
 * @param {Object} connection - The connection to validate
 * @param {Array} edges - Current edges in the workflow
 * @param {Object} connectingNode - Node being connected from
 * @param {Function} showNotification - Notification function
 * @returns {boolean} Whether the connection is valid
 */
export const isValidConnection = (connection, edges, connectingNode, showNotification) => {
  // Prevent self-connections
  if (connection.source === connection.target) {
    return false;
  }

  // Check if connecting from a target handle (not allowed)
  const sourceHandleType = connectingNode?.handleType;
  if (sourceHandleType === 'target') {
    return false;
  }

  // Check if the target input is already connected
  const isTargetInputTaken = edges.some(
    edge => edge.target === connection.target && edge.targetHandle === connection.targetHandle
  );

  if (isTargetInputTaken) {
    if (showNotification) {
      showNotification('Input is already connected.', 'error');
    }
    return false;
  }

  return true;
};
