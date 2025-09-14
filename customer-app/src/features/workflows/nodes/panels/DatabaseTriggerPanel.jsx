import ExpandMoreIcon from '@mui/icons-material/ExpandMore';
import RefreshIcon from '@mui/icons-material/Refresh';
import {
  TextField,
  Typography,
  Box,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  Alert,
  CircularProgress,
  Chip,
  Switch,
  FormControlLabel,
  Accordion,
  AccordionSummary,
  AccordionDetails,
  Divider,
  IconButton,
  Tooltip,
} from '@mui/material';
import React, { useState, useEffect } from 'react';

import { useNotification } from '../../../../context/NotificationContext';
import api from '../../../../services/api';
import {
  getConnections,
  getConnectionDatabases,
  getConnectionSchema,
} from '../../../../services/connectionService';

const DatabaseTriggerPanel = ({ node, onNodeDataChange }) => {
  const [connections, setConnections] = useState([]);
  const [databases, setDatabases] = useState([]);
  const [tables, setTables] = useState([]);
  const [columns, setColumns] = useState([]);
  const [loading, setLoading] = useState({
    connections: false,
    databases: false,
    tables: false,
    columns: false,
  });
  const [schemaRefreshTrigger, setSchemaRefreshTrigger] = useState(0);
  const { showNotification } = useNotification();

  const nodeData = node?.data || {};

  // Load connections on component mount
  useEffect(() => {
    const fetchConnections = async () => {
      setLoading(prev => ({ ...prev, connections: true }));
      try {
        const fetchedConnections = await getConnections();
        // Filter to only show active connections for workflow configuration
        const activeConnections = fetchedConnections.filter(connection => connection.isActive);
        setConnections(activeConnections);
      } catch (error) {
        showNotification('Failed to load database connections', 'error');
        console.error('Error fetching connections:', error);
        setConnections([]); // Ensure connections is always an array
      } finally {
        setLoading(prev => ({ ...prev, connections: false }));
      }
    };

    fetchConnections();
  }, [showNotification]);

  // Load databases when connection changes
  useEffect(() => {
    const fetchDatabases = async () => {
      if (!nodeData.connectionId) {
        setDatabases([]);
        return;
      }

      setLoading(prev => ({ ...prev, databases: true }));
      try {
        const selectedConnection = connections.find(c => c._id === nodeData.connectionId);
        if (
          selectedConnection &&
          selectedConnection.databases &&
          Array.isArray(selectedConnection.databases)
        ) {
          setDatabases(selectedConnection.databases);
        } else {
          // Fallback to fetching databases from API
          const databaseList = await getConnectionDatabases(nodeData.connectionId);
          // Ensure we always set an array
          setDatabases(Array.isArray(databaseList) ? databaseList : []);
        }
      } catch (error) {
        showNotification('Failed to load databases', 'error');
        console.error('Error fetching databases:', error);
        setDatabases([]); // Ensure databases is always an array
      } finally {
        setLoading(prev => ({ ...prev, databases: false }));
      }
    };

    fetchDatabases();
  }, [nodeData.connectionId, connections, showNotification]);

  // Load tables when database changes
  useEffect(() => {
    const fetchTables = async () => {
      if (!nodeData.connectionId || !nodeData.database) {
        setTables([]);
        return;
      }

      setLoading(prev => ({ ...prev, tables: true }));
      try {
        const schema = await getConnectionSchema(nodeData.connectionId, nodeData.database);

        // Handle different response formats
        let schemaArray = [];
        if (Array.isArray(schema)) {
          schemaArray = schema;
        } else if (schema && Array.isArray(schema.tables)) {
          schemaArray = schema.tables;
        } else if (schema && Array.isArray(schema.data)) {
          schemaArray = schema.data;
        } else {
          console.warn('Unexpected schema format:', schema);
          schemaArray = [];
        }

        const tableList = schemaArray
          .filter(obj => obj.type === 'table' || obj.objectType === 'table' || !obj.type)
          .map(table => ({
            name: table.name,
            schema: table.schema || 'dbo',
            fullName: `${table.schema || 'dbo'}.${table.name}`,
          }));
        setTables(tableList);
      } catch (error) {
        showNotification('Failed to load tables', 'error');
        console.error('Error fetching tables:', error);
        setTables([]); // Ensure tables is always an array
      } finally {
        setLoading(prev => ({ ...prev, tables: false }));
      }
    };

    fetchTables();
  }, [nodeData.connectionId, nodeData.database, showNotification]);

  // Enhanced column fetching with retry logic and proper error handling
  useEffect(() => {
    const fetchColumnsWithRetry = async () => {
      if (!nodeData.connectionId || !nodeData.database || !nodeData.table) {
        setColumns([]);
        return;
      }

      setLoading(prev => ({ ...prev, columns: true }));

      const maxRetries = 3;
      const retryDelay = 1000; // 1 second
      let lastError;

      for (let attempt = 1; attempt <= maxRetries; attempt++) {
        try {
          // Fetch actual timestamp columns from the database
          const response = await api.post(
            `/api/connections/${nodeData.connectionId}/table-columns`,
            {
              database: nodeData.database,
              table: nodeData.table,
            }
          );

          if (response.data && Array.isArray(response.data) && response.data.length > 0) {
            setColumns(response.data);
            return; // Success - exit retry loop
          } else {
            console.warn(`Empty or invalid column response on attempt ${attempt}`, response.data);
            if (attempt === maxRetries) {
              throw new Error('Empty column response from database after all retries');
            }
          }
        } catch (error) {
          lastError = error;
          console.warn(`Column fetch attempt ${attempt}/${maxRetries} failed:`, error.message);

          // If this is not the last attempt, wait before retrying
          if (attempt < maxRetries) {
            await new Promise(resolve => setTimeout(resolve, retryDelay * attempt));
          }
        }
      }

      // All retries failed - provide enhanced fallback with better user feedback
      console.error(`Column fetching failed after ${maxRetries} attempts. Last error:`, {
        message: lastError.message,
        status: lastError.response?.status,
        connectionId: nodeData.connectionId,
        database: nodeData.database,
        table: nodeData.table,
      });

      // Enhanced common columns with more comprehensive patterns
      const enhancedCommonColumns = [
        // Standard timestamp patterns
        'dateAdded',
        'dateLstMod',
        'created_at',
        'created_date',
        'updated_at',
        'updated_date',
        'modified_at',
        'modified_date',
        'timestamp',
        'last_modified',
        // Capitalized patterns
        'CreatedAt',
        'CreatedDate',
        'UpdatedAt',
        'UpdatedDate',
        'ModifiedAt',
        'ModifiedDate',
        'DateCreated',
        'DateModified',
        'DateUpdated',
        'LastModified',
        // Alternative patterns
        'create_time',
        'update_time',
        'modify_time',
        'insert_date',
        'change_date',
        'CreateTime',
        'UpdateTime',
        'ModifyTime',
        'InsertDate',
        'ChangeDate',
      ];

      setColumns(enhancedCommonColumns);

      // Provide more informative user feedback based on error type
      const errorType = lastError.response?.status;
      let message = 'Schema fetch failed after multiple attempts.';
      let severity = 'warning';

      if (errorType === 404) {
        message = `Table "${nodeData.table}" not found in database "${nodeData.database}". Using common column names.`;
      } else if (errorType === 403) {
        message = 'Insufficient permissions to read table schema. Using common column names.';
      } else if (errorType === 500) {
        message = 'Database connection error while fetching schema. Using common column names.';
        severity = 'error';
      } else {
        message = `Unable to fetch actual columns from "${nodeData.database}.${nodeData.table}". Using common column patterns instead.`;
      }

      showNotification(message, severity);

      // Log fallback usage for monitoring
      console.warn('SCHEMA_FALLBACK_USED', {
        component: 'DatabaseTriggerPanel',
        connectionId: nodeData.connectionId,
        database: nodeData.database,
        table: nodeData.table,
        attempts: maxRetries,
        lastErrorStatus: errorType,
        fallbackColumnsCount: enhancedCommonColumns.length,
      });
    };

    fetchColumnsWithRetry().finally(() => {
      setLoading(prev => ({ ...prev, columns: false }));
    });
  }, [
    nodeData.connectionId,
    nodeData.database,
    nodeData.table,
    schemaRefreshTrigger,
    showNotification,
  ]);

  // Manual schema refresh function
  const handleSchemaRefresh = () => {
    if (!nodeData.connectionId || !nodeData.database || !nodeData.table) {
      showNotification('Please select a connection, database, and table first', 'info');
      return;
    }

    // Increment trigger to force useEffect to run again
    setSchemaRefreshTrigger(prev => prev + 1);
    showNotification('Refreshing table schema...', 'info');
  };

  if (!node || !node.data) {
    return null;
  }

  const handleChange = event => {
    const { name, value } = event.target;

    // Reset dependent fields when parent fields change
    if (name === 'connectionId') {
      onNodeDataChange({
        [name]: value,
        database: '',
        table: '',
        column: '',
      });
    } else if (name === 'database') {
      onNodeDataChange({
        [name]: value,
        table: '',
        column: '',
      });
    } else if (name === 'table') {
      onNodeDataChange({
        [name]: value,
        column: '',
      });
    } else {
      onNodeDataChange({ [name]: value });
    }
  };

  const selectedConnection = connections.find(c => c._id === nodeData.connectionId);

  return (
    <Box sx={{ p: 2 }}>
      <Typography variant="h6" gutterBottom>
        Database Trigger
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

      <FormControl fullWidth margin="normal">
        <InputLabel>Event Type</InputLabel>
        <Select
          name="eventType"
          value={nodeData.eventType || 'newRow'}
          onChange={handleChange}
          label="Event Type"
        >
          <MenuItem value="newRow">New Row Added</MenuItem>
          <MenuItem value="updatedRow">Row Updated</MenuItem>
        </Select>
      </FormControl>

      <FormControl fullWidth margin="normal">
        <InputLabel>Database Connection</InputLabel>
        <Select
          name="connectionId"
          value={nodeData.connectionId || ''}
          onChange={handleChange}
          label="Database Connection"
          disabled={loading.connections}
        >
          <MenuItem value="">
            <em>Select a connection</em>
          </MenuItem>
          {(connections || []).map(connection => (
            <MenuItem key={connection._id} value={connection._id}>
              {connection.name} ({connection.host})
            </MenuItem>
          ))}
        </Select>
        {loading.connections && (
          <Box sx={{ display: 'flex', alignItems: 'center', mt: 1 }}>
            <CircularProgress size={16} sx={{ mr: 1 }} />
            <Typography variant="caption">Loading connections...</Typography>
          </Box>
        )}
      </FormControl>

      <FormControl fullWidth margin="normal" disabled={!nodeData.connectionId}>
        <InputLabel>Database</InputLabel>
        <Select
          name="database"
          value={nodeData.database || ''}
          onChange={handleChange}
          label="Database"
          disabled={loading.databases || !nodeData.connectionId}
        >
          <MenuItem value="">
            <em>Select a database</em>
          </MenuItem>
          {(databases || []).map(database => (
            <MenuItem key={database} value={database}>
              {database}
            </MenuItem>
          ))}
        </Select>
        {loading.databases && (
          <Box sx={{ display: 'flex', alignItems: 'center', mt: 1 }}>
            <CircularProgress size={16} sx={{ mr: 1 }} />
            <Typography variant="caption">Loading databases...</Typography>
          </Box>
        )}
      </FormControl>

      <FormControl fullWidth margin="normal" disabled={!nodeData.database}>
        <InputLabel>Table</InputLabel>
        <Select
          name="table"
          value={nodeData.table || ''}
          onChange={handleChange}
          label="Table"
          disabled={loading.tables || !nodeData.database}
        >
          <MenuItem value="">
            <em>Select a table</em>
          </MenuItem>
          {(tables || []).map(table => (
            <MenuItem key={table.fullName} value={table.fullName}>
              {table.fullName}
            </MenuItem>
          ))}
        </Select>
        {loading.tables && (
          <Box sx={{ display: 'flex', alignItems: 'center', mt: 1 }}>
            <CircularProgress size={16} sx={{ mr: 1 }} />
            <Typography variant="caption">Loading tables...</Typography>
          </Box>
        )}
      </FormControl>

      {/* Date Column Selection for New Rows */}
      {nodeData.eventType === 'newRow' && (
        <FormControl fullWidth margin="normal" disabled={!nodeData.table}>
          <InputLabel>Date Column (for new row detection)</InputLabel>
          <Select
            name="dateColumn"
            value={nodeData.dateColumn || ''}
            onChange={handleChange}
            label="Date Column (for new row detection)"
            disabled={loading.columns || !nodeData.table}
          >
            <MenuItem value="">
              <em>Auto-detect (recommended)</em>
            </MenuItem>
            {(columns || []).map(column => (
              <MenuItem key={column} value={column}>
                {column}
              </MenuItem>
            ))}
          </Select>
          {loading.columns && (
            <Box sx={{ display: 'flex', alignItems: 'center', mt: 1 }}>
              <CircularProgress size={16} sx={{ mr: 1 }} />
              <Typography variant="caption">Loading columns...</Typography>
            </Box>
          )}
          <Typography variant="caption" color="text.secondary" sx={{ mt: 1, ml: 1.5 }}>
            Leave as &quot;Auto-detect&quot; to use the first available timestamp column, or select
            a specific column like &quot;dateAdded&quot;
          </Typography>
        </FormControl>
      )}

      {/* Timezone Offset Configuration */}
      <TextField
        label="Time Add Offset (minutes from EST)"
        name="timeadd"
        type="number"
        value={nodeData.timeadd || ''}
        onChange={handleChange}
        fullWidth
        margin="normal"
        variant="outlined"
        placeholder="0"
        helperText={`Leave blank for EST (0). Use negative values for times stored behind EST (e.g., -180 for databases that store time 3 hours behind EST). Use positive values for times stored ahead of EST (e.g., +180 for databases that store time 3 hours ahead of EST).`}
      />

      {nodeData.eventType === 'updatedRow' && (
        <Box sx={{ position: 'relative' }}>
          <FormControl fullWidth margin="normal" disabled={!nodeData.table}>
            <InputLabel>Monitor Column (for updates)</InputLabel>
            <Select
              name="column"
              value={nodeData.column || ''}
              onChange={handleChange}
              label="Monitor Column (for updates)"
              disabled={loading.columns || !nodeData.table}
            >
              <MenuItem value="">
                <em>Select a column to monitor</em>
              </MenuItem>
              {(columns || []).map(column => (
                <MenuItem key={column} value={column}>
                  {column}
                </MenuItem>
              ))}
            </Select>
            {/* Refresh button positioned at the top right of the select */}
            <Tooltip title="Refresh table schema from database">
              <IconButton
                onClick={handleSchemaRefresh}
                disabled={loading.columns || !nodeData.table}
                sx={{
                  position: 'absolute',
                  right: 40, // Position to avoid overlap with dropdown arrow
                  top: '50%',
                  transform: 'translateY(-50%)',
                  zIndex: 1,
                }}
                size="small"
              >
                <RefreshIcon fontSize="small" />
              </IconButton>
            </Tooltip>
          </FormControl>
          {loading.columns && (
            <Box sx={{ display: 'flex', alignItems: 'center', mt: 1 }}>
              <CircularProgress size={16} sx={{ mr: 1 }} />
              <Typography variant="caption">
                {schemaRefreshTrigger > 0 ? 'Refreshing schema...' : 'Loading columns...'}
              </Typography>
            </Box>
          )}
          {/* Show fallback indicator when using common columns */}
          {!loading.columns && columns.length > 0 && columns.includes('dateAdded') && (
            <Alert severity="info" sx={{ mt: 1, fontSize: '0.875rem' }}>
              Using common column names. Click the refresh button to fetch actual table schema.
            </Alert>
          )}
        </Box>
      )}

      {/* CDC Optimization Settings */}
      <Accordion sx={{ mt: 2 }}>
        <AccordionSummary
          expandIcon={<ExpandMoreIcon />}
          aria-controls="cdc-content"
          id="cdc-header"
        >
          <Typography variant="subtitle1">CDC Optimization Settings</Typography>
        </AccordionSummary>
        <AccordionDetails>
          <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
            <FormControlLabel
              control={
                <Switch
                  checked={nodeData.cdcMode || false}
                  onChange={e =>
                    handleChange({
                      target: { name: 'cdcMode', value: e.target.checked },
                    })
                  }
                  name="cdcMode"
                />
              }
              label="Enable CDC Mode"
            />

            {nodeData.cdcMode && (
              <>
                <TextField
                  label="Batch Size"
                  name="batchSize"
                  type="number"
                  value={nodeData.batchSize || '5000'}
                  onChange={handleChange}
                  fullWidth
                  variant="outlined"
                  helperText="Number of records to process per batch (default: 5000 for CDC mode)"
                />

                <FormControl fullWidth>
                  <InputLabel>Cleanup Strategy</InputLabel>
                  <Select
                    name="cleanupStrategy"
                    value={nodeData.cleanupStrategy || 'time-based'}
                    onChange={handleChange}
                    label="Cleanup Strategy"
                  >
                    <MenuItem value="time-based">Time-based (default)</MenuItem>
                    <MenuItem value="processed-marker">Processed Marker</MenuItem>
                  </Select>
                </FormControl>

                <FormControlLabel
                  control={
                    <Switch
                      checked={nodeData.enableBatching || false}
                      onChange={e =>
                        handleChange({
                          target: { name: 'enableBatching', value: e.target.checked },
                        })
                      }
                      name="enableBatching"
                    />
                  }
                  label="Enable Batch Processing"
                />

                <Divider />

                <Typography variant="subtitle2">Adaptive Polling Configuration</Typography>

                <TextField
                  label="Minimum Interval (seconds)"
                  name="minInterval"
                  type="number"
                  value={nodeData.minInterval ? nodeData.minInterval / 1000 : '5'}
                  onChange={e =>
                    handleChange({
                      target: { name: 'minInterval', value: parseInt(e.target.value) * 1000 },
                    })
                  }
                  fullWidth
                  variant="outlined"
                  helperText="Fastest polling interval during high activity"
                />

                <TextField
                  label="Base Interval (seconds)"
                  name="baseInterval"
                  type="number"
                  value={nodeData.baseInterval ? nodeData.baseInterval / 1000 : '30'}
                  onChange={e =>
                    handleChange({
                      target: { name: 'baseInterval', value: parseInt(e.target.value) * 1000 },
                    })
                  }
                  fullWidth
                  variant="outlined"
                  helperText="Default polling interval"
                />

                <TextField
                  label="Maximum Interval (minutes)"
                  name="maxInterval"
                  type="number"
                  value={nodeData.maxInterval ? nodeData.maxInterval / 60000 : '5'}
                  onChange={e =>
                    handleChange({
                      target: { name: 'maxInterval', value: parseInt(e.target.value) * 60000 },
                    })
                  }
                  fullWidth
                  variant="outlined"
                  helperText="Slowest polling interval during low activity"
                />
              </>
            )}
          </Box>
        </AccordionDetails>
      </Accordion>

      {/* Configuration Summary */}
      {nodeData.connectionId && (
        <Box sx={{ mt: 2, p: 2, bgcolor: 'background.default', borderRadius: 1 }}>
          <Typography variant="subtitle2" gutterBottom>
            Configuration Summary
          </Typography>
          <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1 }}>
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
              <Typography variant="body2" color="text.secondary">
                Connection:
              </Typography>
              <Chip label={selectedConnection?.name || 'Not selected'} size="small" />
            </Box>
            {nodeData.database && (
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                <Typography variant="body2" color="text.secondary">
                  Database:
                </Typography>
                <Chip label={nodeData.database} size="small" />
              </Box>
            )}
            {nodeData.table && (
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                <Typography variant="body2" color="text.secondary">
                  Table:
                </Typography>
                <Chip label={nodeData.table} size="small" />
              </Box>
            )}
            {nodeData.eventType === 'newRow' && nodeData.dateColumn && (
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                <Typography variant="body2" color="text.secondary">
                  Date Column:
                </Typography>
                <Chip label={nodeData.dateColumn} size="small" />
              </Box>
            )}
            {nodeData.timeadd && (
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                <Typography variant="body2" color="text.secondary">
                  Timezone Offset:
                </Typography>
                <Chip
                  label={`${nodeData.timeadd > 0 ? '+' : ''}${nodeData.timeadd} minutes from EST`}
                  size="small"
                  color={nodeData.timeadd === 0 ? 'default' : 'primary'}
                />
              </Box>
            )}
            {nodeData.eventType === 'updatedRow' && nodeData.column && (
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                <Typography variant="body2" color="text.secondary">
                  Monitor Column:
                </Typography>
                <Chip label={nodeData.column} size="small" />
              </Box>
            )}
            {nodeData.cdcMode && (
              <>
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                  <Typography variant="body2" color="text.secondary">
                    CDC Mode:
                  </Typography>
                  <Chip label="Enabled" size="small" color="success" />
                </Box>
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                  <Typography variant="body2" color="text.secondary">
                    Batch Size:
                  </Typography>
                  <Chip label={nodeData.batchSize || '5000'} size="small" />
                </Box>
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                  <Typography variant="body2" color="text.secondary">
                    Polling Range:
                  </Typography>
                  <Chip
                    label={`${(nodeData.minInterval || 5000) / 1000}s - ${(nodeData.maxInterval || 300000) / 60000}min`}
                    size="small"
                    color="primary"
                  />
                </Box>
              </>
            )}
          </Box>
        </Box>
      )}

      <Alert severity="info" sx={{ mt: 2 }}>
        <Typography variant="body2">
          <strong>How it works:</strong>
          {nodeData.cdcMode ? (
            <>
              This trigger uses adaptive polling (5 seconds to 5 minutes) to check for{' '}
              {nodeData.eventType === 'newRow' ? 'new rows' : 'updated rows'} in the selected table.
              CDC mode enables batch processing of up to {nodeData.batchSize || '5000'} records and
              {nodeData.cleanupStrategy === 'processed-marker'
                ? ' marks processed rows automatically.'
                : ' uses time-based cleanup.'}
            </>
          ) : (
            <>
              This trigger runs every minute via a background job to check for{' '}
              {nodeData.eventType === 'newRow' ? 'new rows' : 'updated rows'} in the selected table.
              {nodeData.eventType === 'updatedRow'
                ? ' It monitors the specified column for changes.'
                : ''}
            </>
          )}
        </Typography>
      </Alert>

      {(!nodeData.connectionId || !nodeData.database || !nodeData.table) && (
        <Alert severity="warning" sx={{ mt: 1 }}>
          <Typography variant="body2">
            Complete configuration required: Please select a database connection, database, and
            table to enable this trigger.
          </Typography>
        </Alert>
      )}
    </Box>
  );
};

export default DatabaseTriggerPanel;
