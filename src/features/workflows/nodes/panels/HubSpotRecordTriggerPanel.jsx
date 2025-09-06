import {
  ExpandMore as ExpandMoreIcon,
  Science as TestIcon,
  Security as SecurityIcon,
  Search as SearchIcon,
} from '@mui/icons-material';
import {
  Box,
  TextField,
  Typography,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  Button,
  Alert,
  Accordion,
  AccordionSummary,
  AccordionDetails,
  Grid,
  Chip,
} from '@mui/material';
import React, { useState, useEffect, useMemo } from 'react';

const HubSpotRecordTriggerPanel = ({ node, onNodeDataChange }) => {
  const [data, setData] = useState(node.data || {});
  const [testResult, setTestResult] = useState(null);
  const [testLoading, setTestLoading] = useState(false);

  const defaultData = useMemo(
    () => ({
      connection: {
        accessToken: '',
        baseUrl: 'https://api.hubapi.com',
        apiVersion: 'v3',
      },
      eventType: 'new',
      object: 'contact',
      pollingInterval: 300000,
      propertiesToMonitor: [],
      filters: '',
      advanced: {
        batchSize: 50,
        includeAssociations: false,
      },
    }),
    []
  );

  useEffect(() => {
    const merged = { ...defaultData, ...node.data };
    setData(merged);
    onNodeDataChange(merged);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [node, defaultData]);

  const handleDataChange = (field, value) => {
    const newData = { ...data, [field]: value };
    setData(newData);
    onNodeDataChange(newData);
  };

  const handleNestedChange = (parent, field, value) => {
    const newData = {
      ...data,
      [parent]: { ...data[parent], [field]: value },
    };
    setData(newData);
    onNodeDataChange(newData);
  };

  const handleAddProperty = () => {
    const prop = prompt('Property to monitor (e.g., email, lifecycle_stage)');
    if (prop && prop.trim()) {
      const next = [...(data.propertiesToMonitor || []), prop.trim()];
      handleDataChange('propertiesToMonitor', next);
    }
  };

  const handleRemoveProperty = p => {
    const next = (data.propertiesToMonitor || []).filter(x => x !== p);
    handleDataChange('propertiesToMonitor', next);
  };

  const handleTest = async () => {
    setTestLoading(true);
    setTestResult(null);
    try {
      const res = await fetch('/api/workflows/test-hubspot-record-trigger', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data),
      });
      const json = await res.json();
      setTestResult(json);
    } catch (e) {
      setTestResult({ success: false, error: e.message });
    } finally {
      setTestLoading(false);
    }
  };

  const objectOptions = [
    { value: 'contact', label: 'Contact' },
    { value: 'company', label: 'Company' },
    { value: 'deal', label: 'Deal' },
    { value: 'ticket', label: 'Ticket' },
    { value: 'product', label: 'Product' },
    { value: 'line_item', label: 'Line Item' },
    { value: 'email', label: 'Email Activity' },
    { value: 'call', label: 'Call Activity' },
  ];

  return (
    <Box sx={{ p: 2 }}>
      <Typography variant="h6" gutterBottom>
        HubSpot Record Trigger
      </Typography>

      <Accordion defaultExpanded>
        <AccordionSummary expandIcon={<ExpandMoreIcon />}>
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
            <SecurityIcon />
            <Typography>Connection</Typography>
          </Box>
        </AccordionSummary>
        <AccordionDetails>
          <Grid container spacing={2}>
            <Grid item xs={12}>
              <TextField
                fullWidth
                label="Base URL"
                value={data.connection?.baseUrl || 'https://api.hubapi.com'}
                onChange={e => handleNestedChange('connection', 'baseUrl', e.target.value)}
              />
            </Grid>
            <Grid item xs={12}>
              <TextField
                fullWidth
                label="Access Token"
                type="password"
                value={data.connection?.accessToken || ''}
                onChange={e => handleNestedChange('connection', 'accessToken', e.target.value)}
              />
            </Grid>
            <Grid item xs={12} md={6}>
              <TextField
                fullWidth
                label="API Version"
                value={data.connection?.apiVersion || 'v3'}
                onChange={e => handleNestedChange('connection', 'apiVersion', e.target.value)}
                placeholder="e.g., v3"
              />
            </Grid>
          </Grid>
        </AccordionDetails>
      </Accordion>

      <Accordion defaultExpanded>
        <AccordionSummary expandIcon={<ExpandMoreIcon />}>
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
            <SearchIcon />
            <Typography>Trigger Settings</Typography>
          </Box>
        </AccordionSummary>
        <AccordionDetails>
          <Grid container spacing={2}>
            <Grid item xs={12} md={6}>
              <FormControl fullWidth>
                <InputLabel>Event Type</InputLabel>
                <Select
                  value={data.eventType || 'new'}
                  label="Event Type"
                  onChange={e => handleDataChange('eventType', e.target.value)}
                >
                  <MenuItem value="new">New Record</MenuItem>
                  <MenuItem value="updated">Updated Record</MenuItem>
                </Select>
              </FormControl>
            </Grid>
            <Grid item xs={12} md={6}>
              <FormControl fullWidth>
                <InputLabel>Object</InputLabel>
                <Select
                  value={data.object || 'contact'}
                  label="Object"
                  onChange={e => handleDataChange('object', e.target.value)}
                >
                  {objectOptions.map(op => (
                    <MenuItem key={op.value} value={op.value}>
                      {op.label}
                    </MenuItem>
                  ))}
                </Select>
              </FormControl>
            </Grid>

            {data.eventType === 'updated' && (
              <Grid item xs={12}>
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, flexWrap: 'wrap' }}>
                  {(data.propertiesToMonitor || []).map(p => (
                    <Chip
                      key={p}
                      label={p}
                      onDelete={() => handleRemoveProperty(p)}
                      sx={{ mr: 1, mb: 1 }}
                    />
                  ))}
                  <Button variant="outlined" size="small" onClick={handleAddProperty}>
                    Add Property to Monitor
                  </Button>
                </Box>
              </Grid>
            )}

            <Grid item xs={12}>
              <TextField
                fullWidth
                label="Filters (optional)"
                value={data.filters || ''}
                onChange={e => handleDataChange('filters', e.target.value)}
                placeholder="e.g., hs_lastmodifieddate GT yesterday"
                helperText="Additional filter for polling-based triggers"
              />
            </Grid>

            <Grid item xs={12} md={6}>
              <TextField
                fullWidth
                label="Polling Interval (ms)"
                type="number"
                value={data.pollingInterval || 300000}
                onChange={e => handleDataChange('pollingInterval', Number(e.target.value))}
                inputProps={{ min: 15000 }}
              />
            </Grid>
          </Grid>
        </AccordionDetails>
      </Accordion>

      <Box sx={{ mt: 2, display: 'flex', alignItems: 'center', gap: 1 }}>
        <Button
          variant="contained"
          startIcon={<TestIcon />}
          onClick={handleTest}
          disabled={testLoading}
        >
          Test Trigger
        </Button>
        {testResult && (
          <Alert severity={testResult.success ? 'success' : 'error'} sx={{ ml: 2 }}>
            {testResult.success ? 'Connection OK' : testResult.error || 'Test failed'}
          </Alert>
        )}
      </Box>
    </Box>
  );
};

export default HubSpotRecordTriggerPanel;
