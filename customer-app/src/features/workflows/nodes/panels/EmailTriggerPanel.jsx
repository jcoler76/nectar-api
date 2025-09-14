import ContentCopyIcon from '@mui/icons-material/ContentCopy';
import { TextField, Typography, Box, Paper, IconButton, Tooltip } from '@mui/material';
import React, { useMemo } from 'react';

import { useNotification } from '../../../../context/NotificationContext';

const EmailTriggerPanel = ({ node, onNodeDataChange, workflowId }) => {
  const { showNotification } = useNotification();

  const emailAddress = useMemo(() => {
    return `workflow-${workflowId}@yourdomain.com`;
  }, [workflowId]);

  if (!node || !node.data) {
    return null;
  }

  const nodeData = node.data;

  const handleChange = event => {
    const { name, value } = event.target;
    onNodeDataChange({ [name]: value });
  };

  const handleCopyToClipboard = (text, type) => {
    navigator.clipboard.writeText(text);
    showNotification(`${type} copied to clipboard!`, 'success');
  };

  return (
    <Box sx={{ p: 2 }}>
      <Typography variant="h6" gutterBottom>
        Email Trigger
      </Typography>
      <TextField
        label="Node Label"
        name="label"
        value={nodeData.label || ''}
        onChange={handleChange}
        fullWidth
        margin="normal"
        variant="outlined"
      />

      <Box sx={{ mt: 3, mb: 2 }}>
        <Typography variant="subtitle1" gutterBottom>
          Setup Information
        </Typography>
        <Typography variant="body2" color="text.secondary" sx={{ mb: 1 }}>
          Send an email to the following address to trigger this workflow. The email body will be
          available as input data.
        </Typography>
        <Paper
          elevation={0}
          variant="outlined"
          sx={{ p: 1.5, display: 'flex', alignItems: 'center', backgroundColor: '#F9FAFB' }}
        >
          <Typography variant="body2" component="code" sx={{ flexGrow: 1, wordBreak: 'break-all' }}>
            {emailAddress}
          </Typography>
          <Tooltip title="Copy Email Address">
            <IconButton
              size="small"
              onClick={() => handleCopyToClipboard(emailAddress, 'Email Address')}
            >
              <ContentCopyIcon fontSize="small" />
            </IconButton>
          </Tooltip>
        </Paper>
        <Typography variant="body2" color="text.secondary" sx={{ mt: 2, mb: 1 }}>
          Note: This requires setting up an email service (like Mailgun or SendGrid) to forward
          incoming emails to a webhook endpoint. The endpoint for this trigger is:{' '}
          <strong>/api/email/trigger/{workflowId}</strong>
        </Typography>
      </Box>
    </Box>
  );
};

export default EmailTriggerPanel;
