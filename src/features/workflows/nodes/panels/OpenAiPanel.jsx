import {
  Box,
  Typography,
  TextField,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  FormHelperText,
} from '@mui/material';
import React from 'react';

const OpenAiPanel = ({ data = {}, onDataChange }) => {
  const { prompt = '', model = 'gpt-3.5-turbo' } = data;

  const handleDataChange = (field, value) => {
    onDataChange({ ...data, [field]: value });
  };

  return (
    <Box sx={{ p: 2 }}>
      <Typography variant="h6" gutterBottom>
        Configure OpenAI Action
      </Typography>
      <Box sx={{ display: 'flex', flexDirection: 'column', gap: 3 }}>
        <FormControl fullWidth>
          <InputLabel id="openai-model-select-label">Model</InputLabel>
          <Select
            labelId="openai-model-select-label"
            value={model}
            label="Model"
            onChange={e => handleDataChange('model', e.target.value)}
          >
            <MenuItem value="gpt-4">GPT-4</MenuItem>
            <MenuItem value="gpt-3.5-turbo">GPT-3.5-Turbo</MenuItem>
          </Select>
          <FormHelperText>Select the OpenAI model to use.</FormHelperText>
        </FormControl>

        <TextField
          label="Prompt"
          value={prompt}
          onChange={e => handleDataChange('prompt', e.target.value)}
          fullWidth
          multiline
          rows={8}
          variant="outlined"
          helperText="Enter the prompt for the AI. You can use placeholders like {{input.data}} to include data from previous steps."
        />
      </Box>
    </Box>
  );
};

export default OpenAiPanel;
