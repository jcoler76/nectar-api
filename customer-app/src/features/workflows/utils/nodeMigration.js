import { NODE_TYPES, getNodeDefinition } from '../nodes/nodeTypes';

/**
 * Resolve default data for a node definition
 * @param {Object} nodeDef - Node definition
 * @returns {Object} Default data for the node
 */
const resolveDefaultData = nodeDef => {
  return typeof nodeDef.defaultData === 'function' ? nodeDef.defaultData() : nodeDef.defaultData;
};

/**
 * Migrate node data from old formats to current format
 * Handles legacy node types and data structure changes
 * @param {Object} node - Node to migrate
 * @returns {Object} Migrated node
 */
export const migrateNodeData = node => {
  if (!node.data) return node;

  // Handle the old filter type migration to router
  if (node.data.nodeType === 'logic:filter') {
    const nodeDef = getNodeDefinition('logic:router');
    return {
      ...node,
      data: {
        ...resolveDefaultData(nodeDef), // Apply the new default rules
        label: node.data.label || 'Router', // Preserve old label if it exists
        nodeType: 'logic:router',
      },
    };
  }

  // Map old node types to new ones
  const nodeTypeMap = {
    webhook: 'trigger:webhook',
    default: 'generic:unrecognized',
  };

  // If the node type is already valid, return as-is
  if (node.data.nodeType && NODE_TYPES[node.data.nodeType]) {
    return node;
  }

  // Map to new type or use unrecognized as fallback
  const mappedType = nodeTypeMap[node.data.nodeType] || 'generic:unrecognized';
  const nodeDef = getNodeDefinition(mappedType);

  return {
    ...node,
    data: {
      ...resolveDefaultData(nodeDef),
      ...node.data,
      nodeType: mappedType,
    },
  };
};
