import {
  Delete as DeleteIcon,
  MoreVert as MoreVertIcon,
  TableChart as TableIcon,
  Visibility as ViewIcon,
  Code as ProcedureIcon,
  Schedule as ScheduleIcon,
  Assessment as AssessmentIcon,
} from '@mui/icons-material';
import {
  Box,
  Typography,
  Button,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Table,
  TableHead,
  TableBody,
  TableRow,
  TableCell,
  TableContainer,
  Paper,
  Chip,
  IconButton,
  Alert,
  CircularProgress,
  Tabs,
  Tab,
  Card,
  CardContent,
  Grid,
  Menu,
  MenuItem,
  ListItemIcon,
  ListItemText,
} from '@mui/material';
import { useState, useEffect } from 'react';

import { useNotification } from '../../context/NotificationContext';
import ConfirmDialog from '../common/ConfirmDialog';
import ExportMenu from '../common/ExportMenu';

const ServiceObjectManager = ({ open, onClose, serviceId, serviceName, onEdit, onRefresh }) => {
  const [currentTab, setCurrentTab] = useState(0);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [selections, setSelections] = useState(null);
  const [stats, setStats] = useState(null);
  const [menuAnchor, setMenuAnchor] = useState(null);
  const [selectedForAction, setSelectedForAction] = useState(null);
  const [confirmBulkRemove, setConfirmBulkRemove] = useState({ open: false, objectType: null });

  const { showNotification } = useNotification();

  useEffect(() => {
    if (open && serviceId) {
      fetchSelections();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open, serviceId]);

  const fetchSelections = async () => {
    setLoading(true);
    setError('');
    try {
      const response = await fetch(`/api/database-objects/${serviceId}/selections`, {
        headers: {
          Authorization: `Bearer ${localStorage.getItem('token')}`,
        },
      });

      if (!response.ok) {
        throw new Error('Failed to fetch selections');
      }

      const data = await response.json();
      setSelections(data);
      calculateStats(data);
    } catch (err) {
      setError(err.message);
      showNotification('Failed to fetch object selections', 'error');
    } finally {
      setLoading(false);
    }
  };

  const calculateStats = data => {
    if (!data) return;

    const stats = {
      totalTables: data.selectedTables?.length || 0,
      totalViews: data.selectedViews?.length || 0,
      totalProcedures: data.selectedProcedures?.length || 0,
      lastModified: data.lastModified,
      selectionName: data.selectionName,
      description: data.description,

      // Business entity breakdown
      entityBreakdown: {},

      // Selection reasons
      reasonBreakdown: {
        user_selected: 0,
        dependency: 0,
        auto_included: 0,
      },
    };

    // Calculate entity and reason breakdowns
    const allObjects = [
      ...(data.selectedTables || []),
      ...(data.selectedViews || []),
      ...(data.selectedProcedures || []),
    ];

    allObjects.forEach(obj => {
      // Entity breakdown
      const entity = obj.businessEntity || 'unknown';
      stats.entityBreakdown[entity] = (stats.entityBreakdown[entity] || 0) + 1;

      // Reason breakdown
      const reason = obj.reason || 'user_selected';
      stats.reasonBreakdown[reason] = (stats.reasonBreakdown[reason] || 0) + 1;
    });

    stats.totalObjects = stats.totalTables + stats.totalViews + stats.totalProcedures;
    setStats(stats);
  };

  const handleTabChange = (event, newValue) => {
    setCurrentTab(newValue);
  };

  const handleMenuOpen = (event, object, objectType) => {
    setMenuAnchor(event.currentTarget);
    setSelectedForAction({ object, objectType });
  };

  const handleMenuClose = () => {
    setMenuAnchor(null);
    setSelectedForAction(null);
  };

  const handleRemoveObject = async (objectName, objectType) => {
    try {
      const response = await fetch(`/api/database-objects/${serviceId}/selections/${objectName}`, {
        method: 'DELETE',
        headers: {
          Authorization: `Bearer ${localStorage.getItem('token')}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ objectType }),
      });

      if (!response.ok) {
        throw new Error('Failed to remove object');
      }

      showNotification(`${objectName} removed from selection`, 'success');
      fetchSelections(); // Refresh data
      if (onRefresh) onRefresh();
    } catch (err) {
      showNotification(`Failed to remove ${objectName}`, 'error');
    } finally {
      handleMenuClose();
    }
  };

  const handleBulkRemove = async objectType => {
    const objectsToRemove = getObjectsForTab(objectType);
    if (objectsToRemove.length === 0) return;

    try {
      const response = await fetch(`/api/database-objects/${serviceId}/selections/bulk-remove`, {
        method: 'DELETE',
        headers: {
          Authorization: `Bearer ${localStorage.getItem('token')}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          objectType,
          objectNames: objectsToRemove.map(obj => getObjectName(obj, objectType)),
        }),
      });

      if (!response.ok) {
        throw new Error(`Failed to remove ${objectType}`);
      }

      showNotification(`All ${objectType} removed from selection`, 'success');
      fetchSelections();
      if (onRefresh) onRefresh();
    } catch (err) {
      showNotification(`Failed to remove ${objectType}`, 'error');
    }
    setConfirmBulkRemove({ open: false, objectType: null });
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

  const getObjectsForTab = objectType => {
    if (!selections) return [];
    switch (objectType) {
      case 'tables':
        return selections.selectedTables || [];
      case 'views':
        return selections.selectedViews || [];
      case 'procedures':
        return selections.selectedProcedures || [];
      default:
        return [];
    }
  };

  const prepareExportData = () => {
    if (!selections) return [];

    const allObjects = [];

    // Add tables
    (selections.selectedTables || []).forEach(table => {
      allObjects.push({
        Type: 'Table',
        Name: table.tableName,
        'Business Entity': table.businessEntity || '',
        Reason: table.reason || 'user_selected',
        'Added Date': new Date(table.addedAt).toLocaleString(),
      });
    });

    // Add views
    (selections.selectedViews || []).forEach(view => {
      allObjects.push({
        Type: 'View',
        Name: view.viewName,
        'Business Entity': view.businessEntity || '',
        Reason: view.reason || 'user_selected',
        'Added Date': new Date(view.addedAt).toLocaleString(),
      });
    });

    // Add procedures
    (selections.selectedProcedures || []).forEach(proc => {
      allObjects.push({
        Type: 'Procedure',
        Name: proc.procedureName,
        'Business Entity': proc.businessEntity || '',
        Reason: proc.reason || 'user_selected',
        'Added Date': new Date(proc.addedAt).toLocaleString(),
      });
    });

    return allObjects;
  };

  const renderStatsCards = () => {
    if (!stats) return null;

    return (
      <Grid container spacing={2} sx={{ mb: 3 }}>
        <Grid item xs={12} sm={6} md={3}>
          <Card>
            <CardContent sx={{ textAlign: 'center' }}>
              <TableIcon color="primary" sx={{ fontSize: 40, mb: 1 }} />
              <Typography variant="h4" color="primary">
                {stats.totalTables}
              </Typography>
              <Typography variant="body2" color="textSecondary">
                Tables
              </Typography>
            </CardContent>
          </Card>
        </Grid>

        <Grid item xs={12} sm={6} md={3}>
          <Card>
            <CardContent sx={{ textAlign: 'center' }}>
              <ViewIcon color="secondary" sx={{ fontSize: 40, mb: 1 }} />
              <Typography variant="h4" color="secondary">
                {stats.totalViews}
              </Typography>
              <Typography variant="body2" color="textSecondary">
                Views
              </Typography>
            </CardContent>
          </Card>
        </Grid>

        <Grid item xs={12} sm={6} md={3}>
          <Card>
            <CardContent sx={{ textAlign: 'center' }}>
              <ProcedureIcon color="info" sx={{ fontSize: 40, mb: 1 }} />
              <Typography variant="h4" color="info">
                {stats.totalProcedures}
              </Typography>
              <Typography variant="body2" color="textSecondary">
                Procedures
              </Typography>
            </CardContent>
          </Card>
        </Grid>

        <Grid item xs={12} sm={6} md={3}>
          <Card>
            <CardContent sx={{ textAlign: 'center' }}>
              <AssessmentIcon color="success" sx={{ fontSize: 40, mb: 1 }} />
              <Typography variant="h4" color="success">
                {stats.totalObjects}
              </Typography>
              <Typography variant="body2" color="textSecondary">
                Total Objects
              </Typography>
            </CardContent>
          </Card>
        </Grid>
      </Grid>
    );
  };

  const renderEntityBreakdown = () => {
    if (!stats || !stats.entityBreakdown) return null;

    const entities = Object.entries(stats.entityBreakdown);
    if (entities.length === 0) return null;

    return (
      <Card sx={{ mb: 2 }}>
        <CardContent>
          <Typography variant="h6" gutterBottom>
            Business Entity Distribution
          </Typography>
          <Box sx={{ display: 'flex', gap: 1, flexWrap: 'wrap' }}>
            {entities.map(([entity, count]) => (
              <Chip key={entity} label={`${entity}: ${count}`} variant="outlined" color="primary" />
            ))}
          </Box>
        </CardContent>
      </Card>
    );
  };

  const renderObjectTable = objectType => {
    const objects = getObjectsForTab(objectType);

    if (objects.length === 0) {
      return (
        <Box sx={{ p: 3, textAlign: 'center' }}>
          <Typography color="textSecondary">No {objectType} selected</Typography>
        </Box>
      );
    }

    return (
      <TableContainer component={Paper}>
        <Table size="small">
          <TableHead>
            <TableRow>
              <TableCell>Name</TableCell>
              <TableCell>Business Entity</TableCell>
              <TableCell>Reason</TableCell>
              <TableCell>Added Date</TableCell>
              <TableCell align="right">Actions</TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {objects.map((obj, index) => {
              const objectName = getObjectName(obj, objectType);

              return (
                <TableRow key={index} hover>
                  <TableCell>
                    <Typography variant="body2" fontWeight="medium">
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
                      label={obj.reason || 'user_selected'}
                      size="small"
                      color={
                        obj.reason === 'user_selected'
                          ? 'success'
                          : obj.reason === 'dependency'
                            ? 'warning'
                            : 'default'
                      }
                      variant="outlined"
                    />
                  </TableCell>
                  <TableCell>
                    <Typography variant="body2" color="textSecondary">
                      {new Date(obj.addedAt).toLocaleDateString()}
                    </Typography>
                  </TableCell>
                  <TableCell align="right">
                    <IconButton size="small" onClick={e => handleMenuOpen(e, obj, objectType)}>
                      <MoreVertIcon />
                    </IconButton>
                  </TableCell>
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
    <>
      <Dialog open={open} onClose={onClose} maxWidth="lg" fullWidth>
        <DialogTitle>
          <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <Typography variant="h6">Manage Selected Objects - {serviceName}</Typography>
            <Box sx={{ display: 'flex', gap: 1 }}>
              <ExportMenu
                data={prepareExportData()}
                filename={`${serviceName}-object-selections`}
              />
              <Button variant="outlined" onClick={onEdit} size="small">
                Edit Selections
              </Button>
            </Box>
          </Box>
        </DialogTitle>

        <DialogContent>
          {error && (
            <Alert severity="error" sx={{ mb: 2 }}>
              {error}
            </Alert>
          )}

          {loading ? (
            <Box sx={{ display: 'flex', justifyContent: 'center', p: 4 }}>
              <CircularProgress />
            </Box>
          ) : selections ? (
            <>
              {/* Statistics Cards */}
              {renderStatsCards()}

              {/* Entity Breakdown */}
              {renderEntityBreakdown()}

              {/* Selection Metadata */}
              {selections.lastModified && (
                <Card sx={{ mb: 2 }}>
                  <CardContent>
                    <Typography variant="h6" gutterBottom>
                      Selection Information
                    </Typography>
                    <Grid container spacing={2}>
                      <Grid item xs={12} sm={6}>
                        <Box sx={{ display: 'flex', alignItems: 'center', mb: 1 }}>
                          <ScheduleIcon sx={{ mr: 1, color: 'text.secondary' }} />
                          <Typography variant="body2">
                            Last Modified: {new Date(selections.lastModified).toLocaleString()}
                          </Typography>
                        </Box>
                      </Grid>
                      {selections.selectionName && (
                        <Grid item xs={12} sm={6}>
                          <Typography variant="body2">
                            <strong>Selection:</strong> {selections.selectionName}
                          </Typography>
                        </Grid>
                      )}
                    </Grid>
                    {selections.description && (
                      <Typography variant="body2" color="textSecondary" sx={{ mt: 1 }}>
                        {selections.description}
                      </Typography>
                    )}
                  </CardContent>
                </Card>
              )}

              {/* Tabs for object types */}
              <Box sx={{ borderBottom: 1, borderColor: 'divider' }}>
                <Tabs value={currentTab} onChange={handleTabChange}>
                  {tabLabels.map((label, index) => {
                    const objectType = tabTypes[index];
                    const count = getObjectsForTab(objectType).length;

                    return (
                      <Tab
                        key={label}
                        label={
                          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                            {label}
                            <Chip
                              label={count}
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

              {/* Bulk Actions */}
              <Box
                sx={{
                  mt: 2,
                  mb: 2,
                  display: 'flex',
                  justifyContent: 'space-between',
                  alignItems: 'center',
                }}
              >
                <Typography variant="h6">{tabLabels[currentTab]}</Typography>
                {getObjectsForTab(tabTypes[currentTab]).length > 0 && (
                  <Button
                    color="error"
                    size="small"
                    onClick={() =>
                      setConfirmBulkRemove({ open: true, objectType: tabTypes[currentTab] })
                    }
                    startIcon={<DeleteIcon />}
                  >
                    Remove All {tabLabels[currentTab]}
                  </Button>
                )}
              </Box>

              {/* Object Table */}
              {renderObjectTable(tabTypes[currentTab])}
            </>
          ) : (
            <Box sx={{ p: 3, textAlign: 'center' }}>
              <Typography color="textSecondary">No objects selected for this service</Typography>
            </Box>
          )}
        </DialogContent>

        <DialogActions>
          <Button onClick={onClose}>Close</Button>
        </DialogActions>
      </Dialog>

      {/* Context Menu */}
      <Menu anchorEl={menuAnchor} open={Boolean(menuAnchor)} onClose={handleMenuClose}>
        <MenuItem
          onClick={() => {
            if (selectedForAction) {
              const objectName = getObjectName(
                selectedForAction.object,
                selectedForAction.objectType
              );
              handleRemoveObject(objectName, selectedForAction.objectType);
            }
          }}
        >
          <ListItemIcon>
            <DeleteIcon fontSize="small" color="error" />
          </ListItemIcon>
          <ListItemText>Remove from Selection</ListItemText>
        </MenuItem>
      </Menu>

      <ConfirmDialog
        open={confirmBulkRemove.open}
        title={`Remove All ${confirmBulkRemove.objectType ? confirmBulkRemove.objectType.charAt(0).toUpperCase() + confirmBulkRemove.objectType.slice(1) : ''}`}
        message={`Are you sure you want to remove all ${confirmBulkRemove.objectType ? getObjectsForTab(confirmBulkRemove.objectType).length : 0} ${confirmBulkRemove.objectType || 'items'}? This action cannot be undone.`}
        onConfirm={() =>
          confirmBulkRemove.objectType && handleBulkRemove(confirmBulkRemove.objectType)
        }
        onCancel={() => setConfirmBulkRemove({ open: false, objectType: null })}
      />
    </>
  );
};

export default ServiceObjectManager;
