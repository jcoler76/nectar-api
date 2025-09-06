import { Box, Typography, TextField } from '@mui/material';
import React from 'react';

const TransformNodeForm = ({ formData, handleInputChange }) => {
  return (
    <Box>
      <Typography variant="body2" sx={{ mb: 2 }}>
        Write Javascript code to transform the input data. The input data is available as a variable
        named `data`. The function must return an object.
      </Typography>
      <TextField
        fullWidth
        multiline
        rows={10}
        label="Transformation Code"
        name="transformCode"
        value={formData.transformCode || 'return { "new_field": data.some_field };'}
        onChange={handleInputChange}
        sx={{
          mb: 2,
          fontFamily: 'monospace',
          '& .MuiInputBase-input': {
            fontFamily: 'monospace',
          },
        }}
        placeholder="return data.map(item => ({ id: item.id, name: item.name.toUpperCase() }));"
      />
    </Box>
  );
};

export default TransformNodeForm;
