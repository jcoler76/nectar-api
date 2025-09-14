import AddIcon from '@mui/icons-material/Add';
import DeleteIcon from '@mui/icons-material/Delete';
import DragIndicatorIcon from '@mui/icons-material/DragIndicator';
import ExpandMoreIcon from '@mui/icons-material/ExpandMore';
import {
  Typography,
  Box,
  Button,
  Accordion,
  AccordionSummary,
  AccordionDetails,
  TextField,
  IconButton,
  Select,
  MenuItem,
  FormControl,
  InputLabel,
  Paper,
} from '@mui/material';
import React, { useState, useEffect } from 'react';

import { getConnections } from '../../../../services/connectionService';

const ApiCallEditor = ({ call, index, onUpdate }) => {
  const handleChange = (field, value) => {
    onUpdate(index, { ...call, [field]: value });
  };

  const handleHeaderChange = (headerIndex, field, value) => {
    const newHeaders = [...(call.headers || [])];
    newHeaders[headerIndex] = { ...newHeaders[headerIndex], [field]: value };
    handleChange('headers', newHeaders);
  };

  const addHeader = () => {
    const newHeaders = [...(call.headers || []), { key: '', value: '' }];
    handleChange('headers', newHeaders);
  };

  const removeHeader = headerIndex => {
    const newHeaders = (call.headers || []).filter((_, i) => i !== headerIndex);
    handleChange('headers', newHeaders);
  };

  const handleMappingChange = (mapIndex, field, value) => {
    const newMapping = [...(call.responseMapping || [])];
    newMapping[mapIndex] = { ...newMapping[mapIndex], [field]: value };
    handleChange('responseMapping', newMapping);
  };

  const addMapping = () => {
    const newMapping = [...(call.responseMapping || []), { key: '', value: '' }];
    handleChange('responseMapping', newMapping);
  };

  const removeMapping = mapIndex => {
    const newMapping = (call.responseMapping || []).filter((_, i) => i !== mapIndex);
    handleChange('responseMapping', newMapping);
  };

  return (
    <AccordionDetails>
      <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
        <TextField
          label="Name"
          value={call.name || ''}
          onChange={e => handleChange('name', e.target.value)}
          fullWidth
        />
        <FormControl fullWidth>
          <InputLabel>Method</InputLabel>
          <Select
            value={call.method || 'POST'}
            label="Method"
            onChange={e => handleChange('method', e.target.value)}
          >
            <MenuItem value="POST">POST</MenuItem>
            <MenuItem value="GET">GET</MenuItem>
            <MenuItem value="PUT">PUT</MenuItem>
            <MenuItem value="DELETE">DELETE</MenuItem>
            <MenuItem value="PATCH">PATCH</MenuItem>
          </Select>
        </FormControl>
        <TextField
          label="URL"
          value={call.url || ''}
          onChange={e => handleChange('url', e.target.value)}
          fullWidth
          placeholder="https://api.example.com/data"
        />

        <Typography variant="subtitle1" sx={{ mt: 1 }}>
          Headers
        </Typography>
        {(call.headers || []).map((header, i) => (
          <Box key={i} sx={{ display: 'flex', gap: 1, alignItems: 'center' }}>
            <TextField
              label="Key"
              value={header.key}
              onChange={e => handleHeaderChange(i, 'key', e.target.value)}
            />
            <TextField
              label="Value"
              value={header.value}
              onChange={e => handleHeaderChange(i, 'value', e.target.value)}
            />
            <IconButton onClick={() => removeHeader(i)}>
              <DeleteIcon />
            </IconButton>
          </Box>
        ))}
        <Button startIcon={<AddIcon />} onClick={addHeader}>
          Add Header
        </Button>

        <TextField
          label="Body (JSON)"
          value={call.body || ''}
          onChange={e => handleChange('body', e.target.value)}
          fullWidth
          multiline
          rows={4}
          placeholder={`{\n  "key": "value",\n  "dynamic": "{{trigger.body.someData}}"\n}`}
        />

        <Typography variant="subtitle1" sx={{ mt: 1 }}>
          Response Mapping
        </Typography>
        <Typography variant="body2" color="text.secondary">
          Map data from this API call&apos;s response to use in later steps.
        </Typography>
        {(call.responseMapping || []).map((mapping, i) => (
          <Box key={i} sx={{ display: 'flex', gap: 1, alignItems: 'center' }}>
            <TextField
              label="Variable Name"
              value={mapping.key}
              onChange={e => handleMappingChange(i, 'key', e.target.value)}
              helperText="e.g., myApiToken"
            />
            <TextField
              label="Path in Response"
              value={mapping.value}
              onChange={e => handleMappingChange(i, 'value', e.target.value)}
              helperText="e.g., data.access_token"
            />
            <IconButton onClick={() => removeMapping(i)}>
              <DeleteIcon />
            </IconButton>
          </Box>
        ))}
        <Button startIcon={<AddIcon />} onClick={addMapping}>
          Add Mapping
        </Button>
      </Box>
    </AccordionDetails>
  );
};

