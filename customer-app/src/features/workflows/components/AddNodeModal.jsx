import {
  Dialog,
  DialogTitle,
  DialogContent,
  Grid,
  Card,
  CardActionArea,
  CardContent,
  Typography,
  Box,
} from '@mui/material';
import React from 'react';

import { NODE_TYPES } from '../nodes/nodeTypes';

const AddNodeModal = ({ open, onClose, onAddNode }) => {
  const availableNodes = Object.values(NODE_TYPES).filter(node => node.category !== 'system');

  const groupedNodes = availableNodes.reduce((acc, node) => {
    const { category } = node;
    if (!acc[category]) {
      acc[category] = [];
    }
    acc[category].push(node);
    return acc;
  }, {});

  const handleSelectNode = nodeType => {
    onAddNode(nodeType);
    onClose();
  };

  const categoryColors = {
    triggers: 'primary.main',
    actions: 'secondary.main',
    logic: 'success.main',
  };

  const categoryHeadings = {
    triggers: 'Triggers',
    actions: 'Actions',
    logic: 'Logic & Routing',
  };

  return (
    <Dialog open={open} onClose={onClose} fullWidth maxWidth="md">
      <DialogTitle>
        <Typography variant="h5" component="span" sx={{ fontWeight: 'bold' }}>
          Add a Node
        </Typography>
      </DialogTitle>
      <DialogContent dividers>
        {Object.entries(groupedNodes).map(([category, nodes]) => (
          <Box key={category} sx={{ mb: 4 }}>
            <Typography
              variant="h6"
              sx={{
                fontWeight: 'bold',
                mb: 2,
                borderBottom: 2,
                borderColor: categoryColors[category] || 'grey.300',
                pb: 1,
                display: 'inline-block',
                color: categoryColors[category] || 'text.primary',
              }}
            >
              {categoryHeadings[category]}
            </Typography>
            <Grid container spacing={2}>
              {nodes.map(node => (
                <Grid item xs={12} sm={6} md={4} key={node.type}>
                  <Card
                    variant="outlined"
                    sx={{
                      height: '100%',
                      transition: 'transform 0.2s, box-shadow 0.2s',
                      '&:hover': {
                        transform: 'translateY(-4px)',
                        boxShadow: 6,
                      },
                    }}
                  >
                    <CardActionArea
                      onClick={() => handleSelectNode(node.type)}
                      sx={{
                        height: '100%',
                        display: 'flex',
                        flexDirection: 'column',
                        justifyContent: 'flex-start',
                      }}
                    >
                      <CardContent sx={{ textAlign: 'center' }}>
                        <node.icon
                          sx={{
                            fontSize: 40,
                            mb: 1,
                            color: categoryColors[category] || 'action.active',
                          }}
                        />
                        <Typography variant="subtitle1" sx={{ fontWeight: 'bold' }}>
                          {node.name}
                        </Typography>
                        <Typography variant="body2" color="text.secondary">
                          {node.description}
                        </Typography>
                      </CardContent>
                    </CardActionArea>
                  </Card>
                </Grid>
              ))}
            </Grid>
          </Box>
        ))}
      </DialogContent>
    </Dialog>
  );
};

export default AddNodeModal;
