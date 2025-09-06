import { TextField, MenuItem, Box } from '@mui/material';
import React from 'react';

const HttpRequestForm = ({ formData, handleInputChange }) => {
  return (
    <Box>
      <TextField
        fullWidth
        label="URL"
        name="url"
        value={formData.url || ''}
        onChange={handleInputChange}
        sx={{ mb: 2 }}
        placeholder="https://api.example.com/data"
      />
      <TextField
        select
        fullWidth
        label="HTTP Method"
        name="method"
        value={formData.method || 'GET'}
        onChange={handleInputChange}
        sx={{ mb: 2 }}
      >
        <MenuItem value="GET">GET</MenuItem>
        <MenuItem value="POST">POST</MenuItem>
        <MenuItem value="PUT">PUT</MenuItem>
        <MenuItem value="DELETE">DELETE</MenuItem>
        <MenuItem value="PATCH">PATCH</MenuItem>
      </TextField>
      <TextField
        fullWidth
        multiline
        rows={4}
        label="Headers (JSON)"
        name="headers"
        value={formData.headers || ''}
        onChange={handleInputChange}
        sx={{ mb: 2 }}
        placeholder='{ "Authorization": "Bearer YOUR_TOKEN" }'
      />
      <TextField
        fullWidth
        multiline
        rows={4}
        label="Body (JSON)"
        name="body"
        value={formData.body || ''}
        onChange={handleInputChange}
        sx={{ mb: 2 }}
        placeholder='{ "key": "value" }'
        disabled={formData.method === 'GET'}
      />
    </Box>
  );
};

export default HttpRequestForm;
