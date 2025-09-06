import { TextField, Box, Typography } from '@mui/material';
import React from 'react';

const IfNodeForm = ({ formData, handleInputChange }) => {
  return (
    <Box>
      <Typography variant="body2" sx={{ mb: 2 }}>
        Define the condition for the &quot;true&quot; path. You can use data from previous nodes
        with {'{{}}'} syntax.
      </Typography>
      <TextField
        fullWidth
        multiline
        rows={3}
        label="Condition"
        name="condition"
        value={formData.condition || ''}
        onChange={handleInputChange}
        sx={{ mb: 2 }}
        placeholder="{{data.status}} === 'success'"
      />
    </Box>
  );
};

export default IfNodeForm;
