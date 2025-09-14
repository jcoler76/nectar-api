import {
  ExpandMore as ExpandMoreIcon,
  Settings as SettingsIcon,
  Science as TestIcon,
  Security as SecurityIcon,
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
  Chip,
} from '@mui/material';
import React, { useEffect, useMemo, useState } from 'react';

import { getTemplateFor } from './hubspotTemplates';

// HubSpot action panel mirrors the clean patterns from SalesforceActionPanel
// and CRMIntegrationPanel, focusing on concise configuration.
const HubSpotActionPanel = ({ node, onNodeDataChange }) => {
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
      object: 'contact',
      operation: 'create',
      search: {
        property: 'email',
        value: '',
        createIfNotFound: false,
      },
      association: {
        fromObject: 'contact',
        toObject: 'company',
        associationType: 'contact_to_company',
      },
      list: { listId: '' },
      note: { content: '' },
      email: {
        subject: '',
        html: '',
        text: '',
        direction: 'OUTGOING',
        status: 'SENT',
        associate: { object: 'contact', objectId: '' },
      },
      call: {
        title: '',
        body: '',
        direction: 'OUTGOING',
        duration: 0,
        timestamp: '',
        associate: { object: 'contact', objectId: '' },
      },
      dataMapping: { properties: {} },
      errorHandling: { retryOnError: true, retryCount: 3, retryDelay: 1000 },
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
    const src = prompt('Source field (from context), e.g., contact.email');
    if (!src) return;
    const dest = prompt('HubSpot property name, e.g., email');
    if (!dest) return;
    const next = { ...(data.dataMapping?.properties || {}), [src]: dest };
    handleNestedChange('dataMapping', 'properties', next);
  };

  const handleMappingRemove = key => {
    const next = { ...(data.dataMapping?.properties || {}) };
    delete next[key];
    handleNestedChange('dataMapping', 'properties', next);
  };

  const handleTest = async () => {
    setTestLoading(true);
    setTestResult(null);
    try {
      const res = await fetch('/api/workflows/test-hubspot-action', {
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
    { value: 'createOrUpdate', label: 'Create or Update (Upsert)' },
    { value: 'find', label: 'Find Record' },
    { value: 'findOrCreate', label: 'Find or Create Record' },
    { value: 'addToList', label: 'Add Contact to List' },
    { value: 'associate', label: 'Associate Records' },
    { value: 'createNote', label: 'Create Note' },
    { value: 'updateDealStage', label: 'Update Deal Stage' },
    { value: 'enrollInWorkflow', label: 'Enroll Contact in Workflow' },
    { value: 'createTimelineEvent', label: 'Create Timeline Event' },
    { value: 'createEmail', label: 'Create Email Activity' },
    { value: 'createCall', label: 'Create Call Activity' },
  ];

  const objectOptions = [
    { value: 'contact', label: 'Contact' },
    { value: 'company', label: 'Company' },
    { value: 'deal', label: 'Deal' },
    { value: 'ticket', label: 'Ticket' },
    { value: 'product', label: 'Product' },
    { value: 'line_item', label: 'Line Item' },
  ];

  return (
    <Box sx={{ p: 2 }}>
      <Typography variant="h6" gutterBottom>
        HubSpot Action
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
                placeholder="HubSpot Private App token or OAuth access token"
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

            {(data.operation === 'find' || data.operation === 'findOrCreate') && (
              <>
                <Grid item xs={12} md={6}>
                  <TextField
                    fullWidth
                    label="Search Property"
                    value={data.search?.property || 'email'}
                    onChange={e => handleNestedChange('search', 'property', e.target.value)}
                    placeholder="e.g., email, hs_object_id"
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

            {data.operation === 'associate' && (
              <>
                <Grid item xs={12} md={4}>
                  <TextField
                    fullWidth
                    label="From Object"
                    value={data.association?.fromObject || 'contact'}
                    onChange={e => handleNestedChange('association', 'fromObject', e.target.value)}
                    placeholder="e.g., contact"
                  />
                </Grid>
                <Grid item xs={12} md={4}>
                  <TextField
                    fullWidth
                    label="To Object"
                    value={data.association?.toObject || 'company'}
                    onChange={e => handleNestedChange('association', 'toObject', e.target.value)}
                    placeholder="e.g., company"
                  />
                </Grid>
                <Grid item xs={12} md={4}>
                  <TextField
                    fullWidth
                    label="Association Type"
                    value={data.association?.associationType || 'contact_to_company'}
                    onChange={e =>
                      handleNestedChange('association', 'associationType', e.target.value)
                    }
                    placeholder="e.g., contact_to_company"
                  />
                </Grid>
              </>
            )}

            {data.operation === 'updateDealStage' && (
              <>
                <Grid item xs={12} md={6}>
                  <TextField
                    fullWidth
                    label="Deal Record ID"
                    value={data.recordId || ''}
                    onChange={e => handleDataChange('recordId', e.target.value)}
                    placeholder="e.g., 12345"
                  />
                </Grid>
                <Grid item xs={12} md={6}>
                  <TextField
                    fullWidth
                    label="Deal Stage ID"
                    value={data.deal?.stageId || ''}
                    onChange={e => handleNestedChange('deal', 'stageId', e.target.value)}
                    placeholder="e.g., appointmentscheduled"
                  />
                </Grid>
              </>
            )}

            {data.operation === 'enrollInWorkflow' && (
              <>
                <Grid item xs={12} md={6}>
                  <TextField
                    fullWidth
                    label="Workflow ID"
                    value={data.workflow?.workflowId || ''}
                    onChange={e => handleNestedChange('workflow', 'workflowId', e.target.value)}
                    placeholder="Numeric workflow ID"
                  />
                </Grid>
                <Grid item xs={12} md={6}>
                  <TextField
                    fullWidth
                    label="Contact Email"
                    value={data.workflow?.contactEmail || ''}
                    onChange={e => handleNestedChange('workflow', 'contactEmail', e.target.value)}
                    placeholder="email@example.com or leave empty to use Contact ID"
                  />
                </Grid>
                <Grid item xs={12} md={6}>
                  <TextField
                    fullWidth
                    label="Contact ID (optional)"
                    value={data.workflow?.contactId || ''}
                    onChange={e => handleNestedChange('workflow', 'contactId', e.target.value)}
                    placeholder="Use HubSpot contactId instead of email"
                  />
                </Grid>
              </>
            )}

            {data.operation === 'createTimelineEvent' && (
              <>
                <Grid item xs={12} md={6}>
                  <TextField
                    fullWidth
                    label="Event Template ID"
                    value={data.timeline?.eventTemplateId || ''}
                    onChange={e =>
                      handleNestedChange('timeline', 'eventTemplateId', e.target.value)
                    }
                  />
                </Grid>
                <Grid item xs={12} md={6}>
                  <TextField
                    fullWidth
                    label="Associate Object Type"
                    value={data.timeline?.objectType || data.object || 'contact'}
                    onChange={e => handleNestedChange('timeline', 'objectType', e.target.value)}
                    placeholder="e.g., contact, deal"
                  />
                </Grid>
                <Grid item xs={12} md={6}>
                  <TextField
                    fullWidth
                    label="Associate Object ID"
                    value={data.timeline?.objectId || ''}
                    onChange={e => handleNestedChange('timeline', 'objectId', e.target.value)}
                  />
                </Grid>
                <Grid item xs={12}>
                  <TextField
                    fullWidth
                    label="Tokens (JSON)"
                    multiline
                    rows={3}
                    value={data.timeline?.tokens || ''}
                    onChange={e => handleNestedChange('timeline', 'tokens', e.target.value)}
                    placeholder='{"tokenName":"value"}'
                  />
                </Grid>
              </>
            )}

            {data.operation === 'createEmail' && (
              <>
                <Grid item xs={12} md={6}>
                  <TextField
                    fullWidth
                    label="Subject"
                    value={data.email?.subject || ''}
                    onChange={e => handleNestedChange('email', 'subject', e.target.value)}
                  />
                </Grid>
                <Grid item xs={12}>
                  <TextField
                    fullWidth
                    label="HTML Body"
                    multiline
                    rows={3}
                    value={data.email?.html || ''}
                    onChange={e => handleNestedChange('email', 'html', e.target.value)}
                  />
                </Grid>
                <Grid item xs={12}>
                  <TextField
                    fullWidth
                    label="Text Body"
                    multiline
                    rows={3}
                    value={data.email?.text || ''}
                    onChange={e => handleNestedChange('email', 'text', e.target.value)}
                  />
                </Grid>
                <Grid item xs={12} md={4}>
                  <FormControl fullWidth>
                    <InputLabel>Direction</InputLabel>
                    <Select
                      value={data.email?.direction || 'OUTGOING'}
                      label="Direction"
                      onChange={e => handleNestedChange('email', 'direction', e.target.value)}
                    >
                      <MenuItem value="OUTGOING">Outgoing</MenuItem>
                      <MenuItem value="INCOMING">Incoming</MenuItem>
                    </Select>
                  </FormControl>
                </Grid>
                <Grid item xs={12} md={4}>
                  <TextField
                    fullWidth
                    label="Status"
                    value={data.email?.status || 'SENT'}
                    onChange={e => handleNestedChange('email', 'status', e.target.value)}
                    placeholder="SENT, QUEUED, FAILED"
                  />
                </Grid>
                <Grid item xs={12} md={4}>
                  <TextField
                    fullWidth
                    label="Associate Object ID"
                    value={data.email?.associate?.objectId || ''}
                    onChange={e =>
                      handleNestedChange('email', 'associate', {
                        ...(data.email?.associate || { object: 'contact' }),
                        objectId: e.target.value,
                      })
                    }
                    placeholder="Contact/Deal ID"
                  />
                </Grid>
              </>
            )}

            {data.operation === 'createCall' && (
              <>
                <Grid item xs={12} md={6}>
                  <TextField
                    fullWidth
                    label="Title"
                    value={data.call?.title || ''}
                    onChange={e => handleNestedChange('call', 'title', e.target.value)}
                  />
                </Grid>
                <Grid item xs={12}>
                  <TextField
                    fullWidth
                    label="Body"
                    multiline
                    rows={3}
                    value={data.call?.body || ''}
                    onChange={e => handleNestedChange('call', 'body', e.target.value)}
                  />
                </Grid>
                <Grid item xs={12} md={4}>
                  <FormControl fullWidth>
                    <InputLabel>Direction</InputLabel>
                    <Select
                      value={data.call?.direction || 'OUTGOING'}
                      label="Direction"
                      onChange={e => handleNestedChange('call', 'direction', e.target.value)}
                    >
                      <MenuItem value="OUTGOING">Outgoing</MenuItem>
                      <MenuItem value="INCOMING">Incoming</MenuItem>
                    </Select>
                  </FormControl>
                </Grid>
                <Grid item xs={12} md={4}>
                  <TextField
                    fullWidth
                    type="number"
                    label="Duration (ms)"
                    value={data.call?.duration || 0}
                    onChange={e => handleNestedChange('call', 'duration', Number(e.target.value))}
                  />
                </Grid>
                <Grid item xs={12} md={4}>
                  <TextField
                    fullWidth
                    label="Associate Object ID"
                    value={data.call?.associate?.objectId || ''}
                    onChange={e =>
                      handleNestedChange('call', 'associate', {
                        ...(data.call?.associate || { object: 'contact' }),
                        objectId: e.target.value,
                      })
                    }
                  />
                </Grid>
              </>
            )}

            {data.operation === 'addToList' && (
              <Grid item xs={12} md={6}>
                <TextField
                  fullWidth
                  label="Static List ID"
                  value={data.list?.listId || ''}
                  onChange={e => handleNestedChange('list', 'listId', e.target.value)}
                />
              </Grid>
            )}

            {data.operation === 'createNote' && (
              <Grid item xs={12}>
                <TextField
                  fullWidth
                  label="Note Content"
                  multiline
                  rows={3}
                  value={data.note?.content || ''}
                  onChange={e => handleNestedChange('note', 'content', e.target.value)}
                />
              </Grid>
            )}
          </Grid>
        </AccordionDetails>
      </Accordion>

      <Accordion>
        <AccordionSummary expandIcon={<ExpandMoreIcon />}>
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
            <IntegrationIcon />
            <Typography>Property Mapping</Typography>
          </Box>
        </AccordionSummary>
        <AccordionDetails>
          <Grid container spacing={2}>
            <Grid item xs={12} md={8}>
              <FormControl fullWidth>
                <InputLabel>Apply Template</InputLabel>
                <Select
                  value={data._templateSelection || ''}
                  label="Apply Template"
                  onChange={e => handleDataChange('_templateSelection', e.target.value)}
                >
                  <MenuItem value="">None</MenuItem>
                  <MenuItem value="contact">Contact (Standard)</MenuItem>
                  <MenuItem value="company">Company (Standard)</MenuItem>
                  <MenuItem value="deal">Deal (Standard)</MenuItem>
                  <MenuItem value="email">Email Activity (Standard)</MenuItem>
                  <MenuItem value="call">Call Activity (Standard)</MenuItem>
                  <MenuItem value="note">Note (Standard)</MenuItem>
                </Select>
              </FormControl>
            </Grid>
            <Grid item xs={12} md={4} sx={{ display: 'flex', alignItems: 'center' }}>
              <Button
                variant="outlined"
                onClick={() => {
                  const desired =
                    data._templateSelection ||
                    (data.operation?.toLowerCase().includes('create') ? data.object : '');
                  const tmpl = getTemplateFor(desired, data.operation);
                  if (!tmpl) return;
                  const current = { ...(data.dataMapping?.properties || {}) };
                  const merged = { ...tmpl, ...current }; // current wins to avoid overwriting
                  handleNestedChange('dataMapping', 'properties', merged);
                }}
                sx={{ ml: { md: 2 } }}
              >
                Apply Template
              </Button>
            </Grid>
            <Grid item xs={12}>
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, flexWrap: 'wrap' }}>
                {Object.entries(data.dataMapping?.properties || {}).map(([k, v]) => (
                  <Chip
                    key={k}
                    label={`${k} → ${v}`}
                    onDelete={() => handleMappingRemove(k)}
                    sx={{ mr: 1, mb: 1 }}
                  />
                ))}
                <Button variant="outlined" size="small" onClick={handleMappingAdd}>
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

export default HubSpotActionPanel;
