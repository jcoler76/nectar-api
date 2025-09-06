import {
  Drawer,
  Box,
  Typography,
  List,
  ListItem,
  ListItemButton,
  ListItemIcon,
  ListItemText,
  ListSubheader,
} from '@mui/material';
import React from 'react';

import { NODE_TYPES } from '../nodes/nodeTypes';

const NodePalette = ({ open, onClose, onNodeAdd }) => {
  const nodeCategories = React.useMemo(() => {
    const categories = {
      triggers: {
        name: 'Triggers',
        nodes: [],
      },
      actions: {
        name: 'Actions',
        nodes: [],
      },
      logic: {
        name: 'Logic',
        nodes: [],
      },
    };

    Object.values(NODE_TYPES).forEach(nodeDef => {
      if (nodeDef.category !== 'system' && categories[nodeDef.category]) {
        categories[nodeDef.category].nodes.push(nodeDef);
      }
    });

    return Object.values(categories).filter(cat => cat.nodes.length > 0);
  }, []);

  const handleAddNode = nodeDef => {
    const defaultData =
      typeof nodeDef.defaultData === 'function' ? nodeDef.defaultData() : nodeDef.defaultData || {};

    onNodeAdd({
      type: 'custom',
      data: {
        ...defaultData,
        nodeType: nodeDef.type,
      },
    });
    onClose();
  };

  return (
    <Drawer anchor="left" open={open} onClose={onClose}>
      <Box sx={{ width: 280, p: 2 }}>
        <Typography variant="h6" sx={{ mb: 2 }}>
          Add Node
        </Typography>
        <List>
          {nodeCategories.map(category => (
            <React.Fragment key={category.name}>
              <ListSubheader>{category.name}</ListSubheader>
              {category.nodes.map(nodeDef => (
                <ListItem key={nodeDef.type} disablePadding>
                  <ListItemButton onClick={() => handleAddNode(nodeDef)}>
                    <ListItemIcon>
                      <nodeDef.icon />
                    </ListItemIcon>
                    <ListItemText primary={nodeDef.name} secondary={nodeDef.description} />
                  </ListItemButton>
                </ListItem>
              ))}
            </React.Fragment>
          ))}
        </List>
      </Box>
    </Drawer>
  );
};

export default NodePalette;
