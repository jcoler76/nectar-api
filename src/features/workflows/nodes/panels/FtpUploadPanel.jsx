import CloudUploadIcon from '@mui/icons-material/CloudUpload';
import ExpandMoreIcon from '@mui/icons-material/ExpandMore';
import SecurityIcon from '@mui/icons-material/Security';
import {
  Box,
  Typography,
  TextField,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  Accordion,
  AccordionSummary,
  AccordionDetails,
  FormControlLabel,
  Switch,
  InputAdornment,
  Alert,
  Chip,
  Stack,
  Divider,
} from '@mui/material';
import React from 'react';

const FtpUploadPanel = ({ nodeData, onNodeDataChange }) => {
  const handleInputChange = event => {
    const { name, value } = event.target;
    onNodeDataChange({ [name]: value });
  };

  const handleSwitchChange = name => event => {
    onNodeDataChange({ [name]: event.target.checked });
  };

  if (!nodeData) {
    return null;
  }

  return (
    <Box sx={{ p: 2 }}>
      <Typography variant="h6" gutterBottom sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
        <CloudUploadIcon />
        FTP Upload
      </Typography>

      <Alert severity="info" sx={{ mb: 2 }}>
        Upload files to FTP, FTPS, or SFTP servers. Files from previous workflow nodes will be
        automatically detected.
      </Alert>

      {/* Basic Configuration */}
      <Box sx={{ mb: 2 }}>
        <TextField
          fullWidth
          label="Node Label"
          name="label"
          value={nodeData.label || ''}
          onChange={handleInputChange}
          placeholder="Upload to FTP Server"
          sx={{ mb: 2 }}
        />

        <FormControl fullWidth sx={{ mb: 2 }}>
          <InputLabel>Protocol</InputLabel>
          <Select
            name="protocol"
            value={nodeData.protocol || 'ftp'}
            onChange={handleInputChange}
            label="Protocol"
          >
            <MenuItem value="ftp">FTP (File Transfer Protocol)</MenuItem>
            <MenuItem value="ftps">FTPS (FTP Secure)</MenuItem>
            <MenuItem value="sftp">SFTP (SSH File Transfer Protocol)</MenuItem>
          </Select>
        </FormControl>

        <TextField
          fullWidth
          label="Host"
          name="host"
          value={nodeData.host || ''}
          onChange={handleInputChange}
          placeholder="ftp.example.com"
          required
          sx={{ mb: 2 }}
        />

        <TextField
          fullWidth
          label="Port"
          name="port"
          type="number"
          value={nodeData.port || ''}
          onChange={handleInputChange}
          placeholder={nodeData.protocol === 'sftp' ? '22' : '21'}
          helperText={`Default: ${nodeData.protocol === 'sftp' ? '22 (SFTP)' : '21 (FTP/FTPS)'}`}
          sx={{ mb: 2 }}
        />
      </Box>

      {/* Authentication */}
      <Accordion sx={{ mb: 2 }}>
        <AccordionSummary expandIcon={<ExpandMoreIcon />}>
          <Typography sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
            <SecurityIcon fontSize="small" />
            Authentication
          </Typography>
        </AccordionSummary>
        <AccordionDetails>
          <Stack spacing={2}>
            <TextField
              fullWidth
              label="Username"
              name="username"
              value={nodeData.username || ''}
              onChange={handleInputChange}
              placeholder="ftpuser"
              required
            />

            <TextField
              fullWidth
              label="Password"
              name="password"
              type="password"
              value={nodeData.password || ''}
              onChange={handleInputChange}
              placeholder="••••••••"
              required
              helperText="Password will be encrypted in workflow storage"
            />
          </Stack>
        </AccordionDetails>
      </Accordion>

      {/* File Configuration */}
      <Accordion sx={{ mb: 2 }}>
        <AccordionSummary expandIcon={<ExpandMoreIcon />}>
          <Typography>File Configuration</Typography>
        </AccordionSummary>
        <AccordionDetails>
          <Stack spacing={2}>
            <FormControl fullWidth>
              <InputLabel>File Source</InputLabel>
              <Select
                name="fileSource"
                value={nodeData.fileSource || 'previous'}
                onChange={handleInputChange}
                label="File Source"
              >
                <MenuItem value="previous">From Previous Node</MenuItem>
                <MenuItem value="specific">Specific File ID</MenuItem>
              </Select>
            </FormControl>

            {nodeData.fileSource === 'specific' && (
              <TextField
                fullWidth
                label="File ID"
                name="fileId"
                value={nodeData.fileId || ''}
                onChange={handleInputChange}
                placeholder="file_12345"
                helperText="ID of file stored in temporary storage"
              />
            )}

            <TextField
              fullWidth
              label="Remote Path"
              name="remotePath"
              value={nodeData.remotePath || '/'}
              onChange={handleInputChange}
              placeholder="/uploads/"
              helperText="Directory path on the remote server"
            />

            <TextField
              fullWidth
              label="Custom Filename (optional)"
              name="filename"
              value={nodeData.filename || ''}
              onChange={handleInputChange}
              placeholder="report.csv"
              helperText="Leave empty to use original filename"
            />
          </Stack>
        </AccordionDetails>
      </Accordion>

      {/* Advanced Options */}
      <Accordion sx={{ mb: 2 }}>
        <AccordionSummary expandIcon={<ExpandMoreIcon />}>
          <Typography>Advanced Options</Typography>
        </AccordionSummary>
        <AccordionDetails>
          <Stack spacing={2}>
            {nodeData.protocol !== 'sftp' && (
              <>
                <FormControlLabel
                  control={
                    <Switch
                      checked={nodeData.passive !== false}
                      onChange={handleSwitchChange('passive')}
                    />
                  }
                  label="Passive Mode"
                />

                {nodeData.protocol === 'ftp' && (
                  <FormControlLabel
                    control={
                      <Switch
                        checked={nodeData.secure === true}
                        onChange={handleSwitchChange('secure')}
                      />
                    }
                    label="Use TLS/SSL (FTPS)"
                  />
                )}
              </>
            )}

            <TextField
              fullWidth
              label="Connection Timeout (ms)"
              name="timeout"
              type="number"
              value={nodeData.timeout || '30000'}
              onChange={handleInputChange}
              InputProps={{
                endAdornment: <InputAdornment position="end">ms</InputAdornment>,
              }}
              helperText="Connection timeout in milliseconds"
            />
          </Stack>
        </AccordionDetails>
      </Accordion>

      {/* Protocol Information */}
      <Accordion>
        <AccordionSummary expandIcon={<ExpandMoreIcon />}>
          <Typography>Protocol Information</Typography>
        </AccordionSummary>
        <AccordionDetails>
          <Stack spacing={2}>
            <Box>
              <Typography variant="subtitle2" gutterBottom>
                Protocol Comparison:
              </Typography>
              <Stack spacing={1}>
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                  <Chip label="FTP" size="small" color="default" />
                  <Typography variant="caption">
                    Standard File Transfer Protocol (unencrypted)
                  </Typography>
                </Box>
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                  <Chip label="FTPS" size="small" color="secondary" />
                  <Typography variant="caption">FTP with TLS/SSL encryption</Typography>
                </Box>
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                  <Chip label="SFTP" size="small" color="primary" />
                  <Typography variant="caption">
                    SSH File Transfer Protocol (most secure)
                  </Typography>
                </Box>
              </Stack>
            </Box>

            <Divider />

            <Box>
              <Typography variant="subtitle2" gutterBottom>
                Common Port Numbers:
              </Typography>
              <Typography variant="caption" component="div">
                • FTP: 21 (control), 20 (data)
                <br />
                • FTPS: 990 (implicit), 21 (explicit)
                <br />• SFTP: 22 (SSH)
              </Typography>
            </Box>

            <Divider />

            <Box>
              <Typography variant="subtitle2" gutterBottom>
                Supported File Sources:
              </Typography>
              <Stack direction="row" spacing={1} flexWrap="wrap">
                <Chip label="File Generation Node" size="small" />
                <Chip label="HTTP Response" size="small" />
                <Chip label="Email Attachments" size="small" />
                <Chip label="Form Uploads" size="small" />
              </Stack>
            </Box>
          </Stack>
        </AccordionDetails>
      </Accordion>
    </Box>
  );
};

export default FtpUploadPanel;
