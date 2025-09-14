import {
  ExpandMore as ExpandMoreIcon,
  Add as AddIcon,
  Security as SecurityIcon,
  Science as TestIcon,
} from '@mui/icons-material';
import {
  Box,
  TextField,
  Typography,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  Chip,
  Button,
  Alert,
  Accordion,
  AccordionSummary,
  AccordionDetails,
  FormControlLabel,
  Switch,
  Grid,
} from '@mui/material';
import React, { useState, useEffect, useMemo } from 'react';

const ZoomInfoIntentTriggerPanel = ({ node, onNodeDataChange }) => {
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
      intentTopics: [],
      signalStrength: 'moderate',
      companyFilters: {
        industry: '',
        companySize: '',
        location: '',
        technologyStack: [],
      },
      pollingInterval: 900000, // 15 minutes
      advancedSettings: {
        batchSize: 50,
        includeContactData: true,
        minimumConfidenceScore: 0.7,
      },
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

  const handleAddIntentTopic = () => {
    const topic = prompt('Enter intent topic:');
    if (topic && topic.trim()) {
      const newTopics = [...(data.intentTopics || []), topic.trim()];
      handleDataChange('intentTopics', newTopics);
    }
  };

  const handleRemoveIntentTopic = topicToRemove => {
    const newTopics = (data.intentTopics || []).filter(topic => topic !== topicToRemove);
    handleDataChange('intentTopics', newTopics);
  };

  const handleAddTechnology = () => {
    const tech = prompt('Enter technology name:');
    if (tech && tech.trim()) {
      const newTech = [...(data.companyFilters?.technologyStack || []), tech.trim()];
      handleNestedChange('companyFilters', 'technologyStack', newTech);
    }
  };

  const handleRemoveTechnology = techToRemove => {
    const newTech = (data.companyFilters?.technologyStack || []).filter(
      tech => tech !== techToRemove
    );
    handleNestedChange('companyFilters', 'technologyStack', newTech);
  };

  const handleTestConnection = async () => {
    setTestLoading(true);
    setTestResult(null);

    try {
      const response = await fetch('/api/workflows/test-zoominfo-trigger', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(data),
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

  const formatPollingInterval = ms => {
    const minutes = Math.floor(ms / 60000);
    if (minutes < 60) {
      return `${minutes} minutes`;
    }
    const hours = Math.floor(minutes / 60);
    return `${hours} hours`;
  };

  return (
    <Box sx={{ p: 2 }}>
      <Typography variant="h6" gutterBottom>
        ZoomInfo Intent Trigger Configuration
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

            <Grid item xs={12}>
              <Button
                variant="outlined"
                startIcon={<TestIcon />}
                onClick={handleTestConnection}
                disabled={testLoading}
                fullWidth
              >
                {testLoading ? 'Testing Connection...' : 'Test Connection'}
              </Button>
            </Grid>

            {testResult && (
              <Grid item xs={12}>
                <Alert severity={testResult.success ? 'success' : 'error'}>
                  {testResult.success ? testResult.message : testResult.error}
                  {testResult.sampleData && (
                    <Box sx={{ mt: 1 }}>
                      <Typography variant="body2">
                        Sample data: {JSON.stringify(testResult.sampleData, null, 2)}
                      </Typography>
                    </Box>
                  )}
                </Alert>
              </Grid>
            )}
          </Grid>
        </AccordionDetails>
      </Accordion>

      {/* Intent Topics Section */}
      <Accordion>
        <AccordionSummary expandIcon={<ExpandMoreIcon />}>
          <Typography>Intent Topics ({(data.intentTopics || []).length})</Typography>
        </AccordionSummary>
        <AccordionDetails>
          <Box sx={{ mb: 2 }}>
            <Button
              variant="outlined"
              startIcon={<AddIcon />}
              onClick={handleAddIntentTopic}
              size="small"
            >
              Add Intent Topic
            </Button>
          </Box>

          <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 1, mb: 2 }}>
            {(data.intentTopics || []).map((topic, index) => (
              <Chip
                key={index}
                label={topic}
                onDelete={() => handleRemoveIntentTopic(topic)}
                color="primary"
                variant="outlined"
              />
            ))}
          </Box>

          <Typography variant="body2" color="text.secondary">
            Common topics: CRM Software, Marketing Automation, Data Analytics, Business
            Intelligence, Customer Support Software
          </Typography>
        </AccordionDetails>
      </Accordion>

      {/* Signal Strength */}
      <Accordion>
        <AccordionSummary expandIcon={<ExpandMoreIcon />}>
          <Typography>Signal Configuration</Typography>
        </AccordionSummary>
        <AccordionDetails>
          <Grid container spacing={2}>
            <Grid item xs={6}>
              <FormControl fullWidth>
                <InputLabel>Signal Strength</InputLabel>
                <Select
                  value={data.signalStrength || 'moderate'}
                  onChange={e => handleDataChange('signalStrength', e.target.value)}
                >
                  <MenuItem value="weak">Weak (Lower threshold)</MenuItem>
                  <MenuItem value="moderate">Moderate (Balanced)</MenuItem>
                  <MenuItem value="strong">Strong (High confidence)</MenuItem>
                </Select>
              </FormControl>
            </Grid>

            <Grid item xs={6}>
              <TextField
                fullWidth
                label="Minimum Confidence Score"
                type="number"
                inputProps={{ min: 0, max: 1, step: 0.1 }}
                value={data.advancedSettings?.minimumConfidenceScore || 0.7}
                onChange={e =>
                  handleNestedChange(
                    'advancedSettings',
                    'minimumConfidenceScore',
                    parseFloat(e.target.value)
                  )
                }
                helperText="0.0 - 1.0"
              />
            </Grid>
          </Grid>
        </AccordionDetails>
      </Accordion>

      {/* Company Filters */}
      <Accordion>
        <AccordionSummary expandIcon={<ExpandMoreIcon />}>
          <Typography>Company Filters</Typography>
        </AccordionSummary>
        <AccordionDetails>
          <Grid container spacing={2}>
            <Grid item xs={6}>
              <TextField
                fullWidth
                label="Industry"
                value={data.companyFilters?.industry || ''}
                onChange={e => handleNestedChange('companyFilters', 'industry', e.target.value)}
                placeholder="e.g., Technology, Healthcare"
              />
            </Grid>

            <Grid item xs={6}>
              <TextField
                fullWidth
                label="Company Size"
                value={data.companyFilters?.companySize || ''}
                onChange={e => handleNestedChange('companyFilters', 'companySize', e.target.value)}
                placeholder="e.g., 1-50, 51-200, 201-1000"
              />
            </Grid>

            <Grid item xs={6}>
              <TextField
                fullWidth
                label="Location"
                value={data.companyFilters?.location || ''}
                onChange={e => handleNestedChange('companyFilters', 'location', e.target.value)}
                placeholder="e.g., United States, California"
              />
            </Grid>

            <Grid item xs={12}>
              <Box sx={{ mb: 1 }}>
                <Button
                  variant="outlined"
                  startIcon={<AddIcon />}
                  onClick={handleAddTechnology}
                  size="small"
                >
                  Add Technology Filter
                </Button>
              </Box>

              <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 1 }}>
                {(data.companyFilters?.technologyStack || []).map((tech, index) => (
                  <Chip
                    key={index}
                    label={tech}
                    onDelete={() => handleRemoveTechnology(tech)}
                    color="secondary"
                    variant="outlined"
                  />
                ))}
              </Box>
            </Grid>
          </Grid>
        </AccordionDetails>
      </Accordion>

      {/* Polling Configuration */}
      <Accordion>
        <AccordionSummary expandIcon={<ExpandMoreIcon />}>
          <Typography>Polling Configuration</Typography>
        </AccordionSummary>
        <AccordionDetails>
          <Grid container spacing={2}>
            <Grid item xs={6}>
              <TextField
                fullWidth
                label="Polling Interval (minutes)"
                type="number"
                inputProps={{ min: 5, max: 1440 }}
                value={Math.floor((data.pollingInterval || 900000) / 60000)}
                onChange={e =>
                  handleDataChange('pollingInterval', parseInt(e.target.value) * 60000)
                }
                helperText={`Currently: ${formatPollingInterval(data.pollingInterval || 900000)}`}
              />
            </Grid>

            <Grid item xs={6}>
              <TextField
                fullWidth
                label="Batch Size"
                type="number"
                inputProps={{ min: 10, max: 100 }}
                value={data.advancedSettings?.batchSize || 50}
                onChange={e =>
                  handleNestedChange('advancedSettings', 'batchSize', parseInt(e.target.value))
                }
                helperText="Records per API call"
              />
            </Grid>

            <Grid item xs={12}>
              <FormControlLabel
                control={
                  <Switch
                    checked={data.advancedSettings?.includeContactData || false}
                    onChange={e =>
                      handleNestedChange('advancedSettings', 'includeContactData', e.target.checked)
                    }
                  />
                }
                label="Include Contact Data"
              />
              <Typography variant="body2" color="text.secondary">
                Include associated contact information with intent signals
              </Typography>
            </Grid>
          </Grid>
        </AccordionDetails>
      </Accordion>

      {/* Information */}
      <Box sx={{ mt: 2 }}>
        <Alert severity="info">
          This trigger will monitor ZoomInfo for companies showing purchase intent based on your
          criteria. The workflow will be triggered for each company that matches your filters with
          new intent signals.
        </Alert>
      </Box>
    </Box>
  );
};

export default ZoomInfoIntentTriggerPanel;
