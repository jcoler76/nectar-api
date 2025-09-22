import CheckCircleIcon from '@mui/icons-material/CheckCircle';
import CloseIcon from '@mui/icons-material/Close';
import ErrorIcon from '@mui/icons-material/Error';
import ExpandLess from '@mui/icons-material/ExpandLess';
import ExpandMore from '@mui/icons-material/ExpandMore';
import HourglassTopIcon from '@mui/icons-material/HourglassTop';
import {
  Drawer,
  Box,
  Typography,
  IconButton,
  List,
  ListItemButton,
  ListItemText,
  ListItemIcon,
  CircularProgress,
  Collapse,
  Chip,
  Tooltip,
} from '@mui/material';
import { format } from 'date-fns';
import React, { useState, useEffect } from 'react';

import JsonViewer from '../../../components/ui/JsonViewer';
import { sanitizeString } from '../../../utils/xssProtection';
import { getWorkflowRuns } from '../api/workflowApi';

const StatusIcon = ({ status }) => {
  switch (status) {
    case 'succeeded':
      return (
        <Tooltip title="Succeeded">
          <CheckCircleIcon color="success" />
        </Tooltip>
      );
    case 'failed':
      return (
        <Tooltip title="Failed">
          <ErrorIcon color="error" />
        </Tooltip>
      );
    case 'running':
      return (
        <Tooltip title="Running">
          <HourglassTopIcon color="warning" />
        </Tooltip>
      );
    default:
      return null;
  }
};

const ExecutionHistoryPanel = ({ open, onClose, workflowId }) => {
  const [runs, setRuns] = useState([]);
  const [isLoading, setIsLoading] = useState(false);
  const [selectedRunId, setSelectedRunId] = useState(null);

  useEffect(() => {
    if (open && workflowId) {
      setIsLoading(true);
      getWorkflowRuns(workflowId)
        .then(data => setRuns(data))
        .catch(err => console.error('Failed to fetch runs', err))
        .finally(() => setIsLoading(false));
    }
  }, [open, workflowId]);

  const handleRunClick = runId => {
    setSelectedRunId(prev => (prev === runId ? null : runId));
  };

  return (
    <Drawer
      anchor="bottom"
      open={open}
      onClose={onClose}
      sx={{ '& .MuiDrawer-paper': { maxHeight: '60vh' } }}
    >
      <Box sx={{ p: 2, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <Typography variant="h6">Execution History</Typography>
        <IconButton onClick={onClose}>
          <CloseIcon />
        </IconButton>
      </Box>
      {isLoading ? (
        <Box sx={{ display: 'flex', justifyContent: 'center', p: 4 }}>
          <CircularProgress />
        </Box>
      ) : (
        <List sx={{ overflowY: 'auto' }}>
          {runs.map(run => (
            <React.Fragment key={run._id}>
              <ListItemButton onClick={() => handleRunClick(run._id)}>
                <ListItemIcon>
                  <StatusIcon status={run.status} />
                </ListItemIcon>
                <ListItemText
                  primary={`Run started at ${format(new Date(run.startedAt), 'PPpp')}`}
                  secondary={`Status: ${run.status}`}
                />
                {selectedRunId === run._id ? <ExpandLess /> : <ExpandMore />}
              </ListItemButton>
              <Collapse in={selectedRunId === run._id} timeout="auto" unmountOnExit>
                <Box sx={{ p: 2, pl: 4, backgroundColor: '#f9f9f9' }}>
                  <Typography variant="subtitle2" gutterBottom>
                    Run Details
                  </Typography>
                  <Chip
                    label={`ID: ${sanitizeString(run._id || '')}`}
                    size="small"
                    sx={{ mb: 1 }}
                  />
                  <JsonViewer
                    data={run.trigger || {}}
                    title="Trigger Data"
                    collapsed={true}
                    enableClipboard={true}
                    maxHeight="200px"
                    className="mb-3"
                  />
                  <JsonViewer
                    data={Object.fromEntries(run.steps)}
                    title="Steps"
                    collapsed={1}
                    enableClipboard={true}
                    maxHeight="300px"
                  />
                </Box>
              </Collapse>
            </React.Fragment>
          ))}
        </List>
      )}
    </Drawer>
  );
};

export default ExecutionHistoryPanel;
