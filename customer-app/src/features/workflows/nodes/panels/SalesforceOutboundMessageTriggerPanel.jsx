import ContentCopyIcon from '@mui/icons-material/ContentCopy';
import ExpandMoreIcon from '@mui/icons-material/ExpandMore';
import LockIcon from '@mui/icons-material/Lock';
import PublicIcon from '@mui/icons-material/Public';
import {
  Accordion,
  AccordionDetails,
  AccordionSummary,
  Alert,
  Box,
  Button,
  FormControl,
  Grid,
  IconButton,
  InputLabel,
  MenuItem,
  Paper,
  Select,
  TextField,
  Tooltip,
  Typography,
} from '@mui/material';
import React, { useMemo } from 'react';

const SalesforceOutboundMessageTriggerPanel = ({ node, onNodeDataChange, workflowId }) => {
  const endpointUrl = useMemo(() => {
    const baseUrl = (process.env.REACT_APP_API_URL || 'http://localhost:3001').replace(/\/$/, '');
    const nodeId = node?.id || 'node';
    return `${baseUrl}/api/webhooks/salesforce/outbound/${workflowId}/${nodeId}`;
  }, [workflowId, node?.id]);

  if (!node || !node.data) return null;
  const { data } = node;

  const handleChange = (parent, key, value) => {
    if (!parent) return onNodeDataChange({ [key]: value });
    onNodeDataChange({ [parent]: { ...(data[parent] || {}), [key]: value } });
  };

  const handleAddIP = () => {
    const ip = prompt('Enter allowed IP/CIDR (e.g., 13.108.0.0/14):');
    if (!ip) return;
    const next = Array.from(new Set([...(data.allowedIPs || []), ip.trim()]));
    onNodeDataChange({ allowedIPs: next });
  };

  const handleRemoveIP = ip => {
    const next = (data.allowedIPs || []).filter(v => v !== ip);
    onNodeDataChange({ allowedIPs: next });
  };

  const copy = (txt, label) => {
    navigator.clipboard.writeText(txt);
    // Optional: notification is available globally elsewhere; keep minimal here
  };

  return (
    <Box sx={{ p: 2 }}>
      <Typography variant="h6" gutterBottom>
        Salesforce Outbound Message
      </Typography>

      <Accordion defaultExpanded>
        <AccordionSummary expandIcon={<ExpandMoreIcon />}>
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
            <PublicIcon />
            <Typography>Endpoint</Typography>
          </Box>
        </AccordionSummary>
        <AccordionDetails>
          <Typography variant="body2" color="text.secondary" sx={{ mb: 1 }}>
            Configure Salesforce Outbound Message to POST SOAP XML to this URL.
          </Typography>
          <Paper elevation={0} variant="outlined" sx={{ p: 1.5, display: 'flex', gap: 1 }}>
            <Typography
              variant="body2"
              component="code"
              sx={{ flexGrow: 1, wordBreak: 'break-all' }}
            >
              {endpointUrl}
            </Typography>
            <Tooltip title="Copy URL">
              <IconButton size="small" onClick={() => copy(endpointUrl, 'URL')}>
                <ContentCopyIcon fontSize="small" />
              </IconButton>
            </Tooltip>
          </Paper>
          {data.requireTLS && !endpointUrl.startsWith('https://') && (
            <Alert severity="warning" sx={{ mt: 1 }}>
              TLS is required but endpoint is not HTTPS. Set REACT_APP_API_URL to an HTTPS domain.
            </Alert>
          )}
        </AccordionDetails>
      </Accordion>

      <Accordion defaultExpanded>
        <AccordionSummary expandIcon={<ExpandMoreIcon />}>
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
            <LockIcon />
            <Typography>Security</Typography>
          </Box>
        </AccordionSummary>
        <AccordionDetails>
          <Grid container spacing={2}>
            <Grid item xs={12} md={6}>
              <FormControl fullWidth>
                <InputLabel>Auth Type</InputLabel>
                <Select
                  label="Auth Type"
                  value={data.auth?.type || 'basic'}
                  onChange={e => handleChange('auth', 'type', e.target.value)}
                >
                  <MenuItem value="none">None</MenuItem>
                  <MenuItem value="basic">HTTP Basic</MenuItem>
                </Select>
              </FormControl>
            </Grid>

            {data.auth?.type === 'basic' && (
              <>
                <Grid item xs={12} md={6}>
                  <TextField
                    fullWidth
                    label="Username"
                    value={data.auth?.username || ''}
                    onChange={e => handleChange('auth', 'username', e.target.value)}
                  />
                </Grid>
                <Grid item xs={12} md={6}>
                  <TextField
                    fullWidth
                    label="Password"
                    type="password"
                    value={data.auth?.password || ''}
                    onChange={e => handleChange('auth', 'password', e.target.value)}
                  />
                </Grid>
              </>
            )}

            <Grid item xs={12}>
              <FormControl fullWidth>
                <InputLabel>Require TLS (HTTPS)</InputLabel>
                <Select
                  label="Require TLS (HTTPS)"
                  value={data.requireTLS === false ? 'no' : 'yes'}
                  onChange={e => onNodeDataChange({ requireTLS: e.target.value === 'yes' })}
                >
                  <MenuItem value="yes">Yes</MenuItem>
                  <MenuItem value="no">No</MenuItem>
                </Select>
              </FormControl>
            </Grid>

            <Grid item xs={12}>
              <Typography variant="subtitle2" sx={{ mb: 1 }}>
                Allowed IPs/CIDRs
              </Typography>
              <Box sx={{ display: 'flex', gap: 1, flexWrap: 'wrap' }}>
                {(data.allowedIPs || []).map(ip => (
                  <Button
                    key={ip}
                    variant="outlined"
                    color="secondary"
                    onClick={() => handleRemoveIP(ip)}
                  >
                    {ip} (remove)
                  </Button>
                ))}
                <Button variant="outlined" onClick={handleAddIP}>
                  Add IP/CIDR
                </Button>
              </Box>
            </Grid>
          </Grid>
        </AccordionDetails>
      </Accordion>

      <Accordion>
        <AccordionSummary expandIcon={<ExpandMoreIcon />}>
          <Typography>Response</Typography>
        </AccordionSummary>
        <AccordionDetails>
          <FormControl fullWidth>
            <InputLabel>Send SOAP Ack</InputLabel>
            <Select
              label="Send SOAP Ack"
              value={data.responseAck === false ? 'no' : 'yes'}
              onChange={e => onNodeDataChange({ responseAck: e.target.value === 'yes' })}
            >
              <MenuItem value="yes">Yes</MenuItem>
              <MenuItem value="no">No</MenuItem>
            </Select>
          </FormControl>
          <Typography variant="caption" color="text.secondary">
            Salesforce expects a SOAP acknowledgement envelope indicating Ack=true.
          </Typography>
        </AccordionDetails>
      </Accordion>
    </Box>
  );
};

export default SalesforceOutboundMessageTriggerPanel;
