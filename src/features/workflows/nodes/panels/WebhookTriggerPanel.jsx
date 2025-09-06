import ContentCopyIcon from '@mui/icons-material/ContentCopy';
import {
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  TextField,
  Typography,
  Box,
  Paper,
  IconButton,
  Tooltip,
  Button,
} from '@mui/material';
import React, { useMemo, useState } from 'react';

import { useNotification } from '../../../../context/NotificationContext';

const WebhookTriggerPanel = ({ node, onNodeDataChange, workflowId }) => {
  const { showNotification } = useNotification();
  const [isTesting, setIsTesting] = useState(false);

  const webhookUrl = useMemo(() => {
    // Ensure the base URL doesn't have a trailing slash, and the path has a leading slash
    const baseUrl = (process.env.REACT_APP_API_URL || 'http://localhost:3001').replace(/\/$/, '');
    return `${baseUrl}/api/webhooks/trigger/${workflowId}`;
  }, [workflowId]);

  const curlCommand = useMemo(() => {
    let headers = `-H "Content-Type: application/json"`;
    if (node?.data?.authType === 'apiKey' && node?.data?.headerName && node?.data?.apiKeyValue) {
      headers += ` -H "${node.data.headerName}: ${node.data.apiKeyValue}"`;
    }
    return `curl -X ${node?.data?.httpMethod || 'POST'} '${webhookUrl}' ${headers} -d '{"key": "value"}'`;
  }, [node, webhookUrl]);

  if (!node || !node.data) {
    return null;
  }

  const nodeData = node.data;

  const handleChange = event => {
    const { name, value } = event.target;
    onNodeDataChange({ [name]: value });
  };

  const webhookEvents = {
    catchHook: {
      name: 'Catch Hook',
      description: 'Triggers on a POST, PUT, or GET request. The request body is parsed as JSON.',
    },
    catchRawHook: {
      name: 'Catch Raw Hook',
      description: 'Gives the request body unparsed (raw) and also includes headers.',
    },
  };

  const handleCopyToClipboard = (text, type) => {
    navigator.clipboard.writeText(text);
    showNotification(`${type} copied to clipboard!`, 'success');
  };

  const handleTestConnection = async () => {
    setIsTesting(true);
    try {
      const headers = {
        'Content-Type': 'application/json',
      };
      if (nodeData.authType === 'apiKey' && nodeData.headerName && nodeData.apiKeyValue) {
        headers[nodeData.headerName] = nodeData.apiKeyValue;
      }

      const response = await fetch(webhookUrl, {
        method: nodeData.httpMethod || 'POST',
        headers,
        body: JSON.stringify({ key: 'value' }),
      });

      if (response.ok) {
        showNotification('Test request sent successfully!', 'success');
      } else {
        const errorData = await response.json();
        showNotification(`Test failed: ${errorData.message || response.statusText}`, 'error');
      }
    } catch (error) {
      showNotification(`Test failed: ${error.message}`, 'error');
    }
    setIsTesting(false);
  };

  return (
    <Box sx={{ p: 2 }}>
      <Typography variant="h6" gutterBottom>
        Webhook Trigger
      </Typography>
      <FormControl fullWidth margin="normal">
        <InputLabel>Trigger Event</InputLabel>
        <Select
          name="event"
          value={nodeData.event || 'catchHook'}
          onChange={handleChange}
          label="Trigger Event"
        >
          {Object.entries(webhookEvents).map(([key, value]) => (
            <MenuItem key={key} value={key}>
              {value.name}
            </MenuItem>
          ))}
        </Select>
        <Typography variant="caption" color="text.secondary" sx={{ mt: 1, ml: 1.5 }}>
          {webhookEvents[nodeData.event]?.description}
        </Typography>
      </FormControl>
      <TextField
        label="Node Label"
        name="label"
        value={nodeData.label || ''}
        onChange={handleChange}
        fullWidth
        margin="normal"
        variant="outlined"
      />
      <FormControl fullWidth margin="normal">
        <InputLabel>HTTP Method</InputLabel>
        <Select
          name="httpMethod"
          value={nodeData.httpMethod || 'POST'}
          onChange={handleChange}
          label="HTTP Method"
        >
          <MenuItem value="POST">POST</MenuItem>
          <MenuItem value="GET">GET</MenuItem>
          <MenuItem value="PUT">PUT</MenuItem>
        </Select>
      </FormControl>
      <FormControl fullWidth margin="normal">
        <InputLabel>Authentication</InputLabel>
        <Select
          name="authType"
          value={nodeData.authType || 'none'}
          onChange={handleChange}
          label="Authentication"
        >
          <MenuItem value="none">None</MenuItem>
          <MenuItem value="apiKey">API Key</MenuItem>
        </Select>
      </FormControl>
      {nodeData.authType === 'apiKey' && (
        <>
          <TextField
            label="Header Name"
            name="headerName"
            value={nodeData.headerName || ''}
            onChange={handleChange}
            fullWidth
            margin="normal"
            variant="outlined"
            helperText="The name of the HTTP header holding the API Key."
          />
          <TextField
            label="API Key Value"
            name="apiKeyValue"
            type="password"
            value={nodeData.apiKeyValue || ''}
            onChange={handleChange}
            fullWidth
            margin="normal"
            variant="outlined"
            helperText="The secret API Key value."
          />
        </>
      )}

      <Box sx={{ mt: 3, mb: 2 }}>
        <Typography variant="subtitle1" gutterBottom>
          Test Information
        </Typography>
        <Typography variant="body2" color="text.secondary" sx={{ mb: 1 }}>
          Use the following URL to trigger this workflow. The endpoint is automatically active when
          the workflow is saved.
        </Typography>
        <Paper
          elevation={0}
          variant="outlined"
          sx={{ p: 1.5, display: 'flex', alignItems: 'center', backgroundColor: '#F9FAFB' }}
        >
          <Typography variant="body2" component="code" sx={{ flexGrow: 1, wordBreak: 'break-all' }}>
            {webhookUrl}
          </Typography>
          <Tooltip title="Copy URL">
            <IconButton size="small" onClick={() => handleCopyToClipboard(webhookUrl, 'URL')}>
              <ContentCopyIcon fontSize="small" />
            </IconButton>
          </Tooltip>
        </Paper>
        <Typography variant="body2" color="text.secondary" sx={{ mt: 2, mb: 1 }}>
          Or use this cURL command to send a test request:
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
            {curlCommand}
          </Typography>
          <Tooltip title="Copy Command">
            <IconButton size="small" onClick={() => handleCopyToClipboard(curlCommand, 'Command')}>
              <ContentCopyIcon fontSize="small" />
            </IconButton>
          </Tooltip>
        </Paper>
        <Box sx={{ mt: 2 }}>
          <Button variant="contained" onClick={handleTestConnection} disabled={isTesting}>
            {isTesting ? 'Testing...' : 'Test Connection'}
          </Button>
        </Box>
      </Box>
    </Box>
  );
};

export default WebhookTriggerPanel;
