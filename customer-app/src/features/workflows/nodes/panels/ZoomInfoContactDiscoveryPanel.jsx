import {
  ExpandMore as ExpandMoreIcon,
  Search as SearchIcon,
  Science as TestIcon,
  Security as SecurityIcon,
  ContactPage as ContactIcon,
  Add as AddIcon,
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

const ZoomInfoContactDiscoveryPanel = ({ node, onNodeDataChange }) => {
  const [data, setData] = useState(node.data || {});
  const [testResult, setTestResult] = useState(null);
  const [testLoading, setTestLoading] = useState(false);

  const defaultData = useMemo(
    () => ({
      credentials: {
        type: 'apikey',
        apiKey: '',
        username: '',
        password: '',
        privateKey: '',
        clientId: '',
      },
      searchCriteria: {
        companyDomain: '',
        companyId: '',
        companyName: '',
        jobTitle: '',
        seniority: '',
        department: '',
        location: '',
        limit: 25,
        offset: 0,
        includeCompanyData: true,
      },
      enrichmentOptions: {
        customFields: {},
      },
      outputFormat: 'enriched',
    }),
    []
  );

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

  const handleAddCustomField = () => {
    const sourceField = prompt('Enter source field name (e.g., job_title):');
    if (sourceField && sourceField.trim()) {
      const targetField = prompt('Enter target field name (e.g., title):');
      if (targetField && targetField.trim()) {
        const newFields = {
          ...data.enrichmentOptions?.customFields,
          [sourceField.trim()]: targetField.trim(),
        };
        handleNestedChange('enrichmentOptions', 'customFields', newFields);
      }
    }
  };

  const handleRemoveCustomField = fieldToRemove => {
    const newFields = { ...data.enrichmentOptions?.customFields };
    delete newFields[fieldToRemove];
    handleNestedChange('enrichmentOptions', 'customFields', newFields);
  };

  const handleTestConnection = async () => {
    setTestLoading(true);
    setTestResult(null);

    try {
      const response = await fetch('/api/workflows/test-zoominfo-contact-discovery', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          credentials: data.credentials,
          searchCriteria: {
            ...data.searchCriteria,
            limit: 5, // Small test sample
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

  return (
    <Box sx={{ p: 2 }}>
      <Typography variant="h6" gutterBottom>
        ZoomInfo Contact Discovery Configuration
      </Typography>

      {/* Authentication Section */}
      <Accordion defaultExpanded>
        <AccordionSummary expandIcon={<ExpandMoreIcon />}>
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
            <SecurityIcon />
            <Typography>Authentication</Typography>
          </Box>
        </AccordionSummary>
        <AccordionDetails>
          <Grid container spacing={2}>
            <Grid item xs={12}>
              <FormControl fullWidth>
                <InputLabel>Authentication Type</InputLabel>
                <Select
                  value={data.credentials?.type || 'apikey'}
                  onChange={e => handleNestedChange('credentials', 'type', e.target.value)}
                >
                  <MenuItem value="apikey">API Key</MenuItem>
                  <MenuItem value="username_password">Username/Password</MenuItem>
                  <MenuItem value="pki">PKI Authentication</MenuItem>
                </Select>
              </FormControl>
            </Grid>

            {data.credentials?.type === 'apikey' && (
              <Grid item xs={12}>
                <TextField
                  fullWidth
                  label="API Key"
                  type="password"
                  value={data.credentials?.apiKey || ''}
                  onChange={e => handleNestedChange('credentials', 'apiKey', e.target.value)}
                  helperText="Your ZoomInfo API key"
                />
              </Grid>
            )}

            {data.credentials?.type === 'username_password' && (
              <>
                <Grid item xs={6}>
                  <TextField
                    fullWidth
                    label="Username"
                    value={data.credentials?.username || ''}
                    onChange={e => handleNestedChange('credentials', 'username', e.target.value)}
                  />
                </Grid>
                <Grid item xs={6}>
                  <TextField
                    fullWidth
                    label="Password"
                    type="password"
                    value={data.credentials?.password || ''}
                    onChange={e => handleNestedChange('credentials', 'password', e.target.value)}
                  />
                </Grid>
              </>
            )}

            {data.credentials?.type === 'pki' && (
              <>
                <Grid item xs={6}>
                  <TextField
                    fullWidth
                    label="Client ID"
                    value={data.credentials?.clientId || ''}
                    onChange={e => handleNestedChange('credentials', 'clientId', e.target.value)}
                  />
                </Grid>
                <Grid item xs={12}>
                  <TextField
                    fullWidth
                    label="Private Key"
                    multiline
                    rows={4}
                    value={data.credentials?.privateKey || ''}
                    onChange={e => handleNestedChange('credentials', 'privateKey', e.target.value)}
                    helperText="PEM formatted private key"
                  />
                </Grid>
              </>
            )}
          </Grid>
        </AccordionDetails>
      </Accordion>

      {/* Search Criteria */}
      <Accordion>
        <AccordionSummary expandIcon={<ExpandMoreIcon />}>
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
            <SearchIcon />
            <Typography>Search Criteria</Typography>
          </Box>
        </AccordionSummary>
        <AccordionDetails>
          <Grid container spacing={2}>
            <Grid item xs={6}>
              <TextField
                fullWidth
                label="Company Domain"
                value={data.searchCriteria?.companyDomain || ''}
                onChange={e =>
                  handleNestedChange('searchCriteria', 'companyDomain', e.target.value)
                }
                placeholder="e.g., salesforce.com"
              />
            </Grid>

            <Grid item xs={6}>
              <TextField
                fullWidth
                label="Company Name"
                value={data.searchCriteria?.companyName || ''}
                onChange={e => handleNestedChange('searchCriteria', 'companyName', e.target.value)}
                placeholder="e.g., Salesforce Inc."
              />
            </Grid>

            <Grid item xs={6}>
              <TextField
                fullWidth
                label="Job Title"
                value={data.searchCriteria?.jobTitle || ''}
                onChange={e => handleNestedChange('searchCriteria', 'jobTitle', e.target.value)}
                placeholder="e.g., Sales Manager, CEO"
              />
            </Grid>

            <Grid item xs={6}>
              <FormControl fullWidth>
                <InputLabel>Seniority Level</InputLabel>
                <Select
                  value={data.searchCriteria?.seniority || ''}
                  onChange={e => handleNestedChange('searchCriteria', 'seniority', e.target.value)}
                >
                  <MenuItem value="">Any</MenuItem>
                  <MenuItem value="entry">Entry Level</MenuItem>
                  <MenuItem value="manager">Manager</MenuItem>
                  <MenuItem value="director">Director</MenuItem>
                  <MenuItem value="vp">VP</MenuItem>
                  <MenuItem value="c-level">C-Level</MenuItem>
                </Select>
              </FormControl>
            </Grid>

            <Grid item xs={6}>
              <TextField
                fullWidth
                label="Department"
                value={data.searchCriteria?.department || ''}
                onChange={e => handleNestedChange('searchCriteria', 'department', e.target.value)}
                placeholder="e.g., Sales, Marketing, IT"
              />
            </Grid>

            <Grid item xs={6}>
              <TextField
                fullWidth
                label="Location"
                value={data.searchCriteria?.location || ''}
                onChange={e => handleNestedChange('searchCriteria', 'location', e.target.value)}
                placeholder="e.g., San Francisco, CA"
              />
            </Grid>

            <Grid item xs={6}>
              <TextField
                fullWidth
                label="Results Limit"
                type="number"
                inputProps={{ min: 1, max: 100 }}
                value={data.searchCriteria?.limit || 25}
                onChange={e =>
                  handleNestedChange('searchCriteria', 'limit', parseInt(e.target.value))
                }
                helperText="Maximum contacts to return"
              />
            </Grid>

            <Grid item xs={6}>
              <TextField
                fullWidth
                label="Results Offset"
                type="number"
                inputProps={{ min: 0 }}
                value={data.searchCriteria?.offset || 0}
                onChange={e =>
                  handleNestedChange('searchCriteria', 'offset', parseInt(e.target.value))
                }
                helperText="Skip this many results"
              />
            </Grid>

            <Grid item xs={12}>
              <FormControlLabel
                control={
                  <Switch
                    checked={data.searchCriteria?.includeCompanyData || false}
                    onChange={e =>
                      handleNestedChange('searchCriteria', 'includeCompanyData', e.target.checked)
                    }
                  />
                }
                label="Include Company Data"
              />
              <Typography variant="body2" color="text.secondary">
                Include detailed company information with contact results
              </Typography>
            </Grid>
          </Grid>
        </AccordionDetails>
      </Accordion>

      {/* Output Configuration */}
      <Accordion>
        <AccordionSummary expandIcon={<ExpandMoreIcon />}>
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
            <ContactIcon />
            <Typography>Output Configuration</Typography>
          </Box>
        </AccordionSummary>
        <AccordionDetails>
          <Grid container spacing={2}>
            <Grid item xs={12}>
              <FormControl fullWidth>
                <InputLabel>Output Format</InputLabel>
                <Select
                  value={data.outputFormat || 'enriched'}
                  onChange={e => handleDataChange('outputFormat', e.target.value)}
                >
                  <MenuItem value="basic">Basic (Name, Email, Title, Company)</MenuItem>
                  <MenuItem value="enriched">Enriched (Additional contact details)</MenuItem>
                  <MenuItem value="full">Full (All available data + tech stack + news)</MenuItem>
                </Select>
              </FormControl>
            </Grid>

            <Grid item xs={12}>
              <Box sx={{ mb: 1 }}>
                <Button
                  variant="outlined"
                  startIcon={<AddIcon />}
                  onClick={handleAddCustomField}
                  size="small"
                >
                  Add Custom Field Mapping
                </Button>
              </Box>

              <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 1, mb: 1 }}>
                {Object.entries(data.enrichmentOptions?.customFields || {}).map(
                  ([source, target]) => (
                    <Chip
                      key={source}
                      label={`${source} → ${target}`}
                      onDelete={() => handleRemoveCustomField(source)}
                      color="secondary"
                      variant="outlined"
                    />
                  )
                )}
              </Box>

              <Typography variant="body2" color="text.secondary">
                Map ZoomInfo field names to custom field names in your output
              </Typography>
            </Grid>
          </Grid>
        </AccordionDetails>
      </Accordion>

      {/* Test Connection */}
      <Box sx={{ mt: 2 }}>
        <Button
          variant="outlined"
          startIcon={<TestIcon />}
          onClick={handleTestConnection}
          disabled={testLoading}
          fullWidth
        >
          {testLoading ? 'Testing Discovery...' : 'Test Contact Discovery'}
        </Button>

        {testResult && (
          <Box sx={{ mt: 2 }}>
            <Alert severity={testResult.success ? 'success' : 'error'}>
              {testResult.success ? testResult.message : testResult.error}
              {testResult.data && testResult.data.contacts && (
                <Box sx={{ mt: 1 }}>
                  <Typography variant="body2">
                    Found {testResult.data.contacts.length} contacts
                  </Typography>
                  {testResult.data.contacts.slice(0, 2).map((contact, index) => (
                    <Box key={index} sx={{ mt: 1, p: 1, bgcolor: 'grey.100', borderRadius: 1 }}>
                      <Typography variant="caption">
                        {contact.name} - {contact.job_title} at {contact.company_name}
                      </Typography>
                    </Box>
                  ))}
                </Box>
              )}
            </Alert>
          </Box>
        )}
      </Box>

      {/* Information */}
      <Box sx={{ mt: 2 }}>
        <Alert severity="info">
          This action will search ZoomInfo for contacts based on your criteria and return enriched
          contact data. Use company domain or name to search for contacts within specific
          organizations.
        </Alert>
      </Box>
    </Box>
  );
};

export default ZoomInfoContactDiscoveryPanel;
