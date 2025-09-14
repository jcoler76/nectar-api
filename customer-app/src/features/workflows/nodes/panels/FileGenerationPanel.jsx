import DescriptionIcon from '@mui/icons-material/Description';
import ExpandMoreIcon from '@mui/icons-material/ExpandMore';
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
  Chip,
  Stack,
  Alert,
  Divider,
} from '@mui/material';
import React, { useState } from 'react';

const FileGenerationPanel = ({ nodeData, onNodeDataChange }) => {
  const [format, setFormat] = useState(nodeData?.format || 'csv');

  const handleInputChange = event => {
    const { name, value } = event.target;
    onNodeDataChange({ [name]: value });
  };

  const handleFormatChange = event => {
    const newFormat = event.target.value;
    setFormat(newFormat);
    onNodeDataChange({ format: newFormat });
  };

  const handleCSVConfigChange = (field, value) => {
    const csvConfig = { ...(nodeData?.csvConfig || {}), [field]: value };
    onNodeDataChange({ csvConfig });
  };

  const handleXMLConfigChange = (field, value) => {
    const xmlConfig = { ...(nodeData?.xmlConfig || {}), [field]: value };
    onNodeDataChange({ xmlConfig });
  };

  const handleJSONConfigChange = (field, value) => {
    const jsonConfig = { ...(nodeData?.jsonConfig || {}), [field]: value };
    onNodeDataChange({ jsonConfig });
  };

  if (!nodeData) {
    return null;
  }

  return (
    <Box sx={{ p: 2 }}>
      <Typography variant="h6" gutterBottom sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
        <DescriptionIcon />
        File Generation
      </Typography>

      <Alert severity="info" sx={{ mb: 2 }}>
        Generate CSV or XML files from API response data or workflow context.
      </Alert>

      {/* Basic Configuration */}
      <Box sx={{ mb: 2 }}>
        <TextField
          fullWidth
          label="Node Label"
          name="label"
          value={nodeData.label || ''}
          onChange={handleInputChange}
          placeholder="Generate Report File"
          sx={{ mb: 2 }}
        />

        <FormControl fullWidth sx={{ mb: 2 }}>
          <InputLabel>File Format</InputLabel>
          <Select value={format} onChange={handleFormatChange} label="File Format">
            <MenuItem value="csv">CSV (Comma-Separated Values)</MenuItem>
            <MenuItem value="xml">XML (Extensible Markup Language)</MenuItem>
            <MenuItem value="json">JSON (JavaScript Object Notation)</MenuItem>
          </Select>
        </FormControl>

        <TextField
          fullWidth
          label="Filename (without extension)"
          name="filename"
          value={nodeData.filename || ''}
          onChange={handleInputChange}
          placeholder="report_data"
          helperText="The file extension will be added automatically based on format"
          sx={{ mb: 2 }}
        />

        <TextField
          fullWidth
          label="Source Data Path"
          name="sourceData"
          value={nodeData.sourceData || '{{previousNodeId.data}}'}
          onChange={handleInputChange}
          placeholder="{{httpRequest.data}}"
          helperText="Path to data in workflow context (use {{nodeName.path}} syntax)"
          multiline
          rows={2}
        />
      </Box>

      {/* Format-specific Configuration */}
      {format === 'csv' && (
        <Accordion sx={{ mb: 2 }}>
          <AccordionSummary expandIcon={<ExpandMoreIcon />}>
            <Typography>CSV Options</Typography>
          </AccordionSummary>
          <AccordionDetails>
            <Stack spacing={2}>
              <TextField
                fullWidth
                label="Delimiter"
                value={nodeData.csvConfig?.delimiter || ','}
                onChange={e => handleCSVConfigChange('delimiter', e.target.value)}
                placeholder=","
                helperText="Character to separate fields (comma, semicolon, tab, etc.)"
              />

              <FormControlLabel
                control={
                  <Switch
                    checked={nodeData.csvConfig?.includeHeaders !== false}
                    onChange={e => handleCSVConfigChange('includeHeaders', e.target.checked)}
                  />
                }
                label="Include Headers"
              />

              <FormControlLabel
                control={
                  <Switch
                    checked={nodeData.csvConfig?.quoteStrings !== false}
                    onChange={e => handleCSVConfigChange('quoteStrings', e.target.checked)}
                  />
                }
                label="Quote String Values"
              />

              <FormControlLabel
                control={
                  <Switch
                    checked={nodeData.csvConfig?.escapeQuotes !== false}
                    onChange={e => handleCSVConfigChange('escapeQuotes', e.target.checked)}
                  />
                }
                label="Escape Quotes in Values"
              />

              <TextField
                fullWidth
                label="Custom Headers (comma-separated)"
                value={nodeData.csvConfig?.headers?.join(',') || ''}
                onChange={e => {
                  const headers = e.target.value
                    ? e.target.value.split(',').map(h => h.trim())
                    : [];
                  handleCSVConfigChange('headers', headers);
                }}
                placeholder="id,name,email,created_date"
                helperText="Leave empty to auto-detect from data"
              />
            </Stack>
          </AccordionDetails>
        </Accordion>
      )}

      {format === 'xml' && (
        <Accordion sx={{ mb: 2 }}>
          <AccordionSummary expandIcon={<ExpandMoreIcon />}>
            <Typography>XML Options</Typography>
          </AccordionSummary>
          <AccordionDetails>
            <Stack spacing={2}>
              <TextField
                fullWidth
                label="Root Element Name"
                value={nodeData.xmlConfig?.rootElement || 'data'}
                onChange={e => handleXMLConfigChange('rootElement', e.target.value)}
                placeholder="data"
                helperText="Name of the XML root element"
              />

              <TextField
                fullWidth
                label="Item Element Name"
                value={nodeData.xmlConfig?.itemElement || 'item'}
                onChange={e => handleXMLConfigChange('itemElement', e.target.value)}
                placeholder="item"
                helperText="Name for individual items in arrays"
              />

              <TextField
                fullWidth
                label="Character Encoding"
                value={nodeData.xmlConfig?.encoding || 'UTF-8'}
                onChange={e => handleXMLConfigChange('encoding', e.target.value)}
                placeholder="UTF-8"
              />

              <FormControlLabel
                control={
                  <Switch
                    checked={nodeData.xmlConfig?.pretty !== false}
                    onChange={e => handleXMLConfigChange('pretty', e.target.checked)}
                  />
                }
                label="Pretty Print (formatted with indentation)"
              />

              <FormControlLabel
                control={
                  <Switch
                    checked={nodeData.xmlConfig?.xmlDeclaration !== false}
                    onChange={e => handleXMLConfigChange('xmlDeclaration', e.target.checked)}
                  />
                }
                label="Include XML Declaration"
              />
            </Stack>
          </AccordionDetails>
        </Accordion>
      )}

      {format === 'json' && (
        <Accordion sx={{ mb: 2 }}>
          <AccordionSummary expandIcon={<ExpandMoreIcon />}>
            <Typography>JSON Options</Typography>
          </AccordionSummary>
          <AccordionDetails>
            <Stack spacing={2}>
              <FormControlLabel
                control={
                  <Switch
                    checked={nodeData.jsonConfig?.pretty !== false}
                    onChange={e => handleJSONConfigChange('pretty', e.target.checked)}
                  />
                }
                label="Pretty Print (formatted with indentation)"
              />

              <FormControlLabel
                control={
                  <Switch
                    checked={nodeData.jsonConfig?.sortKeys === true}
                    onChange={e => handleJSONConfigChange('sortKeys', e.target.checked)}
                  />
                }
                label="Sort Keys Alphabetically"
              />

              <FormControlLabel
                control={
                  <Switch
                    checked={nodeData.jsonConfig?.includeMetadata === true}
                    onChange={e => handleJSONConfigChange('includeMetadata', e.target.checked)}
                  />
                }
                label="Include Metadata (timestamp, record count)"
              />
            </Stack>
          </AccordionDetails>
        </Accordion>
      )}

      {/* Usage Examples */}
      <Accordion>
        <AccordionSummary expandIcon={<ExpandMoreIcon />}>
          <Typography>Usage Examples</Typography>
        </AccordionSummary>
        <AccordionDetails>
          <Stack spacing={2}>
            <Box>
              <Typography variant="subtitle2" gutterBottom>
                Common Data Sources:
              </Typography>
              <Stack direction="row" spacing={1} flexWrap="wrap" sx={{ mb: 2 }}>
                <Chip label="{{httpRequest.data}}" size="small" />
                <Chip label="{{apiSequence.results}}" size="small" />
                <Chip label="{{trigger.data}}" size="small" />
              </Stack>
            </Box>

            <Divider />

            <Box>
              <Typography variant="subtitle2" gutterBottom>
                Array Data Example:
              </Typography>
              <Typography
                variant="caption"
                component="pre"
                sx={{
                  bgcolor: 'grey.100',
                  p: 1,
                  borderRadius: 1,
                  fontSize: '0.75rem',
                }}
              >
                {`[
  {"id": 1, "name": "John", "email": "john@example.com"},
  {"id": 2, "name": "Jane", "email": "jane@example.com"}
]`}
              </Typography>
            </Box>

            <Box>
              <Typography variant="subtitle2" gutterBottom>
                Object Data Example:
              </Typography>
              <Typography
                variant="caption"
                component="pre"
                sx={{
                  bgcolor: 'grey.100',
                  p: 1,
                  borderRadius: 1,
                  fontSize: '0.75rem',
                }}
              >
                {`{
  "total_users": 150,
  "active_users": 120,
  "last_updated": "2024-01-15"
}`}
              </Typography>
            </Box>

            <Divider />

            <Box>
              <Typography variant="subtitle2" gutterBottom>
                JSON Output Formats:
              </Typography>
              <Typography variant="caption" component="div" sx={{ mb: 1 }}>
                • <strong>Raw Data:</strong> Direct JSON output of source data
              </Typography>
              <Typography variant="caption" component="div" sx={{ mb: 1 }}>
                • <strong>With Metadata:</strong> Includes generation timestamp and record count
              </Typography>
              <Typography variant="caption" component="div">
                • <strong>Sorted Keys:</strong> Alphabetically ordered object properties
              </Typography>
            </Box>
          </Stack>
        </AccordionDetails>
      </Accordion>
    </Box>
  );
};

export default FileGenerationPanel;
