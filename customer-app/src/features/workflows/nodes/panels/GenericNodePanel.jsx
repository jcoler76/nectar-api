import { Box, Typography, FormControl, InputLabel, Select, MenuItem } from '@mui/material';
import React from 'react';

import { NODE_TYPES } from '../nodeTypes';

const GenericNodePanel = ({ onNodeUpgrade }) => {
  const handleTypeChange = event => {
    const newType = event.target.value;
    if (newType) {
      onNodeUpgrade(newType);
    }
  };

  return (
    <Box sx={{ p: 2 }}>
      <Typography variant="h6" gutterBottom>
        Unrecognized Node
      </Typography>
      <Typography variant="body1" sx={{ mb: 2 }}>
        This node&apos;s type is not recognized by the new system. Please select a new type to
        continue.
      </Typography>

      <FormControl fullWidth margin="normal">
        <InputLabel>Upgrade Node Type</InputLabel>
        <Select onChange={handleTypeChange} label="Upgrade Node Type" defaultValue="">
          {Object.values(NODE_TYPES).map(def => (
            <MenuItem key={def.type} value={def.type}>
              {def.name} ({def.category})
            </MenuItem>
          ))}
        </Select>
      </FormControl>

      <Typography variant="caption" color="text.secondary" sx={{ mt: 2, display: 'block' }}>
        Note: Upgrading the node will reset its properties to the defaults for the new type.
      </Typography>
    </Box>
  );
};

export default GenericNodePanel;
