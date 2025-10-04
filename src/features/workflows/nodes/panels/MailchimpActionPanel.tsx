import {
  ExpandMore as ExpandMoreIcon,
  Email as EmailIcon,
  Label as TagIcon,
  Security as SecurityIcon,
} from '@mui/icons-material';
import {
  Box,
  TextField,
  Typography,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  Accordion,
  AccordionSummary,
  AccordionDetails,
  Grid,
  Chip,
  Button,
  FormControlLabel,
  Checkbox,
  Alert,
} from '@mui/material';
import React, { useEffect, useMemo, useState } from 'react';

type Props = {
  node: any;
  onNodeDataChange: (data: any) => void;
};

const MailchimpActionPanel = ({ node, onNodeDataChange }: Props) => {
  const [data, setData] = useState(node.data || {});

  const defaultData = useMemo(
    () => ({
      connection: {
        apiKey: '',
        server: '', // Optional, auto-detected from API key
      },
      operation: 'subscribe',
      listId: '',
      email: '',
      status: 'subscribed',
      doubleOptIn: false,
      tags: [],
      dataMapping: {
        mergeFields: {}, // e.g., { FNAME: '{{contact.firstName}}', LNAME: '{{contact.lastName}}' }
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

  const handleDataChange = (field: string, value: any) => {
    const newData = { ...data, [field]: value };
    setData(newData);
    onNodeDataChange(newData);
  };

  const handleNestedChange = (parent: string, field: string, value: any) => {
    const newData = { ...data, [parent]: { ...data[parent], [field]: value } };
    setData(newData);
    onNodeDataChange(newData);
  };

  const handleTagsChange = (value: string) => {
    // Convert comma-separated string to array
    const tagsArray = value
      .split(',')
      .map(t => t.trim())
      .filter(Boolean);
    handleDataChange('tags', tagsArray);
  };

  const handleMergeFieldAdd = () => {
    const fieldName = prompt('Mailchimp merge field name (e.g., FNAME, LNAME, PHONE):');
    if (!fieldName) return;
    const source = prompt(
      'Source field from context (use {{variable}} syntax):\nExample: {{contact.firstName}}'
    );
    if (!source) return;

    const next = {
      ...(data.dataMapping?.mergeFields || {}),
      [fieldName.toUpperCase()]: source,
    };
    handleNestedChange('dataMapping', 'mergeFields', next);
  };

  const handleMergeFieldRemove = (key: string) => {
    const next = { ...(data.dataMapping?.mergeFields || {}) };
    delete next[key];
    handleNestedChange('dataMapping', 'mergeFields', next);
  };

  const operationOptions = [
    { value: 'subscribe', label: 'Subscribe Member' },
    { value: 'unsubscribe', label: 'Unsubscribe Member' },
    { value: 'updateMember', label: 'Update Member' },
    { value: 'addTags', label: 'Add Tags' },
    { value: 'removeTags', label: 'Remove Tags' },
    { value: 'updateFields', label: 'Update Merge Fields' },
    { value: 'getMember', label: 'Get Member Info' },
    { value: 'deleteMember', label: 'Delete Member (Permanent)' },
  ];

  const statusOptions = [
    { value: 'subscribed', label: 'Subscribed' },
    { value: 'unsubscribed', label: 'Unsubscribed' },
    { value: 'cleaned', label: 'Cleaned' },
    { value: 'pending', label: 'Pending (Double Opt-in)' },
  ];

  const requiresEmail = true; // All operations require email
  const showTagsField = ['subscribe', 'addTags', 'removeTags'].includes(data.operation);
  const showStatusField = ['subscribe', 'updateMember'].includes(data.operation);
  const showMergeFields = ['subscribe', 'updateMember', 'updateFields'].includes(data.operation);

  return (
    <Box sx={{ p: 2 }}>
      <Typography variant="h6" gutterBottom sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
        <EmailIcon />
        Mailchimp Action
      </Typography>

      <Accordion defaultExpanded>
        <AccordionSummary expandIcon={<ExpandMoreIcon />}>
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
            <SecurityIcon fontSize="small" />
            <Typography>Connection</Typography>
          </Box>
        </AccordionSummary>
        <AccordionDetails>
          <Grid container spacing={2}>
            <Grid item xs={12}>
              <TextField
                fullWidth
                label="API Key"
                type="password"
                value={data.connection?.apiKey || ''}
                onChange={e => handleNestedChange('connection', 'apiKey', e.target.value)}
                placeholder="xxxxxxxxxxxxxxxxxxxxx-us1"
                helperText="Get your API key from Mailchimp Account > Extras > API keys"
              />
            </Grid>
            <Grid item xs={12}>
              <TextField
                fullWidth
                label="Server Prefix (Optional)"
                value={data.connection?.server || ''}
                onChange={e => handleNestedChange('connection', 'server', e.target.value)}
                placeholder="us1, us2, etc. (auto-detected from API key)"
                helperText="Leave blank to auto-detect from API key"
              />
            </Grid>
          </Grid>
        </AccordionDetails>
      </Accordion>

      <Accordion defaultExpanded>
        <AccordionSummary expandIcon={<ExpandMoreIcon />}>
          <Typography>Operation Settings</Typography>
        </AccordionSummary>
        <AccordionDetails>
          <Grid container spacing={2}>
            <Grid item xs={12}>
              <FormControl fullWidth>
                <InputLabel>Operation</InputLabel>
                <Select
                  value={data.operation || 'subscribe'}
                  onChange={e => handleDataChange('operation', e.target.value)}
                  label="Operation"
                >
                  {operationOptions.map(opt => (
                    <MenuItem key={opt.value} value={opt.value}>
                      {opt.label}
                    </MenuItem>
                  ))}
                </Select>
              </FormControl>
            </Grid>

            <Grid item xs={12}>
              <TextField
                fullWidth
                label="List/Audience ID"
                value={data.listId || ''}
                onChange={e => handleDataChange('listId', e.target.value)}
                placeholder="abc123def4"
                helperText="Find this in Mailchimp > Audience > Settings > Audience name and defaults"
                required
              />
            </Grid>

            {requiresEmail && (
              <Grid item xs={12}>
                <TextField
                  fullWidth
                  label="Email Address"
                  value={data.email || ''}
                  onChange={e => handleDataChange('email', e.target.value)}
                  placeholder="{{contact.email}} or specific email"
                  helperText="Use {{variable}} syntax for dynamic values"
                  required
                />
              </Grid>
            )}

            {showStatusField && (
              <Grid item xs={12} md={6}>
                <FormControl fullWidth>
                  <InputLabel>Subscriber Status</InputLabel>
                  <Select
                    value={data.status || 'subscribed'}
                    onChange={e => handleDataChange('status', e.target.value)}
                    label="Subscriber Status"
                  >
                    {statusOptions.map(opt => (
                      <MenuItem key={opt.value} value={opt.value}>
                        {opt.label}
                      </MenuItem>
                    ))}
                  </Select>
                </FormControl>
              </Grid>
            )}

            {data.operation === 'subscribe' && (
              <Grid item xs={12} md={6}>
                <FormControlLabel
                  control={
                    <Checkbox
                      checked={data.doubleOptIn || false}
                      onChange={e => handleDataChange('doubleOptIn', e.target.checked)}
                    />
                  }
                  label="Double Opt-In (Send confirmation email)"
                />
              </Grid>
            )}

            {showTagsField && (
              <Grid item xs={12}>
                <TextField
                  fullWidth
                  label="Tags (comma-separated)"
                  value={Array.isArray(data.tags) ? data.tags.join(', ') : data.tags || ''}
                  onChange={e => handleTagsChange(e.target.value)}
                  placeholder="customer, vip, newsletter"
                  helperText="Enter tags separated by commas"
                  InputProps={{
                    startAdornment: <TagIcon sx={{ mr: 1, color: 'text.secondary' }} />,
                  }}
                />
              </Grid>
            )}
          </Grid>
        </AccordionDetails>
      </Accordion>

      {showMergeFields && (
        <Accordion>
          <AccordionSummary expandIcon={<ExpandMoreIcon />}>
            <Typography>Merge Fields (Subscriber Data)</Typography>
          </AccordionSummary>
          <AccordionDetails>
            <Grid container spacing={2}>
              <Grid item xs={12}>
                <Alert severity="info" sx={{ mb: 2 }}>
                  Map fields from your workflow to Mailchimp merge fields (FNAME, LNAME, PHONE,
                  etc.)
                </Alert>
              </Grid>

              <Grid item xs={12}>
                <Box sx={{ mb: 2 }}>
                  {Object.entries(data.dataMapping?.mergeFields || {}).map(([key, value]) => (
                    <Chip
                      key={key}
                      label={`${key} = ${value}`}
                      onDelete={() => handleMergeFieldRemove(key)}
                      sx={{ mr: 1, mb: 1 }}
                    />
                  ))}
                </Box>
                <Button variant="outlined" size="small" onClick={handleMergeFieldAdd}>
                  + Add Merge Field Mapping
                </Button>
              </Grid>

              <Grid item xs={12}>
                <Typography variant="caption" color="text.secondary">
                  Common merge fields: FNAME (First Name), LNAME (Last Name), PHONE, ADDRESS,
                  BIRTHDAY
                </Typography>
              </Grid>
            </Grid>
          </AccordionDetails>
        </Accordion>
      )}

      <Box sx={{ mt: 2, p: 2, bgcolor: 'background.paper', borderRadius: 1 }}>
        <Typography variant="caption" color="text.secondary">
          <strong>Setup Guide:</strong>
          <ol style={{ marginTop: 8, marginBottom: 0 }}>
            <li>Log in to Mailchimp and go to Account → Extras → API keys</li>
            <li>Create a new API key and copy it (format: key-us1)</li>
            <li>Find your List ID in Audience → Settings → Audience name and defaults</li>
            <li>
              Configure merge fields in Audience → Settings → Audience fields and *|MERGE|* tags
            </li>
          </ol>
        </Typography>
      </Box>
    </Box>
  );
};

export default MailchimpActionPanel;
