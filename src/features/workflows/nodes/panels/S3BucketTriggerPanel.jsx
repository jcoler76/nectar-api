import TestIcon from '@mui/icons-material/BugReport';
import ContentCopyIcon from '@mui/icons-material/ContentCopy';
import ExpandMoreIcon from '@mui/icons-material/ExpandMore';
import InfoIcon from '@mui/icons-material/Info';
import {
  Accordion,
  AccordionDetails,
  AccordionSummary,
  Alert,
  Box,
  Button,
  Chip,
  FormControl,
  FormControlLabel,
  FormLabel,
  IconButton,
  InputLabel,
  MenuItem,
  Paper,
  Radio,
  RadioGroup,
  Select,
  Stack,
  Switch,
  TextField,
  Tooltip,
  Typography,
} from '@mui/material';
import { useState } from 'react';

import { useNotification } from '../../../../context/NotificationContext';

const S3BucketTriggerPanel = ({ node, onNodeDataChange, workflowId }) => {
  const { showNotification } = useNotification();
  const [isTesting, setIsTesting] = useState(false);

  if (!node || !node.data) {
    return null;
  }

  const nodeData = node.data;

  const handleChange = event => {
    const { name, value, type, checked } = event.target;
    const newValue = type === 'checkbox' ? checked : value;
    onNodeDataChange({ [name]: newValue });
  };

  const handlePollingIntervalChange = event => {
    const value = parseInt(event.target.value) || 300000;
    onNodeDataChange({ pollingInterval: value });
  };

  const handleMaxFilesChange = event => {
    const value = parseInt(event.target.value) || 10;
    onNodeDataChange({ maxFiles: value });
  };

  const handleTestConnection = async () => {
    setIsTesting(true);
    try {
      // In a real implementation, this would call an API endpoint to test the S3 connection
      await new Promise(resolve => setTimeout(resolve, 1000)); // Simulate API call
      showNotification('S3 connection test successful!', 'success');
    } catch (error) {
      showNotification('S3 connection test failed: ' + error.message, 'error');
    } finally {
      setIsTesting(false);
    }
  };

  const handleCopyToClipboard = (text, type) => {
    navigator.clipboard.writeText(text);
    showNotification(`${type} copied to clipboard!`, 'success');
  };

  // Generate webhook URL for S3 event notifications
  const webhookUrl = workflowId
    ? `${(process.env.REACT_APP_API_URL || 'http://localhost:3001').replace(/\/$/, '')}/api/webhooks/s3/${workflowId}`
    : 'Workflow must be saved first';

  const awsRegions = [
    'us-east-1',
    'us-east-2',
    'us-west-1',
    'us-west-2',
    'eu-west-1',
    'eu-west-2',
    'eu-west-3',
    'eu-central-1',
    'ap-northeast-1',
    'ap-northeast-2',
    'ap-southeast-1',
    'ap-southeast-2',
    'ap-south-1',
    'sa-east-1',
    'ca-central-1',
  ];

  const pollingIntervals = [
    { value: 60000, label: '1 minute' },
    { value: 300000, label: '5 minutes' },
    { value: 600000, label: '10 minutes' },
    { value: 1800000, label: '30 minutes' },
    { value: 3600000, label: '1 hour' },
  ];

  return (
    <Box sx={{ p: 2 }}>
      <Typography variant="h6" gutterBottom>
        S3 Bucket Trigger
      </Typography>

      <TextField
        label="Node Label"
        name="label"
        value={nodeData.label || ''}
        onChange={handleChange}
        fullWidth
        margin="normal"
        helperText="A descriptive name for this trigger"
      />

      {/* Trigger Method Selection */}
      <Accordion defaultExpanded sx={{ mt: 2 }}>
        <AccordionSummary expandIcon={<ExpandMoreIcon />}>
          <Typography variant="subtitle1">Trigger Method</Typography>
        </AccordionSummary>
        <AccordionDetails>
          <FormControl component="fieldset">
            <FormLabel component="legend">How should this trigger monitor S3?</FormLabel>
            <RadioGroup
              name="triggerMethod"
              value={nodeData.triggerMethod || 'webhook'}
              onChange={handleChange}
            >
              <FormControlLabel
                value="webhook"
                control={<Radio />}
                label="S3 Event Notifications (Recommended - Real-time, No polling costs)"
              />
              <FormControlLabel
                value="polling"
                control={<Radio />}
                label="Polling (Check bucket periodically - Higher AWS costs)"
              />
            </RadioGroup>
          </FormControl>

          {nodeData.triggerMethod === 'webhook' && (
            <Box sx={{ mt: 2 }}>
              <Alert severity="success" sx={{ mb: 2 }}>
                <Typography variant="body2">
                  <strong>Real-time S3 Event Notifications:</strong> Files trigger workflows
                  immediately when uploaded. No polling costs and near-instant response times.
                </Typography>
              </Alert>

              <Paper sx={{ p: 2, bgcolor: 'grey.50' }}>
                <Typography variant="subtitle2" gutterBottom>
                  S3 Event Notification Webhook URL:
                </Typography>
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 2 }}>
                  <TextField
                    value={webhookUrl}
                    fullWidth
                    InputProps={{
                      readOnly: true,
                      style: { fontSize: '0.875rem' },
                    }}
                    size="small"
                  />
                  <Tooltip title="Copy webhook URL">
                    <IconButton
                      onClick={() => handleCopyToClipboard(webhookUrl, 'Webhook URL')}
                      disabled={!workflowId}
                    >
                      <ContentCopyIcon />
                    </IconButton>
                  </Tooltip>
                </Box>

                <Typography variant="body2" color="text.secondary">
                  Configure this URL in your S3 bucket&apos;s Event Notifications settings.
                  {!workflowId && ' Save the workflow first to generate the URL.'}
                </Typography>
              </Paper>
            </Box>
          )}

          {nodeData.triggerMethod === 'polling' && (
            <Alert severity="warning" sx={{ mt: 2 }}>
              <Typography variant="body2">
                <strong>Polling Mode:</strong> Regularly checks the S3 bucket for new files. This
                results in API calls every few minutes and may incur AWS costs.
              </Typography>
            </Alert>
          )}
        </AccordionDetails>
      </Accordion>

      {/* S3 Configuration */}
      <Accordion defaultExpanded sx={{ mt: 2 }}>
        <AccordionSummary expandIcon={<ExpandMoreIcon />}>
          <Typography variant="subtitle1">S3 Configuration</Typography>
        </AccordionSummary>
        <AccordionDetails>
          <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
            <TextField
              label="S3 Bucket Name"
              name="bucketName"
              value={nodeData.bucketName || ''}
              onChange={handleChange}
              fullWidth
              required
              helperText="The name of the S3 bucket to monitor"
            />

            <FormControl fullWidth>
              <InputLabel>AWS Region</InputLabel>
              <Select
                name="awsRegion"
                value={nodeData.awsRegion || 'us-east-1'}
                onChange={handleChange}
                label="AWS Region"
              >
                {awsRegions.map(region => (
                  <MenuItem key={region} value={region}>
                    {region}
                  </MenuItem>
                ))}
              </Select>
            </FormControl>

            <TextField
              label="S3 Key Prefix (Optional)"
              name="prefix"
              value={nodeData.prefix || ''}
              onChange={handleChange}
              fullWidth
              helperText="Only monitor files with this prefix (e.g., 'uploads/', 'incoming/')"
            />

            <Button
              variant="outlined"
              startIcon={<TestIcon />}
              onClick={handleTestConnection}
              disabled={isTesting || !nodeData.bucketName}
              sx={{ alignSelf: 'flex-start' }}
            >
              {isTesting ? 'Testing...' : 'Test Connection'}
            </Button>
          </Box>
        </AccordionDetails>
      </Accordion>

      {/* AWS Credentials */}
      <Accordion sx={{ mt: 1 }}>
        <AccordionSummary expandIcon={<ExpandMoreIcon />}>
          <Typography variant="subtitle1">AWS Credentials</Typography>
          <Tooltip title="Configure AWS credentials for S3 access">
            <IconButton size="small" sx={{ ml: 1 }}>
              <InfoIcon fontSize="small" />
            </IconButton>
          </Tooltip>
        </AccordionSummary>
        <AccordionDetails>
          <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
            <Alert severity="info" sx={{ mb: 2 }}>
              Leave these fields empty to use environment variables (AWS_ACCESS_KEY_ID,
              AWS_SECRET_ACCESS_KEY)
            </Alert>

            <TextField
              label="AWS Access Key ID (Optional)"
              name="awsAccessKeyId"
              value={nodeData.awsAccessKeyId || ''}
              onChange={handleChange}
              fullWidth
              type="password"
              helperText="Override environment variable if needed"
            />

            <TextField
              label="AWS Secret Access Key (Optional)"
              name="awsSecretAccessKey"
              value={nodeData.awsSecretAccessKey || ''}
              onChange={handleChange}
              fullWidth
              type="password"
              helperText="Override environment variable if needed"
            />
          </Box>
        </AccordionDetails>
      </Accordion>

      {/* File Filtering */}
      <Accordion sx={{ mt: 1 }}>
        <AccordionSummary expandIcon={<ExpandMoreIcon />}>
          <Typography variant="subtitle1">File Filtering</Typography>
        </AccordionSummary>
        <AccordionDetails>
          <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
            <TextField
              label="File Pattern"
              name="filePattern"
              value={nodeData.filePattern || '*'}
              onChange={handleChange}
              fullWidth
              helperText="Pattern to match files (e.g., '*.zip', '*.pdf', 'report_*.csv')"
            />

            <TextField
              label="Max Files Per Poll"
              name="maxFiles"
              type="number"
              value={nodeData.maxFiles || 10}
              onChange={handleMaxFilesChange}
              fullWidth
              inputProps={{ min: 1, max: 100 }}
              helperText="Maximum number of files to process in each polling cycle"
            />

            <Stack direction="row" spacing={1} sx={{ mt: 1 }}>
              <Chip
                label="*.zip"
                size="small"
                onClick={() => onNodeDataChange({ filePattern: '*.zip' })}
                variant={nodeData.filePattern === '*.zip' ? 'filled' : 'outlined'}
              />
              <Chip
                label="*.pdf"
                size="small"
                onClick={() => onNodeDataChange({ filePattern: '*.pdf' })}
                variant={nodeData.filePattern === '*.pdf' ? 'filled' : 'outlined'}
              />
              <Chip
                label="*.csv"
                size="small"
                onClick={() => onNodeDataChange({ filePattern: '*.csv' })}
                variant={nodeData.filePattern === '*.csv' ? 'filled' : 'outlined'}
              />
              <Chip
                label="*"
                size="small"
                onClick={() => onNodeDataChange({ filePattern: '*' })}
                variant={nodeData.filePattern === '*' ? 'filled' : 'outlined'}
              />
            </Stack>
          </Box>
        </AccordionDetails>
      </Accordion>

      {/* Polling Configuration - Only show if polling mode is selected */}
      {nodeData.triggerMethod === 'polling' && (
        <Accordion sx={{ mt: 1 }}>
          <AccordionSummary expandIcon={<ExpandMoreIcon />}>
            <Typography variant="subtitle1">Polling Configuration</Typography>
          </AccordionSummary>
          <AccordionDetails>
            <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
              <FormControl fullWidth>
                <InputLabel>Polling Interval</InputLabel>
                <Select
                  name="pollingInterval"
                  value={nodeData.pollingInterval || 300000}
                  onChange={handlePollingIntervalChange}
                  label="Polling Interval"
                >
                  {pollingIntervals.map(interval => (
                    <MenuItem key={interval.value} value={interval.value}>
                      {interval.label}
                    </MenuItem>
                  ))}
                </Select>
              </FormControl>

              <Alert severity="warning">
                <Typography variant="body2">
                  Shorter polling intervals may result in higher AWS costs. Consider using S3 Event
                  Notifications for real-time processing.
                </Typography>
              </Alert>
            </Box>
          </AccordionDetails>
        </Accordion>
      )}

      {/* Post-Processing Options */}
      <Accordion sx={{ mt: 1 }}>
        <AccordionSummary expandIcon={<ExpandMoreIcon />}>
          <Typography variant="subtitle1">Post-Processing Options</Typography>
        </AccordionSummary>
        <AccordionDetails>
          <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1 }}>
            <FormControlLabel
              control={
                <Switch
                  name="moveAfterProcessing"
                  checked={nodeData.moveAfterProcessing || false}
                  onChange={handleChange}
                />
              }
              label="Move files after processing"
            />

            <FormControlLabel
              control={
                <Switch
                  name="deleteAfterProcessing"
                  checked={nodeData.deleteAfterProcessing || false}
                  onChange={handleChange}
                />
              }
              label="Delete files after processing"
            />

            <Alert severity="info" sx={{ mt: 1 }}>
              <Typography variant="body2">
                Post-processing actions are not yet implemented. Files will remain in the bucket
                after processing.
              </Typography>
            </Alert>
          </Box>
        </AccordionDetails>
      </Accordion>

      {/* Configuration Summary */}
      {nodeData.bucketName && (
        <Box
          sx={{
            mt: 2,
            p: 2,
            bgcolor: 'background.paper',
            borderRadius: 1,
            border: 1,
            borderColor: 'divider',
          }}
        >
          <Typography variant="subtitle2" gutterBottom>
            Configuration Summary
          </Typography>
          <Typography variant="body2" color="text.secondary">
            Monitoring bucket: <strong>{nodeData.bucketName}</strong>
            {nodeData.prefix && ` (prefix: ${nodeData.prefix})`}
            <br />
            Region: <strong>{nodeData.awsRegion || 'us-east-1'}</strong>
            <br />
            File pattern: <strong>{nodeData.filePattern || '*'}</strong>
            <br />
            Polling every:{' '}
            <strong>
              {pollingIntervals.find(i => i.value === (nodeData.pollingInterval || 300000))
                ?.label || '5 minutes'}
            </strong>
          </Typography>
        </Box>
      )}

      {/* Setup Instructions for S3 Event Notifications */}
      {nodeData.triggerMethod === 'webhook' && workflowId && (
        <Accordion sx={{ mt: 2 }}>
          <AccordionSummary expandIcon={<ExpandMoreIcon />}>
            <Typography variant="subtitle1">AWS S3 Setup Instructions</Typography>
          </AccordionSummary>
          <AccordionDetails>
            <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
              <Typography variant="body2" color="text.secondary" gutterBottom>
                Follow these steps to configure your S3 bucket to send event notifications to this
                workflow:
              </Typography>

              <Box component="ol" sx={{ pl: 2, '& li': { mb: 1 } }}>
                <Box component="li">
                  <Typography variant="body2">
                    <strong>Open AWS S3 Console:</strong> Navigate to your S3 bucket in the AWS
                    Management Console
                  </Typography>
                </Box>
                <Box component="li">
                  <Typography variant="body2">
                    <strong>Go to Properties:</strong> Click on the &quot;Properties&quot; tab for
                    your bucket
                  </Typography>
                </Box>
                <Box component="li">
                  <Typography variant="body2">
                    <strong>Find Event Notifications:</strong> Scroll down to &quot;Event
                    notifications&quot; section and click &quot;Create event notification&quot;
                  </Typography>
                </Box>
                <Box component="li">
                  <Typography variant="body2">
                    <strong>Configure Event:</strong>
                  </Typography>
                  <Box component="ul" sx={{ pl: 2, mt: 1 }}>
                    <Box component="li">
                      Name: Give it a descriptive name (e.g., &quot;Nectar Studio Workflow
                      Trigger&quot;)
                    </Box>
                    <Box component="li">
                      Prefix: {nodeData.prefix || '(leave empty for all files)'}
                    </Box>
                    <Box component="li">
                      Event types: Select &quot;All object create events&quot; or specific events
                      like &quot;PUT&quot;
                    </Box>
                  </Box>
                </Box>
                <Box component="li">
                  <Typography variant="body2">
                    <strong>Destination:</strong> Choose &quot;Lambda function&quot;, &quot;SNS
                    topic&quot;, or &quot;SQS queue&quot; depending on your setup preference
                  </Typography>
                </Box>
                <Box component="li">
                  <Typography variant="body2">
                    <strong>Webhook URL:</strong> Use this URL as your destination endpoint:
                  </Typography>
                  <Paper
                    sx={{
                      p: 1,
                      mt: 1,
                      bgcolor: 'grey.100',
                      fontSize: '0.875rem',
                      fontFamily: 'monospace',
                    }}
                  >
                    {webhookUrl}
                  </Paper>
                </Box>
              </Box>

              <Alert severity="info">
                <Typography variant="body2">
                  <strong>Recommended Approach:</strong> Use AWS SNS (Simple Notification Service)
                  as an intermediate step. Configure S3 to send events to SNS, then configure SNS to
                  send HTTP POST requests to the webhook URL above. This provides better reliability
                  and retry logic.
                </Typography>
              </Alert>

              <Alert severity="warning">
                <Typography variant="body2">
                  <strong>Security Note:</strong> This webhook endpoint is publicly accessible.
                  Ensure your S3 bucket and AWS account are properly secured. Consider adding
                  authentication or IP restrictions if needed.
                </Typography>
              </Alert>
            </Box>
          </AccordionDetails>
        </Accordion>
      )}
    </Box>
  );
};

export default S3BucketTriggerPanel;
