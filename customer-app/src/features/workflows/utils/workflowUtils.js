/**
 * Performs a topological sort on the nodes of a workflow.
 * @param {Array} nodes - The array of nodes from React Flow.
 * @param {Array} edges - The array of edges from React Flow.
 * @returns {Array} - A new array of nodes sorted topologically.
 *                    Returns the original nodes array if a cycle is detected.
 */
export const getSortedNodes = (nodes, edges) => {
  if (nodes.length === 0) {
    return [];
  }

  const nodeMap = new Map(nodes.map(n => [n.id, n]));
  const inDegree = new Map(nodes.map(node => [node.id, 0]));
  const adjList = new Map(nodes.map(node => [node.id, []]));

  for (const edge of edges) {
    if (adjList.has(edge.source)) {
      adjList.get(edge.source).push(edge.target);
    }
    if (inDegree.has(edge.target)) {
      inDegree.set(edge.target, inDegree.get(edge.target) + 1);
    }
  }

  const queue = nodes.filter(node => inDegree.get(node.id) === 0);
  const sortedNodeIds = [];

  while (queue.length > 0) {
    const uNode = queue.shift();
    sortedNodeIds.push(uNode.id);

    const neighbors = adjList.get(uNode.id) || [];
    for (const vId of neighbors) {
      inDegree.set(vId, inDegree.get(vId) - 1);
      if (inDegree.get(vId) === 0) {
        const neighborNode = nodeMap.get(vId);
        if (neighborNode) {
          queue.push(neighborNode);
        }
      }
    }
  }

  if (sortedNodeIds.length !== nodes.length) {
    console.warn('Cycle detected in workflow graph. Cannot determine step order.');
    return nodes;
  }

  return sortedNodeIds.map(id => nodeMap.get(id));
};
