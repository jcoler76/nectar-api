import AddIcon from '@mui/icons-material/Add';
import DeleteIcon from '@mui/icons-material/Delete';
import ExpandMoreIcon from '@mui/icons-material/ExpandMore';
import {
  Box,
  Typography,
  TextField,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  Accordion,
  AccordionSummary,
  AccordionDetails,
  Button,
  IconButton,
  Paper,
  CircularProgress,
  Alert,
} from '@mui/material';
import React, { useState, useEffect } from 'react';
import { Prism as SyntaxHighlighter } from 'react-syntax-highlighter';
import { coy } from 'react-syntax-highlighter/dist/esm/styles/prism';

import { useNotification } from '../../../../context/NotificationContext';
import api from '../../../../services/api';

const HttpRequestPanel = ({ nodeData, onNodeDataChange }) => {
  const { showNotification } = useNotification();
  const [isTesting, setIsTesting] = useState(false);
  const [testResponse, setTestResponse] = useState(null);
  const [localUrl, setLocalUrl] = useState(nodeData?.url || '');

  // Sync local state with external changes
  useEffect(() => {
    setLocalUrl(nodeData?.url || '');
  }, [nodeData?.url]);

  // Debounced update for URL field
  useEffect(() => {
    const timeoutId = setTimeout(() => {
      if (localUrl !== (nodeData?.url || '')) {
        onNodeDataChange({ url: localUrl });
      }
    }, 300);

    return () => clearTimeout(timeoutId);
  }, [localUrl, nodeData?.url, onNodeDataChange]);

  if (!nodeData) {
    return null;
  }

  const handleInputChange = event => {
    const { name, value } = event.target;
    if (name === 'url') {
      setLocalUrl(value);
    } else {
      onNodeDataChange({ [name]: value });
    }
  };

  const handleHeaderChange = (index, field, value) => {
    const newHeaders = [...(nodeData.headers || [])];
    newHeaders[index] = { ...newHeaders[index], [field]: value };
    onNodeDataChange({ headers: newHeaders });
  };

  const handleAddHeader = () => {
    const newHeaders = [...(nodeData.headers || []), { key: '', value: '' }];
    onNodeDataChange({ headers: newHeaders });
  };

  const handleRemoveHeader = index => {
    const newHeaders = [...(nodeData.headers || [])];
    newHeaders.splice(index, 1);
    onNodeDataChange({ headers: newHeaders });
  };

  const handleTestRequest = async () => {
    setIsTesting(true);
    setTestResponse(null);

    const { url, method, headers, body } = nodeData;

    if (!url) {
      showNotification('URL is required to send a test request.', 'error');
      setIsTesting(false);
      return;
    }

    // Warn user about unresolved variables. The backend won't replace them either.
    if (url.includes('{{') || (body && body.includes('{{'))) {
      showNotification(
        'Test request will not replace template variables like {{input.value}}. Please use static values for testing.',
        'warning'
      );
    }

    try {
      const { data: responseData } = await api.post('/api/workflows/test-http-request', {
        url,
        method,
        headers,
        body,
      });

      setTestResponse({
        status: responseData.status,
        statusText: responseData.statusText,
        body: responseData.body,
        ok: responseData.status >= 200 && responseData.status < 300,
      });
    } catch (error) {
      console.error('Test request error:', error);

      let errorMessage = error.message;
      let statusCode = 'Error';
      let statusText = 'Request Failed';

      // Check if it's an axios error with response
      if (error.response) {
        statusCode = error.response.status;
        statusText = error.response.statusText;
        errorMessage = error.response.data?.message || error.response.data || error.message;
      } else if (error.request) {
        statusText = 'Network Error';
        errorMessage = 'No response received from server. Check if the API is running.';
      }

      setTestResponse({
        status: statusCode,
        statusText: statusText,
        body: errorMessage,
        ok: false,
      });
    } finally {
      setIsTesting(false);
    }
  };

  return (
    <Box sx={{ p: 2 }}>
      <Typography variant="h6" gutterBottom>
        Configure HTTP Request
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
      <FormControl fullWidth margin="normal">
        <InputLabel>Method</InputLabel>
        <Select
          name="method"
          value={nodeData.method || 'POST'}
          onChange={handleInputChange}
          label="Method"
        >
          <MenuItem value="GET">GET</MenuItem>
          <MenuItem value="POST">POST</MenuItem>
          <MenuItem value="PUT">PUT</MenuItem>
          <MenuItem value="PATCH">PATCH</MenuItem>
          <MenuItem value="DELETE">DELETE</MenuItem>
        </Select>
      </FormControl>
      <TextField
        label="URL"
        name="url"
        value={localUrl}
        onChange={handleInputChange}
        fullWidth
        margin="normal"
        variant="outlined"
        placeholder="https://api.example.com/data"
      />

      <Accordion sx={{ mt: 2 }}>
        <AccordionSummary expandIcon={<ExpandMoreIcon />}>
          <Typography>Headers</Typography>
        </AccordionSummary>
        <AccordionDetails>
          {nodeData.headers &&
            nodeData.headers.map((header, index) => (
              <Paper
                key={index}
                elevation={0}
                variant="outlined"
                sx={{ p: 1, mb: 1, display: 'flex', gap: 1, alignItems: 'center' }}
              >
                <TextField
                  label="Key"
                  value={header.key}
                  onChange={e => handleHeaderChange(index, 'key', e.target.value)}
                  variant="outlined"
                  size="small"
                />
                <TextField
                  label="Value"
                  value={header.value}
                  onChange={e => handleHeaderChange(index, 'value', e.target.value)}
                  variant="outlined"
                  size="small"
                  sx={{ flexGrow: 1 }}
                />
                <IconButton onClick={() => handleRemoveHeader(index)}>
                  <DeleteIcon />
                </IconButton>
              </Paper>
            ))}
          <Button startIcon={<AddIcon />} onClick={handleAddHeader}>
            Add Header
          </Button>
        </AccordionDetails>
      </Accordion>

      <Accordion sx={{ mt: 1 }}>
        <AccordionSummary expandIcon={<ExpandMoreIcon />}>
          <Typography>Body</Typography>
        </AccordionSummary>
        <AccordionDetails>
          <TextField
            label="JSON Body"
            name="body"
            value={nodeData.body || ''}
            onChange={handleInputChange}
            fullWidth
            margin="normal"
            variant="outlined"
            multiline
            rows={6}
            placeholder={'{\n    "key": "value",\n    "data": {{input.someValue}}\n}'}
            helperText="Use {{variable}} syntax to insert data from previous steps."
          />
        </AccordionDetails>
      </Accordion>

      <Box sx={{ mt: 3, mb: 2 }}>
        <Typography variant="subtitle1" gutterBottom>
          Test Request
        </Typography>
        <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
          Click the button below to send a test request to the configured URL. This will not use
          data from previous nodes.
        </Typography>
        <Button
          variant="contained"
          onClick={handleTestRequest}
          disabled={isTesting}
          startIcon={isTesting ? <CircularProgress size={20} /> : null}
        >
          {isTesting ? 'Testing...' : 'Send Test Request'}
        </Button>
      </Box>

      {testResponse && (
        <Box sx={{ mt: 2 }}>
          <Typography variant="subtitle1" gutterBottom>
            Test Response
          </Typography>
          <Alert severity={testResponse.ok ? 'success' : 'error'} sx={{ mb: 2 }}>
            Status: {testResponse.status} {testResponse.statusText}
          </Alert>
          <Typography variant="subtitle2" gutterBottom>
            Response Body
          </Typography>
          <Paper
            elevation={0}
            variant="outlined"
            sx={{ p: 1.5, backgroundColor: '#F9FAFB', maxHeight: 300, overflowY: 'auto' }}
          >
            {testResponse.body ? (
              <SyntaxHighlighter language="json" style={coy} customStyle={{ margin: 0 }}>
                {(() => {
                  try {
                    // If the body is a string representing an object, parse and prettify
                    if (typeof testResponse.body === 'string') {
                      const parsed = JSON.parse(testResponse.body);
                      return JSON.stringify(parsed, null, 2);
                    }
                    // If it's already an object
                    return JSON.stringify(testResponse.body, null, 2);
                  } catch (e) {
                    // Otherwise, return as plain text
                    return testResponse.body;
                  }
                })()}
              </SyntaxHighlighter>
            ) : (
              <Typography variant="body2" color="text.secondary">
                No response body.
              </Typography>
            )}
          </Paper>
        </Box>
      )}
    </Box>
  );
};

export default HttpRequestPanel;
