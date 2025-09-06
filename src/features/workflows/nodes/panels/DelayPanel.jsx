import {
  Box,
  Typography,
  TextField,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  Grid,
} from '@mui/material';
import React from 'react';

const DelayPanel = ({ nodeData, onNodeDataChange }) => {
  const handleInputChange = event => {
    const { name, value } = event.target;
    // Ensure delay is a number
    const processedValue = name === 'delay' ? Number(value) : value;
    onNodeDataChange({ [name]: processedValue });
  };

  return (
    <Box sx={{ p: 2 }}>
      <Typography variant="h6" gutterBottom>
        Configure Delay
      </Typography>
      <TextField
        label="Node Label"
        name="label"
        value={nodeData.label || ''}
        onChange={handleInputChange}
        fullWidth
        margin="normal"
        variant="outlined"
      />
      <Typography variant="body1" sx={{ mt: 2, mb: 1 }}>
        Wait for a specified amount of time before continuing the workflow.
      </Typography>
      <Grid container spacing={2}>
        <Grid item xs={6}>
          <TextField
            label="Duration"
            name="delay"
            type="number"
            value={nodeData.delay || 1}
            onChange={handleInputChange}
            fullWidth
            margin="normal"
            variant="outlined"
            inputProps={{ min: 0 }}
          />
        </Grid>
        <Grid item xs={6}>
          <FormControl fullWidth margin="normal">
            <InputLabel>Unit</InputLabel>
            <Select
              name="unit"
              value={nodeData.unit || 'seconds'}
              onChange={handleInputChange}
              label="Unit"
            >
              <MenuItem value="seconds">Seconds</MenuItem>
              <MenuItem value="minutes">Minutes</MenuItem>
              <MenuItem value="hours">Hours</MenuItem>
              <MenuItem value="days">Days</MenuItem>
            </Select>
          </FormControl>
        </Grid>
      </Grid>
    </Box>
  );
};

export default DelayPanel;
