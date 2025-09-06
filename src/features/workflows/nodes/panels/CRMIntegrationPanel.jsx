import {
  ExpandMore as ExpandMoreIcon,
  IntegrationInstructions as IntegrationIcon,
  Science as TestIcon,
  Security as SecurityIcon,
  Transform as TransformIcon,
  Settings as SettingsIcon,
  Add as AddIcon,
  ViewList as BatchIcon,
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
  FormControlLabel,
  Switch,
  Grid,
  Chip,
} from '@mui/material';
import React, { useState, useEffect, useMemo } from 'react';

const CRMIntegrationPanel = ({ node, onNodeDataChange }) => {
  const [data, setData] = useState(node.data || {});
  const [testResult, setTestResult] = useState(null);
  const [testLoading, setTestLoading] = useState(false);

  const defaultData = useMemo(
    () => ({
      crmType: 'custom',
      connection: {
        baseURL: '',
        accessToken: '',
        apiToken: '',
        username: '',
        password: '',
        timeout: 30000,
        customHeaders: {},
      },
      operation: 'create',
      dataMapping: {
        fields: {},
        crmDefaults: {},
        includeMetadata: true,
      },
      batchSettings: {
        enabled: false,
        batchSize: 20,
        batchDelay: 1000,
      },
      errorHandling: {
        retryOnError: true,
        retryCount: 3,
        retryDelay: 1000,
      },
    }),
    []
  );

  const crmTypes = {
    salesforce: 'Salesforce',
    hubspot: 'HubSpot',
    pipedrive: 'Pipedrive',
    dynamics: 'Microsoft Dynamics 365',
    custom: 'Custom HTTP API',
  };

  const operations = {
    create: 'Create New Records',
    update: 'Update Existing Records',
    upsert: 'Create or Update (Upsert)',
  };

  useEffect(() => {
    const mergedData = { ...defaultData, ...data };
    setData(mergedData);
    onNodeDataChange(mergedData);
  }, [node, defaultData]); // eslint-disable-line react-hooks/exhaustive-deps

  const handleDataChange = (field, value) => {
    const newData = {
      ...data,
      [field]: value,
    };
    setData(newData);
    onNodeDataChange(newData);
  };

  const handleNestedChange = (parent, field, value) => {
    const newData = {
      ...data,
      [parent]: {
        ...data[parent],
        [field]: value,
      },
    };
    setData(newData);
    onNodeDataChange(newData);
  };

  const handleFieldMappingAdd = () => {
    const sourceField = prompt('Enter source field name (e.g., company_name):');
    if (sourceField && sourceField.trim()) {
      const targetField = prompt('Enter target CRM field (e.g., Name, Account_Name):');
      if (targetField && targetField.trim()) {
        const transform = prompt(
          'Optional: Enter transformation type (uppercase, lowercase, phone_format, etc.):'
        );

        const mapping =
          transform && transform.trim()
            ? { field: targetField.trim(), transform: { type: transform.trim() } }
            : targetField.trim();

        const newFields = {
          ...data.dataMapping?.fields,
          [sourceField.trim()]: mapping,
        };
        handleNestedChange('dataMapping', 'fields', newFields);
      }
    }
  };

  const handleFieldMappingRemove = fieldToRemove => {
    const newFields = { ...data.dataMapping?.fields };
    delete newFields[fieldToRemove];
    handleNestedChange('dataMapping', 'fields', newFields);
  };

  const handleDefaultValueAdd = () => {
    const field = prompt('Enter CRM field name:');
    if (field && field.trim()) {
      const value = prompt('Enter default value:');
      if (value !== null) {
        const newDefaults = {
          ...data.dataMapping?.crmDefaults,
          [field.trim()]: value.trim(),
        };
        handleNestedChange('dataMapping', 'crmDefaults', newDefaults);
      }
    }
  };

  const handleDefaultValueRemove = fieldToRemove => {
    const newDefaults = { ...data.dataMapping?.crmDefaults };
    delete newDefaults[fieldToRemove];
    handleNestedChange('dataMapping', 'crmDefaults', newDefaults);
  };

  const handleCustomHeaderAdd = () => {
    const headerName = prompt('Enter header name:');
    if (headerName && headerName.trim()) {
      const headerValue = prompt('Enter header value:');
      if (headerValue && headerValue.trim()) {
        const newHeaders = {
          ...data.connection?.customHeaders,
          [headerName.trim()]: headerValue.trim(),
        };
        handleNestedChange('connection', 'customHeaders', newHeaders);
      }
    }
  };

  const handleCustomHeaderRemove = headerToRemove => {
    const newHeaders = { ...data.connection?.customHeaders };
    delete newHeaders[headerToRemove];
    handleNestedChange('connection', 'customHeaders', newHeaders);
  };

  const handleTestConnection = async () => {
    setTestLoading(true);
    setTestResult(null);

    try {
      const response = await fetch('/api/workflows/test-crm-integration', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          crmType: data.crmType,
          connection: data.connection,
          operation: data.operation,
          testData: {
            name: 'Test Contact',
            email: 'test@example.com',
            company: 'Test Company',
          },
        }),
      });

      const result = await response.json();
      setTestResult(result);
    } catch (error) {
      setTestResult({
        success: false,
        error: error.message,
      });
    } finally {
      setTestLoading(false);
    }
  };

  const getConnectionFields = () => {
    switch (data.crmType) {
      case 'salesforce':
      case 'hubspot':
      case 'dynamics':
        return (
          <Grid item xs={12}>
            <TextField
              fullWidth
              label="Access Token"
              type="password"
              value={data.connection?.accessToken || ''}
              onChange={e => handleNestedChange('connection', 'accessToken', e.target.value)}
              helperText="OAuth access token or bearer token"
            />
          </Grid>
        );

      case 'pipedrive':
        return (
          <Grid item xs={12}>
            <TextField
              fullWidth
              label="API Token"
              type="password"
              value={data.connection?.apiToken || ''}
              onChange={e => handleNestedChange('connection', 'apiToken', e.target.value)}
              helperText="Pipedrive API token"
            />
          </Grid>
        );

      default:
        return (
          <>
            <Grid item xs={6}>
              <TextField
                fullWidth
                label="Username"
                value={data.connection?.username || ''}
                onChange={e => handleNestedChange('connection', 'username', e.target.value)}
              />
            </Grid>
            <Grid item xs={6}>
              <TextField
                fullWidth
                label="Password"
                type="password"
                value={data.connection?.password || ''}
                onChange={e => handleNestedChange('connection', 'password', e.target.value)}
              />
            </Grid>
          </>
        );
    }
  };

  return (
    <Box sx={{ p: 2 }}>
      <Typography variant="h6" gutterBottom>
        CRM Integration Configuration
      </Typography>

      {/* CRM Type and Connection */}
      <Accordion defaultExpanded>
        <AccordionSummary expandIcon={<ExpandMoreIcon />}>
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
            <IntegrationIcon />
            <Typography>CRM Connection</Typography>
          </Box>
        </AccordionSummary>
        <AccordionDetails>
          <Grid container spacing={2}>
            <Grid item xs={6}>
              <FormControl fullWidth>
                <InputLabel>CRM Type</InputLabel>
                <Select
                  value={data.crmType || 'custom'}
                  onChange={e => handleDataChange('crmType', e.target.value)}
                >
                  {Object.entries(crmTypes).map(([value, label]) => (
                    <MenuItem key={value} value={value}>
                      {label}
                    </MenuItem>
                  ))}
                </Select>
              </FormControl>
            </Grid>

            <Grid item xs={6}>
              <FormControl fullWidth>
                <InputLabel>Operation</InputLabel>
                <Select
                  value={data.operation || 'create'}
                  onChange={e => handleDataChange('operation', e.target.value)}
                >
                  {Object.entries(operations).map(([value, label]) => (
                    <MenuItem key={value} value={value}>
                      {label}
                    </MenuItem>
                  ))}
                </Select>
              </FormControl>
            </Grid>

            <Grid item xs={12}>
              <TextField
                fullWidth
                label="Base URL"
                value={data.connection?.baseURL || ''}
                onChange={e => handleNestedChange('connection', 'baseURL', e.target.value)}
                placeholder={
                  data.crmType === 'salesforce'
                    ? 'https://your-instance.salesforce.com'
                    : data.crmType === 'hubspot'
                      ? 'https://api.hubapi.com'
                      : data.crmType === 'pipedrive'
                        ? 'https://your-company.pipedrive.com/api/v1'
                        : data.crmType === 'dynamics'
                          ? 'https://your-org.api.crm.dynamics.com/api/data/v9.2'
                          : 'https://your-api.com'
                }
              />
            </Grid>

            {getConnectionFields()}

            <Grid item xs={6}>
              <TextField
                fullWidth
                label="Timeout (ms)"
                type="number"
                inputProps={{ min: 5000, max: 300000 }}
                value={data.connection?.timeout || 30000}
                onChange={e =>
                  handleNestedChange('connection', 'timeout', parseInt(e.target.value))
                }
                helperText="Request timeout in milliseconds"
              />
            </Grid>
          </Grid>
        </AccordionDetails>
      </Accordion>

      {/* Data Mapping */}
      <Accordion>
        <AccordionSummary expandIcon={<ExpandMoreIcon />}>
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
            <TransformIcon />
            <Typography>
              Data Mapping ({Object.keys(data.dataMapping?.fields || {}).length} fields)
            </Typography>
          </Box>
        </AccordionSummary>
        <AccordionDetails>
          <Box sx={{ mb: 2 }}>
            <Button
              variant="outlined"
              startIcon={<AddIcon />}
              onClick={handleFieldMappingAdd}
              size="small"
              sx={{ mr: 1 }}
            >
              Add Field Mapping
            </Button>
            <Button
              variant="outlined"
              startIcon={<AddIcon />}
              onClick={handleDefaultValueAdd}
              size="small"
            >
              Add Default Value
            </Button>
          </Box>

          <Typography variant="subtitle2" gutterBottom>
            Field Mappings
          </Typography>
          <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 1, mb: 2 }}>
            {Object.entries(data.dataMapping?.fields || {}).map(([source, target]) => {
              const displayTarget =
                typeof target === 'string' ? target : `${target.field} (${target.transform?.type})`;
              return (
                <Chip
                  key={source}
                  label={`${source} → ${displayTarget}`}
                  onDelete={() => handleFieldMappingRemove(source)}
                  color="primary"
                  variant="outlined"
                />
              );
            })}
          </Box>

          <Typography variant="subtitle2" gutterBottom>
            Default Values
          </Typography>
          <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 1, mb: 2 }}>
            {Object.entries(data.dataMapping?.crmDefaults || {}).map(([field, value]) => (
              <Chip
                key={field}
                label={`${field} = "${value}"`}
                onDelete={() => handleDefaultValueRemove(field)}
                color="secondary"
                variant="outlined"
              />
            ))}
          </Box>

          <FormControlLabel
            control={
              <Switch
                checked={data.dataMapping?.includeMetadata || false}
                onChange={e =>
                  handleNestedChange('dataMapping', 'includeMetadata', e.target.checked)
                }
              />
            }
            label="Include ZoomInfo Metadata"
          />
          <Typography variant="body2" color="text.secondary">
            Add source tracking fields to CRM records
          </Typography>
        </AccordionDetails>
      </Accordion>

      {/* Batch Processing */}
      <Accordion>
        <AccordionSummary expandIcon={<ExpandMoreIcon />}>
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
            <BatchIcon />
            <Typography>Batch Processing</Typography>
          </Box>
        </AccordionSummary>
        <AccordionDetails>
          <Grid container spacing={2}>
            <Grid item xs={12}>
              <FormControlLabel
                control={
                  <Switch
                    checked={data.batchSettings?.enabled || false}
                    onChange={e => handleNestedChange('batchSettings', 'enabled', e.target.checked)}
                  />
                }
                label="Enable Batch Processing"
              />
              <Typography variant="body2" color="text.secondary">
                Process multiple records in batches for better performance
              </Typography>
            </Grid>

            {data.batchSettings?.enabled && (
              <>
                <Grid item xs={6}>
                  <TextField
                    fullWidth
                    label="Batch Size"
                    type="number"
                    inputProps={{ min: 1, max: 100 }}
                    value={data.batchSettings?.batchSize || 20}
                    onChange={e =>
                      handleNestedChange('batchSettings', 'batchSize', parseInt(e.target.value))
                    }
                    helperText="Records per batch"
                  />
                </Grid>

                <Grid item xs={6}>
                  <TextField
                    fullWidth
                    label="Batch Delay (ms)"
                    type="number"
                    inputProps={{ min: 0, max: 60000 }}
                    value={data.batchSettings?.batchDelay || 1000}
                    onChange={e =>
                      handleNestedChange('batchSettings', 'batchDelay', parseInt(e.target.value))
                    }
                    helperText="Delay between batches"
                  />
                </Grid>
              </>
            )}
          </Grid>
        </AccordionDetails>
      </Accordion>

      {/* Error Handling */}
      <Accordion>
        <AccordionSummary expandIcon={<ExpandMoreIcon />}>
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
            <SettingsIcon />
            <Typography>Error Handling</Typography>
          </Box>
        </AccordionSummary>
        <AccordionDetails>
          <Grid container spacing={2}>
            <Grid item xs={12}>
              <FormControlLabel
                control={
                  <Switch
                    checked={data.errorHandling?.retryOnError || false}
                    onChange={e =>
                      handleNestedChange('errorHandling', 'retryOnError', e.target.checked)
                    }
                  />
                }
                label="Retry on Error"
              />
              <Typography variant="body2" color="text.secondary">
                Automatically retry failed requests
              </Typography>
            </Grid>

            {data.errorHandling?.retryOnError && (
              <>
                <Grid item xs={6}>
                  <TextField
                    fullWidth
                    label="Retry Count"
                    type="number"
                    inputProps={{ min: 1, max: 10 }}
                    value={data.errorHandling?.retryCount || 3}
                    onChange={e =>
                      handleNestedChange('errorHandling', 'retryCount', parseInt(e.target.value))
                    }
                    helperText="Maximum retry attempts"
                  />
                </Grid>

                <Grid item xs={6}>
                  <TextField
                    fullWidth
                    label="Retry Delay (ms)"
                    type="number"
                    inputProps={{ min: 100, max: 30000 }}
                    value={data.errorHandling?.retryDelay || 1000}
                    onChange={e =>
                      handleNestedChange('errorHandling', 'retryDelay', parseInt(e.target.value))
                    }
                    helperText="Delay before retry"
                  />
                </Grid>
              </>
            )}
          </Grid>
        </AccordionDetails>
      </Accordion>

      {/* Custom Headers (for Custom CRM) */}
      {data.crmType === 'custom' && (
        <Accordion>
          <AccordionSummary expandIcon={<ExpandMoreIcon />}>
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
              <SecurityIcon />
              <Typography>
                Custom Headers ({Object.keys(data.connection?.customHeaders || {}).length})
              </Typography>
            </Box>
          </AccordionSummary>
          <AccordionDetails>
            <Box sx={{ mb: 2 }}>
              <Button
                variant="outlined"
                startIcon={<AddIcon />}
                onClick={handleCustomHeaderAdd}
                size="small"
              >
                Add Custom Header
              </Button>
            </Box>

            <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 1 }}>
              {Object.entries(data.connection?.customHeaders || {}).map(([header, value]) => (
                <Chip
                  key={header}
                  label={`${header}: ${value}`}
                  onDelete={() => handleCustomHeaderRemove(header)}
                  color="info"
                  variant="outlined"
                />
              ))}
            </Box>
          </AccordionDetails>
        </Accordion>
      )}

      {/* Test Connection */}
      <Box sx={{ mt: 2 }}>
        <Button
          variant="outlined"
          startIcon={<TestIcon />}
          onClick={handleTestConnection}
          disabled={testLoading}
          fullWidth
        >
          {testLoading ? 'Testing Integration...' : 'Test CRM Integration'}
        </Button>

        {testResult && (
          <Box sx={{ mt: 2 }}>
            <Alert severity={testResult.success ? 'success' : 'error'}>
              {testResult.success
                ? `Integration test successful. ${testResult.data?.processed || 0} record(s) processed.`
                : testResult.error}
              {testResult.data?.results && (
                <Box sx={{ mt: 1 }}>
                  <Typography variant="body2">
                    Response: {JSON.stringify(testResult.data.results[0], null, 2)}
                  </Typography>
                </Box>
              )}
            </Alert>
          </Box>
        )}
      </Box>

      {/* Information */}
      <Box sx={{ mt: 2 }}>
        <Alert severity="info">
          This action will send data from previous workflow steps to your CRM system. Configure
          field mappings to ensure data is properly formatted for your CRM.
        </Alert>
      </Box>
    </Box>
  );
};

export default CRMIntegrationPanel;
