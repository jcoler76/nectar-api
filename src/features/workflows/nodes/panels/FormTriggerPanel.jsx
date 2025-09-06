import ContentCopyIcon from '@mui/icons-material/ContentCopy';
import {
  TextField,
  Typography,
  Box,
  Paper,
  IconButton,
  Tooltip,
  FormControlLabel,
  Switch,
} from '@mui/material';
import React, { useMemo } from 'react';

import { useNotification } from '../../../../context/NotificationContext';

const FormTriggerPanel = ({ node, onNodeDataChange, workflowId }) => {
  const { showNotification } = useNotification();

  const formUrl = useMemo(() => {
    const baseUrl = (process.env.REACT_APP_API_URL || 'http://localhost:3001').replace(/\/$/, '');
    return `${baseUrl}/api/forms/trigger/${workflowId}`;
  }, [workflowId]);

  const htmlSnippet = useMemo(() => {
    return `<form action="${formUrl}" method="POST">
  <label for="name">Name:</label>
  <input type="text" id="name" name="name"><br><br>
  <label for="email">Email:</label>
  <input type="email" id="email" name="email"><br><br>
  <input type="submit" value="Submit">
</form>`;
  }, [formUrl]);

  if (!node || !node.data) {
    return null;
  }

  const nodeData = node.data;

  const handleChange = event => {
    const { name, value } = event.target;
    onNodeDataChange({ [name]: value });
  };

  const handleCopyToClipboard = (text, type) => {
    navigator.clipboard.writeText(text);
    showNotification(`${type} copied to clipboard!`, 'success');
  };

  return (
    <Box sx={{ p: 2 }}>
      <Typography variant="h6" gutterBottom>
        Form Submission Trigger
      </Typography>
      <TextField
        label="Node Label"
        name="label"
        value={nodeData.label || ''}
        onChange={handleChange}
        fullWidth
        margin="normal"
        variant="outlined"
      />

      <Box sx={{ mt: 2 }}>
        <Typography variant="subtitle2" gutterBottom>
          After Submission
        </Typography>
        <TextField
          label="Redirect URL (Optional)"
          name="redirectUrl"
          value={nodeData.redirectUrl || ''}
          onChange={handleChange}
          fullWidth
          margin="normal"
          variant="outlined"
          helperText="Redirect the user to this URL after the form is submitted."
        />
        <FormControlLabel
          control={
            <Switch
              checked={nodeData.passDataToRedirect || false}
              onChange={e => onNodeDataChange({ passDataToRedirect: e.target.checked })}
              name="passDataToRedirect"
            />
          }
          label="Pass form data to redirect URL as query parameters"
        />
      </Box>

      <Box sx={{ mt: 3, mb: 2 }}>
        <Typography variant="subtitle1" gutterBottom>
          Setup Information
        </Typography>
        <Typography variant="body2" color="text.secondary" sx={{ mb: 1 }}>
          Use the following URL as the action for your HTML form to trigger this workflow.
        </Typography>
        <Paper
          elevation={0}
          variant="outlined"
          sx={{ p: 1.5, display: 'flex', alignItems: 'center', backgroundColor: '#F9FAFB' }}
        >
          <Typography variant="body2" component="code" sx={{ flexGrow: 1, wordBreak: 'break-all' }}>
            {formUrl}
          </Typography>
          <Tooltip title="Copy URL">
            <IconButton size="small" onClick={() => handleCopyToClipboard(formUrl, 'URL')}>
              <ContentCopyIcon fontSize="small" />
            </IconButton>
          </Tooltip>
        </Paper>
        <Typography variant="body2" color="text.secondary" sx={{ mt: 2, mb: 1 }}>
          Here is a sample HTML form snippet:
        </Typography>
        <Paper
          elevation={0}
          variant="outlined"
          sx={{ p: 1.5, display: 'flex', alignItems: 'center', backgroundColor: '#F9FAFB' }}
        >
          <Typography
            variant="body2"
            component="code"
            sx={{ flexGrow: 1, wordBreak: 'break-all', whiteSpace: 'pre-wrap' }}
          >
            {htmlSnippet}
          </Typography>
          <Tooltip title="Copy Snippet">
            <IconButton
              size="small"
              onClick={() => handleCopyToClipboard(htmlSnippet, 'HTML Snippet')}
            >
              <ContentCopyIcon fontSize="small" />
            </IconButton>
          </Tooltip>
        </Paper>
      </Box>
    </Box>
  );
};

export default FormTriggerPanel;
