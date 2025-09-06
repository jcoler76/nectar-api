import {
  Search as SearchIcon,
  ExpandMore as ExpandMoreIcon,
  FilterList as FilterIcon,
  Clear as ClearIcon,
} from '@mui/icons-material';
import {
  Box,
  Typography,
  Button,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  TextField,
  Tabs,
  Tab,
  Checkbox,
  Table,
  TableHead,
  TableBody,
  TableRow,
  TableCell,
  TableContainer,
  Paper,
  Chip,
  IconButton,
  InputAdornment,
  Alert,
  CircularProgress,
  Accordion,
  AccordionSummary,
  AccordionDetails,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
} from '@mui/material';
import { useState, useEffect } from 'react';

import { useNotification } from '../../context/NotificationContext';

const ServiceObjectSelector = ({ open, onClose, serviceId, serviceName, onSelectionSaved }) => {
  const [currentTab, setCurrentTab] = useState(0);
  const [searchTerm, setSearchTerm] = useState('');
  const [entityFilter, setEntityFilter] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [saving, setSaving] = useState(false);

  // Data state
  const [availableObjects, setAvailableObjects] = useState({
    tables: [],
    views: [],
    procedures: [],
  });
  const [selectedObjects, setSelectedObjects] = useState({
    tables: new Set(),
    views: new Set(),
    procedures: new Set(),
  });

  const { showNotification } = useNotification();

  // Business entity options for filtering
  const businessEntities = [
    'customer',
    'contract',
    'invoice',
    'payment',
    'opportunity',
    'production',
    'reference',
    'system',
    'operational',
    'reporting',
  ];

  useEffect(() => {
    if (open && serviceId) {
      fetchAvailableObjects();
      fetchCurrentSelections();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open, serviceId]);

  const fetchAvailableObjects = async () => {
    setLoading(true);
    setError('');
    try {
      const response = await fetch(`/api/database-objects/${serviceId}`, {
        headers: {
          Authorization: `Bearer ${localStorage.getItem('token')}`,
        },
      });

      if (!response.ok) {
        throw new Error('Failed to fetch available objects');
      }

      const data = await response.json();
      setAvailableObjects(data);
    } catch (err) {
      setError(err.message);
      showNotification('Failed to fetch available database objects', 'error');
    } finally {
      setLoading(false);
    }
  };

  const fetchCurrentSelections = async () => {
    try {
      const response = await fetch(`/api/database-objects/${serviceId}/selections`, {
        headers: {
          Authorization: `Bearer ${localStorage.getItem('token')}`,
        },
      });

      if (response.ok) {
        const data = await response.json();

        // Pre-populate selected objects
        const newSelectedObjects = {
          tables: new Set(data.selectedTables?.map(t => t.tableName) || []),
          views: new Set(data.selectedViews?.map(v => v.viewName) || []),
          procedures: new Set(data.selectedProcedures?.map(p => p.procedureName) || []),
        };
        setSelectedObjects(newSelectedObjects);
      }
    } catch (err) {
      console.error('Failed to fetch current selections:', err);
    }
  };

  const handleTabChange = (event, newValue) => {
    setCurrentTab(newValue);
  };

  const handleObjectToggle = (objectType, objectName) => {
    setSelectedObjects(prev => {
      const newSelected = { ...prev };
      const currentSet = new Set(newSelected[objectType]);

      if (currentSet.has(objectName)) {
        currentSet.delete(objectName);
      } else {
        currentSet.add(objectName);
      }

      newSelected[objectType] = currentSet;
      return newSelected;
    });
  };

  const handleSelectAll = objectType => {
    const filtered = getFilteredObjects(objectType);
    setSelectedObjects(prev => ({
      ...prev,
      [objectType]: new Set([
        ...prev[objectType],
        ...filtered.map(obj => getObjectName(obj, objectType)),
      ]),
    }));
  };

  const handleDeselectAll = objectType => {
    const filtered = getFilteredObjects(objectType);
    const filteredNames = new Set(filtered.map(obj => getObjectName(obj, objectType)));

    setSelectedObjects(prev => {
      const newSet = new Set(prev[objectType]);
      filteredNames.forEach(name => newSet.delete(name));
      return {
        ...prev,
        [objectType]: newSet,
      };
    });
  };

  const getObjectName = (obj, objectType) => {
    switch (objectType) {
      case 'tables':
        return obj.tableName;
      case 'views':
        return obj.viewName;
      case 'procedures':
        return obj.procedureName;
      default:
        return '';
    }
  };

  const getFilteredObjects = objectType => {
    const objects = availableObjects[objectType] || [];
    return objects.filter(obj => {
      const name = getObjectName(obj, objectType);
      const matchesSearch = !searchTerm || name.toLowerCase().includes(searchTerm.toLowerCase());
      const matchesEntity = !entityFilter || obj.businessEntity === entityFilter;
      return matchesSearch && matchesEntity;
    });
  };

  const getConfidenceColor = confidence => {
    if (confidence >= 0.8) return 'success';
    if (confidence >= 0.6) return 'warning';
    return 'error';
  };

  const getImportanceColor = importance => {
    switch (importance) {
      case 'critical':
        return 'error';
      case 'important':
        return 'warning';
      case 'reference':
        return 'info';
      case 'system':
        return 'default';
      default:
        return 'default';
    }
  };

  const handleSave = async () => {
    setSaving(true);
    setError('');

    try {
      const selectionData = {
        selectedTables: Array.from(selectedObjects.tables),
        selectedViews: Array.from(selectedObjects.views),
        selectedProcedures: Array.from(selectedObjects.procedures),
      };

      const response = await fetch(`/api/database-objects/${serviceId}/select`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${localStorage.getItem('token')}`,
        },
        body: JSON.stringify(selectionData),
      });

      if (!response.ok) {
        throw new Error('Failed to save selections');
      }

      const result = await response.json();
      showNotification('Database object selections saved successfully', 'success');

      if (onSelectionSaved) {
        onSelectionSaved(result);
      }

      onClose();
    } catch (err) {
      setError(err.message);
      showNotification('Failed to save selections', 'error');
    } finally {
      setSaving(false);
    }
  };

  const getTotalSelected = () => {
    return (
      selectedObjects.tables.size + selectedObjects.views.size + selectedObjects.procedures.size
    );
  };

  const renderObjectTable = objectType => {
    const objects = getFilteredObjects(objectType);
    const selectedSet = selectedObjects[objectType];

    if (objects.length === 0) {
      return (
        <Box sx={{ p: 2, textAlign: 'center' }}>
          <Typography color="textSecondary">
            {searchTerm || entityFilter
              ? 'No objects match the current filters'
              : `No ${objectType} available`}
          </Typography>
        </Box>
      );
    }

    return (
      <TableContainer component={Paper} sx={{ maxHeight: 400 }}>
        <Table stickyHeader size="small">
          <TableHead>
            <TableRow>
              <TableCell padding="checkbox">
                <Checkbox
                  checked={
                    objects.length > 0 &&
                    objects.every(obj => selectedSet.has(getObjectName(obj, objectType)))
                  }
                  indeterminate={
                    objects.some(obj => selectedSet.has(getObjectName(obj, objectType))) &&
                    objects.some(obj => !selectedSet.has(getObjectName(obj, objectType)))
                  }
                  onChange={e => {
                    if (e.target.checked) {
                      handleSelectAll(objectType);
                    } else {
                      handleDeselectAll(objectType);
                    }
                  }}
                />
              </TableCell>
              <TableCell>Name</TableCell>
              <TableCell>Business Entity</TableCell>
              <TableCell>Confidence</TableCell>
              {objectType === 'tables' && <TableCell>Importance</TableCell>}
              {objectType === 'procedures' && <TableCell>Type</TableCell>}
              {objectType === 'views' && <TableCell>Complexity</TableCell>}
            </TableRow>
          </TableHead>
          <TableBody>
            {objects.map(obj => {
              const objectName = getObjectName(obj, objectType);
              const isSelected = selectedSet.has(objectName);

              return (
                <TableRow
                  key={objectName}
                  hover
                  onClick={() => handleObjectToggle(objectType, objectName)}
                  sx={{ cursor: 'pointer' }}
                >
                  <TableCell padding="checkbox">
                    <Checkbox checked={isSelected} />
                  </TableCell>
                  <TableCell>
                    <Typography variant="body2" fontWeight={isSelected ? 'bold' : 'normal'}>
                      {objectName}
                    </Typography>
                  </TableCell>
                  <TableCell>
                    {obj.businessEntity && (
                      <Chip
                        label={obj.businessEntity}
                        size="small"
                        variant="outlined"
                        color="primary"
                      />
                    )}
                  </TableCell>
                  <TableCell>
                    <Chip
                      label={`${Math.round((obj.confidence || 0) * 100)}%`}
                      size="small"
                      color={getConfidenceColor(obj.confidence || 0)}
                      variant="outlined"
                    />
                  </TableCell>
                  {objectType === 'tables' && (
                    <TableCell>
                      <Chip
                        label={obj.businessImportance || 'reference'}
                        size="small"
                        color={getImportanceColor(obj.businessImportance)}
                        variant="outlined"
                      />
                    </TableCell>
                  )}
                  {objectType === 'procedures' && (
                    <TableCell>
                      <Chip label={obj.procedureType || 'other'} size="small" variant="outlined" />
                    </TableCell>
                  )}
                  {objectType === 'views' && (
                    <TableCell>
                      <Chip
                        label={obj.complexityScore || 'moderate'}
                        size="small"
                        variant="outlined"
                      />
                    </TableCell>
                  )}
                </TableRow>
              );
            })}
          </TableBody>
        </Table>
      </TableContainer>
    );
  };

  const tabLabels = ['Tables', 'Views', 'Procedures'];
  const tabTypes = ['tables', 'views', 'procedures'];

  return (
    <Dialog open={open} onClose={onClose} maxWidth="lg" fullWidth>
      <DialogTitle>
        <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <Typography variant="h6">Configure Database Objects - {serviceName}</Typography>
          <Typography variant="body2" color="textSecondary">
            {getTotalSelected()} objects selected
          </Typography>
        </Box>
      </DialogTitle>

      <DialogContent>
        {error && (
          <Alert severity="error" sx={{ mb: 2 }}>
            {error}
          </Alert>
        )}

        {/* Filters */}
        <Accordion sx={{ mb: 2 }}>
          <AccordionSummary expandIcon={<ExpandMoreIcon />}>
            <Box sx={{ display: 'flex', alignItems: 'center' }}>
              <FilterIcon sx={{ mr: 1 }} />
              <Typography>Filters</Typography>
              {(searchTerm || entityFilter) && (
                <Chip label="Active" size="small" color="primary" sx={{ ml: 1 }} />
              )}
            </Box>
          </AccordionSummary>
          <AccordionDetails>
            <Box sx={{ display: 'flex', gap: 2, flexWrap: 'wrap' }}>
              <TextField
                label="Search Objects"
                value={searchTerm}
                onChange={e => setSearchTerm(e.target.value)}
                size="small"
                sx={{ minWidth: 200 }}
                InputProps={{
                  startAdornment: (
                    <InputAdornment position="start">
                      <SearchIcon />
                    </InputAdornment>
                  ),
                  endAdornment: searchTerm && (
                    <InputAdornment position="end">
                      <IconButton size="small" onClick={() => setSearchTerm('')}>
                        <ClearIcon />
                      </IconButton>
                    </InputAdornment>
                  ),
                }}
              />

              <FormControl size="small" sx={{ minWidth: 180 }}>
                <InputLabel>Business Entity</InputLabel>
                <Select
                  value={entityFilter}
                  label="Business Entity"
                  onChange={e => setEntityFilter(e.target.value)}
                >
                  <MenuItem value="">
                    <em>All Entities</em>
                  </MenuItem>
                  {businessEntities.map(entity => (
                    <MenuItem key={entity} value={entity}>
                      {entity.charAt(0).toUpperCase() + entity.slice(1)}
                    </MenuItem>
                  ))}
                </Select>
              </FormControl>
            </Box>
          </AccordionDetails>
        </Accordion>

        {/* Tabs for object types */}
        <Box sx={{ borderBottom: 1, borderColor: 'divider' }}>
          <Tabs value={currentTab} onChange={handleTabChange}>
            {tabLabels.map((label, index) => {
              const objectType = tabTypes[index];
              const count = selectedObjects[objectType].size;
              const total = availableObjects[objectType]?.length || 0;

              return (
                <Tab
                  key={label}
                  label={
                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                      {label}
                      <Chip
                        label={`${count}/${total}`}
                        size="small"
                        color={count > 0 ? 'primary' : 'default'}
                        variant="outlined"
                      />
                    </Box>
                  }
                />
              );
            })}
          </Tabs>
        </Box>

        {/* Content */}
        <Box sx={{ mt: 2 }}>
          {loading ? (
            <Box sx={{ display: 'flex', justifyContent: 'center', p: 4 }}>
              <CircularProgress />
            </Box>
          ) : (
            renderObjectTable(tabTypes[currentTab])
          )}
        </Box>

        {/* Selection summary */}
        {getTotalSelected() > 0 && (
          <Box
            sx={{
              mt: 2,
              p: 2,
              bgcolor: 'background.paper',
              border: 1,
              borderColor: 'divider',
              borderRadius: 1,
            }}
          >
            <Typography variant="subtitle2" gutterBottom>
              Selection Summary
            </Typography>
            <Box sx={{ display: 'flex', gap: 1, flexWrap: 'wrap' }}>
              {selectedObjects.tables.size > 0 && (
                <Chip
                  label={`${selectedObjects.tables.size} Tables`}
                  color="primary"
                  variant="outlined"
                />
              )}
              {selectedObjects.views.size > 0 && (
                <Chip
                  label={`${selectedObjects.views.size} Views`}
                  color="secondary"
                  variant="outlined"
                />
              )}
              {selectedObjects.procedures.size > 0 && (
                <Chip
                  label={`${selectedObjects.procedures.size} Procedures`}
                  color="info"
                  variant="outlined"
                />
              )}
            </Box>
          </Box>
        )}
      </DialogContent>

      <DialogActions>
        <Button onClick={onClose} disabled={saving}>
          Cancel
        </Button>
        <Button
          onClick={handleSave}
          variant="contained"
          disabled={saving || getTotalSelected() === 0}
          startIcon={saving && <CircularProgress size={20} />}
        >
          {saving ? 'Saving...' : 'Save Selections'}
        </Button>
      </DialogActions>
    </Dialog>
  );
};

export default ServiceObjectSelector;
