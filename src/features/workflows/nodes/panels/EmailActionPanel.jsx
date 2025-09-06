import AddIcon from '@mui/icons-material/Add';
import DeleteIcon from '@mui/icons-material/Delete';
import ExpandMoreIcon from '@mui/icons-material/ExpandMore';
import SendIcon from '@mui/icons-material/Send';
import {
  Box,
  Typography,
  TextField,
  Button,
  IconButton,
  Paper,
  Accordion,
  AccordionSummary,
  AccordionDetails,
  Alert,
  Stack,
  CircularProgress,
} from '@mui/material';
import React, { useState } from 'react';

import { useNotification } from '../../../../context/NotificationContext';
import api from '../../../../services/api';

const EmailActionPanel = ({ nodeData, onNodeDataChange }) => {
  const { showNotification } = useNotification();
  const [isTesting, setIsTesting] = useState(false);
  const [testResponse, setTestResponse] = useState(null);

  if (!nodeData) {
    return null;
  }

  const handleInputChange = event => {
    const { name, value } = event.target;
    onNodeDataChange({ [name]: value });
  };

  const handleAttachmentChange = (index, field, value) => {
    const newAttachments = [...(nodeData.attachments || [])];
    newAttachments[index] = { ...newAttachments[index], [field]: value };
    onNodeDataChange({ attachments: newAttachments });
  };

  const handleAddAttachment = () => {
    const newAttachments = [
      ...(nodeData.attachments || []),
      { filename: '', content: '', encoding: 'base64' },
    ];
    onNodeDataChange({ attachments: newAttachments });
  };

  const handleRemoveAttachment = index => {
    const newAttachments = [...(nodeData.attachments || [])];
    newAttachments.splice(index, 1);
    onNodeDataChange({ attachments: newAttachments });
  };

  const handleTestEmail = async () => {
    setIsTesting(true);
    setTestResponse(null);

    const { to, subject, htmlBody } = nodeData;

    if (!to || !subject) {
      showNotification('Email recipient and subject are required for testing.', 'error');
      setIsTesting(false);
      return;
    }

    // Warn user about unresolved variables
    if (to.includes('{{') || subject.includes('{{') || (htmlBody && htmlBody.includes('{{'))) {
      showNotification(
        'Test email will not replace template variables like {{input.data}}. Please use static values for testing.',
        'warning'
      );
    }

    try {
      const { data: responseData } = await api.post('/api/workflows/test-email', {
        to,
        subject,
        htmlBody: htmlBody || 'Test email from workflow builder',
        attachments: nodeData.attachments || [],
      });

      setTestResponse({
        status: 'success',
        message: 'Test email sent successfully!',
        messageId: responseData.messageId,
        previewUrl: responseData.previewUrl,
      });

      showNotification('Test email sent successfully!', 'success');
    } catch (error) {
      console.error('Test email error:', error);

      const errorMessage =
        error.response?.data?.message || error.message || 'Failed to send test email';

      setTestResponse({
        status: 'error',
        message: errorMessage,
      });

      showNotification(`Failed to send test email: ${errorMessage}`, 'error');
    } finally {
      setIsTesting(false);
    }
  };

  return (
    <Box sx={{ p: 2 }}>
      <Typography variant="h6" gutterBottom>
        Configure Email Action
      </Typography>

      <TextField
        label="Node Label"
        name="label"
        value={nodeData.label || ''}
        onChange={handleInputChange}
        fullWidth
        margin="normal"
        variant="outlined"
      />

      <TextField
        label="To (Email Recipients)"
        name="to"
        value={nodeData.to || ''}
        onChange={handleInputChange}
        fullWidth
        margin="normal"
        variant="outlined"
        placeholder="user@example.com or {{input.email}}"
        helperText="Use commas to separate multiple recipients. Variables like {{input.email}} will be replaced with actual values."
      />

      <TextField
        label="Subject"
        name="subject"
        value={nodeData.subject || ''}
        onChange={handleInputChange}
        fullWidth
        margin="normal"
        variant="outlined"
        placeholder="Email subject or {{input.subject}}"
        helperText="You can use variables like {{input.customerName}} in the subject."
      />

      <TextField
        label="HTML Body"
        name="htmlBody"
        value={nodeData.htmlBody || ''}
        onChange={handleInputChange}
        fullWidth
        margin="normal"
        variant="outlined"
        multiline
        rows={8}
        placeholder="<h1>Hello {{input.customerName}}</h1><p>Your order #{{input.orderId}} has been processed.</p>"
        helperText="HTML content for the email body. You can use variables from previous workflow steps."
      />

      <Accordion sx={{ mt: 2 }}>
        <AccordionSummary expandIcon={<ExpandMoreIcon />}>
          <Typography>Attachments (Optional)</Typography>
        </AccordionSummary>
        <AccordionDetails>
          {nodeData.attachments &&
            nodeData.attachments.map((attachment, index) => (
              <Paper key={index} elevation={0} variant="outlined" sx={{ p: 2, mb: 2 }}>
                <Stack spacing={2}>
                  <TextField
                    label="Filename"
                    value={attachment.filename || ''}
                    onChange={e => handleAttachmentChange(index, 'filename', e.target.value)}
                    variant="outlined"
                    size="small"
                    placeholder="document.pdf"
                  />
                  <TextField
                    label="Content (Base64 or URL)"
                    value={attachment.content || ''}
                    onChange={e => handleAttachmentChange(index, 'content', e.target.value)}
                    variant="outlined"
                    size="small"
                    placeholder="{{input.documentBase64}} or https://example.com/file.pdf"
                    multiline
                    rows={3}
                  />
                  <Box sx={{ display: 'flex', justifyContent: 'flex-end' }}>
                    <IconButton onClick={() => handleRemoveAttachment(index)}>
                      <DeleteIcon />
                    </IconButton>
                  </Box>
                </Stack>
              </Paper>
            ))}
          <Button startIcon={<AddIcon />} onClick={handleAddAttachment}>
            Add Attachment
          </Button>
        </AccordionDetails>
      </Accordion>

      <Box sx={{ mt: 3, display: 'flex', gap: 2, alignItems: 'center' }}>
        <Button
          variant="outlined"
          startIcon={isTesting ? <CircularProgress size={20} /> : <SendIcon />}
          onClick={handleTestEmail}
          disabled={isTesting || !nodeData.to || !nodeData.subject}
        >
          {isTesting ? 'Sending...' : 'Send Test Email'}
        </Button>
      </Box>

      {testResponse && (
        <Alert severity={testResponse.status === 'success' ? 'success' : 'error'} sx={{ mt: 2 }}>
          <Typography variant="body2">{testResponse.message}</Typography>
          {testResponse.previewUrl && (
            <Typography variant="body2" sx={{ mt: 1 }}>
              Preview:{' '}
              <a href={testResponse.previewUrl} target="_blank" rel="noopener noreferrer">
                {testResponse.previewUrl}
              </a>
            </Typography>
          )}
        </Alert>
      )}

      <Box sx={{ mt: 2 }}>
        <Typography variant="body2" color="text.secondary">
          <strong>Available Variables:</strong> You can use variables from previous workflow steps
          in any field. Common examples:{' '}
          {`{{input.email}}, {{input.customerName}}, {{input.orderId}}, {{trigger.data}}`}
        </Typography>
      </Box>
    </Box>
  );
};

export default EmailActionPanel;
