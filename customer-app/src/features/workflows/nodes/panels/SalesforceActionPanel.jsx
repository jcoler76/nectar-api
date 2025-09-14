import {
  ExpandMore as ExpandMoreIcon,
  Settings as SettingsIcon,
  Science as TestIcon,
  IntegrationInstructions as IntegrationIcon,
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
} from '@mui/material';
import React, { useEffect, useMemo, useState } from 'react';

const SalesforceActionPanel = ({ node, onNodeDataChange }) => {
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
      operation: 'create',
      object: 'Lead',
      externalIdField: '',
      recordId: '',
      search: {
        field: '',
        value: '',
        createIfNotFound: false,
      },
      campaign: {
        campaignId: '',
        memberIdField: 'LeadId',
        status: 'Sent',
      },
      attachment: {
        parentId: '',
        fileName: '',
        contentBase64: '',
        contentType: 'application/octet-stream',
      },
      dataMapping: {
        fields: {},
      },
      errorHandling: {
        retryOnError: true,
        retryCount: 3,
        retryDelay: 1000,
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
    const newData = { ...data, [parent]: { ...data[parent], [field]: value } };
    setData(newData);
    onNodeDataChange(newData);
  };

  const handleMappingAdd = () => {
    const src = prompt('Source field (from context), e.g., lead.email');
    if (!src) return;
    const dest = prompt('Salesforce field API name, e.g., Email');
    if (!dest) return;
    const next = { ...(data.dataMapping?.fields || {}), [src]: dest };
    handleNestedChange('dataMapping', 'fields', next);
  };

  const handleMappingRemove = key => {
    const next = { ...(data.dataMapping?.fields || {}) };
    delete next[key];
    handleNestedChange('dataMapping', 'fields', next);
  };

  const handleTest = async () => {
    setTestLoading(true);
    setTestResult(null);
    try {
      const res = await fetch('/api/workflows/test-salesforce-action', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ...data, test: true }),
      });
      const json = await res.json();
      setTestResult(json);
    } catch (e) {
      setTestResult({ success: false, error: e.message });
    } finally {
      setTestLoading(false);
    }
  };

  const operationOptions = [
    { value: 'create', label: 'Create Record' },
    { value: 'update', label: 'Update Record' },
    { value: 'upsert', label: 'Create or Update (Upsert)' },
    { value: 'find', label: 'Find Record' },
    { value: 'findOrCreate', label: 'Find or Create Record' },
    { value: 'createTask', label: 'Create Task' },
    { value: 'addToCampaign', label: 'Add to Campaign' },
    { value: 'createAttachment', label: 'Create Attachment' },
  ];

  return (
    <Box sx={{ p: 2 }}>
      <Typography variant="h6" gutterBottom>
        Salesforce Record Action
      </Typography>

      <Accordion defaultExpanded>
        <AccordionSummary expandIcon={<ExpandMoreIcon />}>
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
            <IntegrationIcon />
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
            <SettingsIcon />
            <Typography>Operation</Typography>
          </Box>
        </AccordionSummary>
        <AccordionDetails>
          <Grid container spacing={2}>
            <Grid item xs={12} md={6}>
              <FormControl fullWidth>
                <InputLabel>Operation</InputLabel>
                <Select
                  value={data.operation || 'create'}
                  label="Operation"
                  onChange={e => handleDataChange('operation', e.target.value)}
                >
                  {operationOptions.map(op => (
                    <MenuItem key={op.value} value={op.value}>
                      {op.label}
                    </MenuItem>
                  ))}
                </Select>
              </FormControl>
            </Grid>
            <Grid item xs={12} md={6}>
              <TextField
                fullWidth
                label="Object API Name"
                value={data.object || 'Lead'}
                onChange={e => handleDataChange('object', e.target.value)}
                placeholder="e.g., Lead, Contact, Account, Opportunity, CampaignMember, ContentVersion"
              />
            </Grid>

            {data.operation === 'update' && (
              <Grid item xs={12}>
                <TextField
                  fullWidth
                  label="Record ID"
                  value={data.recordId || ''}
                  onChange={e => handleDataChange('recordId', e.target.value)}
                  placeholder="e.g., 0035g00001ABCDeAAH"
                />
              </Grid>
            )}

            {(data.operation === 'upsert' || data.operation === 'findOrCreate') && (
              <Grid item xs={12} md={6}>
                <TextField
                  fullWidth
                  label="External ID Field"
                  value={data.externalIdField || ''}
                  onChange={e => handleDataChange('externalIdField', e.target.value)}
                  placeholder="e.g., External_Id__c"
                />
              </Grid>
            )}

            {(data.operation === 'find' || data.operation === 'findOrCreate') && (
              <>
                <Grid item xs={12} md={6}>
                  <TextField
                    fullWidth
                    label="Search Field"
                    value={data.search?.field || ''}
                    onChange={e => handleNestedChange('search', 'field', e.target.value)}
                    placeholder="e.g., Email"
                  />
                </Grid>
                <Grid item xs={12} md={6}>
                  <TextField
                    fullWidth
                    label="Search Value"
                    value={data.search?.value || ''}
                    onChange={e => handleNestedChange('search', 'value', e.target.value)}
                  />
                </Grid>
              </>
            )}

            {data.operation === 'addToCampaign' && (
              <>
                <Grid item xs={12} md={6}>
                  <TextField
                    fullWidth
                    label="Campaign ID"
                    value={data.campaign?.campaignId || ''}
                    onChange={e => handleNestedChange('campaign', 'campaignId', e.target.value)}
                  />
                </Grid>
                <Grid item xs={12} md={6}>
                  <TextField
                    fullWidth
                    label="Member Id Field (LeadId/ContactId)"
                    value={data.campaign?.memberIdField || 'LeadId'}
                    onChange={e => handleNestedChange('campaign', 'memberIdField', e.target.value)}
                  />
                </Grid>
                <Grid item xs={12} md={6}>
                  <TextField
                    fullWidth
                    label="Member Status"
                    value={data.campaign?.status || 'Sent'}
                    onChange={e => handleNestedChange('campaign', 'status', e.target.value)}
                  />
                </Grid>
              </>
            )}

            {data.operation === 'createAttachment' && (
              <>
                <Grid item xs={12} md={6}>
                  <TextField
                    fullWidth
                    label="Parent Record ID"
                    value={data.attachment?.parentId || ''}
                    onChange={e => handleNestedChange('attachment', 'parentId', e.target.value)}
                  />
                </Grid>
                <Grid item xs={12} md={6}>
                  <TextField
                    fullWidth
                    label="File Name"
                    value={data.attachment?.fileName || ''}
                    onChange={e => handleNestedChange('attachment', 'fileName', e.target.value)}
                  />
                </Grid>
                <Grid item xs={12}>
                  <TextField
                    fullWidth
                    label="Base64 Content"
                    multiline
                    minRows={3}
                    value={data.attachment?.contentBase64 || ''}
                    onChange={e =>
                      handleNestedChange('attachment', 'contentBase64', e.target.value)
                    }
                    placeholder="Base64-encoded content"
                  />
                </Grid>
                <Grid item xs={12} md={6}>
                  <TextField
                    fullWidth
                    label="Content Type"
                    value={data.attachment?.contentType || 'application/octet-stream'}
                    onChange={e => handleNestedChange('attachment', 'contentType', e.target.value)}
                  />
                </Grid>
              </>
            )}
          </Grid>
        </AccordionDetails>
      </Accordion>

      <Accordion>
        <AccordionSummary expandIcon={<ExpandMoreIcon />}>
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
            <SettingsIcon />
            <Typography>Field Mapping</Typography>
          </Box>
        </AccordionSummary>
        <AccordionDetails>
          <Grid container spacing={2}>
            <Grid item xs={12}>
              <Typography variant="body2" sx={{ mb: 1 }}>
                Map input fields to Salesforce fields (key: value)
              </Typography>
              <Box sx={{ display: 'flex', gap: 1, flexWrap: 'wrap' }}>
                {Object.entries(data.dataMapping?.fields || {}).map(([k, v]) => (
                  <Button
                    key={k}
                    variant="outlined"
                    color="secondary"
                    onClick={() => handleMappingRemove(k)}
                  >
                    {k} → {String(v)} (remove)
                  </Button>
                ))}
                <Button variant="outlined" onClick={handleMappingAdd}>
                  Add Mapping
                </Button>
              </Box>
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
          Test Action
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

export default SalesforceActionPanel;
