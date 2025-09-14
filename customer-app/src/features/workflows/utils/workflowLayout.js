import ELK from 'elkjs/lib/elk.bundled.js';

const elk = new ELK();

export const NODE_WIDTH = 300;
export const NODE_HEIGHT = 80;

/**
 * Apply automatic layout to workflow nodes and edges using ELK
 * @param {Array} nodes - Array of workflow nodes
 * @param {Array} edges - Array of workflow edges
 * @returns {Promise<{nodes: Array, edges: Array}>} Layouted elements
 */
export const getLayoutedElements = async (nodes, edges) => {
  const graph = {
    id: 'root',
    layoutOptions: {
      'elk.algorithm': 'layered',
      'elk.direction': 'DOWN',
      'elk.spacing.nodeNode': '80',
    },
    children: nodes.map(node => ({
      ...node,
      width: NODE_WIDTH,
      height: NODE_HEIGHT,
    })),
    edges: edges,
  };

  try {
    const layoutedGraph = await elk.layout(graph);
    const layoutedNodes = layoutedGraph.children.map(node => ({
      ...node,
      // React Flow uses the top-left corner of a node as its position, whereas ELK uses the center.
      position: { x: node.x, y: node.y },
    }));

    return { nodes: layoutedNodes, edges };
  } catch (e) {
    console.error('ELK layout failed:', e);
    return { nodes, edges };
  }
};
