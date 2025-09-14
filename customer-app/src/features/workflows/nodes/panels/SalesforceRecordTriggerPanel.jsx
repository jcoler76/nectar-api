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

const SalesforceRecordTriggerPanel = ({ node, onNodeDataChange }) => {
  const [data, setData] = useState(node.data || {});
  const [testResult, setTestResult] = useState(null);
  const [testLoading, setTestLoading] = useState(false);

  const defaultData = useMemo(
    () => ({
      connection: {
        accessToken: '',
        instanceUrl: '',
        apiVersion: 'v58.0',
      },
      eventType: 'new',
      object: 'Lead',
      pollingInterval: 300000,
      fieldsToMonitor: [],
      soqlWhere: '',
      advanced: {
        batchSize: 50,
        includeSystemFields: false,
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

  const handleAddFieldToMonitor = () => {
    const field = prompt('Field API name to monitor (e.g., Status):');
    if (field && field.trim()) {
      const next = [...(data.fieldsToMonitor || []), field.trim()];
      handleDataChange('fieldsToMonitor', next);
    }
  };

  const handleRemoveField = f => {
    const next = (data.fieldsToMonitor || []).filter(x => x !== f);
    handleDataChange('fieldsToMonitor', next);
  };

  const handleTest = async () => {
    setTestLoading(true);
    setTestResult(null);
    try {
      const res = await fetch('/api/workflows/test-salesforce-record-trigger', {
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

  return (
    <Box sx={{ p: 2 }}>
      <Typography variant="h6" gutterBottom>
        Salesforce Record Trigger
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
                label="Instance URL"
                value={data.connection?.instanceUrl || ''}
                onChange={e => handleNestedChange('connection', 'instanceUrl', e.target.value)}
                placeholder="https://your-instance.my.salesforce.com"
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
                value={data.connection?.apiVersion || 'v58.0'}
                onChange={e => handleNestedChange('connection', 'apiVersion', e.target.value)}
                placeholder="e.g., v58.0"
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
              <TextField
                fullWidth
                label="Object API Name"
                value={data.object || 'Lead'}
                onChange={e => handleDataChange('object', e.target.value)}
                placeholder="e.g., Lead, Contact, Account, Opportunity, Custom__c"
              />
            </Grid>

            {data.eventType === 'updated' && (
              <Grid item xs={12}>
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, flexWrap: 'wrap' }}>
                  {(data.fieldsToMonitor || []).map(f => (
                    <Chip
                      key={f}
                      label={f}
                      onDelete={() => handleRemoveField(f)}
                      sx={{ mr: 1, mb: 1 }}
                    />
                  ))}
                  <Button variant="outlined" size="small" onClick={handleAddFieldToMonitor}>
                    Add Field to Monitor
                  </Button>
                </Box>
              </Grid>
            )}

            <Grid item xs={12}>
              <TextField
                fullWidth
                label="SOQL WHERE (optional)"
                value={data.soqlWhere || ''}
                onChange={e => handleDataChange('soqlWhere', e.target.value)}
                placeholder="e.g., Status = 'Open - Not Contacted' AND CreatedDate = LAST_N_DAYS:1"
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

export default SalesforceRecordTriggerPanel;