const ApiSequencePanel = ({ data = {}, onDataChange }) => {
  const [connections, setConnections] = useState([]);
  const [selectedConnection, setSelectedConnection] = useState(null);
  const { apiCalls = [], connectionId, database } = data;

  useEffect(() => {
    const fetchConnections = async () => {
      try {
        const fetchedConnections = await getConnections();
        // Filter to only show active connections for workflow configuration
        const activeConnections = fetchedConnections.filter(connection => connection.isActive);
        setConnections(activeConnections);
        if (connectionId) {
          const currentConnection = activeConnections.find(c => c._id === connectionId);
          setSelectedConnection(currentConnection);
        }
      } catch (error) {
        console.error('Failed to fetch connections', error);
        // Optionally, show a notification to the user
      }
    };

    fetchConnections();
  }, [connectionId]);

  const handleConnectionChange = event => {
    const newConnectionId = event.target.value;
    const connection = connections.find(c => c._id === newConnectionId);
    setSelectedConnection(connection);
    onDataChange({ ...data, connectionId: newConnectionId, database: '' }); // Reset database on new connection
  };

  const handleDatabaseChange = event => {
    const newDatabaseName = event.target.value;
    onDataChange({ ...data, database: newDatabaseName });
  };

  const handleUpdateCall = (index, updatedCall) => {
    const newApiCalls = [...apiCalls];
    newApiCalls[index] = updatedCall;
    onDataChange({ ...data, apiCalls: newApiCalls });
  };

  const handleAddCall = () => {
    const newApiCalls = [
      ...apiCalls,
      {
        name: `API Call ${apiCalls.length + 1}`,
        method: 'POST',
        url: '',
        headers: [],
        body: '{}',
        responseMapping: [],
      },
    ];
    onDataChange({ ...data, apiCalls: newApiCalls });
  };

  const handleDeleteCall = index => {
    const newApiCalls = apiCalls.filter((_, i) => i !== index);
    onDataChange({ ...data, apiCalls: newApiCalls });
  };

  return (
    <Box>
      <Typography variant="h6" sx={{ mb: 2 }}>
        Database and API Sequence
      </Typography>

      <Paper variant="outlined" sx={{ p: 2, mb: 2 }}>
        <Typography variant="subtitle1" gutterBottom>
          Database Selection
        </Typography>
        <Box sx={{ display: 'flex', gap: 2, mb: 2 }}>
          <FormControl fullWidth>
            <InputLabel id="connection-select-label">Connection</InputLabel>
            <Select
              labelId="connection-select-label"
              value={connectionId || ''}
              label="Connection"
              onChange={handleConnectionChange}
            >
              <MenuItem value="">
                <em>None</em>
              </MenuItem>
              {connections.map(conn => (
                <MenuItem key={conn._id} value={conn._id}>
                  {conn.name}
                </MenuItem>
              ))}
            </Select>
          </FormControl>
          <FormControl fullWidth disabled={!selectedConnection}>
            <InputLabel id="database-select-label">Database</InputLabel>
            <Select
              labelId="database-select-label"
              value={database || ''}
              label="Database"
              onChange={handleDatabaseChange}
            >
              <MenuItem value="">
                <em>None</em>
              </MenuItem>
              {(selectedConnection?.databases || []).map(dbName => (
                <MenuItem key={dbName} value={dbName}>
                  {dbName}
                </MenuItem>
              ))}
            </Select>
          </FormControl>
        </Box>
      </Paper>

      <Typography variant="h6" sx={{ mb: 2 }}>
        API Call Sequence
      </Typography>
      <Paper variant="outlined" sx={{ p: 1 }}>
        {apiCalls.map((call, index) => (
          <Accordion key={index} sx={{ mb: 1 }}>
            <AccordionSummary expandIcon={<ExpandMoreIcon />}>
              <Box sx={{ display: 'flex', alignItems: 'center', width: '100%' }}>
                <DragIndicatorIcon sx={{ mr: 1, cursor: 'grab' }} />
                <Typography sx={{ flexGrow: 1 }}>{call.name || `API Call ${index + 1}`}</Typography>
                <IconButton
                  onClick={e => {
                    e.stopPropagation();
                    handleDeleteCall(index);
                  }}
                  size="small"
                >
                  <DeleteIcon />
                </IconButton>
              </Box>
            </AccordionSummary>
            <ApiCallEditor call={call} index={index} onUpdate={handleUpdateCall} />
          </Accordion>
        ))}
      </Paper>
      <Button startIcon={<AddIcon />} onClick={handleAddCall} sx={{ mt: 2 }}>
        Add API Call
      </Button>
    </Box>
  );
};

export default ApiSequencePanel;
