import ContentCopyIcon from '@mui/icons-material/ContentCopy';
import { TextField, Typography, Box, Paper, IconButton, Tooltip } from '@mui/material';
import React, { useMemo } from 'react';

import { useNotification } from '../../../../context/NotificationContext';

const FileTriggerPanel = ({ node, onNodeDataChange, workflowId }) => {
  const { showNotification } = useNotification();

  const uploadUrl = useMemo(() => {
    const baseUrl = (process.env.REACT_APP_API_URL || 'http://localhost:3001').replace(/\/$/, '');
    return `${baseUrl}/api/files/trigger/${workflowId}`;
  }, [workflowId]);

  const curlSnippet = useMemo(() => {
    return `curl -X POST -F "file=@/path/to/your/file.txt" ${uploadUrl}`;
  }, [uploadUrl]);

  if (!node || !node.data) {
    return null;
  }

  const nodeData = node.data;

  const handleChange = event => {
    const { name, value } = event.taget;
    onNodeDataChange({ [name]: value });
  };

  const handleCopyToClipboard = (text, type) => {
    navigator.clipboard.writeText(text);
    showNotification(`${type} copied to clipboard!`, 'success');
  };

  return (
    <Box sx={{ p: 2 }}>
      <Typography variant="h6" gutterBottom>
        File Upload Trigger
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

      <Box sx={{ mt: 3, mb: 2 }}>
        <Typography variant="subtitle1" gutterBottom>
          Setup Information
        </Typography>
        <Typography variant="body2" color="text.secondary" sx={{ mb: 1 }}>
          Upload a file to the following URL to trigger this workflow. The request must be a POST
          with multipart/form-data.
        </Typography>
        <Paper
          elevation={0}
          variant="outlined"
          sx={{ p: 1.5, display: 'flex', alignItems: 'center', backgroundColor: '#F9FAFB' }}
        >
          <Typography variant="body2" component="code" sx={{ flexGrow: 1, wordBreak: 'break-all' }}>
            {uploadUrl}
          </Typography>
          <Tooltip title="Copy URL">
            <IconButton size="small" onClick={() => handleCopyToClipboard(uploadUrl, 'URL')}>
              <ContentCopyIcon fontSize="small" />
            </IconButton>
          </Tooltip>
        </Paper>
        <Typography variant="body2" color="text.secondary" sx={{ mt: 2, mb: 1 }}>
          Here is a sample cURL command:
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
            {curlSnippet}
          </Typography>
          <Tooltip title="Copy Snippet">
            <IconButton
              size="small"
              onClick={() => handleCopyToClipboard(curlSnippet, 'cURL Snippet')}
            >
              <ContentCopyIcon fontSize="small" />
            </IconButton>
          </Tooltip>
        </Paper>
      </Box>
    </Box>
  );
};

export default FileTriggerPanel;
